import type { Slot } from "@fcalell/cli";
import { cliSlots } from "@fcalell/cli/cli-slots";
import {
	buildGraph,
	type GraphCtxFactory,
	type GraphPlugin,
} from "@fcalell/cli/graph";
import { api } from "@fcalell/plugin-api";
import { expo } from "@fcalell/plugin-expo";
import { describe, expect, it } from "vitest";
import { DEFAULT_THEMES } from "./defaults";
import { nativeUi } from "./index";
import type { NativeUiOptions } from "./types";

// ── Harness ────────────────────────────────────────────────────────
//
// Mirrors plugin-expo's harness: collect the real api + expo + native-ui
// plugins through `.cli.collect()` and resolve slots against a graph built the
// same way the CLI builds it. Reordering `plugins` must leave assertions green.

const app = { name: "WeNauti", domain: "wenauti.app" };

const noopLog = {
	info: () => {},
	warn: () => {},
	success: () => {},
	error: () => {},
};

function makeCtxFactory(
	perPluginOptions: Record<string, unknown> = {},
): GraphCtxFactory {
	return {
		app,
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

function toPlugin(
	name: string,
	collected: { slots?: unknown; contributes: unknown },
): GraphPlugin {
	return {
		name,
		slots: collected.slots as Record<string, Slot<unknown>>,
		contributes: collected.contributes as GraphPlugin["contributes"],
	};
}

function collect(
	nativeUiOpts: NativeUiOptions = {},
	expoOpts: Parameters<typeof expo>[0] = {},
	reversed = false,
): { plugins: GraphPlugin[]; ctxFactory: GraphCtxFactory } {
	const plugins = [
		toPlugin("api", api.cli.collect({ app, options: {} })),
		toPlugin("expo", expo.cli.collect({ app, options: expoOpts ?? {} })),
		toPlugin("native-ui", nativeUi.cli.collect({ app, options: nativeUiOpts })),
	];
	return {
		plugins: reversed ? plugins.reverse() : plugins,
		ctxFactory: makeCtxFactory({
			api: {},
			expo: expoOpts ?? {},
			"native-ui": nativeUiOpts,
		}),
	};
}

// ── Config factory ─────────────────────────────────────────────────

describe("native-ui config factory", () => {
	it("returns PluginConfig with __plugin 'native-ui'", () => {
		expect(nativeUi().__plugin).toBe("native-ui");
	});

	it("defaults to empty options", () => {
		expect(nativeUi().options).toEqual({});
	});
});

describe("native-ui.slots", () => {
	it("owns the design-system slots", () => {
		for (const name of [
			"themeTokens",
			"fonts",
			"appCssImports",
			"appCssSource",
		]) {
			expect(nativeUi.slots[name as keyof typeof nativeUi.slots].source).toBe(
				"native-ui",
			);
		}
	});
});

// ── global.css emission ────────────────────────────────────────────

describe("native-ui global.css", () => {
	it("renders the uniwind entry with imports, sources, @theme and variants", async () => {
		const { plugins, ctxFactory } = collect();
		const g = buildGraph(plugins, ctxFactory);
		const css = await g.resolve(nativeUi.slots.appCssSource);
		expect(css).not.toBeNull();
		const out = css ?? "";
		expect(out).toContain("@import 'tailwindcss';");
		expect(out).toContain("@import 'uniwind';");
		expect(out).toContain('@source "../src";');
		expect(out).toContain("@theme {");
		expect(out).toContain("@layer theme {");
		expect(out).toContain("@variant light {");
		expect(out).toContain("@variant dark {");
		// Default theme colors are present (neutral defaults).
		expect(out).toContain("--color-canvas:");
	});

	it("uses consumer themeTokens over the defaults", async () => {
		const themeTokens: NativeUiOptions["themeTokens"] = [
			{ name: "light", default: true, colors: { canvas: "#fefefe" } },
			{ name: "dark", colors: { canvas: "#010101" } },
		];
		const { plugins, ctxFactory } = collect({ themeTokens });
		const g = buildGraph(plugins, ctxFactory);
		const css = (await g.resolve(nativeUi.slots.appCssSource)) ?? "";
		expect(css).toContain("--color-canvas: #fefefe;");
		expect(css).toContain("--color-canvas: #010101;");
	});

	it("is emitted as a .stack/global.css artifact", async () => {
		const { plugins, ctxFactory } = collect();
		const g = buildGraph(plugins, ctxFactory);
		// cliSlots.artifactFiles is the universal sink; assert the file landed.
		const files = await g.resolve(cliSlots.artifactFiles);
		const globalCss = files.find((f) => f.path === ".stack/global.css");
		expect(globalCss).toBeDefined();
		expect(globalCss?.content).toContain("@import 'uniwind';");
	});
});

// ── Metro integration ──────────────────────────────────────────────

describe("native-ui Metro wiring", () => {
	it("wraps Metro with withUniwindConfig pointing at the generated css", async () => {
		const { plugins, ctxFactory } = collect();
		const g = buildGraph(plugins, ctxFactory);
		const metro = (await g.resolve(expo.slots.metroConfig)) ?? "";
		expect(metro).toContain(
			'const { withUniwindConfig } = require("uniwind/metro");',
		);
		expect(metro).toContain("withUniwindConfig(config,");
		expect(metro).toContain('"cssEntryFile": "./global.css"');
		expect(metro).toContain('"dtsFile": "./uniwind-types.d.ts"');
	});

	it("registers non-builtin theme names as extraThemes", async () => {
		const themeTokens: NativeUiOptions["themeTokens"] = [
			{ name: "light", default: true, colors: { canvas: "#fff" } },
			{ name: "dark", colors: { canvas: "#000" } },
			{ name: "contrast", colors: { canvas: "#ffff00" } },
		];
		const { plugins, ctxFactory } = collect({ themeTokens });
		const g = buildGraph(plugins, ctxFactory);
		const metro = (await g.resolve(expo.slots.metroConfig)) ?? "";
		expect(metro).toContain('"extraThemes"');
		expect(metro).toContain("contrast");
	});

	it("omits extraThemes when only builtin themes are used", async () => {
		const { plugins, ctxFactory } = collect();
		const g = buildGraph(plugins, ctxFactory);
		const metro = (await g.resolve(expo.slots.metroConfig)) ?? "";
		expect(metro).not.toContain("extraThemes");
	});
});

// ── Provider composition ───────────────────────────────────────────

describe("native-ui providers", () => {
	it("wraps the entry with the native provider stack, gesture outermost", async () => {
		const { plugins, ctxFactory } = collect();
		const g = buildGraph(plugins, ctxFactory);
		const entry = (await g.resolve(expo.slots.entrySource)) ?? "";

		for (const provider of [
			"GestureHandlerRootView",
			"KeyboardProvider",
			"SafeAreaProvider",
			"BottomSheetModalProvider",
			"QueryProvider",
			"AuthProvider",
		]) {
			expect(entry).toContain(`<${provider}`);
		}

		// Outer → inner ordering (lower order = outer wrapper).
		const order = [
			"GestureHandlerRootView",
			"KeyboardProvider",
			"SafeAreaProvider",
			"BottomSheetModalProvider",
			"QueryProvider",
			"AuthProvider",
		].map((p) => entry.indexOf(`<${p}`));
		const sorted = [...order].sort((a, b) => a - b);
		expect(order).toEqual(sorted);
		// AuthProvider is the innermost wrapper, just outside ExpoRoot.
		expect(entry.indexOf("<AuthProvider")).toBeLessThan(
			entry.indexOf("<ExpoRoot"),
		);
	});

	it("imports the providers and wires the consumer client modules", async () => {
		const { plugins, ctxFactory } = collect();
		const g = buildGraph(plugins, ctxFactory);
		const entry = (await g.resolve(expo.slots.entrySource)) ?? "";
		expect(entry).toContain(
			'import { GestureHandlerRootView } from "react-native-gesture-handler";',
		);
		expect(entry).toContain('from "@fcalell/plugin-auth/expo"');
		expect(entry).toContain('from "@fcalell/plugin-api/tanstack-query"');
		// Default client modules + props.
		expect(entry).toContain('import { authClient } from "../src/lib/auth";');
		expect(entry).toContain('import { queryClient } from "../src/lib/query";');
		expect(entry).toContain("client={authClient}");
		expect(entry).toContain("client={queryClient}");
		// GestureHandlerRootView fills the screen.
		expect(entry).toContain("flex: 1");
	});

	it("honours overridden client modules", async () => {
		const { plugins, ctxFactory } = collect({
			authClientModule: { source: "../src/auth", export: "myAuth" },
		});
		const g = buildGraph(plugins, ctxFactory);
		const entry = (await g.resolve(expo.slots.entrySource)) ?? "";
		expect(entry).toContain('import { myAuth } from "../src/auth";');
		expect(entry).toContain("client={myAuth}");
	});
});

// ── Fonts ──────────────────────────────────────────────────────────

describe("native-ui fonts", () => {
	it("adds an expo-font config plugin for fonts with a source file", async () => {
		const { plugins, ctxFactory } = collect({
			fonts: [
				{
					family: "Plus Jakarta Sans",
					role: "sans",
					source: "./assets/pjs.ttf",
				},
			],
		});
		const g = buildGraph(plugins, ctxFactory);
		const appConfig = (await g.resolve(expo.slots.expoConfig)) ?? "";
		expect(appConfig).toContain("expo-font");
		expect(appConfig).toContain("./assets/pjs.ttf");
	});

	it("omits the expo-font plugin when no fonts are configured", async () => {
		const { plugins, ctxFactory } = collect();
		const g = buildGraph(plugins, ctxFactory);
		const appConfig = (await g.resolve(expo.slots.expoConfig)) ?? "";
		expect(appConfig).not.toContain("expo-font");
	});
});

// ── Order invariance ───────────────────────────────────────────────

describe("native-ui order invariance", () => {
	it("produces identical output regardless of plugin array order", async () => {
		const forward = collect();
		const reversed = collect({}, {}, true);
		const gf = buildGraph(forward.plugins, forward.ctxFactory);
		const gr = buildGraph(reversed.plugins, reversed.ctxFactory);
		expect(await gr.resolve(expo.slots.entrySource)).toEqual(
			await gf.resolve(expo.slots.entrySource),
		);
		expect(await gr.resolve(nativeUi.slots.appCssSource)).toEqual(
			await gf.resolve(nativeUi.slots.appCssSource),
		);
	});

	it("ships neutral default themes", () => {
		expect(DEFAULT_THEMES.some((t) => t.name === "light" && t.default)).toBe(
			true,
		);
		expect(DEFAULT_THEMES.some((t) => t.name === "dark")).toBe(true);
	});
});
