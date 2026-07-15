import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Slot } from "@fcalell/cli";
import type { ProviderSpec } from "@fcalell/cli/ast";
import { cliSlots } from "@fcalell/cli/cli-slots";
import {
	buildGraph,
	type GraphCtxFactory,
	type GraphPlugin,
} from "@fcalell/cli/graph";
import { buildTestGraphFromPlugins } from "@fcalell/cli/testing";
import { api, type PluginRuntimeEntry } from "@fcalell/plugin-api";
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
	const apiCollected = api.cli.collect({
		app,
		options: api(apiOpts ?? {}).options,
	});
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

// A stand-in for db/auth: contributes a plugin runtime entry so
// `api.slots.workerSource` has something to render (it resolves to `null`
// with no runtimes and no routes, regardless of middleware contributions —
// see plugin-api's `workerSource` derivation). Mirrors plugin-api's own
// `dbLike` test fixture.
function dbLikeRuntime(): GraphPlugin {
	return {
		name: "db",
		contributes: [
			api.slots.pluginRuntimes.contribute(
				(): PluginRuntimeEntry => ({
					plugin: "db",
					import: { source: "@pkg/db/runtime", default: "dbRuntime" },
					identifier: "dbRuntime",
					options: {},
				}),
			),
		],
	};
}

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

	it("emits .stack/metro.config.cjs into the artifact files", async () => {
		const { plugins, ctxFactory } = collectExpoPlugins();
		const g = buildGraph(plugins, ctxFactory);
		const files = await g.resolve(cliSlots.artifactFiles);
		const paths = files.map((f) => f.path);
		expect(paths).toContain(".stack/metro.config.cjs");
		expect(paths).not.toContain(".stack/metro.config.js");
	});

	it("emits the app config as loadable CommonJS .stack/app.config.cjs, not .ts/.js", async () => {
		// Regression: a `.ts`/`.js` here breaks `expo config`/`export`. Expo's
		// loader transpiles only the root shim, then require()s this through Node;
		// a `.ts` can't be required, and a `.js` in this `type: module` package is
		// parsed as ESM and its `module.exports` throws. `.cjs` always loads.
		const { plugins, ctxFactory } = collectExpoPlugins();
		const g = buildGraph(plugins, ctxFactory);
		const files = await g.resolve(cliSlots.artifactFiles);
		const paths = files.map((f) => f.path);
		expect(paths).toContain(".stack/app.config.cjs");
		expect(paths).not.toContain(".stack/app.config.ts");
		expect(paths).not.toContain(".stack/app.config.js");
		const cfg = files.find((f) => f.path === ".stack/app.config.cjs");
		expect(cfg?.content).toContain("module.exports = config;");
		expect(cfg?.content).not.toContain("import type");
	});

	it("emits .stack/expo-env.d.ts with the ambient-types reference", async () => {
		// The app tsconfig includes this to resolve require.context + EXPO_PUBLIC.
		const { plugins, ctxFactory } = collectExpoPlugins();
		const g = buildGraph(plugins, ctxFactory);
		const files = await g.resolve(cliSlots.artifactFiles);
		const envDts = files.find((f) => f.path === ".stack/expo-env.d.ts");
		expect(envDts?.content).toContain('reference types="expo/types"');
	});

	it("contributes @types/react so the app tsconfig resolves JSX types", async () => {
		const { plugins, ctxFactory } = collectExpoPlugins();
		const g = buildGraph(plugins, ctxFactory);
		const devDeps = await g.resolve(cliSlots.initDevDeps);
		expect(devDeps["@types/react"]).toBeDefined();
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

// ── configPlugins option (native modules) ─────────────────────────

describe("expo configPlugins option", () => {
	it("merges consumer config plugins into the app.config plugins array", async () => {
		const { plugins, ctxFactory } = collectExpoPlugins([], {
			configPlugins: [
				{ name: "expo-apple-authentication" },
				{
					name: "@react-native-google-signin/google-signin",
					options: { iosUrlScheme: "com.googleusercontent.apps.test" },
				},
			],
		});
		const g = buildGraph(plugins, ctxFactory);
		const src = await g.resolve(expo.slots.expoConfig);
		expect(src).toContain('"expo-apple-authentication"');
		expect(src).toContain('"@react-native-google-signin/google-signin"');
		expect(src).toContain('"iosUrlScheme": "com.googleusercontent.apps.test"');
	});

	it("installs config-plugin dependencies via initDeps", async () => {
		const { plugins, ctxFactory } = collectExpoPlugins([], {
			configPlugins: [
				{
					name: "expo-apple-authentication",
					dependencies: { "expo-apple-authentication": "~56.0.4" },
				},
				{
					name: "@react-native-google-signin/google-signin",
					options: { iosUrlScheme: "x" },
					dependencies: {
						"@react-native-google-signin/google-signin": "^16.0.0",
					},
				},
			],
		});
		const g = buildGraph(plugins, ctxFactory);
		const deps = await g.resolve(cliSlots.initDeps);
		expect(deps["expo-apple-authentication"]).toBe("~56.0.4");
		expect(deps["@react-native-google-signin/google-signin"]).toBe("^16.0.0");
	});

	it("contributes nothing when no config plugins are declared", async () => {
		const { plugins, ctxFactory } = collectExpoPlugins();
		const g = buildGraph(plugins, ctxFactory);
		// expo-router is the only plugin entry; no consumer modules leak in.
		const src = await g.resolve(expo.slots.expoConfig);
		expect(src).not.toContain("google-signin");
		expect(src).not.toContain("apple-authentication");
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
		expect(paths).toContain(".stack/metro.config.cjs");
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
		expect(targets).toContain("babel.config.cjs");
		expect(targets).toContain("eas.json");
	});
});

// ── native API client scaffold (WS4 client half) ────────────────────

describe("expo init scaffolds → src/lib/api.ts", () => {
	it("scaffolds src/lib/api.ts", async () => {
		const { plugins, ctxFactory } = collectExpoPlugins();
		const g = buildGraph(plugins, ctxFactory);
		const targets = (await g.resolve(cliSlots.initScaffolds)).map(
			(s) => s.target,
		);
		expect(targets).toContain("src/lib/api.ts");
	});

	it("removes src/lib/api.ts on `stack remove expo`", async () => {
		const { plugins, ctxFactory } = collectExpoPlugins();
		const g = buildGraph(plugins, ctxFactory);
		const files = await g.resolve(cliSlots.removeFiles);
		expect(files).toContain("src/lib/api.ts");
	});

	it("resolves to the on-disk template stamping headers + the update signal", async () => {
		// The hand-rolled harness above fakes `ctx.template`; real template
		// resolution needs the production `plugin()` closure, so drive this one
		// through `buildTestGraphFromPlugins` (real graph, real ctx) per
		// `.claude/playbooks/testing.md`.
		const { graph } = buildTestGraphFromPlugins({
			plugins: [
				{ factory: api, options: {} },
				{ factory: expo, options: {} },
			],
		});
		const scaffolds = await graph.resolve(cliSlots.initScaffolds);
		const apiClient = scaffolds.find((s) => s.target === "src/lib/api.ts");
		expect(apiClient).toBeDefined();
		if (apiClient) {
			const src = readFileSync(fileURLToPath(apiClient.source), "utf8");
			expect(src).toContain(
				'import { createVersionGatedFetch } from "@fcalell/plugin-expo/client";',
			);
			expect(src).toContain("createApiQueryUtils");
			expect(src).toContain('from "../../.stack/worker"');
		}
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

// ── client version gate (WS4) ──────────────────────────────────────

describe("expo → api.slots.workerSource (client version gate)", () => {
	it("wires the versionGate middleware when minNativeBuild is set", async () => {
		const { plugins, ctxFactory } = collectExpoPlugins([dbLikeRuntime()], {
			minNativeBuild: { ios: 10 },
		});
		const g = buildGraph(plugins, ctxFactory);
		const src = await g.resolve(api.slots.workerSource);
		expect(src).toContain(
			'import { versionGate } from "@fcalell/plugin-expo/version-gate";',
		);
		expect(src).toContain(".use(versionGate({ ios: 10, android: 0 }))");
	});

	it("omits the versionGate middleware when minNativeBuild is unset", async () => {
		const { plugins, ctxFactory } = collectExpoPlugins([dbLikeRuntime()]);
		const g = buildGraph(plugins, ctxFactory);
		const src = await g.resolve(api.slots.workerSource);
		expect(src).not.toContain("versionGate");
	});

	it("omits the versionGate middleware when both floors are 0", async () => {
		const { plugins, ctxFactory } = collectExpoPlugins([dbLikeRuntime()], {
			minNativeBuild: { ios: 0, android: 0 },
		});
		const g = buildGraph(plugins, ctxFactory);
		const src = await g.resolve(api.slots.workerSource);
		expect(src).not.toContain("versionGate");
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
