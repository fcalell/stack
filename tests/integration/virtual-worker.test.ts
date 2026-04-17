import type { RegisterContext } from "@fcalell/cli";
import { generateVirtualWorker } from "@fcalell/cli/codegen";
import {
	Codegen,
	createEventBus,
	type Event,
	type EventBus,
} from "@fcalell/cli/events";
import { createMockCtx } from "@fcalell/cli/testing";
import { api } from "@fcalell/plugin-api";
import { auth } from "@fcalell/plugin-auth";
import { db } from "@fcalell/plugin-db";
import { describe, expect, it } from "vitest";

interface MockFs {
	[path: string]: boolean;
}

// The plugin-specific option types collide with createMockCtx's generic when
// passing ctx through a shared helper. Treat each plugin as AnyCliPlugin (the
// same erasure used by plugin-cli-contracts.test.ts) for registration only.
interface AnyCliPlugin {
	cli: {
		register: (
			ctx: RegisterContext<unknown>,
			bus: EventBus,
			events: Record<string, Event<unknown>>,
		) => void;
	};
	events: Record<string, Event<unknown>>;
}

function makeCtx(fs: MockFs, options: unknown): RegisterContext<unknown> {
	return createMockCtx({
		options,
		fileExists: async (p: string) => fs[p] ?? false,
	});
}

function registerPlugin(
	plugin: AnyCliPlugin,
	bus: EventBus,
	fs: MockFs,
	options: unknown,
): void {
	plugin.cli.register(makeCtx(fs, options), bus, plugin.events);
}

function registerDb(bus: EventBus, fs: MockFs, options: unknown): void {
	registerPlugin(db as unknown as AnyCliPlugin, bus, fs, options);
}

function registerAuth(bus: EventBus, fs: MockFs, options: unknown): void {
	registerPlugin(auth as unknown as AnyCliPlugin, bus, fs, options);
}

function registerApi(bus: EventBus, fs: MockFs, options: unknown): void {
	registerPlugin(api as unknown as AnyCliPlugin, bus, fs, options);
}

async function runPipeline(
	bus: EventBus,
	frontend?: { port?: number; domain?: string },
): Promise<string> {
	const frontendPayload = await bus.emit(Codegen.Frontend, frontend ?? {});
	const worker = await bus.emit(Codegen.Worker, {
		imports: [],
		root: null,
		useLines: [],
		handlerArg: "",
		tailLines: [],
		frontend: frontendPayload,
	});
	return generateVirtualWorker(worker);
}

describe("virtual worker codegen pipeline (event-driven)", () => {
	it("full-stack config produces correct imports and builder chain", async () => {
		const bus = createEventBus();
		const fs: MockFs = {
			"src/schema": true,
			"src/worker/plugins/auth.ts": true,
			"src/worker/middleware.ts": true,
			"src/worker/routes": true,
		};

		registerDb(bus, fs, { dialect: "d1", databaseId: "test-id" });
		registerAuth(bus, fs, { secretVar: "AUTH_SECRET" });
		registerApi(bus, fs, { cors: "https://example.com" });

		const result = await runPipeline(bus, { domain: "example.com" });

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

	it("API-only config (no auth) produces simpler worker", async () => {
		const bus = createEventBus();
		const fs: MockFs = { "src/schema": true, "src/worker/routes": true };

		registerDb(bus, fs, { dialect: "d1", databaseId: "test-id" });
		registerApi(bus, fs, {});

		const result = await runPipeline(bus);

		expect(result).toContain("dbRuntime");
		expect(result).not.toContain("authRuntime");
		expect(result).not.toContain("middleware");
		expect(result).toContain(".handler(routes)");
	});

	it("middleware import is included only when middleware.ts exists", async () => {
		const busWith = createEventBus();
		registerApi(busWith, { "src/worker/middleware.ts": true }, {});
		const withMiddleware = await runPipeline(busWith);

		const busWithout = createEventBus();
		registerApi(busWithout, {}, {});
		const withoutMiddleware = await runPipeline(busWithout);

		expect(withMiddleware).toContain("middleware");
		expect(withoutMiddleware).not.toContain("middleware");
	});

	it("callback imports are included only when auth callback file exists", async () => {
		const busWith = createEventBus();
		registerAuth(busWith, { "src/worker/plugins/auth.ts": true }, {});
		registerApi(busWith, {}, {});
		const withCallbacks = await runPipeline(busWith);

		const busWithout = createEventBus();
		registerAuth(busWithout, {}, {});
		registerApi(busWithout, {}, {});
		const withoutCallbacks = await runPipeline(busWithout);

		expect(withCallbacks).toContain("authCallbacks");
		expect(withoutCallbacks).not.toContain("authCallbacks");
	});

	it("routes import is included when routes dir exists", async () => {
		const busWith = createEventBus();
		registerApi(busWith, { "src/worker/routes": true }, {});
		const withRoutes = await runPipeline(busWith);

		const busWithout = createEventBus();
		registerApi(busWithout, {}, {});
		const withoutRoutes = await runPipeline(busWithout);

		expect(withRoutes).toContain(
			'import * as routes from "../src/worker/routes"',
		);
		expect(withRoutes).toContain(".handler(routes)");
		expect(withoutRoutes).not.toContain("routes");
		expect(withoutRoutes).toContain(".handler()");
	});

	it("inlines domain and cors from frontend signal", async () => {
		const bus = createEventBus();
		registerApi(bus, {}, {});

		const result = await runPipeline(bus, {
			domain: "example.com",
			port: 3000,
		});

		expect(result).toContain("example.com");
		expect(result).toContain("http://localhost:3000");
		expect(result).toContain("https://example.com");
		expect(result).toContain("https://app.example.com");
	});

	it("merges explicit api cors with frontend-derived origins", async () => {
		const bus = createEventBus();
		registerApi(bus, {}, { cors: ["https://custom.example.com"] });

		const result = await runPipeline(bus, { port: 4000 });

		expect(result).toContain("https://custom.example.com");
		expect(result).toContain("http://localhost:4000");
	});

	it("does not duplicate existing localhost origin", async () => {
		const bus = createEventBus();
		registerApi(bus, {}, { cors: ["http://localhost:3000"] });

		const result = await runPipeline(bus, { port: 3000 });

		const corsMatches = result.match(/http:\/\/localhost:3000/g);
		expect(corsMatches).toHaveLength(1);
	});

	it("does not add CORS when no frontend signal is present", async () => {
		const bus = createEventBus();
		registerApi(bus, {}, {});

		const result = await runPipeline(bus);

		expect(result).not.toContain("cors");
	});

	it("sets auth sameSite=none when a frontend is present", async () => {
		const bus = createEventBus();
		registerAuth(
			bus,
			{ "src/worker/plugins/auth.ts": true },
			{
				secretVar: "AUTH_SECRET",
			},
		);
		registerApi(bus, {}, {});

		const result = await runPipeline(bus, { port: 3000 });

		expect(result).toContain('"sameSite": "none"');
	});

	it("does not set sameSite when no frontend signal is present", async () => {
		const bus = createEventBus();
		registerAuth(
			bus,
			{ "src/worker/plugins/auth.ts": true },
			{
				secretVar: "AUTH_SECRET",
			},
		);
		registerApi(bus, {}, {});

		const result = await runPipeline(bus);

		expect(result).not.toContain("sameSite");
	});

	it("generated code has correct structure (imports, builder chain, export)", async () => {
		const bus = createEventBus();
		registerDb(bus, {}, {});
		registerApi(bus, {}, {});

		const result = await runPipeline(bus);
		const lines = result.split("\n");

		expect(lines[0]).toContain("Generated by @fcalell/cli");

		const importLines = lines.filter((l) => l.startsWith("import"));
		expect(importLines.length).toBeGreaterThanOrEqual(2);

		expect(result).toContain("const worker = createWorker(");
		expect(result).toContain("export default worker");
	});

	it("throws when two plugins claim the worker root", async () => {
		const bus = createEventBus();
		registerApi(bus, {}, {});
		registerApi(bus, {}, {});

		await expect(runPipeline(bus)).rejects.toThrow(
			/cannot claim the worker root/,
		);
	});
});
