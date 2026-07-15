import type { RuntimePlugin } from "@fcalell/cli/runtime";
import { ORPCError } from "@orpc/server";
import { describe, expect, it, vi } from "vitest";
import { createProcedure } from "./procedure";
import createWorker from "./worker/index";

// Shared wire request for a POST to an oRPC route: the exact shape the real
// client sends and the one `tests/integration/worker-runtime.test.ts` uses.
function rpcRequest(path: string, body: unknown = { json: {} }): Request {
	return new Request(`https://example.com${path}`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("createWorker", () => {
	it(".handler() returns a WorkerExport with fetch", () => {
		const builder = createWorker();
		const worker = builder.handler({});
		expect(typeof worker.fetch).toBe("function");
		expect(worker._router).toBeDefined();
	});

	it("context key collision throws for duplicate plugin names", () => {
		const pluginA: RuntimePlugin<"dup", object, { a: number }> = {
			name: "dup",
			context() {
				return { a: 1 };
			},
		};
		const pluginB: RuntimePlugin<"dup", object, { b: number }> = {
			name: "dup",
			context() {
				return { b: 2 };
			},
		};
		const builder = createWorker();
		expect(() => builder.use(pluginA).use(pluginB)).toThrow(
			'Context key collision: plugin "dup" already registered',
		);
	});

	it("allows multiple distinct plugins", () => {
		const pluginA: RuntimePlugin<"alpha", object, { a: number }> = {
			name: "alpha",
			context() {
				return { a: 1 };
			},
		};
		const pluginB: RuntimePlugin<"beta", object, { b: number }> = {
			name: "beta",
			context() {
				return { b: 2 };
			},
		};
		const builder = createWorker();
		const next = builder.use(pluginA).use(pluginB);
		const worker = next.handler({});
		expect(typeof worker.fetch).toBe("function");
	});

	// A consumer routes barrel exporting a top-level key that collides with a
	// plugin-registered route namespace (e.g. `auth`) would otherwise silently
	// clobber the plugin's route under `{ ...pluginRoutes, ...consumerRoutes }`
	// — fail loud at construction time instead, naming the key and the owner.
	it("throws at construction when a consumer routes key collides with a plugin-registered route", () => {
		const authLike: RuntimePlugin<"auth", object, Record<string, never>> = {
			name: "auth",
			context() {
				return {};
			},
			routes() {
				return { auth: { orgRules: () => ({ rules: [] }) } };
			},
		};
		const builder = createWorker().use(authLike);
		expect(() =>
			builder.handler({ auth: { customRoute: () => ({}) } }),
		).toThrow(
			'createWorker: consumer routes key "auth" collides with a route namespace already registered by the "auth" plugin runtime.',
		);
	});

	it("allows a consumer routes key that doesn't collide with any plugin-registered route", () => {
		const authLike: RuntimePlugin<"auth", object, Record<string, never>> = {
			name: "auth",
			context() {
				return {};
			},
			routes() {
				return { auth: { orgRules: () => ({ rules: [] }) } };
			},
		};
		const builder = createWorker().use(authLike);
		const worker = builder.handler({ todos: { list: () => [] } });
		expect(typeof worker.fetch).toBe("function");
	});

	// Empty cors[] is a misconfiguration: the consumer (or some upstream
	// derivation) opted into CORS but resolved to no origins. Silently
	// skipping the middleware would leak browser-fail-with-no-diagnostic
	// behavior — fail loud at construction time.
	it("throws at construction when cors is an empty array", () => {
		const builder = createWorker({ cors: [] });
		expect(() => builder.handler({})).toThrow(/cors was provided but is empty/);
	});

	it("allows cors: undefined for non-browser workers", () => {
		const builder = createWorker({ cors: undefined });
		const worker = builder.handler({});
		expect(typeof worker.fetch).toBe("function");
	});

	// Empty router is supported at construction; RPC requests then 404 through
	// Hono's onError. The point of locking this in: `aggregateWorker` emits
	// `.handler()` with no args when no routes exist, and that path must not
	// crash at builder time.
	it("does not throw when handler() is called with no consumer routes", () => {
		const builder = createWorker();
		expect(() => builder.handler({})).not.toThrow();
	});
});

// ---------- WS1 1.1: CSRF content-type guard on /rpc ----------

describe("createWorker /rpc content-type guard", () => {
	it("rejects a POST with no Content-Type with 415 UNSUPPORTED_MEDIA_TYPE", async () => {
		const worker = createWorker({ cors: undefined }).handler({});
		const res = await worker.fetch(
			new Request("https://example.com/rpc/x", { method: "POST" }),
			{},
			{},
		);
		expect(res.status).toBe(415);
		expect(await res.json()).toEqual({ code: "UNSUPPORTED_MEDIA_TYPE" });
	});

	it("rejects a POST with an unrelated Content-Type (text/plain) with 415", async () => {
		const worker = createWorker({ cors: undefined }).handler({});
		const res = await worker.fetch(
			new Request("https://example.com/rpc/x", {
				method: "POST",
				headers: { "content-type": "text/plain" },
				body: "{}",
			}),
			{},
			{},
		);
		expect(res.status).toBe(415);
		expect(await res.json()).toEqual({ code: "UNSUPPORTED_MEDIA_TYPE" });
	});

	it("lets a POST with application/json reach the RPC handler (404 from the empty router)", async () => {
		const worker = createWorker({ cors: undefined }).handler({});
		const res = await worker.fetch(rpcRequest("/rpc/x"), {}, {});
		expect(res.status).toBe(404);
		expect((await res.json()) as { code?: string }).toMatchObject({
			code: "NOT_FOUND",
		});
	});

	// M4: RFC 9110 media types are case-insensitive, and a `charset` parameter
	// is a normal, spec-legal suffix on a JSON content-type — both must pass
	// the guard, not just the exact lowercase `application/json` literal.
	it("passes application/json; charset=utf-8 (charset parameter)", async () => {
		const worker = createWorker({ cors: undefined }).handler({});
		const res = await worker.fetch(
			new Request("https://example.com/rpc/x", {
				method: "POST",
				headers: { "content-type": "application/json; charset=utf-8" },
				body: JSON.stringify({ json: {} }),
			}),
			{},
			{},
		);
		expect(res.status).toBe(404); // past the guard, 404 from the empty router
	});

	it("passes Application/JSON (mixed case)", async () => {
		const worker = createWorker({ cors: undefined }).handler({});
		const res = await worker.fetch(
			new Request("https://example.com/rpc/x", {
				method: "POST",
				headers: { "content-type": "Application/JSON" },
				body: JSON.stringify({ json: {} }),
			}),
			{},
			{},
		);
		expect(res.status).toBe(404); // past the guard, 404 from the empty router
	});
});

// ---------- WS1 1.2: log unexpected procedure errors ----------

describe("createProcedure error logging", () => {
	it("logs a non-ORPCError throw and returns 500", async () => {
		const procedure = createProcedure<Record<string, unknown>>();
		const worker = createWorker({ cors: undefined }).handler({
			boom: procedure().handler(() => {
				throw new Error("boom");
			}),
		});
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});
		try {
			const res = await worker.fetch(rpcRequest("/rpc/boom"), {}, {});
			expect(res.status).toBe(500);
			expect(spy).toHaveBeenCalledTimes(1);
		} finally {
			spy.mockRestore();
		}
	});

	it("does not log an ORPCError throw", async () => {
		const procedure = createProcedure<Record<string, unknown>>();
		const worker = createWorker({ cors: undefined }).handler({
			missing: procedure().handler(() => {
				throw new ORPCError("NOT_FOUND");
			}),
		});
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});
		try {
			const res = await worker.fetch(rpcRequest("/rpc/missing"), {}, {});
			expect(res.status).toBe(404);
			expect(spy).not.toHaveBeenCalled();
		} finally {
			spy.mockRestore();
		}
	});
});

// ---------- WS3 3.1: entity-based cache-invalidation headers ----------

describe("createProcedure entity cache-invalidation headers (WS3.1)", () => {
	it("stamps x-stack-reads (and only that) when a query declares reads", async () => {
		const procedure = createProcedure<Record<string, unknown>>();
		const worker = createWorker({ cors: undefined }).handler({
			listTodos: procedure({ reads: ["todos"] }).handler(() => ({
				ok: true,
			})),
		});
		const res = await worker.fetch(rpcRequest("/rpc/listTodos"), {}, {});
		expect(res.status).toBe(200);
		expect(res.headers.get("x-stack-reads")).toBe("todos");
		expect(res.headers.get("x-stack-writes")).toBeNull();
	});

	it("stamps x-stack-writes as a comma-joined list when a mutation declares writes", async () => {
		const procedure = createProcedure<Record<string, unknown>>();
		const worker = createWorker({ cors: undefined }).handler({
			createTodo: procedure({ writes: ["todos", "users"] }).handler(() => ({
				ok: true,
			})),
		});
		const res = await worker.fetch(rpcRequest("/rpc/createTodo"), {}, {});
		expect(res.status).toBe(200);
		expect(res.headers.get("x-stack-writes")).toBe("todos,users");
		expect(res.headers.get("x-stack-reads")).toBeNull();
	});

	it("carries neither header when reads/writes are absent", async () => {
		const procedure = createProcedure<Record<string, unknown>>();
		const worker = createWorker({ cors: undefined }).handler({
			noop: procedure().handler(() => ({ ok: true })),
		});
		const res = await worker.fetch(rpcRequest("/rpc/noop"), {}, {});
		expect(res.status).toBe(200);
		expect(res.headers.get("x-stack-reads")).toBeNull();
		expect(res.headers.get("x-stack-writes")).toBeNull();
	});

	it("does not stamp x-stack-reads on the error response when a procedure declaring reads throws", async () => {
		const procedure = createProcedure<Record<string, unknown>>();
		const worker = createWorker({ cors: undefined }).handler({
			boom: procedure({ reads: ["todos"] }).handler(() => {
				throw new Error("boom");
			}),
		});
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});
		try {
			const res = await worker.fetch(rpcRequest("/rpc/boom"), {}, {});
			expect(res.status).toBe(500);
			expect(res.headers.get("x-stack-reads")).toBeNull();
			expect(res.headers.get("x-stack-writes")).toBeNull();
		} finally {
			spy.mockRestore();
		}
	});
});

// `reads`/`writes` entity names reach `Headers.set` comma-joined -- an
// illegal character must throw at `procedure()` construction time (module
// init, loud), not after a mutation's handler has already committed.
describe("createProcedure validates reads/writes entity names at construction (WS3.1 hardening)", () => {
	const procedure = createProcedure<Record<string, unknown>>();

	it("throws for an entity name containing a comma", () => {
		expect(() => procedure({ reads: ["todos,users"] })).toThrow(
			/invalid entity name "todos,users" in `reads`/,
		);
	});

	it("throws for an entity name containing a space", () => {
		expect(() => procedure({ writes: ["my todos"] })).toThrow(
			/invalid entity name "my todos" in `writes`/,
		);
	});

	it("throws for an empty-string entity name", () => {
		expect(() => procedure({ reads: [""] })).toThrow(/invalid entity name ""/);
	});

	it("accepts entity names made of letters, digits, underscore, dot, and hyphen", () => {
		expect(() =>
			procedure({ reads: ["todos_v2", "org.member-roles", "Table123"] }),
		).not.toThrow();
	});
});

// ---------- WS6.2: can (org-level ability gate) ----------

// A minimal `auth` context stand-in, injected via the top-level `.use((ctx)
// => extra)` fn form (same as the `_devMode`/`_rateLimiter` tests above) so
// `can`'s installed middleware chain (auth -> org -> rbac) runs against it
// without booting a real better-auth instance.
function authContext(hasPermission: (opts: unknown) => Promise<unknown>) {
	return (_ctx: Record<string, unknown>) => ({
		auth: {
			api: {
				getSession: async () => ({
					user: { id: "u1" },
					session: { id: "s1", activeOrganizationId: "org1" },
				}),
				hasPermission,
			},
		},
	});
}

describe("createProcedure can (WS6.2 org-level gate)", () => {
	it("calls hasPermission with { [resource]: [action] } and FORBIDDENs on failure", async () => {
		const hasPermission = vi.fn(async () => ({ success: false }));
		const procedure = createProcedure<Record<string, unknown>>();
		const worker = createWorker({ cors: undefined })
			.use(authContext(hasPermission))
			.handler({
				updateOrg: procedure({
					auth: true,
					org: true,
					can: ["update", "organization"],
				}).handler(() => ({ ok: true })),
			});

		const res = await worker.fetch(
			rpcRequest("/rpc/updateOrg", { json: { organizationId: "org1" } }),
			{},
			{},
		);

		expect(hasPermission).toHaveBeenCalledWith(
			expect.objectContaining({
				body: { permissions: { organization: ["update"] } },
			}),
		);
		expect(res.status).toBe(403);
		expect(await res.json()).toMatchObject({ json: { code: "FORBIDDEN" } });
	});

	it("lets the handler run when hasPermission grants the action", async () => {
		const hasPermission = vi.fn(async () => ({ success: true }));
		const procedure = createProcedure<Record<string, unknown>>();
		const worker = createWorker({ cors: undefined })
			.use(authContext(hasPermission))
			.handler({
				updateOrg: procedure({
					auth: true,
					org: true,
					can: ["update", "organization"],
				}).handler(() => ({ ok: true })),
			});

		const res = await worker.fetch(
			rpcRequest("/rpc/updateOrg", { json: { organizationId: "org1" } }),
			{},
			{},
		);

		expect(res.status).toBe(200);
		expect(await res.json()).toMatchObject({ json: { ok: true } });
	});
});

// ---------- WS1 1.3: expose waitUntil to procedures ----------

describe("createWorker executionCtx.waitUntil", () => {
	it("hands a real executionCtx to procedures; the response resolves before deferred work finishes, and the deferred work eventually runs", async () => {
		let deferredRan = false;
		const procedure = createProcedure<Record<string, unknown>>();
		const worker = createWorker({ cors: undefined }).handler({
			defer: procedure().handler(({ context }) => {
				const { executionCtx } = context as {
					executionCtx: { waitUntil(p: Promise<unknown>): void };
				};
				executionCtx.waitUntil(
					new Promise<void>((resolve) => {
						setTimeout(() => {
							deferredRan = true;
							resolve();
						}, 20);
					}),
				);
				return { ok: true };
			}),
		});

		const waitUntil = vi.fn();
		const res = await worker.fetch(
			rpcRequest("/rpc/defer"),
			{},
			{
				waitUntil,
			},
		);

		expect(res.status).toBe(200);
		expect(waitUntil).toHaveBeenCalledTimes(1);
		expect(deferredRan).toBe(false);

		const [deferredPromise] = waitUntil.mock.calls[0] as [Promise<unknown>];
		await deferredPromise;
		expect(deferredRan).toBe(true);
	});

	it("falls back to a no-op waitUntil (and does not crash) when fetch is called with no third arg or {}", async () => {
		const worker = createWorker({ cors: undefined }).handler({});
		const resNoCtx = await worker.fetch(rpcRequest("/rpc/x"), {}, undefined);
		expect(resNoCtx.status).toBe(404);
		const resEmptyCtx = await worker.fetch(rpcRequest("/rpc/x"), {}, {});
		expect(resEmptyCtx.status).toBe(404);
	});
});

// ---------- WS1 1.4: blanket per-IP volume limiter on /rpc ----------

// ---------- dependsOn: stable-topological plugin ordering ----------

describe("createWorker dependsOn ordering", () => {
	it("runs a dependency's context() before a dependent registered earlier in .use() order", async () => {
		const dbLike: RuntimePlugin<"db", object, { db: string }> = {
			name: "db",
			context() {
				return { db: "db-value" };
			},
		};
		let capturedDb: string | undefined;
		const authLike: RuntimePlugin<"auth", object, Record<string, never>> = {
			name: "auth",
			dependsOn: ["db"],
			context(_env, upstream) {
				capturedDb = (upstream as { db?: string }).db;
				return {};
			},
		};
		// Registered in the WRONG order: the dependent (auth) before its
		// dependency (db). Without sorting, authLike.context() would run
		// first and upstream.db would be undefined.
		const worker = createWorker({ cors: undefined })
			.use(authLike)
			.use(dbLike)
			.handler({});
		await worker.fetch(rpcRequest("/rpc/x"), {}, {});
		expect(capturedDb).toBe("db-value");
	});

	it("preserves .use() registration order for plugins with no dependsOn edge between them", async () => {
		const order: string[] = [];
		const pluginA: RuntimePlugin<"alpha", object, Record<string, never>> = {
			name: "alpha",
			context() {
				order.push("alpha");
				return {};
			},
		};
		const pluginB: RuntimePlugin<"beta", object, Record<string, never>> = {
			name: "beta",
			context() {
				order.push("beta");
				return {};
			},
		};
		const worker = createWorker({ cors: undefined })
			.use(pluginB)
			.use(pluginA)
			.handler({});
		await worker.fetch(rpcRequest("/rpc/x"), {}, {});
		expect(order).toEqual(["beta", "alpha"]);
	});

	it("ignores a dependsOn entry naming a plugin that isn't registered", async () => {
		const pluginA: RuntimePlugin<"alpha", object, { a: number }> = {
			name: "alpha",
			dependsOn: ["missing"],
			context() {
				return { a: 1 };
			},
		};
		const worker = createWorker({ cors: undefined }).use(pluginA).handler({});
		const res = await worker.fetch(rpcRequest("/rpc/x"), {}, {});
		expect(res.status).toBe(404);
	});

	it("throws a clear error at handler() construction when dependsOn forms a cycle", () => {
		const pluginA: RuntimePlugin<"a", object, Record<string, never>> = {
			name: "a",
			dependsOn: ["b"],
			context: () => ({}),
		};
		const pluginB: RuntimePlugin<"b", object, Record<string, never>> = {
			name: "b",
			dependsOn: ["a"],
			context: () => ({}),
		};
		const builder = createWorker({ cors: undefined }).use(pluginA).use(pluginB);
		expect(() => builder.handler({})).toThrow(/dependency cycle.*a.*b.*a/i);
	});
});

describe("createWorker blanket per-IP volume limiter", () => {
	it("returns 429 when the bound RATE_LIMITER_RPC env binding reports failure", async () => {
		const worker = createWorker({ cors: undefined }).handler({});
		const res = await worker.fetch(
			rpcRequest("/rpc/x"),
			{ RATE_LIMITER_RPC: { limit: async () => ({ success: false }) } },
			{},
		);
		expect(res.status).toBe(429);
		expect(await res.json()).toEqual({ code: "TOO_MANY_REQUESTS" });
	});

	it("passes through when no RATE_LIMITER_RPC binding is present in env", async () => {
		const worker = createWorker({ cors: undefined }).handler({});
		const res = await worker.fetch(rpcRequest("/rpc/x"), {}, {});
		// Reached the RPC handler (empty router 404) instead of being blocked.
		expect(res.status).toBe(404);
	});

	it("skips the limit check when _devMode is true, even with a failing RATE_LIMITER_RPC binding", async () => {
		const worker = createWorker({ cors: undefined })
			.use((_ctx: Record<string, unknown>) => ({ _devMode: true }))
			.handler({});
		const res = await worker.fetch(
			rpcRequest("/rpc/x"),
			{ RATE_LIMITER_RPC: { limit: async () => ({ success: false }) } },
			{},
		);
		expect(res.status).toBe(404);
	});

	// H1 regression guard: the blanket guard reads its own dedicated
	// RATE_LIMITER_RPC env binding — never the per-procedure
	// `ctx._rateLimiter` bindings (auth's RATE_LIMITER_IP/RATE_LIMITER_EMAIL,
	// or a procedure's own `rateLimit: "ip"` middleware). A failing
	// `_rateLimiter.ip` must not trip the blanket /rpc guard, or the two would
	// double-draw the same budget.
	it("does not draw from the per-procedure ctx._rateLimiter.ip binding", async () => {
		const worker = createWorker({ cors: undefined })
			.use((_ctx: Record<string, unknown>) => ({
				_rateLimiter: { ip: { limit: async () => ({ success: false }) } },
			}))
			.handler({});
		const res = await worker.fetch(rpcRequest("/rpc/x"), {}, {});
		expect(res.status).toBe(404);
	});
});
