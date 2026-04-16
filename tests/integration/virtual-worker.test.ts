import { describe, expect, it } from "vitest";
import { generateVirtualWorker } from "@fcalell/cli/codegen";

describe("generateVirtualWorker", () => {
	it("full-stack config produces correct imports and builder chain", () => {
		const result = generateVirtualWorker({
			plugins: [
				{
					name: "db",
					worker: {
						runtime: {
							importFrom: "@fcalell/plugin-db/runtime",
							factory: "dbRuntime",
						},
					},
				},
				{
					name: "auth",
					worker: {
						runtime: {
							importFrom: "@fcalell/plugin-auth/runtime",
							factory: "authRuntime",
						},
						callbacks: {
							required: false,
							defineHelper: "defineAuthCallbacks",
							importFrom: "@fcalell/plugin-auth",
						},
						routes: true,
					},
				},
				{
					name: "api",
					worker: {
						runtime: {
							importFrom: "@fcalell/plugin-api/runtime",
							factory: "createWorker",
						},
						routes: true,
						middleware: true,
					},
				},
				{
					name: "app",
					worker: undefined,
				},
			],
			hasMiddleware: true,
			hasRoutes: true,
			callbackFiles: ["auth"],
		});

		expect(result).toContain('import config from "../stack.config"');
		expect(result).toContain('import { getPlugin } from "@fcalell/config"');
		expect(result).toContain(
			'import { createWorker } from "@fcalell/plugin-db/runtime"',
		);
		expect(result).toContain(
			'import { dbRuntime } from "@fcalell/plugin-db/runtime"',
		);
		expect(result).toContain(
			'import { authRuntime } from "@fcalell/plugin-auth/runtime"',
		);
		expect(result).toContain(
			'import { createWorker } from "@fcalell/plugin-api/runtime"',
		);
		expect(result).toContain('import authCallbacks from "../src/worker/plugins/auth"');
		expect(result).toContain(
			'import * as routes from "../src/worker/routes"',
		);
		expect(result).toContain(
			'import middleware from "../src/worker/middleware"',
		);
		expect(result).toContain(".use(dbRuntime(");
		expect(result).toContain(".use(authRuntime(");
		expect(result).toContain("authCallbacks)");
		expect(result).toContain(".use(middleware)");
		expect(result).toContain(".handler(routes)");
		expect(result).toContain("export type AppRouter");
		expect(result).toContain("export default worker");
	});

	it("API-only config (no auth) produces simpler worker", () => {
		const result = generateVirtualWorker({
			plugins: [
				{
					name: "db",
					worker: {
						runtime: {
							importFrom: "@fcalell/plugin-db/runtime",
							factory: "dbRuntime",
						},
					},
				},
				{
					name: "api",
					worker: {
						runtime: {
							importFrom: "@fcalell/plugin-api/runtime",
							factory: "createWorker",
						},
						routes: true,
					},
				},
			],
			hasMiddleware: false,
			hasRoutes: true,
			callbackFiles: [],
		});

		expect(result).toContain("dbRuntime");
		expect(result).not.toContain("authRuntime");
		expect(result).not.toContain("middleware");
		expect(result).toContain(".handler(routes)");
	});

	it("middleware import is included only when hasMiddleware is true", () => {
		const basePlugins = [
			{
				name: "api",
				worker: {
					runtime: {
						importFrom: "@fcalell/plugin-api/runtime",
						factory: "createWorker",
					},
				},
			},
		];

		const withMiddleware = generateVirtualWorker({
			plugins: basePlugins,
			hasMiddleware: true,
			hasRoutes: false,
			callbackFiles: [],
		});

		const withoutMiddleware = generateVirtualWorker({
			plugins: basePlugins,
			hasMiddleware: false,
			hasRoutes: false,
			callbackFiles: [],
		});

		expect(withMiddleware).toContain("middleware");
		expect(withoutMiddleware).not.toContain("middleware");
	});

	it("callback imports are included only when callback files exist", () => {
		const plugins = [
			{
				name: "auth",
				worker: {
					runtime: {
						importFrom: "@fcalell/plugin-auth/runtime",
						factory: "authRuntime",
					},
					callbacks: {
						required: false,
						defineHelper: "defineAuthCallbacks",
						importFrom: "@fcalell/plugin-auth",
					},
				},
			},
		];

		const withCallbacks = generateVirtualWorker({
			plugins,
			hasMiddleware: false,
			hasRoutes: false,
			callbackFiles: ["auth"],
		});

		const withoutCallbacks = generateVirtualWorker({
			plugins,
			hasMiddleware: false,
			hasRoutes: false,
			callbackFiles: [],
		});

		expect(withCallbacks).toContain("authCallbacks");
		expect(withoutCallbacks).not.toContain("authCallbacks");
	});

	it("routes import is included when hasRoutes is true", () => {
		const plugins = [
			{
				name: "api",
				worker: {
					runtime: {
						importFrom: "@fcalell/plugin-api/runtime",
						factory: "createWorker",
					},
				},
			},
		];

		const withRoutes = generateVirtualWorker({
			plugins,
			hasMiddleware: false,
			hasRoutes: true,
			callbackFiles: [],
		});

		const withoutRoutes = generateVirtualWorker({
			plugins,
			hasMiddleware: false,
			hasRoutes: false,
			callbackFiles: [],
		});

		expect(withRoutes).toContain(
			'import * as routes from "../src/worker/routes"',
		);
		expect(withRoutes).toContain(".handler(routes)");
		expect(withoutRoutes).not.toContain("routes");
		expect(withoutRoutes).toContain(".handler()");
	});

	it("generated code has correct structure (imports, builder chain, export)", () => {
		const result = generateVirtualWorker({
			plugins: [
				{
					name: "db",
					worker: {
						runtime: {
							importFrom: "@fcalell/plugin-db/runtime",
							factory: "dbRuntime",
						},
					},
				},
			],
			hasMiddleware: false,
			hasRoutes: false,
			callbackFiles: [],
		});

		const lines = result.split("\n");

		expect(lines[0]).toContain("Generated by @fcalell/cli");

		const importLines = lines.filter((l) => l.startsWith("import"));
		expect(importLines.length).toBeGreaterThanOrEqual(2);

		expect(result).toContain("const worker = createWorker(config)");
		expect(result).toContain("export default worker");
	});
});
