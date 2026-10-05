import type { ResolvedTheme } from "@fcalell/ui-core/derive";
import {
	modeTokens,
	nativeMeasureTokens,
	shadowUtilities,
	themeTokens,
} from "@fcalell/ui-core/emit";
import { HAIRLINE_PX, MODES } from "@fcalell/ui-core/tokens";

// The `@theme` record: the namespace resets lead, then the scales, the
// families and the invariant and light colors, the two measures in px since
// uniwind reads no `ch`, and the hairline every border reads (the web has it
// on the root). On native every color
// utility resolves through the active theme's scoped variables, so which mode
// seeds `@theme` never shows at runtime.
export function themeDeclarations(
	resolved: ResolvedTheme,
): Record<string, string> {
	return {
		...themeTokens(resolved),
		...nativeMeasureTokens(resolved),
		"--hairline": `${HAIRLINE_PX}px`,
	};
}

// The utilities native declares itself, as top-level `@utility` blocks, name →
// declarations. `--shadow-*` is one of the reset namespaces, so the elevation
// ladder ships here, each level reading its mode's variable. `tabular-nums`
// is redeclared plain: Tailwind composes `font-variant-numeric` from unset
// `--tw-*` variables, which uniwind (from 1.11) resolves to empty
// `fontVariant` tokens that React Native logs as unsupported.
export function utilityBlocks(): Array<[string, Record<string, string>]> {
	return [
		...Object.entries(shadowUtilities()),
		["tabular-nums", { "font-variant-numeric": "tabular-nums" }],
	];
}

// Both `@variant` blocks carry every per-mode value (the colors and the two
// shadows, by full custom-property name), so the variable sets are equal by
// construction and uniwind's equal-set check can never fire on our output.
// No `color-scheme` declaration: `Appearance` sync is uniwind's job via
// `setTheme`, and a non-var declaration inside a `@variant` block is
// discovered and ignored.
export function modeBlocks(
	resolved: ResolvedTheme,
): Array<[string, Record<string, string>]> {
	return MODES.map((mode) => [mode, modeTokens(resolved, mode)]);
}
