import { themeSchema, wordsSchema } from "@fcalell/ui-core/schema";
import { z } from "zod";

// ── Plugin options ─────────────────────────────────────────────────

// A font file to embed natively through expo-font. The family it carries is
// named by `theme.fonts` (`sans`, `mono`); this entry only brings the file.
export const nativeFontSchema = z.object({
	// Native font-family name as registered with the OS / expo-font.
	family: z.string().min(1),
	// Path to the font file, consumer-relative.
	source: z.string().min(1),
});

export type NativeFontEntry = z.input<typeof nativeFontSchema>;

// Where a runtime client instance is imported from when wiring the Auth / Query
// providers into the generated `.stack/entry.tsx`. The consumer configures the
// client in `src/lib/` (per the native-provider-wiring decision); paths are
// resolved relative to `.stack/`.
export const clientModuleSchema = z.object({
	source: z.string().min(1),
	export: z.string().min(1),
});

export type ClientModule = z.input<typeof clientModuleSchema>;

export const nativeUiOptionsSchema = z.object({
	// The ui-core design contract: the knobs, per-token overrides and the mode
	// that seeds the `@theme` block. Omitted, the calibrated defaults apply. A
	// consumer with both platforms passes the same object to `solidUi`.
	theme: themeSchema.optional(),
	// Every word a molecule draws on its own, every key required. Omitted,
	// English.
	words: wordsSchema.optional(),
	// Font files to embed. Omitted, no file is embedded and the families named
	// by the theme are expected on the device.
	fonts: z.array(nativeFontSchema).optional(),
	// Module exporting the configured native auth client (`createAuthClient`).
	authClientModule: clientModuleSchema.optional(),
	// Module exporting the shared TanStack Query client (`createQueryClient`).
	queryClientModule: clientModuleSchema.optional(),
});

export type NativeUiOptions = z.input<typeof nativeUiOptionsSchema>;

// The `theme` and `words` types are ui-core's, re-exported here so a consumer
// reaches them through the plugin it configures.
export type { Theme } from "@fcalell/ui-core/schema";
export type { Words } from "@fcalell/ui-core/tokens";
