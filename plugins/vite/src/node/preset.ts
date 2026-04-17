import { createRequire } from "node:module";
import { basename } from "node:path";
import { defaultFonts, type FontEntry } from "@fcalell/ui/fonts-manifest";
import tailwindcss from "@tailwindcss/vite";
import type { Plugin, ResolvedConfig } from "vite";

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

function buildFontFaceCss(fonts: FontEntry[]): string {
	return fonts
		.map(
			(f) => `@font-face {
	font-family: '${f.family} Fallback';
	src: local('${f.fallback.family}');
	ascent-override: ${f.fallback.ascentOverride};
	descent-override: ${f.fallback.descentOverride};
	line-gap-override: ${f.fallback.lineGapOverride};
	size-adjust: ${f.fallback.sizeAdjust};
}`,
		)
		.join("\n");
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

				for (const font of fonts) {
					const abs = resolveFontAbs(font.specifier);
					if (!abs) continue;

					let href: string | null = null;
					if (config.command === "build" && ctx.bundle) {
						href = findBundleUrl(
							ctx.bundle as unknown as BundleLike,
							config.base,
							abs,
						);
					} else {
						href = `/@fs/${abs}`;
					}
					if (!href) continue;

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

				tags.push({
					tag: "style",
					injectTo: "head",
					children: buildFontFaceCss(fonts),
				});

				return tags;
			},
		},
	};
}

export interface BasePresetOptions {
	fonts?: FontEntry[];
}

export function createBasePreset(opts: BasePresetOptions = {}): Plugin[] {
	const fonts = opts.fonts ?? defaultFonts;
	return [...tailwindcss(), themeFontsPlugin(fonts)];
}
