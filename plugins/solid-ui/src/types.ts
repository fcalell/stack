import { z } from "zod";

// A single `@import` line. The shorthand form (a bare string) becomes
// `@import "<url>";`. The structured form lets plugins attach `layer(...)`
// or `supports(...)` modifiers without escaping them inside the URL string
// (e.g. Tailwind v4's `@import "tailwindcss" layer(theme)`).
export type CssImport =
	| string
	| { url: string; layer?: string; supports?: string };

// Aggregated inputs for the `.stack/app.css` derivation. Plugins contribute
// to `solidUi.slots.appCssImports` (CSS `@import`s, shorthand or structured)
// and `solidUi.slots.appCssLayers` (named `@layer` blocks); `aggregateAppCss`
// renders them to the final CSS source.
export interface CodegenAppCssPayload {
	imports: CssImport[];
	layers: Array<{ name: string; content: string }>;
}

// Typed schema for a webfont consumed by plugin-solid-ui. `themeFontsPlugin`
// preloads the woff2, declares `@font-face` (with fallback metrics), and —
// when `role` is set — rebinds the matching --ui-font-* token.
export const fontEntrySchema = z.object({
	// CSS family name used in `font-family` declarations (e.g. "Inter Variable").
	family: z.string(),
	// Node module path or workspace-relative path to the actual woff2 file
	// (e.g. "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2").
	specifier: z.string(),
	// A single weight ("400") or a variable-font range ("100 900").
	weight: z.string(),
	style: z.enum(["normal", "italic"]),
	// Binds this font to the matching --ui-font-* token (and, through the
	// Tailwind theme, to the font-sans / font-mono / font-serif utilities).
	role: z.enum(["sans", "mono", "serif"]).optional(),
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

// `fonts` is an array of FontEntry. Each entry is preloaded, gets an
// `@font-face` (real + fallback metrics) declaration, and — when `role` is
// set — rebinds the matching --ui-font-* token (sans / mono / serif) so the
// Tailwind utilities and design-system tokens pick it up. Defaults to
// `defaultFonts` (JetBrains Mono as mono).
export const solidUiOptionsSchema = z.object({
	fonts: z.array(fontEntrySchema).optional(),
});

export type SolidUiOptions = z.input<typeof solidUiOptionsSchema>;
