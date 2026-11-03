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
	// The ui-core design contract: the knobs and the mode the app starts in.
	// Omitted, the calibrated defaults apply. A consumer with both platforms
	// passes the same object to the web plugin.
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
	// The stack app this app is a client of, as a path to its root relative to this
	// one (`"../hub"`), for an app that owns no server: with it the app needs no
	// `api()`, `auth()`, `db()` or deploy target, and no worker is generated.
	// `stack generate` copies the server's `.stack/schema.ts` (its procedures' input
	// schemas, which `Form` derives fields from and the entity invalidation reads)
	// into this app's `.stack/schema.ts`, and writes `.stack/server.ts`, which
	// exports the server's `AppRouter` type. The server's address is the app's to
	// choose at runtime (`createClient({ url })` takes a function).
	server: z.string().min(1).optional(),
});

export type NativeUiOptions = z.input<typeof nativeUiOptionsSchema>;

// The `theme` and `words` types are ui-core's, re-exported here so a consumer
// reaches them through the plugin it configures.
export type { Theme } from "@fcalell/ui-core/schema";
export type { Words } from "@fcalell/ui-core/tokens";
