import type { Plugin } from "vite";

type Mode = "light" | "dark";

// The glyph slots a theme paints by the scramble, by slot (`theme.loading`;
// a slot left out pulses).
type Loading = Partial<Record<"text" | "figure" | "id", "pulse" | "scramble">>;

// The mode before first paint, so a dark viewer never sees a light flash: the
// viewer's stored choice, else the theme's `defaultMode`, else the system
// preference. It sets the `dark` class the stylesheet keys on; `useTheme`
// reads that class back, so the page and the script never disagree.
export function modeScript(
	defaultMode: Mode | undefined,
	loading: Loading = {},
): string {
	const fallback = defaultMode
		? JSON.stringify(defaultMode)
		: "matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'";
	return `(function(){${loadingScript(loading)}try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark')t=${fallback};if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`;
}

// The paint each glyph slot waits in, as `data-loading-<slot>` on the root:
// the stylesheet and `lib/scramble` read it, so the first frame of a page that
// waits is already in the theme's voice. A slot that pulses carries none.
function loadingScript(loading: Loading): string {
	return (["text", "figure", "id"] as const)
		.filter((slot) => loading[slot] === "scramble")
		.map(
			(slot) =>
				`document.documentElement.dataset.loading${slot[0]?.toUpperCase()}${slot.slice(1)}='scramble';`,
		)
		.join("");
}

export function themeModePlugin(
	defaultMode?: Mode,
	loading: Loading = {},
): Plugin {
	return {
		name: "fcalell:theme-mode",
		transformIndexHtml: {
			order: "post",
			handler: () => [
				{
					tag: "script",
					injectTo: "head-prepend",
					children: modeScript(defaultMode, loading),
				},
			],
		},
	};
}
