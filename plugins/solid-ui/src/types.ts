import { themeSchema, wordsSchema } from "@fcalell/ui-core/schema";
import { z } from "zod";
import { isCssIdent, isCssSupportsExpression } from "./node/css-escape.ts";

// A single `@import` line. The shorthand form (a bare string) becomes
// `@import "<url>";`. The structured form lets plugins attach `layer(...)`
// or `supports(...)` modifiers without escaping them inside the URL string
// (e.g. Tailwind v4's `@import "tailwindcss" layer(theme)`).
//
// Validation lives at the contribution boundary so the slot rejects
// garbage inputs eagerly — the error then names the bad plugin instead
// of producing mysterious CSS at render time.
export const cssImportSchema = z.union([
	z.string().min(1, "css @import url must be a non-empty string"),
	z.object({
		url: z.string().min(1, "css @import url must be a non-empty string"),
		layer: z
			.string()
			.optional()
			.refine(
				(v) => v === undefined || isCssIdent(v),
				"css @import layer(...) argument must be a CSS <ident>",
			),
		supports: z
			.string()
			.optional()
			.refine(
				(v) => v === undefined || isCssSupportsExpression(v),
				"css @import supports(...) argument must be a balanced parenthesized feature query without ';' / '{' / '}'",
			),
	}),
]);

export type CssImport = z.input<typeof cssImportSchema>;

// `@layer <name>` — name must be a CSS <ident>.
export const cssLayerSchema = z.object({
	name: z
		.string()
		.refine((v) => isCssIdent(v), "css @layer name must be a CSS <ident>"),
	content: z.string(),
});

export type CssLayer = z.input<typeof cssLayerSchema>;

// A top-level block: the two Tailwind v4 at-rules that cannot sit inside a
// `@layer`. `theme` seeds the design tokens (`@theme { … }`); `utility`
// declares one custom utility (`@utility shadow-float { … }`). Both bodies are
// declaration records, rendered property-by-property through the CSS render
// boundary.
const cssDeclarationsSchema = z.record(z.string(), z.string());

export const cssBlockSchema = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("theme"),
		declarations: cssDeclarationsSchema,
	}),
	z.object({
		kind: z.literal("utility"),
		// Validated at the render boundary by `cssIdent`, so a malformed name
		// throws an error that names the contributing plugin.
		name: z.string(),
		declarations: cssDeclarationsSchema,
	}),
]);

export type CssBlock = z.input<typeof cssBlockSchema>;

// Aggregated inputs for the `.stack/app.css` derivation. Plugins contribute
// to `solidUi.slots.appCssImports` (CSS `@import`s, shorthand or structured),
// `solidUi.slots.appCssBlocks` (top-level `@theme` / `@utility` blocks) and
// `solidUi.slots.appCssLayers` (named `@layer` blocks); `aggregateAppCss`
// renders them to the final CSS source.
export interface CodegenAppCssPayload {
	imports: CssImport[];
	blocks: CssBlock[];
	layers: CssLayer[];
}

// A webfont file consumed by plugin-solid-ui. `themeFontsPlugin` preloads the
// woff2 and declares `@font-face` (with fallback metrics). Which family the
// contract binds to `sans` or `mono` is the theme's `fonts` knob; an entry
// here only makes a family's file load.
export const fontEntrySchema = z.object({
	// CSS family name used in `font-family` declarations (e.g. "Inter Variable").
	family: z.string(),
	// Node module path or workspace-relative path to the actual woff2 file
	// (e.g. "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2").
	specifier: z.string(),
	// A single weight ("400") or a variable-font range ("100 900").
	weight: z.string(),
	style: z.enum(["normal", "italic"]),
	// Fallback-font metrics used to generate a sibling `@font-face` that
	// matches the webfont's metrics on top of a system family. Prevents CLS
	// while the woff2 loads.
	fallback: z.object({
		family: z.string(),
		ascentOverride: z.string(),
		descentOverride: z.string(),
		lineGapOverride: z.string(),
		sizeAdjust: z.string(),
	}),
});

export type FontEntry = z.infer<typeof fontEntrySchema>;

// `fonts` is the font files to load: each entry is preloaded and gets an
// `@font-face` (real + fallback metrics). Defaults to `defaultFonts`
// (JetBrains Mono Variable, the contract's default `mono` family).
//
// `theme` carries the ui-core design contract: the knobs, per-token
// overrides and the mode that seeds the `@theme` block. Omitted, the
// calibrated defaults apply. `defaultMode` is inert on the web runtime, which
// resolves the mode from `localStorage` then `prefers-color-scheme`.
//
// `words` is every word a molecule draws on its own, every key required;
// omitted, the components speak English.
export const solidUiOptionsSchema = z.object({
	fonts: z.array(fontEntrySchema).optional(),
	theme: themeSchema.optional(),
	words: wordsSchema.optional(),
});

export type SolidUiOptions = z.input<typeof solidUiOptionsSchema>;

// The `theme` option's own type. It is ui-core's, re-exported here so a
// consumer reaches it through the plugin it configures.
export type { Theme } from "@fcalell/ui-core/schema";
export type { Words } from "@fcalell/ui-core/tokens";
