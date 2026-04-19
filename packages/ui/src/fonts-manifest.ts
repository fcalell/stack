// Typed description of a webfont consumed by plugin-solid-ui / plugin-vite.
// Plugin-solid-ui accepts an array of these as its `fonts` option; plugin-vite
// exposes the `themeFontsPlugin` runtime that preloads the woff2, declares
// `@font-face` (with fallback metrics), and ties into the --ui-font-* tokens.
export interface FontEntry {
	// CSS family name used in `font-family` declarations (e.g. "Inter Variable").
	family: string;
	// Node module path or workspace-relative path to the actual woff2 file
	// (e.g. "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2").
	specifier: string;
	// A single weight ("400") or a variable-font range ("100 900").
	weight: string;
	style: "normal" | "italic";
	// Binds this font to the matching --ui-font-* token (and, through the
	// Tailwind theme, to the font-sans / font-mono / font-serif utilities).
	role?: "sans" | "mono" | "serif";
	// Fallback-font metrics used to generate a sibling `@font-face` that
	// matches the webfont's metrics on top of a system family. Prevents CLS
	// while the woff2 loads.
	fallback: {
		family: string;
		ascentOverride: string;
		descentOverride: string;
		lineGapOverride: string;
		sizeAdjust: string;
	};
}

export const defaultFonts: FontEntry[] = [
	{
		family: "JetBrains Mono Variable",
		specifier:
			"@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2",
		weight: "100 800",
		style: "normal",
		role: "mono",
		fallback: {
			family: "monospace",
			ascentOverride: "90%",
			descentOverride: "22%",
			lineGapOverride: "0%",
			sizeAdjust: "100%",
		},
	},
];
