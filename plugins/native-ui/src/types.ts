import { themeSchema } from "@fcalell/ui-core/schema";
import { z } from "zod";

// ── Plugin options ─────────────────────────────────────────────────

// A font family registered for the app. Contributes a `--font-<role>` token (so
// `font-sans` / `font-mono` resolve) and, when `source` is set, an `expo-font`
// config-plugin entry that embeds the file natively at build time.
export const nativeFontSchema = z.object({
	// Native font-family name as registered with the OS / expo-font.
	family: z.string().min(1),
	// Binds to the matching `--font-<role>` token and the `font-<role>` utility.
	role: z.enum(["sans", "mono", "serif"]),
	// Path to the font file (consumer-relative). When omitted, only the token is
	// emitted (the family is assumed already available, e.g. a system font).
	source: z.string().min(1).optional(),
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
	// The ui-core design contract: knobs, per-token overrides and the mode that
	// seeds the `@theme` block. Omitted, the calibrated defaults apply. A
	// consumer with both platforms passes the same object to `solidUi`.
	theme: themeSchema.optional(),
	// Fonts to register. Omitted → no custom fonts (system defaults).
	fonts: z.array(nativeFontSchema).optional(),
	// Module exporting the configured native auth client (`createAuthClient`).
	authClientModule: clientModuleSchema.optional(),
	// Module exporting the shared TanStack Query client (`createQueryClient`).
	queryClientModule: clientModuleSchema.optional(),
});

export type NativeUiOptions = z.input<typeof nativeUiOptionsSchema>;

// The `theme` option's own type. It is ui-core's, re-exported here so a
// consumer reaches it through the plugin it configures.
export type { Theme } from "@fcalell/ui-core/schema";
