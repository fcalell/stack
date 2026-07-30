import type { ResolvedTheme } from "@fcalell/ui-core/derive";
import { modeTokens, shadowUtilities, themeTokens } from "@fcalell/ui-core/emit";
import { FONT_FALLBACKS } from "@fcalell/ui-core/tokens";
import type { CssBlock, CssLayer } from "../types.ts";
import { renderRule } from "./codegen.ts";

// The tokens the web owns on top of the shared contract. Motion is a web-only
// concern, and font families stay with the platform plugins — ui-core shares
// only the fallback stacks. Each family reads the `--ui-font-*` token
// `themeFontsPlugin` rebinds, falling back to the shared stack so a consumer
// running `fonts: []` still gets a real family.
const WEB_ONLY: Record<string, string> = {
	"--ease-ui": "cubic-bezier(0.4, 0, 0.2, 1)",
	"--duration-fast": "100ms",
	"--duration-base": "150ms",
	"--animate-content-show": "content-show 150ms var(--ease-ui)",
	"--animate-content-hide": "content-hide 150ms var(--ease-ui)",
	"--animate-caret-blink": "caret-blink 1.25s ease-out infinite",
	"--font-sans": `var(--ui-font-sans, ${FONT_FALLBACKS.sans})`,
	"--font-mono": `var(--ui-font-mono, ${FONT_FALLBACKS.mono})`,
	"--font-serif": `var(--ui-font-serif, ${FONT_FALLBACKS.serif})`,
};

// The `@theme` block always seeds the light palette. `themeTokens` seeds
// whichever mode `defaultMode` names, and the web has a `dark` custom variant
// but no `light` one, so a `defaultMode: "dark"` theme would otherwise emit a
// sheet with no reachable light mode. Overwriting a key leaves it at its
// original position, so the reset keys still lead.
export function themeBlock(resolved: ResolvedTheme): CssBlock {
	const declarations = themeTokens(resolved);
	for (const [token, value] of Object.entries(modeTokens(resolved, "light"))) {
		declarations[`--color-${token}`] = value;
	}
	return { kind: "theme", declarations: { ...declarations, ...WEB_ONLY } };
}

// `--shadow-*` is one of the reset namespaces, so the ladder ships as three
// custom utilities instead.
export function shadowBlocks(resolved: ResolvedTheme): CssBlock[] {
	return Object.entries(shadowUtilities(resolved)).map(([name, value]) => ({
		kind: "utility",
		name,
		declarations: { "box-shadow": value },
	}));
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
	return { name: "base", content: renderRule(".dark", declarations) };
}
