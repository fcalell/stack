import type { RegisterContext } from "@fcalell/cli";
import { createEventBus, type Event, type EventBus } from "@fcalell/cli/events";
import { createMockCtx } from "@fcalell/cli/testing";
import { api } from "@fcalell/plugin-api";
import {
	aggregateMiddleware,
	aggregateWorker,
} from "@fcalell/plugin-api/node/codegen";
import { auth } from "@fcalell/plugin-auth";
import { db } from "@fcalell/plugin-db";
import { vite } from "@fcalell/plugin-vite";
import { describe, expect, it } from "vitest";

interface MockFs {
	[path: string]: boolean;
}

interface AnyCliPlugin {
	cli: {
		name: string;
		package: string;
		callbacks: Record<string, unknown>;
		register: (
			ctx: RegisterContext<unknown>,
			bus: EventBus,
			events: Record<string, Event<unknown>>,
		) => void;
	};
	events: Record<string, Event<unknown>>;
}

interface PluginEntry {
	plugin: AnyCliPlugin;
	options: unknown;
}

function registerAll(bus: EventBus, fs: MockFs, entries: PluginEntry[]): void {
	const discoveredPlugins = entries.map(({ plugin }) => ({
		name: plugin.cli.name,
		package: plugin.cli.package,
		callbacks: plugin.cli.callbacks as Record<
			string,
			{ readonly __type?: unknown; readonly __optional?: boolean }
		>,
	}));
	for (const { plugin, options } of entries) {
		const ctx = createMockCtx({
			options,
			fileExists: async (p: string) => fs[p] ?? false,
			discoveredPlugins,
		});
		plugin.cli.register(ctx, bus, plugin.events);
	}
}

async function runPipeline(
	bus: EventBus,
	opts: { cors?: string[] } = {},
): Promise<string> {
	// Match plugin-api's Generate handler ordering: api.events.Middleware seeds
	// the Worker payload before api.events.Worker fires, so ordered middleware
	// imports/calls land in the chain.
	const middleware = await bus.emit(api.events.Middleware, { entries: [] });
	const aggregated = aggregateMiddleware(middleware);

	const payload = await bus.emit(api.events.Worker, {
		imports: aggregated?.imports ?? [],
		base: null,
		pluginRuntimes: [],
		middlewareChain: aggregated?.calls ?? [],
		handler: null,
		cors: opts.cors ?? [],
	});
	return aggregateWorker(payload);
}

const dbPlugin = db as unknown as AnyCliPlugin;
const authPlugin = auth as unknown as AnyCliPlugin;
const apiPlugin = api as unknown as AnyCliPlugin;
const vitePlugin = vite as unknown as AnyCliPlugin;

describe("virtual worker codegen pipeline (event-driven)", () => {
	it("full-stack config produces correct imports and builder chain", async () => {
		const bus = createEventBus();
		const fs: MockFs = {
			"src/schema": true,
			"src/worker/plugins/auth.ts": true,
			"src/worker/middleware.ts": true,
			"src/worker/routes": true,
		};

		registerAll(bus, fs, [
			{ plugin: dbPlugin, options: { dialect: "d1", databaseId: "test-id" } },
			{ plugin: authPlugin, options: { secretVar: "AUTH_SECRET" } },
			{ plugin: apiPlugin, options: {} },
		]);

		const result = await runPipeline(bus, {
			cors: ["https://example.com"],
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

	it("API-only config (no auth) produces simpler worker", async () => {
		const bus = createEventBus();
		const fs: MockFs = { "src/schema": true, "src/worker/routes": true };

		registerAll(bus, fs, [
			{ plugin: dbPlugin, options: { dialect: "d1", databaseId: "test-id" } },
			{ plugin: apiPlugin, options: {} },
		]);

		const result = await runPipeline(bus);

		expect(result).toContain("dbRuntime");
		expect(result).not.toContain("authRuntime");
		expect(result).not.toContain("middleware");
		expect(result).toContain(".handler(routes)");
	});

	it("middleware import is included only when middleware.ts exists", async () => {
		const busWith = createEventBus();
		registerAll(busWith, { "src/worker/middleware.ts": true }, [
			{ plugin: apiPlugin, options: {} },
		]);
		const withMiddleware = await runPipeline(busWith);

		const busWithout = createEventBus();
		registerAll(busWithout, {}, [{ plugin: apiPlugin, options: {} }]);
		const withoutMiddleware = await runPipeline(busWithout);

		expect(withMiddleware).toContain("middleware");
		expect(withoutMiddleware).not.toContain("middleware");
	});

	it("callback imports are included only when auth callback file exists", async () => {
		const busWith = createEventBus();
		registerAll(busWith, { "src/worker/plugins/auth.ts": true }, [
			{ plugin: authPlugin, options: {} },
			{ plugin: apiPlugin, options: {} },
		]);
		const withCallbacks = await runPipeline(busWith);

		const busWithout = createEventBus();
		registerAll(busWithout, {}, [
			{ plugin: authPlugin, options: {} },
			{ plugin: apiPlugin, options: {} },
		]);
		const withoutCallbacks = await runPipeline(busWithout);

		expect(withCallbacks).toContain("authCallbacks");
		expect(withoutCallbacks).not.toContain("authCallbacks");
	});

	it("routes import is included when routes dir exists", async () => {
		const busWith = createEventBus();
		registerAll(busWith, { "src/worker/routes": true }, [
			{ plugin: apiPlugin, options: {} },
		]);
		const withRoutes = await runPipeline(busWith);

		const busWithout = createEventBus();
		registerAll(busWithout, {}, [{ plugin: apiPlugin, options: {} }]);
		const withoutRoutes = await runPipeline(busWithout);

		expect(withRoutes).toContain(
			'import * as routes from "../src/worker/routes"',
		);
		expect(withRoutes).toContain(".handler(routes)");
		expect(withoutRoutes).not.toContain("routes");
		expect(withoutRoutes).toContain(".handler()");
	});

	it("inlines cors from payload-supplied origins", async () => {
		const bus = createEventBus();
		registerAll(bus, {}, [
			{ plugin: vitePlugin, options: { port: 3000 } },
			{ plugin: apiPlugin, options: {} },
		]);

		const result = await runPipeline(bus, {
			cors: [
				"https://example.com",
				"https://app.example.com",
				"http://localhost:3000",
			],
		});

		expect(result).toContain("http://localhost:3000");
		expect(result).toContain("https://example.com");
		expect(result).toContain("https://app.example.com");
	});

	it("does not add CORS when payload is empty", async () => {
		const bus = createEventBus();
		registerAll(bus, {}, [{ plugin: apiPlugin, options: {} }]);

		const result = await runPipeline(bus);

		expect(result).not.toContain("cors");
	});

	it("sets auth sameSite=none when payload cors includes localhost", async () => {
		const bus = createEventBus();
		registerAll(bus, { "src/worker/plugins/auth.ts": true }, [
			{ plugin: vitePlugin, options: { port: 3000 } },
			{ plugin: authPlugin, options: { secretVar: "AUTH_SECRET" } },
			{ plugin: apiPlugin, options: {} },
		]);

		const result = await runPipeline(bus, {
			cors: ["http://localhost:3000"],
		});

		expect(result).toContain('sameSite: "none"');
	});

	it("does not set sameSite when no frontend signal is present", async () => {
		const bus = createEventBus();
		registerAll(bus, { "src/worker/plugins/auth.ts": true }, [
			{ plugin: authPlugin, options: { secretVar: "AUTH_SECRET" } },
			{ plugin: apiPlugin, options: {} },
		]);

		const result = await runPipeline(bus);

		expect(result).not.toContain("sameSite");
	});

	it("generated code has correct structure (imports, builder chain, export)", async () => {
		const bus = createEventBus();
		registerAll(bus, {}, [
			{ plugin: dbPlugin, options: { dialect: "d1", databaseId: "test-id" } },
			{ plugin: apiPlugin, options: {} },
		]);

		const result = await runPipeline(bus);
		const lines = result.split("\n");

		const importLines = lines.filter((l) => l.startsWith("import"));
		expect(importLines.length).toBeGreaterThanOrEqual(2);

		expect(result).toContain("const worker = createWorker(");
		expect(result).toContain("export default worker");
	});

	it("throws when two plugins claim the worker root", async () => {
		const bus = createEventBus();
		registerAll(bus, {}, [
			{ plugin: apiPlugin, options: {} },
			{ plugin: apiPlugin, options: {} },
		]);

		await expect(runPipeline(bus)).rejects.toThrow(
			/cannot claim the worker root/,
		);
	});
});
