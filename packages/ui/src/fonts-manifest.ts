export interface FontEntry {
	family: string;
	specifier: string;
	weight: string;
	style: "normal" | "italic";
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
		fallback: {
			family: "monospace",
			ascentOverride: "90%",
			descentOverride: "22%",
			lineGapOverride: "0%",
			sizeAdjust: "100%",
		},
	},
];
