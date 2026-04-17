import { generateVirtualWorkerV2 } from "@fcalell/cli/codegen";
import { describe, expect, it } from "vitest";

describe("generateVirtualWorkerV2", () => {
	it("full-stack config produces correct imports and builder chain", () => {
		const result = generateVirtualWorkerV2({
			plugins: [
				{
					name: "db",
					packageName: "@fcalell/plugin-db",
					hasRuntime: true,
					hasCallbacks: false,
					options: { dialect: "d1", databaseId: "test-id" },
				},
				{
					name: "auth",
					packageName: "@fcalell/plugin-auth",
					hasRuntime: true,
					hasCallbacks: true,
					options: {},
				},
				{
					name: "api",
					packageName: "@fcalell/plugin-api",
					hasRuntime: true,
					hasCallbacks: false,
					options: { cors: "https://example.com" },
				},
			],
			hasSchema: true,
			hasMiddleware: true,
			hasRoutes: true,
			domain: "example.com",
		});

		expect(result).toContain(
			'import createWorker from "@fcalell/plugin-api/runtime"',
		);
		expect(result).toContain(
			'import dbRuntime from "@fcalell/plugin-db/runtime"',
		);
		expect(result).toContain(
			'import authRuntime from "@fcalell/plugin-auth/runtime"',
		);
		expect(result).toContain(
			'import authCallbacks from "../src/worker/plugins/auth"',
		);
		expect(result).toContain('import * as schema from "../src/schema"');
		expect(result).toContain('import * as routes from "../src/worker/routes"');
		expect(result).toContain(
			'import middleware from "../src/worker/middleware"',
		);
		expect(result).toContain(".use(dbRuntime(");
		expect(result).toContain("schema");
		expect(result).toContain(".use(authRuntime(");
		expect(result).toContain("authCallbacks");
		expect(result).toContain(".use(middleware)");
		expect(result).toContain(".handler(routes)");
		expect(result).toContain("export type AppRouter");
		expect(result).toContain("export default worker");
	});

	it("API-only config (no auth) produces simpler worker", () => {
		const result = generateVirtualWorkerV2({
			plugins: [
				{
					name: "db",
					packageName: "@fcalell/plugin-db",
					hasRuntime: true,
					hasCallbacks: false,
					options: { dialect: "d1", databaseId: "test-id" },
				},
				{
					name: "api",
					packageName: "@fcalell/plugin-api",
					hasRuntime: true,
					hasCallbacks: false,
					options: {},
				},
			],
			hasSchema: true,
			hasMiddleware: false,
			hasRoutes: true,
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
				packageName: "@fcalell/plugin-api",
				hasRuntime: true,
				hasCallbacks: false,
				options: {},
			},
		];

		const withMiddleware = generateVirtualWorkerV2({
			plugins: basePlugins,
			hasSchema: false,
			hasMiddleware: true,
			hasRoutes: false,
		});

		const withoutMiddleware = generateVirtualWorkerV2({
			plugins: basePlugins,
			hasSchema: false,
			hasMiddleware: false,
			hasRoutes: false,
		});

		expect(withMiddleware).toContain("middleware");
		expect(withoutMiddleware).not.toContain("middleware");
	});

	it("callback imports are included only when plugin hasCallbacks is true", () => {
		const withCallbacks = generateVirtualWorkerV2({
			plugins: [
				{
					name: "auth",
					packageName: "@fcalell/plugin-auth",
					hasRuntime: true,
					hasCallbacks: true,
					options: {},
				},
				{
					name: "api",
					packageName: "@fcalell/plugin-api",
					hasRuntime: true,
					hasCallbacks: false,
					options: {},
				},
			],
			hasSchema: false,
			hasMiddleware: false,
			hasRoutes: false,
		});

		const withoutCallbacks = generateVirtualWorkerV2({
			plugins: [
				{
					name: "auth",
					packageName: "@fcalell/plugin-auth",
					hasRuntime: true,
					hasCallbacks: false,
					options: {},
				},
				{
					name: "api",
					packageName: "@fcalell/plugin-api",
					hasRuntime: true,
					hasCallbacks: false,
					options: {},
				},
			],
			hasSchema: false,
			hasMiddleware: false,
			hasRoutes: false,
		});

		expect(withCallbacks).toContain("authCallbacks");
		expect(withoutCallbacks).not.toContain("authCallbacks");
	});

	it("routes import is included when hasRoutes is true", () => {
		const plugins = [
			{
				name: "api",
				packageName: "@fcalell/plugin-api",
				hasRuntime: true,
				hasCallbacks: false,
				options: {},
			},
		];

		const withRoutes = generateVirtualWorkerV2({
			plugins,
			hasSchema: false,
			hasMiddleware: false,
			hasRoutes: true,
		});

		const withoutRoutes = generateVirtualWorkerV2({
			plugins,
			hasSchema: false,
			hasMiddleware: false,
			hasRoutes: false,
		});

		expect(withRoutes).toContain(
			'import * as routes from "../src/worker/routes"',
		);
		expect(withRoutes).toContain(".handler(routes)");
		expect(withoutRoutes).not.toContain("routes");
		expect(withoutRoutes).toContain(".handler()");
	});

	it("generated code has correct structure (imports, builder chain, export)", () => {
		const result = generateVirtualWorkerV2({
			plugins: [
				{
					name: "db",
					packageName: "@fcalell/plugin-db",
					hasRuntime: true,
					hasCallbacks: false,
					options: {},
				},
				{
					name: "api",
					packageName: "@fcalell/plugin-api",
					hasRuntime: true,
					hasCallbacks: false,
					options: {},
				},
			],
			hasSchema: false,
			hasMiddleware: false,
			hasRoutes: false,
		});

		const lines = result.split("\n");

		expect(lines[0]).toContain("Generated by @fcalell/cli");

		const importLines = lines.filter((l) => l.startsWith("import"));
		expect(importLines.length).toBeGreaterThanOrEqual(2);

		expect(result).toContain("const worker = createWorker(");
		expect(result).toContain("export default worker");
	});
});
