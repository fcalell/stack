import type { Slot } from "@fcalell/cli";
import { cliSlots } from "@fcalell/cli/cli-slots";
import {
	buildGraph,
	type GraphCtxFactory,
	type GraphPlugin,
} from "@fcalell/cli/graph";
import { api } from "@fcalell/plugin-api";
import { describe, expect, it } from "vitest";
import { vite } from "./index";

// ── Harness ────────────────────────────────────────────────────────

const app = { name: "test-app", domain: "example.com" };

const noopLog = {
	info: () => {},
	warn: () => {},
	success: () => {},
	error: () => {},
};

function makeCtxFactory(
	perPluginOptions: Record<string, unknown> = {},
	appOverride?: typeof app & { origins?: string[] },
): GraphCtxFactory {
	return {
		app: appOverride ?? app,
		cwd: "/tmp/test",
		log: noopLog,
		ctxForPlugin: (name) => ({
			options: perPluginOptions[name] ?? {},
			fileExists: async () => false,
			readFile: async () => "",
			template: (n) => new URL(`file:///tmp/templates/${name}/${n}`),
			scaffold: (n, target) => ({
				source: new URL(`file:///tmp/templates/${name}/${n}`),
				target,
				plugin: name,
			}),
		}),
	};
}

// Pull the api + vite plugins' collected slots/contributions into GraphPlugin
// entries — same production path the CLI walks.
function collectVitePlugins(
	extras: GraphPlugin[] = [],
	viteOpts: Parameters<typeof vite>[0] = {},
	apiOpts: Parameters<typeof api>[0] = {},
	optsPerPlugin: Record<string, unknown> = {},
	appOverride?: typeof app & { origins?: string[] },
): { plugins: GraphPlugin[]; ctxFactory: GraphCtxFactory } {
	const apiCollected = api.cli.collect({ app, options: apiOpts ?? {} });
	const viteCollected = vite.cli.collect({ app, options: viteOpts ?? {} });
	const apiPlugin: GraphPlugin = {
		name: "api",
		slots: apiCollected.slots as unknown as Record<string, Slot<unknown>>,
		contributes: apiCollected.contributes,
	};
	const vitePlugin: GraphPlugin = {
		name: "vite",
		slots: viteCollected.slots as unknown as Record<string, Slot<unknown>>,
		contributes: viteCollected.contributes,
	};
	const perPluginOptions: Record<string, unknown> = {
		api: apiOpts ?? {},
		vite: viteOpts ?? {},
		...optsPerPlugin,
	};
	return {
		plugins: [apiPlugin, vitePlugin, ...extras],
		ctxFactory: makeCtxFactory(perPluginOptions, appOverride),
	};
}

// ── Config factory ────────────────────────────────────────────────

describe("vite config factory", () => {
	it("returns PluginConfig with __plugin 'vite'", () => {
		const config = vite();
		expect(config.__plugin).toBe("vite");
	});

	it("accepts custom port", () => {
		const config = vite({ port: 4000 });
		expect(config.options.port).toBe(4000);
	});

	it("defaults to empty options", () => {
		const config = vite();
		expect(config.options).toEqual({});
	});
});

describe("vite.slots", () => {
	it("owns configImports, pluginCalls, resolveAliases, devServerPort, viteConfig", () => {
		expect(vite.slots.configImports.source).toBe("vite");
		expect(vite.slots.pluginCalls.source).toBe("vite");
		expect(vite.slots.resolveAliases.source).toBe("vite");
		expect(vite.slots.devServerPort.source).toBe("vite");
		expect(vite.slots.viteConfig.source).toBe("vite");
	});
});

// ── devServerPort ─────────────────────────────────────────────────

describe("vite.slots.devServerPort", () => {
	it("defaults to 3000", async () => {
		const { plugins, ctxFactory } = collectVitePlugins();
		const g = buildGraph(plugins, ctxFactory);
		expect(await g.resolve(vite.slots.devServerPort)).toBe(3000);
	});

	it("honours options.port", async () => {
		const { plugins, ctxFactory } = collectVitePlugins([], { port: 4000 });
		const g = buildGraph(plugins, ctxFactory);
		expect(await g.resolve(vite.slots.devServerPort)).toBe(4000);
	});
});

// ── localhost CORS contribution (bug #5) ──────────────────────────

describe("vite → api.slots.corsOrigins contribution", () => {
	it("adds localhost to api.slots.cors when app.origins is not set", async () => {
		const { plugins, ctxFactory } = collectVitePlugins();
		const g = buildGraph(plugins, ctxFactory);
		const cors = await g.resolve(api.slots.cors);
		expect(cors).toContain("http://localhost:3000");
	});

	it("uses the configured port for localhost", async () => {
		const { plugins, ctxFactory } = collectVitePlugins([], { port: 4000 });
		const g = buildGraph(plugins, ctxFactory);
		const cors = await g.resolve(api.slots.cors);
		expect(cors).toContain("http://localhost:4000");
	});

	it("does not contribute localhost when app.origins is set", async () => {
		const { plugins, ctxFactory } = collectVitePlugins(
			[],
			{},
			{},
			{},
			{ ...app, origins: ["https://only.example.com"] },
		);
		const g = buildGraph(plugins, ctxFactory);
		const cors = await g.resolve(api.slots.cors);
		expect(cors).not.toContain("http://localhost:3000");
	});

	// Bug #5 order-independence: placing vite BEFORE or AFTER a sibling
	// `api.slots.corsOrigins` contributor must yield the same cors result.
	it("cors result is order-independent when another plugin also contributes to corsOrigins", async () => {
		const extra: GraphPlugin = {
			name: "other",
			contributes: [
				api.slots.corsOrigins.contribute(() => "https://other.example"),
			],
		};
		const apiCollected = api.cli.collect({ app, options: {} });
		const viteCollected = vite.cli.collect({ app, options: {} });
		const apiP: GraphPlugin = {
			name: "api",
			slots: apiCollected.slots as unknown as Record<string, Slot<unknown>>,
			contributes: apiCollected.contributes,
		};
		const viteP: GraphPlugin = {
			name: "vite",
			slots: viteCollected.slots as unknown as Record<string, Slot<unknown>>,
			contributes: viteCollected.contributes,
		};

		const forward = buildGraph([apiP, viteP, extra], makeCtxFactory());
		const reverse = buildGraph([apiP, extra, viteP], makeCtxFactory());
		const corsF = await forward.resolve(api.slots.cors);
		const corsR = await reverse.resolve(api.slots.cors);
		for (const cors of [corsF, corsR]) {
			expect(cors).toContain("http://localhost:3000");
			expect(cors).toContain("https://other.example");
		}
	});
});

// ── viteConfig ────────────────────────────────────────────────────

describe("vite.slots.viteConfig", () => {
	it("emits defineConfig + providersPlugin with own contributions", async () => {
		const { plugins, ctxFactory } = collectVitePlugins();
		const g = buildGraph(plugins, ctxFactory);
		const src = await g.resolve(vite.slots.viteConfig);
		expect(src).not.toBeNull();
		if (!src) return;
		expect(src).toContain('import { defineConfig } from "vite"');
		expect(src).toContain(
			'import { providersPlugin } from "@fcalell/plugin-vite/preset"',
		);
		expect(src).toContain("providersPlugin()");
	});

	it("embeds the resolved devServerPort in the config", async () => {
		const { plugins, ctxFactory } = collectVitePlugins([], { port: 4321 });
		const g = buildGraph(plugins, ctxFactory);
		const src = await g.resolve(vite.slots.viteConfig);
		expect(src).toContain("port: 4321");
	});

	it("emits .stack/vite.config.ts into cliSlots.artifactFiles", async () => {
		const { plugins, ctxFactory } = collectVitePlugins();
		const g = buildGraph(plugins, ctxFactory);
		const files = await g.resolve(cliSlots.artifactFiles);
		expect(files.map((f) => f.path)).toContain(".stack/vite.config.ts");
	});
});

// ── dev + build ───────────────────────────────────────────────────

describe("vite dev + build contributions", () => {
	it("contributes a dev process with the configured port", async () => {
		const { plugins, ctxFactory } = collectVitePlugins([], { port: 4000 });
		const g = buildGraph(plugins, ctxFactory);
		const procs = await g.resolve(cliSlots.devProcesses);
		const v = procs.find((p) => p.name === "vite");
		expect(v).toBeTruthy();
		expect(v?.args).toContain("4000");
	});

	it("contributes a build step via cliSlots.buildSteps", async () => {
		const { plugins, ctxFactory } = collectVitePlugins();
		const g = buildGraph(plugins, ctxFactory);
		const steps = await g.resolve(cliSlots.buildSteps);
		expect(steps.find((s) => s.name === "vite-build")).toBeTruthy();
	});
});
