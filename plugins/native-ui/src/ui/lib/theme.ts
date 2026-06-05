import { Uniwind, useCSSVariable, useUniwind } from "uniwind";

export { Uniwind, useCSSVariable, useUniwind };

// The active theme name accepted by `Uniwind.setTheme`. Augmented per-app by the
// generated `uniwind-types.d.ts` to include any consumer `extraThemes`.
export type ThemeName = Parameters<typeof Uniwind.setTheme>[0];

// Switch the active design-system theme. Setting `light` / `dark` also drives
// React Native's `Appearance` so native dialogs match; `system` re-enables
// adaptive theming. uniwind is CSS-first — there is no ThemeProvider to mount.
export function setTheme(name: ThemeName): void {
	Uniwind.setTheme(name);
}
