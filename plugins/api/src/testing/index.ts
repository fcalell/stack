import { registerHooks } from "node:module";
import type {
	CallToolResult,
	Client,
	Tool,
} from "@modelcontextprotocol/client";
import { createClient } from "../client.ts";
import type { RouterClient } from "../types.ts";
import type { WorkerExport } from "../worker/index.ts";

export { ORPCError } from "@orpc/client";

// The consumer test entry: loads the generated worker under plain node and
// drives it through `worker.fetch`, with the env `stack dev` would give it and
// whatever the contributed testing plugins set up (a database, a session).
// Node-only.

type Router = Record<string, unknown>;

// The host every test request carries. The worker never checks it; a
// relative `fetch` input resolves against it.
const TEST_ORIGIN = "http://stack.test";

// An MCP client over the handle's `fetch`, the SDK's own, one connection per
// call: the endpoint holds no session.
export interface McpTestClient {
	// What `tools/list` answers, with the instructions the server sent on
	// connecting.
	listTools(): Promise<{ tools: Tool[]; instructions: string | undefined }>;
	// A tool's result, `isError` ones included; an unknown tool rejects with
	// the SDK's `ProtocolError`.
	callTool(
		name: string,
		args?: Record<string, unknown>,
	): Promise<CallToolResult>;
}

// What the endpoint answers before any tool runs: a refusal by HTTP status,
// whichever way the SDK client reports it.
export class McpRefusal extends Error {
	readonly status: number;
	readonly wwwAuthenticate: string | null;

	constructor(status: number, wwwAuthenticate: string | null) {
		super(`MCP endpoint refused the request with ${status}`);
		this.name = "McpRefusal";
		this.status = status;
		this.wwwAuthenticate = wwwAuthenticate;
	}
}

export interface McpOptions {
	// The OAuth access token sent as the bearer; none sends no credential.
	token?: string;
	// `modern` pins protocol 2026-07-28; `legacy` is the 2025 handshake.
	era?: "modern" | "legacy";
}

export interface TestingContext {
	// The consumer root, for resolving a path a plugin baked relative to it.
	root: URL;
	// The live env object every request hands the worker; a plugin's `env`
	// lands here after its `setup`.
	env: Record<string, unknown>;
	worker: WorkerExport;
	fetch(input: string | URL | Request, init?: RequestInit): Promise<Response>;
	client(options?: { cookie?: string }): RouterClient<Router>;
}

export interface TestingSetup<TProvides> {
	env?: Record<string, unknown>;
	provides?: TProvides;
	dispose?(): Promise<void>;
}

export interface TestingPlugin<
	TName extends string = string,
	TDeps = object,
	TProvides extends object = object,
> {
	name: TName;
	// Plugins whose `provides` this one reads in `upstream`. Setups run in
	// this order whatever the `.use()` order; an unknown name is ignored.
	dependsOn?: readonly string[];
	// Method syntax on purpose: its parameters are checked bivariantly, so
	// `.use()` accepts a plugin whose deps its predecessors do not provide
	// yet (the generated file applies `.use()` in plugin-name order).
	setup(ctx: TestingContext, upstream: TDeps): Promise<TestingSetup<TProvides>>;
}

export interface TestApp<TRouter extends Router> {
	env: Record<string, unknown>;
	worker: WorkerExport<TRouter>;
	fetch(input: string | URL | Request, init?: RequestInit): Promise<Response>;
	client(options?: { cookie?: string }): RouterClient<TRouter>;
	// The MCP endpoint's client: needs `src/worker/mcp.ts`, and a token an
	// OAuth grant issued.
	mcp(options?: McpOptions): McpTestClient;
	// Runs every plugin's disposer, in reverse setup order, once.
	dispose(): Promise<void>;
	[Symbol.asyncDispose](): Promise<void>;
}

export interface TestEntry<TRouter extends Router, TProvides extends object> {
	use<TName extends string, P extends object>(
		plugin: TestingPlugin<TName, TProvides, P>,
	): TestEntry<TRouter, TProvides & P>;
	boot(overrides?: {
		env?: Record<string, unknown>;
	}): Promise<TestApp<TRouter> & TProvides>;
}

export interface TestEntryOptions {
	worker: URL;
	procedure: URL;
	root: URL;
	prefix: string;
	env: Record<string, string>;
}

const HANDLE_KEYS = new Set([
	"env",
	"worker",
	"fetch",
	"client",
	"mcp",
	"dispose",
]);

// `registerHooks` appends to the process's hook chain and a resolved module
// stays cached, so one process serves one `virtual:stack-procedure` target.
let procedureHref: string | null = null;
let bootCount = 0;

function registerProcedure(procedure: URL): void {
	if (procedureHref === procedure.href) return;
	if (procedureHref !== null) {
		throw new Error(
			`createTestEntry: virtual:stack-procedure already resolves to ${procedureHref} in this process; ${procedure.href} needs its own test process.`,
		);
	}
	const href = procedure.href;
	registerHooks({
		resolve(specifier, context, nextResolve) {
			if (specifier === "virtual:stack-procedure") {
				return nextResolve(href, context);
			}
			return nextResolve(specifier, context);
		},
	});
	procedureHref = href;
}

// Stable topological sort by `dependsOn`, the rule `createWorker` applies to
// runtime plugins: independent plugins keep their `.use()` order.
function sortByDependencies(
	plugins: readonly TestingPlugin<string, unknown, object>[],
): TestingPlugin<string, unknown, object>[] {
	const byName = new Map(plugins.map((p) => [p.name, p]));
	const visited = new Set<string>();
	const sorted: TestingPlugin<string, unknown, object>[] = [];
	function visit(
		plugin: TestingPlugin<string, unknown, object>,
		stack: string[],
	): void {
		if (visited.has(plugin.name)) return;
		const at = stack.indexOf(plugin.name);
		if (at !== -1) {
			const cycle = [...stack.slice(at), plugin.name];
			throw new Error(
				`createTestEntry: testing plugin dependency cycle: ${cycle.join(" -> ")}`,
			);
		}
		for (const dep of plugin.dependsOn ?? []) {
			const target = byName.get(dep);
			if (target) visit(target, [...stack, plugin.name]);
		}
		visited.add(plugin.name);
		sorted.push(plugin);
	}
	for (const plugin of plugins) visit(plugin, []);
	return sorted;
}

// Runs every disposer, last first, and returns what they threw.
async function runDisposers(
	disposers: Array<() => Promise<void>>,
): Promise<unknown[]> {
	const errors: unknown[] = [];
	for (const dispose of disposers.splice(0).reverse()) {
		try {
			await dispose();
		} catch (error) {
			errors.push(error);
		}
	}
	return errors;
}

function mcpClient(
	fetch: (input: string | URL, init?: RequestInit) => Promise<Response>,
	options: McpOptions = {},
): McpTestClient {
	// Runs `use` on a freshly connected client. The SDK reports a 401 or 403 as
	// its own errors and any other refusal as an HTTP error, none carrying the
	// status or the challenge, so the last refused response is kept and thrown.
	async function withClient<T>(
		use: (client: Client) => Promise<T>,
	): Promise<T> {
		const { Client, StreamableHTTPClientTransport, ProtocolError } =
			await import("@modelcontextprotocol/client");
		let refusal: McpRefusal | undefined;
		const transport = new StreamableHTTPClientTransport(
			new URL("/mcp", TEST_ORIGIN),
			{
				fetch: async (input, init) => {
					const response = await fetch(input, init);
					if (!response.ok) {
						refusal = new McpRefusal(
							response.status,
							response.headers.get("www-authenticate"),
						);
					}
					return response;
				},
				requestInit: options.token
					? { headers: { authorization: `Bearer ${options.token}` } }
					: undefined,
			},
		);
		const client = new Client(
			{ name: "stack-testing", version: "1.0.0" },
			{
				versionNegotiation: {
					mode: options.era === "legacy" ? "legacy" : { pin: "2026-07-28" },
				},
			},
		);
		try {
			await client.connect(transport);
			return await use(client);
		} catch (error) {
			if (refusal && !(error instanceof ProtocolError)) throw refusal;
			throw error;
		} finally {
			await client.close().catch(() => {});
		}
	}
	return {
		listTools: () =>
			withClient(async (client) => ({
				tools: (await client.listTools()).tools,
				instructions: client.getInstructions(),
			})),
		callTool: (name, args) =>
			withClient(
				(client) =>
					client.callTool({ name, arguments: args }) as Promise<CallToolResult>,
			),
	};
}

async function boot<TRouter extends Router>(
	options: TestEntryOptions,
	plugins: readonly TestingPlugin<string, unknown, object>[],
	overrides: { env?: Record<string, unknown> } | undefined,
): Promise<TestApp<TRouter> & Record<string, unknown>> {
	registerProcedure(options.procedure);
	// A fresh module instance per boot: the worker checks its env once per
	// `.handler()` call, so a reused worker would check only the first boot's.
	bootCount += 1;
	const workerUrl = new URL(options.worker);
	workerUrl.searchParams.set("boot", String(bootCount));
	const worker = (
		(await import(workerUrl.href)) as { default: WorkerExport<TRouter> }
	).default;

	// `STACK_QUIET` keeps the worker's request log and env-check line out of
	// the test output; an override may unset it.
	const env: Record<string, unknown> = {
		...options.env,
		STACK_QUIET: "1",
		...overrides?.env,
	};
	const fetch = (
		input: string | URL | Request,
		init?: RequestInit,
	): Promise<Response> => {
		const request = new Request(
			typeof input === "string" ? new URL(input, TEST_ORIGIN) : input,
			init,
		);
		return Promise.resolve(worker.fetch(request, env, undefined));
	};
	const client = (clientOptions?: { cookie?: string }) =>
		createClient<TRouter>({
			url: `${TEST_ORIGIN}${options.prefix}`,
			fetch,
			headers: clientOptions?.cookie
				? { cookie: clientOptions.cookie }
				: undefined,
		});

	const disposers: Array<() => Promise<void>> = [];
	const provided: Record<string, unknown> = {};
	try {
		for (const plugin of sortByDependencies(plugins)) {
			const result = await plugin.setup(
				{ root: options.root, env, worker, fetch, client },
				{ ...provided },
			);
			if (result.dispose) disposers.push(result.dispose.bind(result));
			Object.assign(env, result.env);
			for (const key of Object.keys(result.provides ?? {})) {
				if (HANDLE_KEYS.has(key)) {
					throw new Error(
						`createTestEntry: testing plugin "${plugin.name}" provides "${key}", a key the test handle owns.`,
					);
				}
			}
			Object.assign(provided, result.provides);
		}
	} catch (error) {
		const cleanup = await runDisposers(disposers);
		if (cleanup.length === 0) throw error;
		throw new AggregateError(
			[error, ...cleanup],
			"createTestEntry: boot failed and disposing what it set up failed too",
		);
	}

	const dispose = async (): Promise<void> => {
		const errors = await runDisposers(disposers);
		if (errors.length === 1) throw errors[0];
		if (errors.length > 1) {
			throw new AggregateError(errors, "createTestEntry: dispose failed");
		}
	};
	return {
		...provided,
		env,
		worker,
		fetch,
		client,
		mcp: (mcpOptions?: McpOptions) => mcpClient(fetch, mcpOptions),
		dispose,
		[Symbol.asyncDispose]: dispose,
	};
}

function entry<TRouter extends Router, TProvides extends object>(
	options: TestEntryOptions,
	plugins: readonly TestingPlugin<string, unknown, object>[],
): TestEntry<TRouter, TProvides> {
	return {
		use(plugin) {
			return entry(options, [
				...plugins,
				plugin as TestingPlugin<string, unknown, object>,
			]);
		},
		async boot(overrides) {
			return (await boot<TRouter>(
				options,
				plugins,
				overrides,
			)) as TestApp<TRouter> & TProvides;
		},
	};
}

// Called by the generated `.stack/testing.ts` with the worker and procedure
// modules beside it, the consumer root, the api prefix and the baked dev env.
export function createTestEntry<TRouter extends Router>(
	options: TestEntryOptions,
): TestEntry<TRouter, object> {
	return entry<TRouter, object>(options, []);
}
