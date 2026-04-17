import { describe, expect, it } from "vitest";
import {
	generateVirtualWorkerV2,
	generateWranglerToml,
	serializeOptions,
} from "#lib/codegen-v2";

describe("serializeOptions", () => {
	it("serializes plain objects as JSON", () => {
		const result = serializeOptions({ binding: "DB_MAIN" });
		expect(result).toContain('"binding"');
		expect(result).toContain('"DB_MAIN"');
	});

	it("handles empty objects", () => {
		expect(serializeOptions({})).toBe("{}");
	});
});

describe("generateVirtualWorkerV2", () => {
	it("generates worker with db + api plugins", () => {
		const result = generateVirtualWorkerV2({
			plugins: [
				{
					name: "db",
					packageName: "@fcalell/plugin-db",
					hasRuntime: true,
					hasCallbacks: false,
					options: { binding: "DB_MAIN" },
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

		expect(result).toContain(
			'import createWorker from "@fcalell/plugin-api/runtime"',
		);
		expect(result).toContain(
			'import dbRuntime from "@fcalell/plugin-db/runtime"',
		);
		expect(result).toContain('import * as schema from "../src/schema"');
		expect(result).toContain('import * as routes from "../src/worker/routes"');
		expect(result).toContain(".use(dbRuntime(");
		expect(result).toContain("schema");
		expect(result).toContain(".handler(routes)");
		expect(result).toContain("export type AppRouter");
	});

	it("generates worker with auth callbacks", () => {
		const result = generateVirtualWorkerV2({
			plugins: [
				{
					name: "auth",
					packageName: "@fcalell/plugin-auth",
					hasRuntime: true,
					hasCallbacks: true,
					options: { secretVar: "AUTH_SECRET" },
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

		expect(result).toContain(
			'import authCallbacks from "../src/worker/plugins/auth"',
		);
		expect(result).toContain("callbacks: authCallbacks");
	});

	it("includes middleware when present", () => {
		const result = generateVirtualWorkerV2({
			plugins: [
				{
					name: "api",
					packageName: "@fcalell/plugin-api",
					hasRuntime: true,
					hasCallbacks: false,
					options: {},
				},
			],
			hasSchema: false,
			hasMiddleware: true,
			hasRoutes: false,
		});

		expect(result).toContain(
			'import middleware from "../src/worker/middleware"',
		);
		expect(result).toContain(".use(middleware)");
	});

	it("inlines domain from config", () => {
		const result = generateVirtualWorkerV2({
			plugins: [
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
			domain: "example.com",
		});

		expect(result).toContain("example.com");
	});

	it("generates nothing when no api plugin", () => {
		const result = generateVirtualWorkerV2({
			plugins: [
				{
					name: "db",
					packageName: "@fcalell/plugin-db",
					hasRuntime: true,
					hasCallbacks: false,
					options: {},
				},
			],
			hasSchema: true,
			hasMiddleware: false,
			hasRoutes: false,
		});

		expect(result).not.toContain("createWorker");
	});

	it("does not import config (pure convention)", () => {
		const result = generateVirtualWorkerV2({
			plugins: [
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

		expect(result).not.toContain("stack.config");
		expect(result).not.toContain("getPlugin");
	});

	describe("CORS auto-configuration", () => {
		it("adds localhost origin when frontend port is provided", () => {
			const result = generateVirtualWorkerV2({
				plugins: [
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
				frontendPort: 3000,
			});

			expect(result).toContain("http://localhost:3000");
		});

		it("adds domain origins when frontend port and domain are provided", () => {
			const result = generateVirtualWorkerV2({
				plugins: [
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
				frontendPort: 3000,
				domain: "example.com",
			});

			expect(result).toContain("http://localhost:3000");
			expect(result).toContain("https://example.com");
			expect(result).toContain("https://app.example.com");
		});

		it("merges with explicit CORS values from api plugin options", () => {
			const result = generateVirtualWorkerV2({
				plugins: [
					{
						name: "api",
						packageName: "@fcalell/plugin-api",
						hasRuntime: true,
						hasCallbacks: false,
						options: { cors: ["https://custom.example.com"] },
					},
				],
				hasSchema: false,
				hasMiddleware: false,
				hasRoutes: false,
				frontendPort: 4000,
			});

			expect(result).toContain("https://custom.example.com");
			expect(result).toContain("http://localhost:4000");
		});

		it("does not duplicate existing localhost origin", () => {
			const result = generateVirtualWorkerV2({
				plugins: [
					{
						name: "api",
						packageName: "@fcalell/plugin-api",
						hasRuntime: true,
						hasCallbacks: false,
						options: { cors: ["http://localhost:3000"] },
					},
				],
				hasSchema: false,
				hasMiddleware: false,
				hasRoutes: false,
				frontendPort: 3000,
			});

			const corsMatches = result.match(/http:\/\/localhost:3000/g);
			expect(corsMatches).toHaveLength(1);
		});

		it("does not add CORS when no frontend port", () => {
			const result = generateVirtualWorkerV2({
				plugins: [
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

			expect(result).not.toContain("cors");
		});

		it("uses custom frontend port", () => {
			const result = generateVirtualWorkerV2({
				plugins: [
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
				frontendPort: 5173,
			});

			expect(result).toContain("http://localhost:5173");
		});
	});

	describe("cookie sameSite auto-configuration", () => {
		it("sets sameSite to none when auth and frontend are both present", () => {
			const result = generateVirtualWorkerV2({
				plugins: [
					{
						name: "auth",
						packageName: "@fcalell/plugin-auth",
						hasRuntime: true,
						hasCallbacks: true,
						options: { secretVar: "AUTH_SECRET" },
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
				hasAuth: true,
				hasFrontend: true,
			});

			expect(result).toContain('"sameSite": "none"');
		});

		it("does not set sameSite when no frontend", () => {
			const result = generateVirtualWorkerV2({
				plugins: [
					{
						name: "auth",
						packageName: "@fcalell/plugin-auth",
						hasRuntime: true,
						hasCallbacks: true,
						options: { secretVar: "AUTH_SECRET" },
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
				hasAuth: true,
				hasFrontend: false,
			});

			expect(result).not.toContain("sameSite");
		});

		it("does not set sameSite when no auth", () => {
			const result = generateVirtualWorkerV2({
				plugins: [
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
				hasAuth: false,
				hasFrontend: true,
				frontendPort: 3000,
			});

			expect(result).not.toContain("sameSite");
		});
	});
});

describe("generateWranglerToml", () => {
	it("sets main to worker.ts in generated config", () => {
		const result = generateWranglerToml({
			consumerWrangler: null,
			bindings: [],
		});

		expect(result).toContain('main = "worker.ts"');
	});

	it("replaces existing main line in consumer wrangler.toml", () => {
		const consumer =
			'name = "my-app"\nmain = "src/index.ts"\ncompatibility_date = "2024-01-01"';
		const result = generateWranglerToml({
			consumerWrangler: consumer,
			bindings: [],
		});

		expect(result).toContain('main = "worker.ts"');
		expect(result).not.toContain("src/index.ts");
	});

	it("adds main line when consumer wrangler.toml has no main", () => {
		const consumer = 'name = "my-app"\ncompatibility_date = "2024-01-01"';
		const result = generateWranglerToml({
			consumerWrangler: consumer,
			bindings: [],
		});

		expect(result).toContain('main = "worker.ts"');
		expect(result).toContain('name = "my-app"');
	});

	it("replaces main with .stack/ prefix path", () => {
		const consumer = 'name = "my-app"\nmain = ".stack/worker.ts"';
		const result = generateWranglerToml({
			consumerWrangler: consumer,
			bindings: [],
		});

		expect(result).toContain('main = "worker.ts"');
		expect(result).not.toContain(".stack/worker.ts");
	});
});
