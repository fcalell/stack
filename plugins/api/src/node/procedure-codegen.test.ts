import type { TsExpression } from "@fcalell/cli/ast";
import { describe, expect, it } from "vitest";
import { aggregateProcedure } from "./procedure-codegen";
import { ROUTES_BARREL_IMPORT_SOURCE } from "./types";

const base: TsExpression = {
	kind: "call",
	callee: { kind: "identifier", name: "createWorker" },
	args: [
		{
			kind: "object",
			properties: [{ key: "prefix", value: { kind: "string", value: "/rpc" } }],
		},
	],
};

describe("aggregateProcedure", () => {
	// The runtimes-empty gate lives solely in `api.slots.procedureSource`'s
	// compute (index.ts) — the natural single place to decide whether the
	// artifact exists at all. `aggregateProcedure` itself is ungated: it
	// happily renders a chain with zero `.use()` calls when handed no
	// runtimes/middleware, which is exactly what the empty-input case below
	// exercises.
	it("renders a bare chain (no .use() calls) when there are no runtimes or middleware", () => {
		const result = aggregateProcedure({
			base,
			runtimes: [],
			imports: [],
			middlewareChain: [],
			middlewareImports: [],
			statements: null,
			entities: [],
		});
		expect(result).not.toBeNull();
		expect(result).toContain("const __chain = createWorker(");
		expect(result).not.toContain(".use(");
	});

	it("rebuilds the same .use() chain as the worker, minus callbacks/handler", () => {
		const result = aggregateProcedure({
			base,
			runtimes: [
				{
					plugin: "db",
					import: {
						source: "@fcalell/plugin-db/runtime",
						default: "dbRuntime",
					},
					identifier: "dbRuntime",
					options: {
						binding: { kind: "string", value: "DB_MAIN" },
						schema: { kind: "identifier", name: "schema" },
					},
				},
			],
			imports: [
				{ source: "@fcalell/plugin-api/runtime", default: "createWorker" },
				{ source: "../src/schema", namespace: "schema" },
			],
			middlewareChain: [],
			middlewareImports: [],
			statements: null,
			entities: [],
		});

		expect(result).not.toBeNull();
		expect(result).toContain(
			'import createWorker from "@fcalell/plugin-api/runtime"',
		);
		expect(result).toContain('import * as schema from "../src/schema"');
		expect(result).toContain(
			'import dbRuntime from "@fcalell/plugin-db/runtime"',
		);
		expect(result).toContain(
			'import type { AppBuilder } from "@fcalell/plugin-api/runtime"',
		);
		expect(result).toContain(
			'import { createProcedure } from "@fcalell/plugin-api/procedure"',
		);
		expect(result).toContain("const __chain = createWorker(");
		expect(result).toContain(".use(dbRuntime(");
		expect(result).toContain('binding: "DB_MAIN"');
		// No handler/callbacks/AppRouter — this is the throwaway type-only chain.
		expect(result).not.toContain(".handler(");
		expect(result).not.toContain("AppRouter");
		expect(result).toContain(
			"type ContextOf<B> = B extends AppBuilder<infer C> ? C : never;",
		);
		expect(result).toContain("type WorkerContext = ContextOf<typeof __chain>;");
		expect(result).toContain("type Entity = string;");
		expect(result).toContain(
			"export const procedure = createProcedure<WorkerContext, RbacStatements, Entity>();",
		);
	});

	it("excludes the route barrel import to avoid a procedure.ts <-> routes cycle", () => {
		const result = aggregateProcedure({
			base,
			runtimes: [
				{
					plugin: "db",
					import: {
						source: "@fcalell/plugin-db/runtime",
						default: "dbRuntime",
					},
					identifier: "dbRuntime",
					options: {},
				},
			],
			imports: [
				{ source: "@fcalell/plugin-api/runtime", default: "createWorker" },
				{ source: ROUTES_BARREL_IMPORT_SOURCE, namespace: "routes" },
			],
			middlewareChain: [],
			middlewareImports: [],
			statements: null,
			entities: [],
		});

		expect(result).not.toBeNull();
		expect(result).not.toContain(ROUTES_BARREL_IMPORT_SOURCE);
	});

	// M3 fix: the real worker's chain also mounts consumer middleware
	// (`.use(...)`) after the runtime chain — see `aggregateWorker`. A
	// context-injecting middleware (arity-1 `(ctx) => extra`) extends
	// `AppBuilder`'s `TContext` the same way a runtime plugin does, so
	// `.stack/procedure.ts` must mirror it or `WorkerContext` would miss keys
	// a route handler relies on.
	it("mirrors the middleware chain after the runtime chain, with its imports", () => {
		const result = aggregateProcedure({
			base,
			runtimes: [
				{
					plugin: "db",
					import: {
						source: "@fcalell/plugin-db/runtime",
						default: "dbRuntime",
					},
					identifier: "dbRuntime",
					options: {},
				},
			],
			imports: [],
			middlewareChain: [{ kind: "identifier", name: "middleware" }],
			middlewareImports: [
				{ source: "../src/worker/middleware", default: "middleware" },
			],
			statements: null,
			entities: [],
		});

		expect(result).not.toBeNull();
		expect(result).toContain(
			'import middleware from "../src/worker/middleware"',
		);
		// Runtime chain first, middleware chain after — same order as the real
		// worker's `.use(pluginRuntimes...).use(middlewareChain...)`.
		const dbIdx = result?.indexOf(".use(dbRuntime(") ?? -1;
		const mwIdx = result?.indexOf(".use(middleware)") ?? -1;
		expect(dbIdx).toBeGreaterThanOrEqual(0);
		expect(mwIdx).toBeGreaterThan(dbIdx);
	});

	// A middleware file importing the route barrel back would be a cycle
	// (routes -> procedure.ts -> middleware -> routes) — excluded the same way
	// `workerImports`' barrel entry is, for the same structural reason.
	it("excludes a route-barrel middleware import from .stack/procedure.ts", () => {
		const result = aggregateProcedure({
			base,
			runtimes: [
				{
					plugin: "db",
					import: {
						source: "@fcalell/plugin-db/runtime",
						default: "dbRuntime",
					},
					identifier: "dbRuntime",
					options: {},
				},
			],
			imports: [],
			middlewareChain: [{ kind: "identifier", name: "middleware" }],
			middlewareImports: [
				{ source: ROUTES_BARREL_IMPORT_SOURCE, namespace: "routes" },
			],
			statements: null,
			entities: [],
		});

		expect(result).not.toBeNull();
		expect(result).not.toContain(ROUTES_BARREL_IMPORT_SOURCE);
	});

	it("falls back to Record<never, never> when no statements are contributed", () => {
		const result = aggregateProcedure({
			base,
			runtimes: [
				{
					plugin: "db",
					import: {
						source: "@fcalell/plugin-db/runtime",
						default: "dbRuntime",
					},
					identifier: "dbRuntime",
					options: {},
				},
			],
			imports: [],
			middlewareChain: [],
			middlewareImports: [],
			statements: null,
			entities: [],
		});

		expect(result).toContain("type RbacStatements = Record<never, never>;");
	});

	it("renders contributed RBAC statements as an inline literal type", () => {
		const result = aggregateProcedure({
			base,
			runtimes: [
				{
					plugin: "db",
					import: {
						source: "@fcalell/plugin-db/runtime",
						default: "dbRuntime",
					},
					identifier: "dbRuntime",
					options: {},
				},
			],
			imports: [],
			middlewareChain: [],
			middlewareImports: [],
			statements: {
				project: ["create", "delete"],
				member: ["invite"],
			},
			entities: [],
		});

		expect(result).toContain('project: readonly ["create", "delete"];');
		expect(result).toContain('member: readonly ["invite"];');
	});

	it("renders the contributed entity vocabulary as a deduped string-literal union, preserving contributed order", () => {
		const result = aggregateProcedure({
			base,
			runtimes: [
				{
					plugin: "db",
					import: {
						source: "@fcalell/plugin-db/runtime",
						default: "dbRuntime",
					},
					identifier: "dbRuntime",
					options: {},
				},
			],
			imports: [],
			middlewareChain: [],
			middlewareImports: [],
			statements: null,
			entities: ["todos", "users", "todos"],
		});

		expect(result).toContain('type Entity = "todos" | "users";');
		expect(result).toContain(
			"export const procedure = createProcedure<WorkerContext, RbacStatements, Entity>();",
		);
	});

	it("falls back to `type Entity = string` when entities is an empty array", () => {
		const result = aggregateProcedure({
			base,
			runtimes: [
				{
					plugin: "db",
					import: {
						source: "@fcalell/plugin-db/runtime",
						default: "dbRuntime",
					},
					identifier: "dbRuntime",
					options: {},
				},
			],
			imports: [],
			middlewareChain: [],
			middlewareImports: [],
			statements: null,
			entities: [],
		});

		expect(result).toContain("type Entity = string;");
	});
});
