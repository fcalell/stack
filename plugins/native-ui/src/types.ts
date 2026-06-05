import { z } from "zod";
import { isCssIdent } from "./node/css";

// ── Plugin options ─────────────────────────────────────────────────

// A design-system theme: the set of semantic color tokens applied when the
// theme is active. The default theme's tokens also seed the `@theme` block, so
// the `bg-*` / `text-*` utilities exist and the baseline renders without a
// variant switch. `light` / `dark` reuse uniwind's built-ins (free system-sync
// and the `dark:` variant); any other name is registered via `extraThemes`.
export const themeSpecSchema = z.object({
	// Theme key — also the uniwind theme name passed to `Uniwind.setTheme`.
	name: z
		.string()
		.refine(isCssIdent, "theme name must be an ASCII CSS <ident>"),
	// Marks the baseline theme whose values seed `@theme`. Exactly one theme
	// should set this; the codegen falls back to the first theme otherwise.
	default: z.boolean().optional(),
	// Semantic color tokens keyed WITHOUT the `--color-` prefix (e.g. `canvas`,
	// `ink-1`). Each becomes a `--color-<key>` custom property → `bg-<key>` etc.
	colors: z.record(z.string(), z.string()),
});

export type ThemeSpec = z.input<typeof themeSpecSchema>;

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
	// Design-system themes (light + Notturno for WeNauti). Omit to use the
	// plugin's neutral defaults. At least one theme is required when provided.
	themeTokens: z.array(themeSpecSchema).min(1).optional(),
	// Fonts to register. Omitted → no custom fonts (system defaults).
	fonts: z.array(nativeFontSchema).optional(),
	// Module exporting the configured native auth client (`createAuthClient`).
	authClientModule: clientModuleSchema.optional(),
	// Module exporting the shared TanStack Query client (`createQueryClient`).
	queryClientModule: clientModuleSchema.optional(),
});

export type NativeUiOptions = z.input<typeof nativeUiOptionsSchema>;
