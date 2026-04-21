import { createRequire } from "node:module";
import { basename } from "node:path";
import type { Plugin, ResolvedConfig } from "vite";

// Typed description of a webfont consumed by plugin-solid-ui.
// Plugin-solid-ui accepts an array of these as its `fonts` option and
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

interface AssetLike {
	type: "asset" | "chunk";
	fileName: string;
	originalFileNames?: string[];
}
type BundleLike = Record<string, AssetLike>;

const antiFoucScript = `(function(){try{var t=localStorage.getItem('theme');if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`;

function resolveFontAbs(specifier: string): string | null {
	try {
		const require = createRequire(import.meta.url);
		return require.resolve(specifier);
	} catch {
		return null;
	}
}

function joinBase(base: string, path: string): string {
	const b = base.endsWith("/") ? base : `${base}/`;
	const p = path.startsWith("/") ? path.slice(1) : path;
	return `${b}${p}`;
}

function findBundleUrl(
	bundle: BundleLike,
	base: string,
	fontAbs: string,
): string | null {
	const target = basename(fontAbs);
	for (const entry of Object.values(bundle)) {
		if (entry.type !== "asset") continue;
		const names = entry.originalFileNames ?? [];
		if (names.some((n) => n.endsWith(target))) {
			return joinBase(base, entry.fileName);
		}
		if (entry.fileName.endsWith(`/${target}`) || entry.fileName === target) {
			return joinBase(base, entry.fileName);
		}
	}
	return null;
}

function buildFontFaceCss(
	fonts: Array<{ font: FontEntry; href: string | null }>,
): string {
	const blocks: string[] = [];
	for (const { font, href } of fonts) {
		if (href) {
			blocks.push(`@font-face {
	font-family: '${font.family}';
	src: url('${href}') format('woff2');
	font-weight: ${font.weight};
	font-style: ${font.style};
	font-display: swap;
}`);
		}
		blocks.push(`@font-face {
	font-family: '${font.family} Fallback';
	src: local('${font.fallback.family}');
	ascent-override: ${font.fallback.ascentOverride};
	descent-override: ${font.fallback.descentOverride};
	line-gap-override: ${font.fallback.lineGapOverride};
	size-adjust: ${font.fallback.sizeAdjust};
}`);
	}
	return blocks.join("\n");
}

export function themeFontsPlugin(fonts: FontEntry[] = defaultFonts): Plugin {
	let config: ResolvedConfig;

	return {
		name: "fcalell:theme-fonts",

		configResolved(c) {
			config = c;
		},

		transformIndexHtml: {
			order: "post",
			handler(_html, ctx) {
				const tags: Array<{
					tag: string;
					injectTo: "head" | "head-prepend";
					attrs?: Record<string, string | boolean>;
					children?: string;
				}> = [
					{
						tag: "script",
						injectTo: "head-prepend",
						children: antiFoucScript,
					},
				];

				const resolved: Array<{ font: FontEntry; href: string | null }> = [];

				for (const font of fonts) {
					const abs = resolveFontAbs(font.specifier);
					let href: string | null = null;
					if (abs) {
						if (config.command === "build" && ctx.bundle) {
							href = findBundleUrl(
								ctx.bundle as unknown as BundleLike,
								config.base,
								abs,
							);
						} else {
							href = `/@fs/${abs}`;
						}
					}
					resolved.push({ font, href });

					if (href) {
						tags.push({
							tag: "link",
							injectTo: "head",
							attrs: {
								rel: "preload",
								as: "font",
								type: "font/woff2",
								href,
								crossorigin: "",
							},
						});
					}
				}

				tags.push({
					tag: "style",
					injectTo: "head",
					children: buildFontFaceCss(resolved),
				});

				return tags;
			},
		},
	};
}
