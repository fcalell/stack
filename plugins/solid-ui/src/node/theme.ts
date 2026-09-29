import type { ResolvedTheme } from "@fcalell/ui-core/derive";
import {
	compactTokens,
	modeTokens,
	shadowUtilities,
	themeTokens,
} from "@fcalell/ui-core/emit";
import type { CssBlock, CssLayer } from "../types.ts";
import { renderClassRule, renderMediaRootRule } from "./codegen.ts";

// The tokens the web owns on top of the shared contract: motion. The font
// families are the contract's (`--font-sans`, `--font-mono` from the theme's
// `fonts` knob), so nothing font-shaped lives here.
const WEB_ONLY: Record<string, string> = {
	"--ease-ui": "cubic-bezier(0.4, 0, 0.2, 1)",
	"--duration-fast": "100ms",
	"--duration-base": "150ms",
	"--animate-content-show": "content-show 150ms var(--ease-ui)",
	"--animate-content-hide": "content-hide 150ms var(--ease-ui)",
};

// The `@theme` block seeds the light palette (the web has a `dark` custom
// variant and no `light` one), then the web's motion tokens.
export function themeBlock(resolved: ResolvedTheme): CssBlock {
	return {
		kind: "theme",
		declarations: { ...themeTokens(resolved), ...WEB_ONLY },
	};
}

// `--shadow-*` is one of the reset namespaces, so the elevation ladder ships
// as custom utilities instead: a shadow, or under `elevation: "flat"` the
// `edge` ring.
export function shadowBlocks(resolved: ResolvedTheme): CssBlock[] {
	return Object.entries(shadowUtilities(resolved)).map(
		([name, declarations]) => ({ kind: "utility", name, declarations }),
	);
}

// `density: "desktop"` draws the controls compact where the primary pointer
// is fine: the compact sizes override the seeded touch ones in `@layer base`,
// the same cascade the dark layer rides, so every cell that names a size
// (`min-h-floor`, `py-row-y`) follows with no class of its own. A touch
// screen, a phone and a tablet keep the 44 px floor. Nothing under `touch`.
export const FINE_POINTER = "(pointer: fine)";

export function compactLayer(resolved: ResolvedTheme): CssLayer | undefined {
	const declarations = compactTokens(resolved);
	if (Object.keys(declarations).length === 0) return undefined;
	return {
		name: "base",
		content: renderMediaRootRule(FINE_POINTER, declarations),
	};
}

// Dark mode rides `@layer base`, not a third block kind: `@theme` compiles
// into `@layer theme` and Tailwind sorts `base` after it, so the layered
// override wins over the seeded light values. `color-scheme` travels with the
// colors so UA controls follow the mode.
export function darkLayer(resolved: ResolvedTheme): CssLayer {
	const declarations: Record<string, string> = { "color-scheme": "dark" };
	for (const [token, value] of Object.entries(modeTokens(resolved, "dark"))) {
		declarations[`--color-${token}`] = value;
	}
	return { name: "base", content: renderClassRule("dark", declarations) };
}
