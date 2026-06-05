import type { Slot } from "@fcalell/cli";
import type { ProviderSpec } from "@fcalell/cli/ast";
import { cliSlots } from "@fcalell/cli/cli-slots";
import {
	buildGraph,
	type GraphCtxFactory,
	type GraphPlugin,
} from "@fcalell/cli/graph";
import { api } from "@fcalell/plugin-api";
import { describe, expect, it } from "vitest";
import { expo } from "./index";
import { expoOptionsSchema } from "./types";

// ── Harness ────────────────────────────────────────────────────────
//
// Mirrors plugin-vite's test harness: collect the real api + expo plugins
// through `.cli.collect()` and resolve slots against a graph built the same
// way the CLI builds it. No hand-ordered arrays, no synthetic payloads.

const app = { name: "WeNauti", domain: "wenauti.app" };

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

function collectExpoPlugins(
	extras: GraphPlugin[] = [],
	expoOpts: Parameters<typeof expo>[0] = {},
	apiOpts: Parameters<typeof api>[0] = {},
	optsPerPlugin: Record<string, unknown> = {},
	appOverride?: typeof app & { origins?: string[] },
): { plugins: GraphPlugin[]; ctxFactory: GraphCtxFactory } {
	const apiCollected = api.cli.collect({ app, options: apiOpts ?? {} });
	const expoCollected = expo.cli.collect({ app, options: expoOpts ?? {} });
	const apiPlugin: GraphPlugin = {
		name: "api",
		slots: apiCollected.slots as unknown as Record<string, Slot<unknown>>,
		contributes: apiCollected.contributes,
	};
	const expoPlugin: GraphPlugin = {
		name: "expo",
		slots: expoCollected.slots as unknown as Record<string, Slot<unknown>>,
		contributes: expoCollected.contributes,
	};
	const perPluginOptions: Record<string, unknown> = {
		api: apiOpts ?? {},
		expo: expoOpts ?? {},
		...optsPerPlugin,
	};
	return {
		plugins: [apiPlugin, expoPlugin, ...extras],
		ctxFactory: makeCtxFactory(perPluginOptions, appOverride),
	};
}

// A stand-in for native-ui / auth-expo: contributes into every list slot expo
// exposes, so the composition paths are exercised end to end.
function uiExtras(): GraphPlugin {
	return {
		name: "native-ui",
		contributes: [
			expo.slots.metroConfigImports.contribute(() => ({
				names: ["withUniwindConfig"],
				module: "uniwind/metro",
			})),
			expo.slots.metroPluginCalls.contribute(() => ({
				callee: "withUniwindConfig",
				options: { cssEntryFile: "./src/global.css" },
			})),
			expo.slots.expoConfigPlugins.contribute(() => ({
				name: "expo-build-properties",
				options: { ios: { deploymentTarget: "16.0" } },
			})),
			expo.slots.providers.contribute(
				(): ProviderSpec => ({
					imports: [
						{
							source: "react-native-safe-area-context",
							named: ["SafeAreaProvider"],
						},
					],
					wrap: { identifier: "SafeAreaProvider" },
					order: 10,
				}),
			),
		],
	};
}

// ── Config factory ────────────────────────────────────────────────

describe("expo config factory", () => {
	it("returns PluginConfig with __plugin 'expo'", () => {
		expect(expo().__plugin).toBe("expo");
	});

	it("defaults to empty options and accepts a custom port", () => {
		expect(expo().options).toEqual({});
		expect(expo({ port: 19000 }).options.port).toBe(19000);
	});
});

describe("expo.slots", () => {
	it("owns the native bootstrap slots", () => {
		for (const name of [
			"metroConfig",
			"expoConfig",
			"entrySource",
			"routesDtsSource",
			"devServerPort",
			"routesPagesDir",
			"easBuildProfiles",
			"easUpdateChannel",
		] as const) {
			expect(expo.slots[name].source).toBe("expo");
		}
	});
});

// ── devServerPort + CORS ──────────────────────────────────────────

describe("expo.slots.devServerPort", () => {
	it("defaults to Expo's 8081", async () => {
		const { plugins, ctxFactory } = collectExpoPlugins();
		const g = buildGraph(plugins, ctxFactory);
		expect(await g.resolve(expo.slots.devServerPort)).toBe(8081);
	});

	it("honours options.port", async () => {
		const { plugins, ctxFactory } = collectExpoPlugins([], { port: 19000 });
		const g = buildGraph(plugins, ctxFactory);
		expect(await g.resolve(expo.slots.devServerPort)).toBe(19000);
	});
});

describe("expo → api.slots.corsOrigins", () => {
	it("adds the Metro localhost origin when app.origins is unset", async () => {
		const { plugins, ctxFactory } = collectExpoPlugins();
		const g = buildGraph(plugins, ctxFactory);
		expect(await g.resolve(api.slots.cors)).toContain("http://localhost:8081");
	});

	it("uses the configured port for the localhost origin", async () => {
		const { plugins, ctxFactory } = collectExpoPlugins([], { port: 19000 });
		const g = buildGraph(plugins, ctxFactory);
		expect(await g.resolve(api.slots.cors)).toContain("http://localhost:19000");
	});

	it("does not contribute localhost when app.origins is set", async () => {
		const { plugins, ctxFactory } = collectExpoPlugins(
			[],
			{},
			{},
			{},
			{
				...app,
				origins: ["https://only.example.com"],
			},
		);
		const g = buildGraph(plugins, ctxFactory);
		expect(await g.resolve(api.slots.cors)).not.toContain(
			"http://localhost:8081",
		);
	});

	it("honours an explicit empty app.origins lockdown", async () => {
		const { plugins, ctxFactory } = collectExpoPlugins(
			[],
			{},
			{},
			{},
			{
				...app,
				origins: [],
			},
		);
		const g = buildGraph(plugins, ctxFactory);
		expect(await g.resolve(api.slots.cors)).toEqual([]);
	});
});

// ── metro config ──────────────────────────────────────────────────

describe("expo.slots.metroConfig", () => {
	it("emits a base config from getDefaultConfig", async () => {
		const { plugins, ctxFactory } = collectExpoPlugins();
		const g = buildGraph(plugins, ctxFactory);
		const src = await g.resolve(expo.slots.metroConfig);
		expect(src).toContain("getDefaultConfig(projectRoot)");
		expect(src).toContain("module.exports = config;");
	});

	it("folds in contributed requires + wrappers", async () => {
		const { plugins, ctxFactory } = collectExpoPlugins([uiExtras()]);
		const g = buildGraph(plugins, ctxFactory);
		const src = await g.resolve(expo.slots.metroConfig);
		expect(src).toContain('require("uniwind/metro")');
		expect(src).toContain("config = withUniwindConfig(config, {");
	});

	it("emits .stack/metro.config.js into the artifact files", async () => {
		const { plugins, ctxFactory } = collectExpoPlugins();
		const g = buildGraph(plugins, ctxFactory);
		const files = await g.resolve(cliSlots.artifactFiles);
		expect(files.map((f) => f.path)).toContain(".stack/metro.config.js");
	});
});

// ── expo config ───────────────────────────────────────────────────

describe("expo.slots.expoConfig", () => {
	it("derives name/slug/scheme and enables typed routes", async () => {
		const { plugins, ctxFactory } = collectExpoPlugins();
		const g = buildGraph(plugins, ctxFactory);
		const src = await g.resolve(expo.slots.expoConfig);
		expect(src).toContain('name: "WeNauti"');
		expect(src).toContain('slug: "wenauti"');
		expect(src).toContain('scheme: "wenauti"');
		expect(src).toContain('"expo-router"');
		expect(src).toContain("typedRoutes: true");
		// bundle id derives from the reversed app domain, collapsing the doubled
		// leaf when the domain's last label already equals the slug.
		expect(src).toContain("app.wenauti");
		expect(src).not.toContain("app.wenauti.wenauti");
	});

	it("keeps the leaf for a generic domain and guards illegal segments", async () => {
		const { plugins, ctxFactory } = collectExpoPlugins(
			[],
			{},
			{},
			{},
			{
				name: "MyApp",
				domain: "1example.com",
			},
		);
		const g = buildGraph(plugins, ctxFactory);
		const src = await g.resolve(expo.slots.expoConfig);
		// Domain label "1example" starts with a digit → prefixed to "a1example";
		// the slug leaf ("myapp") differs from the SLD so it is retained.
		expect(src).toContain("com.a1example.myapp");
	});

	it("honours a custom scheme", async () => {
		const { plugins, ctxFactory } = collectExpoPlugins([], { scheme: "wn" });
		const g = buildGraph(plugins, ctxFactory);
		expect(await g.resolve(expo.slots.expoConfig)).toContain('scheme: "wn"');
	});

	it("includes contributed config plugins", async () => {
		const { plugins, ctxFactory } = collectExpoPlugins([uiExtras()]);
		const g = buildGraph(plugins, ctxFactory);
		expect(await g.resolve(expo.slots.expoConfig)).toContain(
			'"expo-build-properties"',
		);
	});
});

// ── entry ─────────────────────────────────────────────────────────

describe("expo.slots.entrySource", () => {
	it("registers ExpoRoot at the default app dir", async () => {
		const { plugins, ctxFactory } = collectExpoPlugins();
		const g = buildGraph(plugins, ctxFactory);
		const src = await g.resolve(expo.slots.entrySource);
		expect(src).toContain("registerRootComponent(App)");
		expect(src).toContain('require.context("../src/app")');
	});

	it("wraps contributed providers around the root", async () => {
		const { plugins, ctxFactory } = collectExpoPlugins([uiExtras()]);
		const g = buildGraph(plugins, ctxFactory);
		const src = await g.resolve(expo.slots.entrySource);
		expect(src).toContain("SafeAreaProvider");
		expect(src).toContain(
			'import { SafeAreaProvider } from "react-native-safe-area-context";',
		);
	});
});

describe("expo.slots.routesDtsSource", () => {
	it("references expo-router's generated route types", async () => {
		const { plugins, ctxFactory } = collectExpoPlugins();
		const g = buildGraph(plugins, ctxFactory);
		expect(await g.resolve(expo.slots.routesDtsSource)).toContain(
			'reference types="expo-router/types"',
		);
	});
});

// ── routes disabled ───────────────────────────────────────────────

describe("expo with routes: false", () => {
	it("disables routing, entry, and routes.d.ts", async () => {
		const { plugins, ctxFactory } = collectExpoPlugins([], { routes: false });
		const g = buildGraph(plugins, ctxFactory);
		expect(await g.resolve(expo.slots.routesPagesDir)).toBeNull();
		expect(await g.resolve(expo.slots.entrySource)).toBeNull();
		expect(await g.resolve(expo.slots.routesDtsSource)).toBeNull();
		const config = await g.resolve(expo.slots.expoConfig);
		expect(config).not.toContain("typedRoutes");
		expect(config).not.toContain("expo-router");
	});

	it("skips the entry + routes.d.ts artifacts", async () => {
		const { plugins, ctxFactory } = collectExpoPlugins([], { routes: false });
		const g = buildGraph(plugins, ctxFactory);
		const paths = (await g.resolve(cliSlots.artifactFiles)).map((f) => f.path);
		expect(paths).toContain(".stack/metro.config.js");
		expect(paths).not.toContain(".stack/entry.tsx");
		expect(paths).not.toContain(".stack/routes.d.ts");
	});

	it("honours a custom app dir", async () => {
		const { plugins, ctxFactory } = collectExpoPlugins([], {
			routes: { appDir: "app" },
		});
		const g = buildGraph(plugins, ctxFactory);
		expect(await g.resolve(expo.slots.routesPagesDir)).toBe("app");
		expect(await g.resolve(expo.slots.entrySource)).toContain(
			'require.context("../app")',
		);
	});
});

// ── init scaffolds ────────────────────────────────────────────────

describe("expo init scaffolds", () => {
	it("scaffolds the four root config files", async () => {
		const { plugins, ctxFactory } = collectExpoPlugins();
		const g = buildGraph(plugins, ctxFactory);
		const targets = (await g.resolve(cliSlots.initScaffolds)).map(
			(s) => s.target,
		);
		expect(targets).toContain("metro.config.js");
		expect(targets).toContain("app.config.ts");
		expect(targets).toContain("babel.config.js");
		expect(targets).toContain("eas.json");
	});
});

// ── package.json main ─────────────────────────────────────────────

describe("expo → cliSlots.packageJsonFields", () => {
	it("points main at the generated entry when routing is enabled", async () => {
		const { plugins, ctxFactory } = collectExpoPlugins();
		const g = buildGraph(plugins, ctxFactory);
		const fields = await g.resolve(cliSlots.packageJsonFields);
		expect(fields.main).toBe(".stack/entry.tsx");
	});

	it("omits main when routing is disabled (bare RN owns the entry)", async () => {
		const { plugins, ctxFactory } = collectExpoPlugins([], { routes: false });
		const g = buildGraph(plugins, ctxFactory);
		const fields = await g.resolve(cliSlots.packageJsonFields);
		expect(fields.main).toBeUndefined();
	});
});

// ── EAS values ─────────────────────────────────────────────────────

describe("expo EAS slots", () => {
	it("defaults EAS profiles and channel", async () => {
		const { plugins, ctxFactory } = collectExpoPlugins();
		const g = buildGraph(plugins, ctxFactory);
		expect(await g.resolve(expo.slots.easBuildProfiles)).toEqual([
			"development",
			"preview",
			"production",
		]);
		expect(await g.resolve(expo.slots.easUpdateChannel)).toBe("production");
	});

	it("honours option overrides", async () => {
		const { plugins, ctxFactory } = collectExpoPlugins([], {
			easProfiles: ["staging"],
			updateChannel: "beta",
		});
		const g = buildGraph(plugins, ctxFactory);
		expect(await g.resolve(expo.slots.easBuildProfiles)).toEqual(["staging"]);
		expect(await g.resolve(expo.slots.easUpdateChannel)).toBe("beta");
	});
});

// ── commands ──────────────────────────────────────────────────────

describe("expo commands", () => {
	it("exposes dev / prebuild / build / update", () => {
		expect(Object.keys(expo.cli.commands).sort()).toEqual([
			"build",
			"dev",
			"prebuild",
			"update",
		]);
	});
});

// ── auto-wired footprint ──────────────────────────────────────────

describe("expo footprint", () => {
	it("gitignores the Expo cache + prebuild outputs", () => {
		expect(expo.cli.gitignore).toContain(".expo");
	});

	it("brings expo + expo-router consumer deps", () => {
		expect(expo.cli.dependencies.expo).toBeDefined();
		expect(expo.cli.dependencies["expo-router"]).toBeDefined();
	});
});

// ── order invariance ──────────────────────────────────────────────

describe("plugin order invariance", () => {
	it("produces identical artifacts regardless of plugin array order", async () => {
		const forward = collectExpoPlugins([uiExtras()]);
		const reverse = {
			plugins: [forward.plugins[2], forward.plugins[1], forward.plugins[0]],
			ctxFactory: forward.ctxFactory,
		} as { plugins: GraphPlugin[]; ctxFactory: GraphCtxFactory };

		const gF = buildGraph(forward.plugins, forward.ctxFactory);
		const gR = buildGraph(reverse.plugins, reverse.ctxFactory);

		for (const sl of [
			expo.slots.metroConfig,
			expo.slots.expoConfig,
			expo.slots.entrySource,
		]) {
			expect(await gR.resolve(sl)).toEqual(await gF.resolve(sl));
		}
	});
});

// ── schema validation ─────────────────────────────────────────────

describe("expoOptionsSchema", () => {
	it("rejects out-of-range / non-integer ports", () => {
		expect(() => expoOptionsSchema.parse({ port: 0 })).toThrow();
		expect(() => expoOptionsSchema.parse({ port: 70000 })).toThrow();
		expect(() => expoOptionsSchema.parse({ port: 8081.5 })).toThrow();
	});

	it("accepts routes: false and a custom appDir", () => {
		expect(expoOptionsSchema.parse({ routes: false }).routes).toBe(false);
		expect(
			expoOptionsSchema.parse({ routes: { appDir: "app" } }).routes,
		).toEqual({ appDir: "app" });
	});

	it("rejects an empty easProfiles list", () => {
		expect(() => expoOptionsSchema.parse({ easProfiles: [] })).toThrow();
	});
});
