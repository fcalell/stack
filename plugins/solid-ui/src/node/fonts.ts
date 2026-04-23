import { createRequire } from "node:module";
import { basename } from "node:path";
import type { Plugin, ResolvedConfig } from "vite";
import type { FontEntry } from "../types";

// Re-exported from types.ts so the existing
// `@fcalell/plugin-solid-ui/node/fonts` subpath consumers keep working.
export type { FontEntry };

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
					if (!abs) {
						config.logger.warn(
							`[plugin-solid-ui] could not resolve font specifier ` +
								`"${font.specifier}" for family "${font.family}". ` +
								`The fallback @font-face will render but the woff2 will not preload — ` +
								`check the package is installed and the path is correct.`,
						);
					}
					let href: string | null = null;
					if (abs) {
						if (config.command === "build" && ctx.bundle) {
							href = findBundleUrl(
								ctx.bundle as unknown as BundleLike,
								config.base,
								abs,
							);
							if (!href) {
								config.logger.warn(
									`[plugin-solid-ui] resolved "${font.specifier}" but no matching ` +
										`asset was emitted to the bundle. Falling back to system font for "${font.family}".`,
								);
							}
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
