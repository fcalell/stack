import type { ResolvedConfig } from "vite";
import { describe, expect, it } from "vitest";
import type { FontEntry } from "../types";
import { aggregateAppCss } from "./codegen";
import { defaultFonts, themeFontsPlugin } from "./fonts";

// ── Test helpers for themeFontsPlugin ──────────────────────────────

// Minimal shim for the subset of ResolvedConfig the plugin touches.
function fakeConfig(overrides?: Partial<ResolvedConfig>): ResolvedConfig {
	return {
		command: "serve",
		base: "/",
		logger: {
			info: () => {},
			warn: () => {},
			warnOnce: () => {},
			error: () => {},
			clearScreen: () => {},
			hasErrorLogged: () => false,
			hasWarned: false,
		},
		...overrides,
	} as unknown as ResolvedConfig;
}

// Tag entries the plugin emits (shape assembled inside transformIndexHtml).
interface HtmlTag {
	tag: string;
	injectTo: string;
	attrs?: Record<string, string | boolean>;
	children?: string;
}

// Drive `transformIndexHtml` against a given fonts array + config.
// Returns the tag list the plugin wants to inject, or throws if the
// plugin errors. Casts through unknown because the vite type surface
// returns `void | IndexHtmlTransformResult` but we always return an
// array from this plugin.
async function runTransform(
	fonts: FontEntry[],
	config: ResolvedConfig = fakeConfig(),
): Promise<HtmlTag[]> {
	const plugin = themeFontsPlugin(fonts);
	// biome-ignore lint/suspicious/noExplicitAny: test-only shim
	await (plugin as any).configResolved?.(config);
	const t = plugin.transformIndexHtml;
	if (!t || typeof t === "function") throw new Error("expected object hook");
	const handler = t.handler;
	if (!handler) throw new Error("expected handler");
	const result = await (
		handler as unknown as (
			this: { error: () => void; warn: () => void },
			html: string,
			ctx: unknown,
		) => HtmlTag[] | Promise<HtmlTag[]>
	).call({ error: () => {}, warn: () => {} }, "<html></html>", {});
	return result;
}

// ── aggregateAppCss ────────────────────────────────────────────────
//
// The aggregator is a pure function; these tests pin its output shape
// directly (no graph). `layers` is `Array<{ name, content }>` — list-slot
// semantics preserve contribution order, so the aggregator must not
// re-sort.

describe("aggregateAppCss", () => {
	it("returns null when no imports and no layers land", () => {
		expect(aggregateAppCss({ imports: [], layers: [] })).toBeNull();
	});

	it("emits just imports (followed by trailing newline) when no layers are contributed", () => {
		const src = aggregateAppCss({
			imports: ["tailwindcss", "@fcalell/plugin-solid-ui/globals.css"],
			layers: [],
		});
		expect(src).toBe(
			'@import "tailwindcss";\n@import "@fcalell/plugin-solid-ui/globals.css";\n',
		);
	});

	it("emits just layers (no leading blank line) when no imports are contributed", () => {
		const src = aggregateAppCss({
			imports: [],
			layers: [{ name: "base", content: ":root { color-scheme: dark; }" }],
		});
		expect(src).toBe("@layer base {\n:root { color-scheme: dark; }\n}\n");
	});

	it("preserves @import contribution order", () => {
		const src = aggregateAppCss({
			imports: ["first", "second", "third"],
			layers: [],
		});
		const lines = src?.split("\n").filter(Boolean) ?? [];
		expect(lines).toEqual([
			'@import "first";',
			'@import "second";',
			'@import "third";',
		]);
	});

	it("preserves @layer contribution order (no re-sort by name)", () => {
		// Deliberately non-alphabetical to catch an accidental sort.
		const src = aggregateAppCss({
			imports: [],
			layers: [
				{ name: "utilities", content: "/* utilities */" },
				{ name: "base", content: "/* base */" },
				{ name: "components", content: "/* components */" },
			],
		});
		const names =
			src
				?.match(/@layer (\w+) \{/g)
				?.map((m) => m.replace(/@layer (\w+) \{/, "$1")) ?? [];
		expect(names).toEqual(["utilities", "base", "components"]);
	});

	it("separates imports and layers with a single blank line", () => {
		const src = aggregateAppCss({
			imports: ["tailwindcss"],
			layers: [{ name: "base", content: "/* base */" }],
		});
		expect(src).toBe(
			'@import "tailwindcss";\n\n@layer base {\n/* base */\n}\n',
		);
	});

	it("renders structured imports with layer() and supports() modifiers", () => {
		const src = aggregateAppCss({
			imports: [
				{ url: "tailwindcss", layer: "theme" },
				{ url: "foo.css", supports: "(display: grid)" },
				{ url: "bar.css", layer: "utilities", supports: "(color: red)" },
			],
			layers: [],
		});
		expect(src).toBe(
			'@import "tailwindcss" layer(theme);\n' +
				'@import "foo.css" supports((display: grid));\n' +
				'@import "bar.css" layer(utilities) supports((color: red));\n',
		);
	});
});

// ── aggregateAppCss — escape & validation ──────────────────────────
//
// Bugs in scope: layer names and supports modifiers used to be
// interpolated raw, allowing CSS injection. The aggregator now routes
// every interpolation through the css-escape helpers and re-validates
// at render time as defense-in-depth. These tests assert two things:
//   (1) a malicious layer name is rejected with a precise error rather
//       than rendered into the stylesheet,
//   (2) a malicious supports expression is rejected likewise,
//   (3) a structured @import URL with quote/backslash chars escapes
//       safely in the rendered output.

describe("aggregateAppCss — escape & validation", () => {
	it("rejects an invalid @layer name", () => {
		expect(() =>
			aggregateAppCss({
				imports: [],
				layers: [{ name: "evil; @import url(http://x);", content: "" }],
			}),
		).toThrow(/css @layer name/);
	});

	it("rejects a malformed supports() expression in a structured @import", () => {
		expect(() =>
			aggregateAppCss({
				imports: [
					{ url: "tailwindcss", supports: "(display: grid); @import url(x)" },
				],
				layers: [],
			}),
		).toThrow(/supports/i);
	});

	it("rejects a non-ident layer() argument in a structured @import", () => {
		expect(() =>
			aggregateAppCss({
				imports: [{ url: "tailwindcss", layer: "1bad ident" }],
				layers: [],
			}),
		).toThrow(/layer/i);
	});

	it("escapes embedded quotes/backslashes in @import URLs", () => {
		const src = aggregateAppCss({
			imports: [`weird"path/with\\back.css`],
			layers: [],
		});
		// Output is double-quoted with the embedded quote/backslash escaped.
		expect(src).toBe(`@import "weird\\"path/with\\\\back.css";\n`);
	});

	it("escapes embedded quotes in layer content (passes through verbatim — content is opaque)", () => {
		// Layer content is treated as opaque CSS — solid-ui's own roled-font
		// emitter quotes through cssString. We pin the contract: aggregator
		// trims and emits content as-is, since it must allow legitimate
		// declarations. The token-css generator (in index.ts) is responsible
		// for escaping inside its own emission.
		const src = aggregateAppCss({
			imports: [],
			layers: [{ name: "base", content: "  /* inner */  " }],
		});
		expect(src).toBe("@layer base {\n/* inner */\n}\n");
	});
});

// ── themeFontsPlugin — file-IO resilience ──────────────────────────
//
// A bogus specifier must fail loudly with an actionable error, not
// warn-and-continue (which previously left consumers staring at
// unstyled text with nothing in the terminal to attribute it to).
// Covers the "silently emit broken CSS" case called out in the task.

describe("themeFontsPlugin file-IO resilience", () => {
	it("throws an actionable MissingFontError when a specifier does not resolve", async () => {
		const bogus: FontEntry = {
			family: "Nope",
			specifier: "@not-a-real-package/files/nope.woff2",
			weight: "400",
			style: "normal",
			fallback: {
				family: "sans-serif",
				ascentOverride: "90%",
				descentOverride: "22%",
				lineGapOverride: "0%",
				sizeAdjust: "100%",
			},
		};

		await expect(runTransform([bogus])).rejects.toThrow(
			/could not resolve font specifier/,
		);
		await expect(runTransform([bogus])).rejects.toThrow(/Nope/);
		// Must surface an actionable hint instead of the previous silent warn.
		await expect(runTransform([bogus])).rejects.toThrow(/installed/);
	});

	// The default JetBrainsMono specifier is a workspace dependency, so it
	// must resolve in dev mode and the plugin must emit the preload <link>
	// + @font-face <style> tags without throwing.
	it("resolves defaultFonts[0] (JetBrainsMono) cleanly in dev mode", async () => {
		const tags = await runTransform(defaultFonts);
		const preload = tags.find(
			(t) => t.tag === "link" && t.attrs?.rel === "preload",
		);
		expect(preload).toBeDefined();
		const style = tags.find((t) => t.tag === "style");
		expect(style).toBeDefined();
		expect(style?.children).toContain("@font-face");
	});

	// fonts: [] is the deliberate "no fonts" opt-out. The plugin must
	// emit exactly the anti-FOUC script — no preload links, no empty
	// <style> tag, no JetBrainsMono resurrection via a default param.
	it("fonts: [] emits only the anti-FOUC script (no style, no preload)", async () => {
		const tags = await runTransform([]);
		const scripts = tags.filter((t) => t.tag === "script");
		const styles = tags.filter((t) => t.tag === "style");
		const preloads = tags.filter(
			(t) => t.tag === "link" && t.attrs?.rel === "preload",
		);
		expect(scripts).toHaveLength(1);
		expect(styles).toHaveLength(0);
		expect(preloads).toHaveLength(0);
	});

	// CSS injection regression: a family name with a stray quote used to
	// break out of `font-family: '...';` and let arbitrary CSS land in the
	// emitted @font-face block. The rendered <style> children must escape
	// the quote and never contain a raw `}body{` payload.
	it("escapes hostile family names in @font-face declarations", async () => {
		const evil: FontEntry = {
			family: 'Evil"; }body{display:none}@font-face{font-family:"x',
			specifier:
				"@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2",
			weight: "400",
			style: "normal",
			fallback: {
				family: 'sans"serif',
				ascentOverride: "90%",
				descentOverride: "22%",
				lineGapOverride: "0%",
				sizeAdjust: "100%",
			},
		};
		const tags = await runTransform([evil]);
		const style = tags.find((t) => t.tag === "style");
		expect(style).toBeDefined();
		const css = style?.children ?? "";
		// The hostile sequence's leading quote MUST appear as the
		// escaped `\"`, never as a raw `Evil"; }` breakout that
		// terminates the surrounding `font-family:` declaration.
		expect(css).toMatch(/Evil\\"/);
		expect(css).not.toMatch(/Evil";/);
		// The `local(...)` argument in the fallback @font-face is also
		// a CSS <string>; the embedded `"` in `sans"serif` must escape
		// for the same reason.
		expect(css).toMatch(/local\("sans\\"serif"\)/);
	});
});
