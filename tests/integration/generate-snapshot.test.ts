import type { RegisterContext } from "@fcalell/cli";
import {
	createEventBus,
	type Event,
	type EventBus,
	Generate,
} from "@fcalell/cli/events";
import { createMockCtx } from "@fcalell/cli/testing";
import { api } from "@fcalell/plugin-api";
import { auth } from "@fcalell/plugin-auth";
import { cloudflare } from "@fcalell/plugin-cloudflare";
import { db } from "@fcalell/plugin-db";
import { solid } from "@fcalell/plugin-solid";
import { solidUi } from "@fcalell/plugin-solid-ui";
import { vite } from "@fcalell/plugin-vite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// End-to-end generate pipeline snapshot. Drives the same sequence of events the
// CLI's `generate` command emits, against a fixed set of plugins and a stub fs.
// Each phase of the codegen-events refactor preserves this output byte-for-byte;
// unexpected drift surfaces here before it lands downstream.

interface MockFs {
	[path: string]: boolean;
}

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

// The plan's snapshot captures post-validation output, so we take a factory
// (callable) and run the user-supplied options through it — picking up Zod
// defaults like `auth.rateLimiter.ip.binding` that handlers read directly.
type PluginFactory = ((opts?: unknown) => { options: unknown }) & AnyCliPlugin;

interface PluginEntry {
	plugin: PluginFactory;
	options?: unknown;
}

interface PluginCliInfo {
	name: string;
	package: string;
	callbacks: Record<string, unknown>;
}

function registerAll(
	bus: EventBus,
	fs: MockFs,
	entries: PluginEntry[],
	origins: string[] | undefined,
): void {
	// Populate discoveredPlugins once — plugin-api reads this during its
	// Generate handler to decide whether to emit Worker + auto-wire callbacks.
	const discoveredPlugins = entries.map((e) => {
		const cli = (e.plugin as unknown as { cli: PluginCliInfo }).cli;
		return {
			name: cli.name,
			package: cli.package,
			callbacks: cli.callbacks as Record<
				string,
				{ readonly __type?: unknown; readonly __optional?: boolean }
			>,
		};
	});

	for (const { plugin, options } of entries) {
		const resolved = plugin(options ?? {}).options;
		const ctx = createMockCtx({
			options: resolved,
			app: {
				name: "test-app",
				domain: "example.com",
				origins,
			},
			discoveredPlugins,
			fileExists: async (p: string) => fs[p] ?? false,
		});
		plugin.cli.register(ctx, bus, plugin.events);
	}
}

interface GenerateSnapshot {
	files: Array<{ path: string; content: string }>;
	worker: string | null;
	wrangler: string | null;
	viteConfig: string | null;
	providers: string | null;
	entry: string | null;
	html: string | null;
	appCss: string | null;
}

async function runGenerate(opts: {
	entries: PluginEntry[];
	fs: MockFs;
	origins?: string[];
}): Promise<GenerateSnapshot> {
	const bus = createEventBus();
	registerAll(bus, opts.fs, opts.entries, opts.origins);

	// plugin-api owns the Worker + Middleware events and emits both from its
	// own Generate handler. The test only needs to emit Generate — the worker
	// file ends up in `payload.files` like everything else.
	const genResult = await bus.emit(Generate, { files: [], postWrite: [] });
	const files = genResult.files;
	const takeFile = (path: string): string | null =>
		files.find((f) => f.path === path)?.content ?? null;

	const worker = takeFile(".stack/worker.ts");
	const wrangler = takeFile(".stack/wrangler.toml");
	const viteConfig = takeFile(".stack/vite.config.ts");
	const providers = takeFile(".stack/virtual-providers.tsx");
	const entry = takeFile(".stack/entry.tsx");
	const html = takeFile(".stack/index.html");
	const appCss = takeFile(".stack/app.css");

	const generatedFilePaths = new Set([
		".stack/worker.ts",
		".stack/virtual-providers.tsx",
		".stack/entry.tsx",
		".stack/index.html",
		".stack/routes.d.ts",
		".stack/app.css",
		".stack/vite.config.ts",
		".stack/wrangler.toml",
		".dev.vars",
	]);
	const remainingFiles = files.filter((f) => !generatedFilePaths.has(f.path));

	return {
		files: remainingFiles.map((f) => ({ path: f.path, content: f.content })),
		worker,
		wrangler,
		viteConfig,
		providers,
		entry,
		html,
		appCss,
	};
}

describe("generate pipeline snapshot", () => {
	// plugin-cloudflare seeds cloudflare.events.Wrangler with today's date for the
	// `compatibility_date` field. Freeze the clock so snapshots stay stable
	// across days.
	beforeAll(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
	});

	afterAll(() => {
		vi.useRealTimers();
	});

	it("full-stack: db + auth + api + vite + solid + solid-ui", async () => {
		const fs: MockFs = {
			"src/schema": true,
			"src/worker/plugins/auth.ts": true,
			"src/worker/middleware.ts": true,
			"src/worker/routes": true,
		};
		const snapshot = await runGenerate({
			fs,
			origins: [
				"https://example.com",
				"https://app.example.com",
				"http://localhost:3000",
			],
			entries: [
				{ plugin: cloudflare as unknown as PluginFactory, options: {} },
				{
					plugin: db as unknown as PluginFactory,
					options: { dialect: "d1", databaseId: "abc-123" },
				},
				{
					plugin: auth as unknown as PluginFactory,
					options: { secretVar: "AUTH_SECRET" },
				},
				{ plugin: api as unknown as PluginFactory, options: {} },
				{ plugin: vite as unknown as PluginFactory, options: { port: 3000 } },
				{
					plugin: solid as unknown as PluginFactory,
					options: { routes: false },
				},
				{ plugin: solidUi as unknown as PluginFactory, options: {} },
			],
		});
		expect(snapshot).toMatchSnapshot();
	});

	it("db-only: schema tooling, no worker/frontend", async () => {
		const fs: MockFs = { "src/schema": true };
		const snapshot = await runGenerate({
			fs,
			entries: [
				{ plugin: cloudflare as unknown as PluginFactory, options: {} },
				{
					plugin: db as unknown as PluginFactory,
					options: { dialect: "d1", databaseId: "abc-123" },
				},
			],
		});
		expect(snapshot).toMatchSnapshot();
	});

	it("api-only: worker without frontend", async () => {
		const fs: MockFs = {
			"src/schema": true,
			"src/worker/routes": true,
		};
		const snapshot = await runGenerate({
			fs,
			origins: ["https://example.com"],
			entries: [
				{ plugin: cloudflare as unknown as PluginFactory, options: {} },
				{
					plugin: db as unknown as PluginFactory,
					options: { dialect: "d1", databaseId: "abc-123" },
				},
				{ plugin: api as unknown as PluginFactory, options: {} },
			],
		});
		expect(snapshot).toMatchSnapshot();
	});

	it("frontend-only: vite + solid without worker", async () => {
		const fs: MockFs = {};
		const snapshot = await runGenerate({
			fs,
			entries: [
				{ plugin: vite as unknown as PluginFactory, options: { port: 3000 } },
				{
					plugin: solid as unknown as PluginFactory,
					options: { routes: false },
				},
			],
		});
		expect(snapshot).toMatchSnapshot();
	});
});
