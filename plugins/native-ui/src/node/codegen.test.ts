import { describe, expect, it } from "vitest";
import type { NativeFontEntry, ThemeSpec } from "../types";
import { aggregateGlobalCss, type CodegenGlobalCssPayload } from "./codegen";

const LIGHT: ThemeSpec = {
	name: "light",
	default: true,
	colors: { canvas: "#ffffff", "ink-1": "#111111" },
};
const DARK: ThemeSpec = {
	name: "dark",
	colors: { canvas: "#000000", "ink-1": "#fafafa" },
};

function payload(
	over: Partial<CodegenGlobalCssPayload> = {},
): CodegenGlobalCssPayload {
	return {
		themes: [LIGHT, DARK],
		fonts: [],
		baseTokens: { "--radius-md": "10px" },
		sources: ["../src", "../node_modules/@fcalell/plugin-native-ui/src"],
		extraImports: [],
		...over,
	};
}

describe("aggregateGlobalCss", () => {
	it("emits the mandatory tailwindcss + uniwind imports first", () => {
		const css = aggregateGlobalCss(payload());
		expect(css).toContain("@import 'tailwindcss';");
		expect(css).toContain("@import 'uniwind';");
		// uniwind must be after tailwindcss.
		expect(css.indexOf("'uniwind'")).toBeGreaterThan(
			css.indexOf("'tailwindcss'"),
		);
	});

	it("emits @source roots so uniwind scans the app + this plugin", () => {
		const css = aggregateGlobalCss(payload());
		expect(css).toContain('@source "../src";');
		expect(css).toContain(
			'@source "../node_modules/@fcalell/plugin-native-ui/src";',
		);
	});

	it("puts base tokens and the default theme's colors in @theme", () => {
		const css = aggregateGlobalCss(payload());
		const themeBlock = css.slice(
			css.indexOf("@theme {"),
			css.indexOf("@layer"),
		);
		expect(themeBlock).toContain("--radius-md: 10px;");
		// Default (light) colors seed @theme so utilities exist + light is default.
		expect(themeBlock).toContain("--color-canvas: #ffffff;");
		expect(themeBlock).toContain("--color-ink-1: #111111;");
	});

	it("emits every theme as a switchable @variant under @layer theme", () => {
		const css = aggregateGlobalCss(payload());
		const layer = css.slice(css.indexOf("@layer theme {"));
		expect(layer).toContain(":root {");
		expect(layer).toContain("@variant light {");
		expect(layer).toContain("@variant dark {");
		// dark overrides carry the dark values.
		const darkBlock = layer.slice(layer.indexOf("@variant dark {"));
		expect(darkBlock).toContain("--color-canvas: #000000;");
	});

	it("selects the default theme for @theme, not just the first", () => {
		const css = aggregateGlobalCss(
			payload({
				themes: [
					{ name: "dark", colors: { canvas: "#000000" } },
					{ name: "light", default: true, colors: { canvas: "#ffffff" } },
				],
			}),
		);
		const themeBlock = css.slice(
			css.indexOf("@theme {"),
			css.indexOf("@layer"),
		);
		expect(themeBlock).toContain("--color-canvas: #ffffff;");
		expect(themeBlock).not.toContain("--color-canvas: #000000;");
	});

	it("renders --font-<role> tokens with a fallback stack", () => {
		const fonts: NativeFontEntry[] = [
			{ family: "Plus Jakarta Sans", role: "sans", source: "./pjs.ttf" },
			{ family: "Geist Mono", role: "mono", source: "./geist.ttf" },
		];
		const css = aggregateGlobalCss(payload({ fonts }));
		expect(css).toContain(
			'--font-sans: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;',
		);
		expect(css).toContain('--font-mono: "Geist Mono", ui-monospace');
	});

	it("keeps the first font per role", () => {
		const fonts: NativeFontEntry[] = [
			{ family: "First", role: "sans" },
			{ family: "Second", role: "sans" },
		];
		const css = aggregateGlobalCss(payload({ fonts }));
		expect(css).toContain('--font-sans: "First"');
		expect(css).not.toContain("Second");
	});

	it("rejects a token value that could break out of its declaration", () => {
		expect(() =>
			aggregateGlobalCss(
				payload({
					themes: [{ name: "light", default: true, colors: { x: "#fff; }" } }],
				}),
			),
		).toThrow();
	});

	it("rejects a non-ident theme name", () => {
		expect(() =>
			aggregateGlobalCss(
				payload({ themes: [{ name: "1bad", colors: { x: "#fff" } }] }),
			),
		).toThrow();
	});
});
