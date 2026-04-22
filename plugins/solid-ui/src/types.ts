import { z } from "zod";
import type { FontEntry } from "./node/fonts";

export type { FontEntry };

// Aggregated inputs for the `.stack/app.css` derivation. Plugins contribute
// to `solidUi.slots.appCssImports` (raw `@import` URLs) and
// `solidUi.slots.appCssLayers` (named `@layer` blocks); `aggregateAppCss`
// renders them to the final CSS source.
export interface CodegenAppCssPayload {
	imports: string[];
	layers: Array<{ name: string; content: string }>;
}

// `fonts` is an array of FontEntry. Each entry is preloaded, gets an
// `@font-face` (real + fallback metrics) declaration, and — when `role` is
// set — rebinds the matching --ui-font-* token (sans / mono / serif) so the
// Tailwind utilities and design-system tokens pick it up. Defaults to
// `defaultFonts` (JetBrains Mono as mono).
//
// `z.custom<FontEntry>()` defers the shape to the FontEntry type; the
// runtime validation just checks `Array.isArray`.
export const solidUiOptionsSchema = z.object({
	fonts: z.array(z.custom<FontEntry>()).optional(),
});

export type SolidUiOptions = z.input<typeof solidUiOptionsSchema>;
