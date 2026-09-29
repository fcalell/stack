import type { Plugin } from "vite";

type Mode = "light" | "dark";

// The mode before first paint, so a dark viewer never sees a light flash: the
// viewer's stored choice, else the theme's `defaultMode`, else the system
// preference. It sets the `dark` class the stylesheet keys on; `useTheme`
// reads that class back, so the page and the script never disagree.
export function modeScript(defaultMode: Mode | undefined): string {
	const fallback = defaultMode
		? JSON.stringify(defaultMode)
		: "matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'";
	return `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark')t=${fallback};if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`;
}

export function themeModePlugin(defaultMode?: Mode): Plugin {
	return {
		name: "fcalell:theme-mode",
		transformIndexHtml: {
			order: "post",
			handler: () => [
				{
					tag: "script",
					injectTo: "head-prepend",
					children: modeScript(defaultMode),
				},
			],
		},
	};
}
