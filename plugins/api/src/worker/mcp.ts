import type {
	AuthInfo,
	CallToolResult,
	McpHttpHandler,
	McpRequestContext,
	Tool,
} from "@modelcontextprotocol/server";
import { call, isProcedure, ORPCError } from "@orpc/server";
import type { Context } from "hono";
import { z } from "zod";
import type { McpDefinition } from "../mcp.ts";

// The MCP endpoint: `POST /mcp` over the consumer's procedures. The SDK loads
// on the first request, so a worker without `src/worker/mcp.ts` never reads it.

const TOOL_NAME = /^[A-Za-z0-9_.-]{1,128}$/;
const MAX_BODY_BYTES = 4 * 1024 * 1024;
const SERVER_VERSION = "1.0.0";
const INTERNAL = {
	code: "INTERNAL_SERVER_ERROR",
	message: "Internal server error",
};

// ---------- Tools ----------

export interface McpTool {
	name: string;
	description: string;
	inputSchema: Tool["inputSchema"];
	readOnly: boolean;
	procedure: Parameters<typeof call>[0];
	// Turns each string at a `z.date()` position into the `Date` it spells.
	convert: (args: unknown) => unknown;
}

type Convert = (value: unknown) => unknown;

// The kinds of schema JSON Schema cannot hold, which `toJSONSchema` would
// turn into `{}` under `unrepresentable: "any"`. A `z.date()` is the one
// exception, a `date-time` string.
const UNREPRESENTABLE = new Set([
	"bigint",
	"symbol",
	"undefined",
	"void",
	"nan",
	"map",
	"set",
	"custom",
	"function",
	"promise",
]);

function inputJsonSchema(schema: z.ZodType | undefined): Tool["inputSchema"] {
	if (schema === undefined) return { type: "object" };
	const json = z.toJSONSchema(schema, {
		target: "draft-2020-12",
		io: "input",
		unrepresentable: "any",
		override: ({ zodSchema, jsonSchema }) => {
			const type = zodSchema._zod.def.type;
			if (type === "date") {
				jsonSchema.type = "string";
				jsonSchema.format = "date-time";
			} else if (UNREPRESENTABLE.has(type)) {
				throw new Error(`a ${type} has no JSON Schema form`);
			}
		},
	});
	if (json.type !== "object") {
		throw new Error("its input is not an object schema");
	}
	return json as Tool["inputSchema"];
}

// The schemas a walk of `def` reaches below the one holding it.
function children(schema: z.ZodType): z.ZodType[] {
	const def = schema._zod.def as unknown as Record<string, unknown>;
	const found: unknown[] = [];
	switch (def.type) {
		case "object":
			found.push(...Object.values(def.shape as Record<string, unknown>));
			break;
		case "array":
		case "set":
			found.push(def.element ?? def.valueType);
			break;
		case "optional":
		case "nullable":
		case "default":
		case "prefault":
		case "nonoptional":
		case "readonly":
		case "catch":
			found.push(def.innerType);
			break;
		case "union":
			found.push(...(def.options as unknown[]));
			break;
		case "pipe":
			found.push(def.in);
			break;
		case "record":
		case "map":
			found.push(def.keyType, def.valueType);
			break;
		case "tuple":
			found.push(...(def.items as unknown[]), def.rest);
			break;
		case "intersection":
			found.push(def.left, def.right);
			break;
		case "lazy":
			found.push((def.getter as () => unknown)());
			break;
	}
	return found.filter((child): child is z.ZodType => child !== undefined);
}

function containsDate(schema: z.ZodType, seen: Set<z.ZodType>): boolean {
	if (seen.has(schema)) return false;
	seen.add(schema);
	if (schema._zod.def.type === "date") return true;
	return children(schema).some((child) => containsDate(child, seen));
}

const RFC_3339 =
	/^\d{4}-\d{2}-\d{2}[Tt]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[Zz]|[+-]\d{2}:\d{2})$/;

function parseDate(text: string): Date | undefined {
	if (!RFC_3339.test(text)) return undefined;
	const date = new Date(text.toUpperCase());
	return Number.isNaN(date.getTime()) ? undefined : date;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (typeof value !== "object" || value === null) return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

// How to convert a value of `schema`, or undefined when no date lies below it.
// A date under a container the walk cannot enter would reach the procedure as
// the string it arrived as, so it is refused when the tool is built.
function datePlan(schema: z.ZodType): Convert | undefined {
	const type = schema._zod.def.type;
	switch (type) {
		case "date":
			return (value) =>
				typeof value === "string" ? (parseDate(value) ?? value) : value;
		case "object": {
			const plans: Array<[string, Convert]> = [];
			for (const [key, child] of Object.entries(
				(schema as z.ZodObject).shape as Record<string, z.ZodType>,
			)) {
				const plan = datePlan(child);
				if (plan) plans.push([key, plan]);
			}
			if (plans.length === 0) return undefined;
			return (value) => {
				if (!isPlainObject(value)) return value;
				const out = { ...value };
				for (const [key, plan] of plans) {
					if (key in out) out[key] = plan(out[key]);
				}
				return out;
			};
		}
		case "array": {
			const plan = datePlan((schema as z.ZodArray).element as z.ZodType);
			if (!plan) return undefined;
			return (value) => (Array.isArray(value) ? value.map(plan) : value);
		}
		case "optional":
		case "nullable":
		case "default":
		case "prefault":
		case "nonoptional":
		case "readonly":
		case "catch":
		case "pipe": {
			const [inner] = children(schema);
			return inner ? datePlan(inner) : undefined;
		}
		case "union": {
			const plans = children(schema)
				.map(datePlan)
				.filter((plan): plan is Convert => plan !== undefined);
			if (plans.length === 0) return undefined;
			return (value) => plans.reduce((acc, plan) => plan(acc), value);
		}
		default:
			if (containsDate(schema, new Set())) {
				throw new Error(
					`a date inside a ${type} cannot be converted from its string`,
				);
			}
			return undefined;
	}
}

function resolvePath(routes: unknown, path: string): unknown {
	let node = routes;
	for (const segment of path.split(".")) {
		if (
			(typeof node !== "object" && typeof node !== "function") ||
			node === null ||
			!Object.hasOwn(node, segment)
		) {
			return undefined;
		}
		node = (node as Record<string, unknown>)[segment];
	}
	return node;
}

// Resolves every tool of `definition` against the consumer's routes, in the
// definition's order. A tool the endpoint could not serve throws here, naming
// the tool, so a worker never boots with it.
export function buildMcpTools(
	routes: Record<string, unknown> | undefined,
	definition: McpDefinition,
): McpTool[] {
	const tools: McpTool[] = [];
	for (const [name, description] of Object.entries(definition.tools)) {
		const refuse = (reason: string) =>
			new Error(`createWorker: MCP tool "${name}" ${reason}.`);
		if (!TOOL_NAME.test(name)) {
			throw refuse(
				"is not a valid name: MCP names hold 1 to 128 letters, digits, `_`, `-` and `.`",
			);
		}
		if (typeof description !== "string") {
			throw refuse("has no description");
		}
		const procedure = resolvePath(routes, name);
		if (!isProcedure(procedure))
			throw refuse("names no procedure in the routes");
		const def = procedure["~orpc"];
		const schema = def.inputSchema as z.ZodType | undefined;
		if (schema !== undefined && !(schema instanceof z.ZodType)) {
			throw refuse("has an input that is not a zod schema");
		}
		let inputSchema: Tool["inputSchema"];
		let convert: Convert | undefined;
		try {
			inputSchema = inputJsonSchema(schema);
			convert = schema && datePlan(schema);
		} catch (error) {
			const reason = error instanceof Error ? error.message : String(error);
			throw refuse(`cannot be served: ${reason}`);
		}
		tools.push({
			name,
			description,
			inputSchema,
			readOnly: (def.meta as { kind?: string } | undefined)?.kind === "query",
			procedure,
			convert: convert ?? ((args) => args),
		});
	}
	return tools;
}

// ---------- A call ----------

interface CallExtra {
	// What the procedure runs with: the stack context, the pinned tenancy and
	// the verified caller.
	context: Record<string, unknown>;
	organizationId: string;
}

function toResult(value: unknown, isError = false): CallToolResult {
	const parsed: unknown = JSON.parse(JSON.stringify(value ?? null));
	const structured = isPlainObject(parsed) ? parsed : { result: parsed };
	return {
		content: [{ type: "text", text: JSON.stringify(structured) }],
		structuredContent: structured,
		...(isError ? { isError: true as const } : {}),
	};
}

async function runTool(
	tool: McpTool,
	args: unknown,
	context: Record<string, unknown>,
): Promise<CallToolResult> {
	try {
		const output = await call(tool.procedure, tool.convert(args ?? {}), {
			context,
		});
		return toResult(output);
	} catch (error) {
		if (error instanceof ORPCError) {
			try {
				return toResult(
					{ code: error.code, message: error.message, data: error.data },
					true,
				);
			} catch {
				// Error data JSON cannot hold: masked like any other failure.
			}
		}
		console.error(`[mcp] tool "${tool.name}" failed:`, error);
		return toResult(INTERNAL, true);
	}
}

// ---------- The endpoint ----------

type Sdk = typeof import("@modelcontextprotocol/server");

export interface McpEndpoint {
	fetch(
		request: Request,
		options: { parsedBody: unknown; authInfo: AuthInfo },
	): Promise<Response>;
	// Reads a request body up to the 4 MiB bound; null beyond it.
	readBody(request: Request): Promise<string | null>;
}

export function createMcpEndpoint(options: {
	tools: McpTool[];
	instructions: string;
	name: string;
}): McpEndpoint {
	const listed = options.tools.map(
		(tool): Tool => ({
			name: tool.name,
			description: tool.description,
			inputSchema: tool.inputSchema,
			...(tool.readOnly ? { annotations: { readOnlyHint: true } } : {}),
		}),
	);
	const byName = new Map(options.tools.map((tool) => [tool.name, tool]));

	let sdk: Promise<Sdk> | undefined;
	const loadSdk = (): Promise<Sdk> => {
		sdk ??= import("@modelcontextprotocol/server").catch((error) => {
			sdk = undefined;
			throw error;
		});
		return sdk;
	};

	let handler: Promise<McpHttpHandler> | undefined;
	const loadHandler = (): Promise<McpHttpHandler> => {
		handler ??= build().catch((error) => {
			handler = undefined;
			throw error;
		});
		return handler;
	};

	// One handler per worker, one server per request: nothing is held between
	// calls, so the 2025-era leg needs no session store.
	async function build(): Promise<McpHttpHandler> {
		const { createMcpHandler, Server, ProtocolError, ProtocolErrorCode } =
			await loadSdk();
		const factory = (request: McpRequestContext) => {
			const extra = request.authInfo?.extra as CallExtra | undefined;
			if (!extra) {
				throw new Error("mcp: the request reached the server unauthenticated");
			}
			const server = new Server(
				{ name: options.name, version: SERVER_VERSION },
				{
					capabilities: { tools: {} },
					instructions: `${options.instructions}\n\nThis connection acts in the organization with id ${extra.organizationId}`,
				},
			);
			server.setRequestHandler("tools/list", () => ({ tools: listed }));
			server.setRequestHandler("tools/call", ({ params }) => {
				const tool = byName.get(params.name);
				if (!tool) {
					throw new ProtocolError(
						ProtocolErrorCode.InvalidParams,
						`Unknown tool: ${params.name}`,
					);
				}
				return runTool(tool, params.arguments, extra.context);
			});
			return server;
		};
		return createMcpHandler(factory, {
			legacy: "stateless",
			// No need names `subscriptions/listen`, which a Worker would hold open.
			maxSubscriptions: 0,
			onerror: (error) => console.error("[mcp] SDK error:", error),
		});
	}

	return {
		async fetch(request, init) {
			return (await loadHandler()).fetch(request, init);
		},
		async readBody(request) {
			const { readRequestBody } = await loadSdk();
			const read = await readRequestBody(request, MAX_BODY_BYTES);
			return read.tooLarge ? null : read.text;
		},
	};
}

// ---------- The route ----------

export interface McpRouteDeps {
	endpoint: McpEndpoint;
	// A browser Origin the worker's CORS list does not carry.
	isForbiddenOrigin(c: Context): boolean;
	// Draws the per-IP budget; true when it refuses.
	ipLimited(c: Context, ctx: Record<string, unknown>): Promise<boolean>;
}

interface VerifiedCaller {
	user: unknown;
	session: { expiresAt: Date };
	grant: { clientId: string; organizationId: string; scopes: string[] };
	tenancy: unknown;
}

function jsonRpcError(code: number, message: string, status: number): Response {
	return Response.json(
		{ jsonrpc: "2.0", error: { code, message }, id: null },
		{ status },
	);
}

export function createMcpRoute(deps: McpRouteDeps) {
	return async (
		c: Context,
		ctx: Record<string, unknown>,
	): Promise<Response> => {
		if (deps.isForbiddenOrigin(c)) {
			return c.json({ code: "FORBIDDEN" }, 403);
		}
		const oauth = ctx.oauth as
			| {
					verify(request: Request): Promise<VerifiedCaller | Response>;
			  }
			| undefined;
		if (!oauth) {
			throw new Error(
				"mcp: the request context has no `oauth`; the MCP endpoint needs auth({ mcp: true }).",
			);
		}
		const request = c.req.raw;
		const verified = await oauth.verify(request);
		if (verified instanceof Response) {
			// A forged `kid` costs a key refetch, so a refused token draws the
			// per-IP budget. An accepted token never does: hosted clients share
			// egress, and `verify` limits per grant.
			if (verified.status === 401 && (await deps.ipLimited(c, ctx))) {
				return c.json({ code: "TOO_MANY_REQUESTS" }, 429);
			}
			return verified;
		}

		const text = await deps.endpoint.readBody(request);
		if (text === null) {
			return jsonRpcError(-32000, "Request body too large", 413);
		}
		let parsedBody: unknown;
		try {
			parsedBody = JSON.parse(text);
		} catch {
			return jsonRpcError(
				-32700,
				"Parse error: the body is not valid JSON",
				400,
			);
		}
		// One POST is one call, so the grant's limit counts calls.
		if (Array.isArray(parsedBody)) {
			return jsonRpcError(
				-32600,
				"Invalid request: batches are not served",
				400,
			);
		}

		const reqHeaders = new Headers(request.headers);
		reqHeaders.delete("cookie");
		reqHeaders.delete("authorization");
		const env = ctx.env as Record<string, unknown> | undefined;
		const appUrl = env?.APP_URL;
		const token = request.headers.get("authorization")?.split(/\s+/)[1] ?? "";
		const authInfo: AuthInfo = {
			token,
			clientId: verified.grant.clientId,
			scopes: verified.grant.scopes,
			expiresAt: Math.floor(verified.session.expiresAt.getTime() / 1000),
			...(typeof appUrl === "string"
				? { resource: new URL(`${appUrl.replace(/\/+$/, "")}/mcp`) }
				: {}),
			extra: {
				context: {
					...ctx,
					tenancy: verified.tenancy,
					_caller: { user: verified.user, session: verified.session },
					reqHeaders,
					// The request without its body or credentials, so a procedure that
					// forwards headers to Better Auth finds no session.
					httpRequest: new Request(request.url, {
						method: request.method,
						headers: reqHeaders,
					}),
					resHeaders: new Headers(),
				},
				organizationId: verified.grant.organizationId,
			} satisfies CallExtra,
		};
		return deps.endpoint.fetch(
			new Request(request.url, {
				method: request.method,
				headers: request.headers,
			}),
			{ parsedBody, authInfo },
		);
	};
}
