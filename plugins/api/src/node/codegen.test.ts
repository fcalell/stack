import type { MiddlewareSpec, TsExpression } from "@fcalell/cli/ast";
import { describe, expect, it } from "vitest";
import { aggregateMiddleware, aggregateWorker } from "./codegen";

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
			pluginRuntimes: [],
			middlewareChain: [mw],
			handler: { identifier: "routes" },
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
			pluginRuntimes: [],
			middlewareChain: [],
			handler: null,
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
			pluginRuntimes: [],
			middlewareChain: [],
			handler: null,
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
			pluginRuntimes: [],
			middlewareChain: [{ kind: "identifier", name: "middleware" }],
			handler: null,
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
			pluginRuntimes: [],
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
			cors: [],
		});

		expect(result).toContain('binding: "DB_MAIN"');
		expect(result).toContain("schema");
		expect(result).not.toContain('"schema":');
	});

	it("emits pluginRuntimes as .use(runtime(options)) calls before middleware", () => {
		const result = aggregateWorker({
			imports: [{ source: "@pkg/api/runtime", default: "createWorker" }],
			base: {
				kind: "call",
				callee: { kind: "identifier", name: "createWorker" },
				args: [],
			},
			pluginRuntimes: [
				{
					plugin: "db",
					import: { source: "@pkg/db/runtime", default: "dbRuntime" },
					identifier: "dbRuntime",
					options: {
						binding: { kind: "string", value: "DB_MAIN" },
					},
				},
			],
			middlewareChain: [{ kind: "identifier", name: "middleware" }],
			handler: null,
			cors: [],
		});

		expect(result).toContain('import dbRuntime from "@pkg/db/runtime"');
		expect(result).toContain('.use(dbRuntime({ binding: "DB_MAIN" }))');
		// Runtimes emit BEFORE composition middleware so middleware sees context.
		const rtIdx = result.indexOf(".use(dbRuntime");
		const mwIdx = result.indexOf(".use(middleware)");
		expect(rtIdx).toBeGreaterThan(-1);
		expect(mwIdx).toBeGreaterThan(rtIdx);
	});

	it("splices callbacks into the runtime's options object when set", () => {
		const result = aggregateWorker({
			imports: [],
			base: {
				kind: "call",
				callee: { kind: "identifier", name: "createWorker" },
				args: [],
			},
			pluginRuntimes: [
				{
					plugin: "auth",
					import: { source: "@pkg/auth/runtime", default: "authRuntime" },
					identifier: "authRuntime",
					options: {
						secretVar: { kind: "string", value: "AUTH_SECRET" },
					},
					callbacks: {
						import: {
							source: "../src/worker/plugins/auth",
							default: "authCallbacks",
						},
						identifier: "authCallbacks",
					},
				},
			],
			middlewareChain: [],
			handler: null,
			cors: [],
		});

		expect(result).toContain(
			'import authCallbacks from "../src/worker/plugins/auth"',
		);
		expect(result).toContain('secretVar: "AUTH_SECRET"');
		expect(result).toContain("callbacks: authCallbacks");
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
