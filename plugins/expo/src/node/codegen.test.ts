import type { ProviderSpec } from "@fcalell/cli/ast";
import { describe, expect, it } from "vitest";
import {
	aggregateEntry,
	aggregateExpoConfig,
	aggregateMetroConfig,
	buildRoutesDts,
} from "./codegen";

// ── metro.config.js ────────────────────────────────────────────────

describe("aggregateMetroConfig", () => {
	it("emits a CommonJS config built on getDefaultConfig", () => {
		const out = aggregateMetroConfig({ requires: [], wrappers: [] });
		expect(out).toContain(
			'const { getDefaultConfig } = require("expo/metro-config");',
		);
		expect(out).toContain("const config = getDefaultConfig(__dirname);");
		expect(out).toContain("module.exports = config;");
		// No wrappers → no reassignment, so the binding stays `const`.
		expect(out).not.toContain("let config");
	});

	it("applies wrappers around the base config with JSON-rendered options", () => {
		const out = aggregateMetroConfig({
			requires: [{ names: ["withUniwindConfig"], module: "uniwind/metro" }],
			wrappers: [
				{
					callee: "withUniwindConfig",
					options: { cssEntryFile: "./src/global.css" },
				},
			],
		});
		expect(out).toContain(
			'const { withUniwindConfig } = require("uniwind/metro");',
		);
		expect(out).toContain("let config = getDefaultConfig(__dirname);");
		expect(out).toContain("config = withUniwindConfig(config, {");
		expect(out).toContain('"cssEntryFile": "./src/global.css"');
	});

	it("orders wrappers by `order` then callee, deterministically", () => {
		const out = aggregateMetroConfig({
			requires: [],
			wrappers: [
				{ callee: "withB", order: 2 },
				{ callee: "withA", order: 1 },
			],
		});
		const a = out.indexOf("config = withA(config)");
		const b = out.indexOf("config = withB(config)");
		expect(a).toBeGreaterThan(-1);
		expect(b).toBeGreaterThan(a);
	});

	it("dedupes requires by module, merging destructured names", () => {
		const out = aggregateMetroConfig({
			requires: [
				{ names: ["a"], module: "shared" },
				{ names: ["b"], module: "shared" },
			],
			wrappers: [],
		});
		expect(out).toContain('const { a, b } = require("shared");');
		// One require line per module.
		expect(out.match(/require\("shared"\)/g)).toHaveLength(1);
	});
});

// ── app.config.ts ──────────────────────────────────────────────────

describe("aggregateExpoConfig", () => {
	const base = {
		name: "WeNauti",
		slug: "wenauti",
		scheme: "wenauti",
		bundleIdentifier: "app.wenauti",
		androidPackage: "app.wenauti",
		plugins: [{ name: "expo-router" }],
		typedRoutes: true,
	};

	it("emits a typed ExpoConfig with the core fields", () => {
		const out = aggregateExpoConfig(base);
		expect(out).toContain('import type { ExpoConfig } from "expo/config";');
		expect(out).toContain("const config: ExpoConfig = {");
		expect(out).toContain('name: "WeNauti"');
		expect(out).toContain('slug: "wenauti"');
		expect(out).toContain('scheme: "wenauti"');
		expect(out).toContain('bundleIdentifier: "app.wenauti"');
		expect(out).toContain('package: "app.wenauti"');
		// "automatic" so the app follows the OS light/dark setting.
		expect(out).toContain('userInterfaceStyle: "automatic"');
		expect(out).toContain("newArchEnabled: true");
		expect(out).toContain("export default config;");
	});

	it("lists expo-router and enables typed routes when routing is on", () => {
		const out = aggregateExpoConfig(base);
		expect(out).toContain('"expo-router"');
		expect(out).toContain("experiments: {");
		expect(out).toContain("typedRoutes: true");
	});

	it("omits typed routes when routing is disabled", () => {
		const out = aggregateExpoConfig({
			...base,
			typedRoutes: false,
			plugins: [],
		});
		expect(out).not.toContain("typedRoutes");
		expect(out).not.toContain("experiments");
	});

	it("renders a config plugin with options as a [name, options] tuple", () => {
		const out = aggregateExpoConfig({
			...base,
			plugins: [
				{ name: "expo-router" },
				{
					name: "expo-build-properties",
					options: { ios: { deploymentTarget: "16.0" } },
				},
			],
		});
		expect(out).toContain('"expo-build-properties"');
		expect(out).toContain('"deploymentTarget": "16.0"');
	});
});

// ── entry.tsx ──────────────────────────────────────────────────────

describe("aggregateEntry", () => {
	it("returns null when routing is disabled (no root to mount)", () => {
		expect(
			aggregateEntry({ imports: [], providers: [], appContextPath: null }),
		).toBeNull();
	});

	it("registers an ExpoRoot rooted at the require.context path", () => {
		const out = aggregateEntry({
			imports: [],
			providers: [],
			appContextPath: "../src/app",
		});
		expect(out).not.toBeNull();
		if (!out) return;
		expect(out).toContain('import { registerRootComponent } from "expo";');
		expect(out).toContain('import { ExpoRoot } from "expo-router";');
		expect(out).toContain('require.context("../src/app")');
		expect(out).toContain("ExpoRoot");
		expect(out).toContain("export const App");
		expect(out).toContain("registerRootComponent(App)");
	});

	it("wraps providers around the root, outermost = lowest order", () => {
		const providers: ProviderSpec[] = [
			{
				imports: [{ source: "@app/outer", named: ["Outer"] }],
				wrap: { identifier: "Outer" },
				order: 0,
			},
			{
				imports: [{ source: "@app/inner", named: ["Inner"] }],
				wrap: { identifier: "Inner" },
				order: 10,
			},
		];
		const out = aggregateEntry({
			imports: [],
			providers,
			appContextPath: "../src/app",
		});
		expect(out).not.toBeNull();
		if (!out) return;
		expect(out).toContain('import { Outer } from "@app/outer";');
		expect(out).toContain('import { Inner } from "@app/inner";');
		// Outer (order 0) must enclose Inner (order 10), which encloses the
		// router root. Match `<ExpoRoot` (the element) not `ExpoRoot` (also in
		// the import line at the top of the file).
		expect(out.indexOf("<Outer>")).toBeLessThan(out.indexOf("<Inner>"));
		expect(out.indexOf("<Inner>")).toBeLessThan(out.indexOf("<ExpoRoot"));
	});
});

// ── routes.d.ts ────────────────────────────────────────────────────

describe("buildRoutesDts", () => {
	it("delegates typed routes to expo-router via a triple-slash reference", () => {
		expect(buildRoutesDts()).toContain(
			'/// <reference types="expo-router/types" />',
		);
	});
});
