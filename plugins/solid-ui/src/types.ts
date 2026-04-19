import type { FontEntry } from "@fcalell/ui/fonts-manifest";

export type { FontEntry };

export interface SolidUiOptions {
	// Custom webfonts. Each entry is preloaded, gets an `@font-face` (real +
	// fallback metrics) declaration, and — when `role` is set — rebinds the
	// matching --ui-font-* token (sans / mono / serif) so the Tailwind
	// utilities and design-system tokens pick it up. Defaults to
	// `defaultFonts` from @fcalell/ui/fonts-manifest (JetBrains Mono as mono).
	fonts?: FontEntry[];
}
