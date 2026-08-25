import { Uniwind, useCSSVariable, useUniwind } from "uniwind";

export { Uniwind, useCSSVariable, useUniwind };

// The active theme name accepted by `Uniwind.setTheme`. The generated
// `uniwind-types.d.ts` pins it to exactly `light` / `dark` / `system`.
export type ThemeName = Parameters<typeof Uniwind.setTheme>[0];

// Switch the active design-system theme. Setting `light` / `dark` also drives
// React Native's `Appearance` so native dialogs match; `system` re-enables
// adaptive theming. uniwind is CSS-first — there is no ThemeProvider to mount.
export function setTheme(name: ThemeName): void {
	Uniwind.setTheme(name);
}

// A --color-* token resolved against the active theme, for the RN nodes that
// take a color prop and never currentColor (lucide glyphs, ActivityIndicator).
export function useTokenColor(name: `--color-${string}`): string | undefined {
	const value = useCSSVariable(name);
	return typeof value === "string" ? value : undefined;
}
