import { log } from "@clack/prompts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MiddlewareSpec, ProviderSpec, TsExpression } from "#ast";
import {
	aggregateDevVars,
	aggregateEnvDts,
	aggregateMiddleware,
	aggregateProviders,
	aggregateViteConfig,
	aggregateWorker,
	aggregateWrangler,
} from "#lib/codegen";

vi.mock("@clack/prompts", () => ({
	log: {
		info: vi.fn(),
		warn: vi.fn(),
		success: vi.fn(),
		error: vi.fn(),
	},
}));

// ── aggregateWorker ────────────────────────────────────────────────

describe("aggregateWorker", () => {
	it("assembles imports, base factory, middleware chain, and handler", () => {
		const base: TsExpression = {
			kind: "call",
			callee: { kind: "identifier", name: "createWorker" },
			args: [
				{
					kind: "object",
					properties: [
						{
							key: "domain",
							value: { kind: "string", value: "example.com" },
						},
					],
				},
			],
		};
		const mw: TsExpression = {
			kind: "call",
			callee: { kind: "identifier", name: "dbRuntime" },
			args: [
				{
					kind: "object",
					properties: [
						{ key: "binding", value: { kind: "string", value: "DB_MAIN" } },
					],
				},
			],
		};

		const result = aggregateWorker({
			imports: [
				{
					source: "@fcalell/plugin-api/runtime",
					default: "createWorker",
				},
				{ source: "@fcalell/plugin-db/runtime", default: "dbRuntime" },
				{ source: "../src/worker/routes", namespace: "routes" },
			],
			base,
			middlewareChain: [mw],
			handler: { identifier: "routes" },
			domain: "example.com",
			cors: [],
		});

		expect(result).toContain(
			'import createWorker from "@fcalell/plugin-api/runtime"',
		);
		expect(result).toContain(
			'import dbRuntime from "@fcalell/plugin-db/runtime"',
		);
		expect(result).toContain('import * as routes from "../src/worker/routes"');
		expect(result).toContain("const worker = createWorker(");
		expect(result).toContain('domain: "example.com"');
		expect(result).toContain(".use(dbRuntime(");
		expect(result).toContain('binding: "DB_MAIN"');
		expect(result).toContain(".handler(routes)");
		expect(result).toContain("export type AppRouter = typeof worker._router");
		expect(result).toContain("export default worker");
	});

	it("emits no worker body when no plugin claims base", () => {
		const result = aggregateWorker({
			imports: [{ source: "@fcalell/plugin-db/runtime", default: "dbRuntime" }],
			base: null,
			middlewareChain: [],
			handler: null,
			domain: "",
			cors: [],
		});

		expect(result).not.toContain("createWorker");
		expect(result).not.toContain("const worker");
	});

	it("renders .handler() when no handler identifier is set", () => {
		const result = aggregateWorker({
			imports: [],
			base: {
				kind: "call",
				callee: { kind: "identifier", name: "createWorker" },
				args: [],
			},
			middlewareChain: [],
			handler: null,
			domain: "",
			cors: [],
		});

		expect(result).toContain(".handler()");
	});

	it("renders identifier-only middleware as bare identifier", () => {
		const result = aggregateWorker({
			imports: [],
			base: {
				kind: "call",
				callee: { kind: "identifier", name: "createWorker" },
				args: [],
			},
			middlewareChain: [{ kind: "identifier", name: "middleware" }],
			handler: null,
			domain: "",
			cors: [],
		});

		expect(result).toContain(".use(middleware)");
	});

	it("renders identifier shorthand fields alongside string options", () => {
		const result = aggregateWorker({
			imports: [],
			base: {
				kind: "call",
				callee: { kind: "identifier", name: "createWorker" },
				args: [],
			},
			middlewareChain: [
				{
					kind: "call",
					callee: { kind: "identifier", name: "dbRuntime" },
					args: [
						{
							kind: "object",
							properties: [
								{
									key: "binding",
									value: { kind: "string", value: "DB_MAIN" },
								},
								{
									key: "schema",
									value: { kind: "identifier", name: "schema" },
									shorthand: true,
								},
							],
						},
					],
				},
			],
			handler: null,
			domain: "",
			cors: [],
		});

		expect(result).toContain('binding: "DB_MAIN"');
		expect(result).toContain("schema");
		expect(result).not.toContain('"schema":');
	});
});

// ── aggregateWrangler ──────────────────────────────────────────────

describe("aggregateWrangler", () => {
	beforeEach(() => {
		vi.mocked(log.warn).mockClear();
	});

	const emptyPayload = {
		bindings: [],
		routes: [],
		vars: {},
		secrets: [],
		compatibilityDate: "2025-01-01",
	};

	it("sets main to worker.ts in a freshly generated config", () => {
		const result = aggregateWrangler({
			consumerWrangler: null,
			payload: emptyPayload,
		});
		expect(result).toContain('main = "worker.ts"');
	});

	it("inserts main line when consumer wrangler.toml has none", () => {
		const consumer = 'name = "my-app"\ncompatibility_date = "2024-01-01"';
		const result = aggregateWrangler({
			consumerWrangler: consumer,
			payload: emptyPayload,
		});

		expect(result).toContain('main = "worker.ts"');
		expect(result).toContain('name = "my-app"');
		expect(log.warn).not.toHaveBeenCalled();
	});

	it("leaves main untouched and does not warn when it targets .stack/worker.ts", () => {
		const consumer = 'name = "my-app"\nmain = ".stack/worker.ts"';
		const result = aggregateWrangler({
			consumerWrangler: consumer,
			payload: emptyPayload,
		});

		expect(result).toContain('main = ".stack/worker.ts"');
		expect(log.warn).not.toHaveBeenCalled();
	});

	it("warns when the consumer overrides main with a non-generated path", () => {
		const consumer =
			'name = "my-app"\nmain = "src/other.ts"\ncompatibility_date = "2024-01-01"';
		const result = aggregateWrangler({
			consumerWrangler: consumer,
			payload: emptyPayload,
		});

		expect(result).toContain('main = "src/other.ts"');
		expect(log.warn).toHaveBeenCalledTimes(1);
	});

	it("emits [[d1_databases]] with binding + database_id", () => {
		const result = aggregateWrangler({
			consumerWrangler: null,
			payload: {
				...emptyPayload,
				bindings: [
					{
						kind: "d1",
						binding: "DB_MAIN",
						databaseId: "abc-123",
						databaseName: "my-db",
					},
				],
			},
		});

		expect(result).toContain("[[d1_databases]]");
		expect(result).toContain('binding = "DB_MAIN"');
		expect(result).toContain('database_id = "abc-123"');
		expect(result).toContain('database_name = "my-db"');
	});

	it("emits [[unsafe.bindings]] for rate_limiter", () => {
		const result = aggregateWrangler({
			consumerWrangler: null,
			payload: {
				...emptyPayload,
				bindings: [
					{
						kind: "rate_limiter",
						binding: "RATE_LIMITER_IP",
						simple: { limit: 100, period: 60 },
					},
				],
			},
		});

		expect(result).toContain("[[unsafe.bindings]]");
		expect(result).toContain('name = "RATE_LIMITER_IP"');
		expect(result).toContain('type = "ratelimit"');
		expect(result).toContain("limit = 100");
		expect(result).toContain("period = 60");
	});

	it("emits [vars] for secrets (empty values) and var-bindings", () => {
		const result = aggregateWrangler({
			consumerWrangler: null,
			payload: {
				...emptyPayload,
				bindings: [{ kind: "var", name: "MY_VAR", value: "hello" }],
				secrets: [{ name: "AUTH_SECRET", devDefault: "dev" }],
			},
		});

		expect(result).toContain("[vars]");
		expect(result).toContain('MY_VAR = "hello"');
		expect(result).toContain('AUTH_SECRET = ""');
	});

	it("emits [[kv_namespaces]] and [[r2_buckets]]", () => {
		const result = aggregateWrangler({
			consumerWrangler: null,
			payload: {
				...emptyPayload,
				bindings: [
					{ kind: "kv", binding: "MY_KV", id: "kv-id" },
					{ kind: "r2", binding: "MY_BUCKET", bucketName: "assets" },
				],
			},
		});

		expect(result).toContain("[[kv_namespaces]]");
		expect(result).toContain('id = "kv-id"');
		expect(result).toContain("[[r2_buckets]]");
		expect(result).toContain('bucket_name = "assets"');
	});

	it("generates default name when no consumer file exists", () => {
		const result = aggregateWrangler({
			consumerWrangler: null,
			payload: emptyPayload,
			name: "test-app",
		});

		expect(result).toContain('name = "test-app"');
		expect(result).toContain("compatibility_date");
	});
});

// ── aggregateEnvDts ────────────────────────────────────────────────

describe("aggregateEnvDts", () => {
	it("renders an empty interface for no fields", () => {
		const result = aggregateEnvDts({ fields: [] });
		expect(result).toMatch(/interface Env \{\s*\}/);
	});

	it("imports D1Database and emits the field", () => {
		const result = aggregateEnvDts({
			fields: [
				{
					name: "DB_MAIN",
					type: { kind: "reference", name: "D1Database" },
					from: {
						source: "@cloudflare/workers-types",
						named: ["D1Database"],
						typeOnly: true,
					},
				},
			],
		});

		expect(result).toContain(
			'import type { D1Database } from "@cloudflare/workers-types"',
		);
		expect(result).toContain("DB_MAIN: D1Database;");
		expect(result).toContain("interface Env {");
	});

	it("dedupes imports by source and merges named lists", () => {
		const importRef = {
			source: "@cloudflare/workers-types",
			named: ["RateLimiter"],
			typeOnly: true as const,
		};
		const result = aggregateEnvDts({
			fields: [
				{
					name: "A",
					type: { kind: "reference", name: "RateLimiter" },
					from: importRef,
				},
				{
					name: "B",
					type: { kind: "reference", name: "RateLimiter" },
					from: importRef,
				},
			],
		});

		const importLines = result
			.split("\n")
			.filter((l) => l.startsWith("import"));
		expect(importLines).toHaveLength(1);
		expect(result).toContain("A: RateLimiter;");
		expect(result).toContain("B: RateLimiter;");
	});

	it("renders plain string-typed fields without an import", () => {
		const result = aggregateEnvDts({
			fields: [
				{
					name: "AUTH_SECRET",
					type: { kind: "reference", name: "string" },
				},
			],
		});

		expect(result).toContain("AUTH_SECRET: string;");
		expect(result).not.toContain("import");
	});
});

// ── aggregateViteConfig ────────────────────────────────────────────

describe("aggregateViteConfig", () => {
	it("emits defineConfig import + plugins array + server port", () => {
		const result = aggregateViteConfig({
			imports: [{ source: "@tailwindcss/vite", default: "tailwindcss" }],
			pluginCalls: [
				{
					kind: "call",
					callee: { kind: "identifier", name: "tailwindcss" },
					args: [],
				},
			],
			resolveAliases: [],
			devServerPort: 3000,
		});

		expect(result).toContain('import { defineConfig } from "vite"');
		expect(result).toContain('import tailwindcss from "@tailwindcss/vite"');
		expect(result).toContain("export default defineConfig(");
		expect(result).toContain("plugins: [tailwindcss()");
		expect(result).toContain("port: 3000");
	});

	it("includes resolve.alias when aliases are provided", () => {
		const result = aggregateViteConfig({
			imports: [],
			pluginCalls: [],
			resolveAliases: [{ find: "@", replacement: "./src" }],
			devServerPort: 0,
		});

		expect(result).toContain("resolve: {");
		expect(result).toContain('"@": "./src"');
	});
});

// ── aggregateDevVars ───────────────────────────────────────────────

describe("aggregateDevVars", () => {
	it("returns null for no secrets", () => {
		expect(aggregateDevVars([])).toBeNull();
	});

	it("renders KEY=VALUE lines terminated with a newline", () => {
		const result = aggregateDevVars([
			{ name: "AUTH_SECRET", devDefault: "dev-secret-change-me" },
			{ name: "APP_URL", devDefault: "http://localhost:3000" },
		]);
		expect(result).toBe(
			"AUTH_SECRET=dev-secret-change-me\nAPP_URL=http://localhost:3000\n",
		);
	});
});

// ── aggregateProviders ─────────────────────────────────────────────

describe("aggregateProviders", () => {
	it("returns null when no providers are contributed", () => {
		expect(aggregateProviders({ providers: [] })).toBeNull();
	});

	it("renders a single wrapper with props.children inside", () => {
		const spec: ProviderSpec = {
			imports: [{ source: "@ui/theme", named: ["ThemeProvider"] }],
			wrap: { identifier: "ThemeProvider" },
			order: 100,
		};
		const out = aggregateProviders({ providers: [spec] });
		expect(out).not.toBeNull();
		if (!out) return;
		expect(out).toContain('import { ThemeProvider } from "@ui/theme"');
		expect(out).toContain("<ThemeProvider>");
		expect(out).toContain("{props.children}");
		expect(out).toContain("</ThemeProvider>");
	});

	it("nests wrappers outer-first by ascending order", () => {
		const outer: ProviderSpec = {
			imports: [{ source: "@ui/outer", named: ["OuterProvider"] }],
			wrap: { identifier: "OuterProvider" },
			order: 10,
		};
		const inner: ProviderSpec = {
			imports: [{ source: "@ui/inner", named: ["InnerProvider"] }],
			wrap: { identifier: "InnerProvider" },
			order: 20,
		};
		// Intentionally reversed input — aggregator should sort.
		const out = aggregateProviders({ providers: [inner, outer] });
		expect(out).not.toBeNull();
		if (!out) return;
		const outerIdx = out.indexOf("<OuterProvider>");
		const innerIdx = out.indexOf("<InnerProvider>");
		expect(outerIdx).toBeGreaterThan(-1);
		expect(innerIdx).toBeGreaterThan(outerIdx);
		// Outer wraps inner wraps {props.children}.
		expect(out).toMatch(
			/<OuterProvider>[\s\S]*<InnerProvider>[\s\S]*\{props\.children\}[\s\S]*<\/InnerProvider>[\s\S]*<\/OuterProvider>/,
		);
	});

	it("renders siblings alongside wrapped children inside the wrapper", () => {
		const spec: ProviderSpec = {
			imports: [
				{ source: "@ui/meta", named: ["MetaProvider"] },
				{ source: "@ui/toast", named: ["Toaster"] },
			],
			wrap: { identifier: "MetaProvider" },
			siblings: [{ kind: "jsx", tag: "Toaster", props: [], children: [] }],
			order: 100,
		};
		const out = aggregateProviders({ providers: [spec] });
		expect(out).not.toBeNull();
		if (!out) return;
		// Toaster lives inside MetaProvider so it sees the provider's context.
		expect(out).toMatch(
			/<MetaProvider>[\s\S]*\{props\.children\}[\s\S]*<Toaster \/>[\s\S]*<\/MetaProvider>/,
		);
	});

	it("imports JSX type from solid-js", () => {
		const spec: ProviderSpec = {
			imports: [{ source: "@ui/x", named: ["X"] }],
			wrap: { identifier: "X" },
			order: 1,
		};
		const out = aggregateProviders({ providers: [spec] });
		expect(out).not.toBeNull();
		if (!out) return;
		expect(out).toContain('import type { JSX } from "solid-js"');
		expect(out).toContain("props: { children: JSX.Element }");
	});

	it("produces a default export named Providers as an arrow function", () => {
		const spec: ProviderSpec = {
			imports: [{ source: "@ui/x", named: ["X"] }],
			wrap: { identifier: "X" },
			order: 1,
		};
		const out = aggregateProviders({ providers: [spec] });
		expect(out).not.toBeNull();
		if (!out) return;
		expect(out).toContain("export default (props:");
	});
});

// ── aggregateMiddleware ────────────────────────────────────────────

describe("aggregateMiddleware", () => {
	it("returns null when no entries are contributed", () => {
		expect(aggregateMiddleware({ entries: [] })).toBeNull();
	});

	it("orders entries by phase (before-cors < after-cors < before-routes < after-routes)", () => {
		const entries: MiddlewareSpec[] = [
			{
				imports: [],
				call: { kind: "identifier", name: "d" },
				phase: "after-routes",
				order: 0,
			},
			{
				imports: [],
				call: { kind: "identifier", name: "b" },
				phase: "after-cors",
				order: 0,
			},
			{
				imports: [],
				call: { kind: "identifier", name: "a" },
				phase: "before-cors",
				order: 0,
			},
			{
				imports: [],
				call: { kind: "identifier", name: "c" },
				phase: "before-routes",
				order: 0,
			},
		];
		const result = aggregateMiddleware({ entries });
		expect(result).not.toBeNull();
		if (!result) return;
		const names = result.calls.map((c) =>
			c.kind === "identifier" ? c.name : "",
		);
		expect(names).toEqual(["a", "b", "c", "d"]);
	});

	it("orders entries within the same phase by ascending `order`", () => {
		const entries: MiddlewareSpec[] = [
			{
				imports: [],
				call: { kind: "identifier", name: "third" },
				phase: "before-routes",
				order: 300,
			},
			{
				imports: [],
				call: { kind: "identifier", name: "first" },
				phase: "before-routes",
				order: 100,
			},
			{
				imports: [],
				call: { kind: "identifier", name: "second" },
				phase: "before-routes",
				order: 200,
			},
		];
		const result = aggregateMiddleware({ entries });
		expect(result).not.toBeNull();
		if (!result) return;
		const names = result.calls.map((c) =>
			c.kind === "identifier" ? c.name : "",
		);
		expect(names).toEqual(["first", "second", "third"]);
	});

	it("aggregates and dedupes imports across entries", () => {
		const entries: MiddlewareSpec[] = [
			{
				imports: [{ source: "@pkg/a", default: "a" }],
				call: { kind: "identifier", name: "a" },
				phase: "before-routes",
				order: 1,
			},
			{
				imports: [{ source: "@pkg/a", default: "a" }],
				call: { kind: "identifier", name: "a2" },
				phase: "before-routes",
				order: 2,
			},
			{
				imports: [{ source: "@pkg/b", default: "b" }],
				call: { kind: "identifier", name: "b" },
				phase: "before-routes",
				order: 3,
			},
		];
		const result = aggregateMiddleware({ entries });
		expect(result).not.toBeNull();
		if (!result) return;
		expect(result.imports).toHaveLength(2);
		expect(result.imports.map((i) => i.source).sort()).toEqual([
			"@pkg/a",
			"@pkg/b",
		]);
	});
});
