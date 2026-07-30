import type { ResolvedTheme } from "@fcalell/ui-core/derive";
import {
	modeTokens,
	shadowUtilities,
	themeTokens,
} from "@fcalell/ui-core/emit";
import { FONT_FALLBACKS, MODES } from "@fcalell/ui-core/tokens";
import { type NativeFontEntry, nativeFontSchema } from "../types";
import { cssString } from "./css";

// First font wins per role — later duplicates are ignored, matching how the
// `--font-<role>` token can only hold one family. Re-validates each entry
// (throws on bad input): the option schema rejects garbage on entry, but
// anything reaching here invalid is a bug we want loud.
function fontsByRole(fonts: NativeFontEntry[]): NativeFontEntry[] {
	const seen = new Set<NativeFontEntry["role"]>();
	const out: NativeFontEntry[] = [];
	for (const raw of fonts) {
		const font = nativeFontSchema.parse(raw);
		if (seen.has(font.role)) continue;
		seen.add(font.role);
		out.push(font);
	}
	return out;
}

// System fallbacks (ui-core's shared stacks) appended after a role's primary
// family so text still renders before the embedded font loads.
function fontStack(font: NativeFontEntry): string {
	return `${cssString(font.family)}, ${FONT_FALLBACKS[font.role]}`;
}

// The `@theme` record: the namespace resets lead, then the scales, then the
// invariant and default-mode colors, then the consumer's font tokens. On
// native every color utility resolves through the active theme's scoped
// variables, so which mode seeds `@theme` never shows at runtime — no
// web-style light pinning.
export function themeDeclarations(
	resolved: ResolvedTheme,
	fonts: NativeFontEntry[],
): Record<string, string> {
	const declarations = themeTokens(resolved);
	for (const font of fontsByRole(fonts)) {
		declarations[`--font-${font.role}`] = fontStack(font);
	}
	return declarations;
}

// `--shadow-*` is one of the reset namespaces, so the ladder ships as three
// top-level `@utility` blocks, name → box-shadow value.
export function shadowBlocks(resolved: ResolvedTheme): Array<[string, string]> {
	return Object.entries(shadowUtilities(resolved));
}

// Both `@variant` blocks carry all 26 per-mode colors, so the variable sets
// are equal by construction and uniwind's equal-set check can never fire on
// our output. No `color-scheme` declaration: `Appearance` sync is uniwind's
// job via `setTheme`, and a non-var declaration inside a `@variant` block is
// discovered and ignored.
export function modeBlocks(
	resolved: ResolvedTheme,
): Array<[string, Record<string, string>]> {
	return MODES.map((mode) => [mode, modeTokens(resolved, mode)]);
}
