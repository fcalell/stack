import type { ResolvedTheme } from "@fcalell/ui-core/derive";
import {
	modeTokens,
	shadowUtilities,
	themeTokens,
} from "@fcalell/ui-core/emit";
import { MODES } from "@fcalell/ui-core/tokens";

// The `@theme` record: the namespace resets lead, then the scales, the
// families and the invariant and light colors. On native every color
// utility resolves through the active theme's scoped variables, so which mode
// seeds `@theme` never shows at runtime.
export function themeDeclarations(
	resolved: ResolvedTheme,
): Record<string, string> {
	return themeTokens(resolved);
}

// `--shadow-*` is one of the reset namespaces, so the elevation ladder ships
// as top-level `@utility` blocks, name → declarations: a shadow, or under
// `elevation: "flat"` the `edge` ring.
export function shadowBlocks(
	resolved: ResolvedTheme,
): Array<[string, Record<string, string>]> {
	return Object.entries(shadowUtilities(resolved));
}

// Both `@variant` blocks carry every per-mode color, so the variable sets are
// equal by construction and uniwind's equal-set check can never fire on our
// output. No `color-scheme` declaration: `Appearance` sync is uniwind's job
// via `setTheme`, and a non-var declaration inside a `@variant` block is
// discovered and ignored.
export function modeBlocks(
	resolved: ResolvedTheme,
): Array<[string, Record<string, string>]> {
	return MODES.map((mode) => [mode, modeTokens(resolved, mode)]);
}
