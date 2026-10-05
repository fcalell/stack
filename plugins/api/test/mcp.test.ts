import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { createProcedure } from "../src/procedure.ts";
import {
	createTestEntry,
	type McpRefusal,
	type TestApp,
} from "../src/testing/index.ts";
import createWorker from "../src/worker/index.ts";
import { CHALLENGE } from "./fixtures/testing/challenge.ts";
import type { AppRouter } from "./fixtures/testing/worker.ts";

const fixture = new URL("./fixtures/testing/", import.meta.url);
const TOOLS = [
	"agent.note",
	"agent.whoami",
	"agent.due",
	"agent.list",
	"agent.refuse",
	"agent.boom",
	"agent.big",
	"agent.bare",
];
const ORG = { orgId: "org-1" };
const ERAS = ["modern", "legacy"] as const;

function boot(env?: Record<string, unknown>) {
	return createTestEntry<AppRouter>({
		worker: new URL("worker.ts", fixture),
		procedure: new URL("procedure.ts", fixture),
		root: fixture,
		prefix: "/rpc",
		env: { STACK_DEV: "1", FIXTURE_SECRET: "fixture-secret-0123456789" },
	}).boot(env ? { env } : undefined);
}

type App = Awaited<ReturnType<typeof boot>>;

const body = (result: { structuredContent?: unknown }) =>
	result.structuredContent as Record<string, unknown>;

const ran = (app: App) => app.client().agent.calls();

// The SDK client, as `mcp()` builds it, with headers the handle does not send.
async function connect(app: App, headers: Record<string, string>) {
	const { Client, StreamableHTTPClientTransport } = await import(
		"@modelcontextprotocol/client"
	);
	const client = new Client(
		{ name: "test", version: "1.0.0" },
		{ versionNegotiation: { mode: { pin: "2026-07-28" } } },
	);
	await client.connect(
		new StreamableHTTPClientTransport(new URL("http://stack.test/mcp"), {
			fetch: (input, init) => app.fetch(input, init),
			requestInit: { headers },
		}),
	);
	return client;
}

function post(app: TestApp<AppRouter>, body: string, headers = {}) {
	return app.fetch("/mcp", {
		method: "POST",
		headers: {
			authorization: "Bearer good",
			"content-type": "application/json",
			accept: "application/json, text/event-stream",
			...headers,
		},
		body,
	});
}

test("tools/list answers the definition in order", async () => {
	await using app = await boot();
	for (const era of ERAS) {
		const { tools, instructions } = await app
			.mcp({ token: "good", era })
			.listTools();
		assert.deepEqual(
			tools.map((tool) => tool.name),
			TOOLS,
		);
		assert.deepEqual(
			tools.map((tool) => tool.description),
			[
				"Saves a note.",
				"Says who runs.",
				"Reads dates.",
				"Lists two rows.",
				"Always refused.",
				"Always throws.",
				"Answers a bigint.",
				"A bare handler.",
			],
		);
		for (const tool of tools) {
			const schema = tool.inputSchema as Record<string, unknown>;
			assert.equal(
				schema.$schema,
				"https://json-schema.org/draft/2020-12/schema",
			);
			assert.equal(schema.type, "object");
			assert.ok((schema.required as string[]).includes("orgId"), tool.name);
		}
		const due = tools.find((tool) => tool.name === "agent.due");
		const properties = due?.inputSchema.properties as Record<string, unknown>;
		assert.deepEqual(properties.at, { type: "string", format: "date-time" });
		// A query is read-only; a mutation and a bare handler claim nothing.
		const hints = Object.fromEntries(
			tools.map((tool) => [tool.name, tool.annotations?.readOnlyHint]),
		);
		assert.equal(hints["agent.whoami"], true);
		assert.equal(hints["agent.note"], undefined);
		assert.equal(hints["agent.bare"], undefined);
		assert.ok(instructions?.startsWith("Fixture tools."));
		assert.ok(instructions?.endsWith("org-1"));
	}
});

test("a tool runs its procedure as the verified caller", async () => {
	await using app = await boot();
	// The cookie `getSession` would sign in as `cookie-user` is on the request.
	const client = await connect(app, {
		authorization: "Bearer good",
		cookie: "session=abc",
	});
	try {
		const who = await client.callTool({ name: "agent.whoami", arguments: ORG });
		const headers = body(who).headers as string[];
		assert.deepEqual(body(who), {
			userId: "agent-user",
			sessionId: "grant-1",
			agent: true,
			headers,
			cookieOnRequest: false,
		});
		assert.ok(headers.length > 0);
		assert.ok(!headers.includes("cookie"));
		assert.ok(!headers.includes("authorization"));
		assert.equal(
			(who.content[0] as { text: string }).text,
			JSON.stringify(who.structuredContent),
		);

		const due = await client.callTool({
			name: "agent.due",
			arguments: {
				...ORG,
				at: "2026-01-02T03:04:05Z",
				also: ["2026-01-02T03:04:05.5+01:00"],
			},
		});
		assert.deepEqual(due.structuredContent, {
			at: "2026-01-02T03:04:05.000Z",
			isDate: true,
			also: [true],
		});

		const list = await client.callTool({ name: "agent.list", arguments: ORG });
		assert.deepEqual(list.structuredContent, {
			result: [{ id: 1 }, { id: 2 }],
		});
		assert.equal(
			(list.content[0] as { text: string }).text,
			JSON.stringify({ result: [{ id: 1 }, { id: 2 }] }),
		);
	} finally {
		await client.close();
	}
});

test("refusals are results and unknown tools are protocol errors", async (t) => {
	const logged = t.mock.method(console, "error", () => {});
	await using app = await boot();
	for (const era of ERAS) {
		const mcp = app.mcp({ token: "good", era });

		const invalid = await mcp.callTool("agent.note", { ...ORG, text: 5 });
		assert.equal(invalid.isError, true);
		const body = invalid.structuredContent as {
			code: string;
			data: { issues: unknown[] };
		};
		assert.equal(body.code, "BAD_REQUEST");
		assert.ok(body.data.issues.length > 0);

		const refused = await mcp.callTool("agent.refuse", ORG);
		assert.equal(refused.isError, true);
		assert.deepEqual(refused.structuredContent, {
			code: "FORBIDDEN",
			message: "Not for you",
			data: { why: "policy" },
		});
		assert.equal(
			(refused.content[0] as { text: string }).text,
			JSON.stringify(refused.structuredContent),
		);

		for (const name of ["agent.boom", "agent.big"]) {
			const before = logged.mock.callCount();
			const masked = await mcp.callTool(name, ORG);
			assert.equal(masked.isError, true, name);
			assert.deepEqual(masked.structuredContent, {
				code: "INTERNAL_SERVER_ERROR",
				message: "Internal server error",
			});
			assert.ok(
				!JSON.stringify(masked).includes("secret detail"),
				"the error's own message is never sent",
			);
			assert.ok(logged.mock.callCount() > before, `${name} is logged`);
		}
		assert.ok(
			logged.mock.calls.some((call) =>
				call.arguments.some(
					(argument) =>
						argument instanceof Error && argument.message === "secret detail",
				),
			),
		);

		// A procedure that exists but is not listed is as unknown as a typo.
		for (const name of ["agent.nope", "hello.secret"]) {
			await assert.rejects(mcp.callTool(name, {}), (error: unknown) => {
				assert.equal((error as { code?: number }).code, -32602, name);
				return true;
			});
		}
	}
});

test("both eras are served statelessly", async (t) => {
	const logged = t.mock.method(console, "error", () => {});
	await using app = await boot();
	for (const era of ERAS) {
		const mcp = app.mcp({ token: "good", era });
		assert.equal((await mcp.listTools()).tools.length, TOOLS.length);
		const who = await mcp.callTool("agent.whoami", ORG);
		assert.equal(body(who).userId, "agent-user");
	}

	for (const method of ["GET", "DELETE"]) {
		const response = await app.fetch("/mcp", {
			method,
			headers: { authorization: "Bearer good" },
		});
		assert.equal(response.status, 405, method);
		assert.equal(response.headers.get("allow"), "POST");
	}

	// No need names `subscriptions/listen`, which a Worker would hold open.
	const client = await connect(app, { authorization: "Bearer good" });
	try {
		await assert.rejects(client.listen({ toolsListChanged: true }));
		assert.ok(
			logged.mock.calls.some((call) =>
				String(call.arguments[1]).includes("subscriptions/listen refused"),
			),
		);
	} finally {
		await client.close();
	}

	// One POST is one call: a batch runs nothing.
	const before = await ran(app);
	const batch = await post(
		app,
		JSON.stringify([
			{
				jsonrpc: "2.0",
				id: 1,
				method: "tools/call",
				params: { name: "agent.note", arguments: { ...ORG, text: "a" } },
			},
		]),
	);
	assert.equal(batch.status, 400);
	assert.deepEqual(await batch.json(), {
		jsonrpc: "2.0",
		error: { code: -32600, message: "Invalid request: batches are not served" },
		id: null,
	});
	assert.equal(await ran(app), before);

	const garbled = await post(app, "{nope");
	assert.equal(garbled.status, 400);
	assert.equal(
		((await garbled.json()) as { error: { code: number } }).error.code,
		-32700,
	);

	const large = await post(app, `"${"a".repeat(4 * 1024 * 1024)}"`);
	assert.equal(large.status, 413);
});

test("the door refuses before any tool runs", async () => {
	await using app = await boot();
	const before = await ran(app);
	for (const era of ERAS) {
		for (const token of [undefined, "unknown"]) {
			await assert.rejects(
				app.mcp({ token, era }).callTool("agent.note", { ...ORG, text: "a" }),
				(error: unknown) => {
					const refusal = error as McpRefusal;
					assert.equal(refusal.status, 401);
					assert.equal(refusal.wwwAuthenticate, CHALLENGE);
					return true;
				},
			);
		}
	}
	const foreign = await post(app, "{}", { origin: "https://evil.example" });
	assert.equal(foreign.status, 403);
	assert.equal(await ran(app), before);

	// Production mode with a bound limiter.
	const keys: string[] = [];
	let allow = true;
	const limiter = {
		limit: async ({ key }: { key: string }) => {
			keys.push(key);
			return { success: allow };
		},
	};
	await using limited = await boot({
		STACK_DEV: "",
		RATE_LIMITER_RPC: limiter,
	});
	const unknown = limited.mcp({ token: "unknown", era: "legacy" });
	await assert.rejects(unknown.listTools(), (error: unknown) => {
		assert.equal((error as McpRefusal).status, 401);
		return true;
	});
	assert.ok(keys.length > 0, "a refused token draws the IP budget");

	allow = false;
	await assert.rejects(unknown.listTools(), (error: unknown) => {
		assert.equal((error as McpRefusal).status, 429);
		return true;
	});
	await assert.rejects(limited.client().hello.secret(), (error: unknown) => {
		assert.equal((error as { status?: number }).status, 429);
		return true;
	});

	// An accepted token never draws it, even while it refuses.
	const drawn = keys.length;
	const who = await limited
		.mcp({ token: "good" })
		.callTool("agent.whoami", ORG);
	assert.equal(body(who).userId, "agent-user");
	assert.equal(keys.length, drawn);
});

test("construction refuses a tool it cannot serve", () => {
	const procedure = createProcedure<Record<string, unknown>>();
	const routes = {
		ok: procedure().query(async () => 1),
		scalar: procedure()
			.input(z.string())
			.query(async () => 1),
		big: procedure()
			.input(z.object({ n: z.bigint() }))
			.query(async () => 1),
		record: procedure()
			.input(z.object({ by: z.record(z.string(), z.date()) }))
			.query(async () => 1),
		nested: { deep: procedure().query(async () => 1) },
	};
	const build = (tools: Record<string, string | undefined>) => () =>
		createWorker().handler(routes, {
			mcp: { instructions: "", tools },
			name: "test",
		});

	const refusals: Array<[string, RegExp]> = [
		["missing", /names no procedure/],
		["nested", /names no procedure/],
		["with space", /not a valid name/],
		["a/b", /not a valid name/],
		["a".repeat(129), /not a valid name/],
		["scalar", /not an object schema/],
		["big", /bigint/],
		["record", /date inside a record/],
	];
	for (const [name, reason] of refusals) {
		assert.throws(
			build({ [name]: "described" }),
			(error: unknown) => {
				const message = (error as Error).message;
				assert.ok(message.includes(`"${name}"`), message);
				assert.match(message, reason);
				return true;
			},
			name,
		);
	}
	assert.throws(build({ ok: undefined }), /"ok" has no description/);

	// The servable ones build, and a worker without a definition builds as before.
	assert.doesNotThrow(build({ ok: "fine", "nested.deep": "fine" }));
	assert.doesNotThrow(() => createWorker().handler(routes));
});
