import type { ThemeSpec } from "./types";

// Neutral default themes so the plugin (and its primitives) render coherently
// before a consumer supplies real tokens. WeNauti overrides these via the
// `themeTokens` option with Marina v4 values parsed from `marina.css`.
//
// `light` and `dark` are uniwind's built-in theme names — using them gives
// free `Appearance` sync and the Tailwind `dark:` variant. WeNauti's "Notturno"
// is the human label for the `dark` palette, not a separate theme key.
//
// The semantic keys are the Marina surface (canvas/surface/ink-1/ink-2/edge/
// accent/accent-ink/ok/warn/danger). Persona is encoded by FILL, never hue, so
// there is intentionally no per-role color token here.
export const DEFAULT_THEMES: ThemeSpec[] = [
	{
		name: "light",
		default: true,
		colors: {
			canvas: "#ffffff",
			surface: "#f5f5f4",
			"ink-1": "#1c1917",
			"ink-2": "#78716c",
			edge: "#e7e5e4",
			accent: "#1c1917",
			"accent-ink": "#ffffff",
			ok: "#16a34a",
			warn: "#d97706",
			danger: "#dc2626",
		},
	},
	{
		name: "dark",
		colors: {
			canvas: "#0b0b0c",
			surface: "#18181b",
			"ink-1": "#fafaf9",
			"ink-2": "#a1a1aa",
			edge: "#27272a",
			accent: "#fafaf9",
			"accent-ink": "#0b0b0c",
			ok: "#22c55e",
			warn: "#f59e0b",
			danger: "#ef4444",
		},
	},
];

// Static, theme-invariant tokens emitted into `@theme`. These carry their full
// `--` name (they live in different Tailwind namespaces: radius, text). Spacing
// is left at Tailwind v4's default scale; uniwind's `rem` polyfill (16) makes
// `p-4` = 16px on native.
export const DEFAULT_BASE_TOKENS: Record<string, string> = {
	"--radius-sm": "6px",
	"--radius-md": "10px",
	"--radius-lg": "16px",
	"--radius-xl": "22px",
	"--radius-full": "9999px",
	"--text-xs": "12px",
	"--text-sm": "14px",
	"--text-base": "15px",
	"--text-lg": "18px",
	"--text-xl": "22px",
	"--text-2xl": "28px",
};
