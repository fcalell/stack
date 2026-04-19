import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, resolve } from "node:path";
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

// Pass-through stub for when no plugin contributed providers. The import
// must not break at runtime even when `.stack/virtual-providers.tsx` wasn't
// written.
const PROVIDERS_STUB = `import type { JSX } from "solid-js";
export default function Providers(props: { children: JSX.Element }): JSX.Element {
	return props.children;
}
`;

export interface ProvidersPluginOptions {
	// Path (absolute or relative to `cwd`) to the generated providers module.
	// Defaults to `.stack/virtual-providers.tsx` relative to the Vite config
	// file via its `root` — consumers rarely override this.
	modulePath?: string;
	cwd?: string;
}

export function providersPlugin(opts: ProvidersPluginOptions = {}): Plugin {
	const VIRTUAL_ID = "virtual:stack-providers";
	const RESOLVED_ID = `\0${VIRTUAL_ID}`;
	const cwd = opts.cwd ?? process.cwd();
	const modulePath = opts.modulePath
		? resolve(cwd, opts.modulePath)
		: resolve(cwd, ".stack/virtual-providers.tsx");

	return {
		name: "fcalell:stack-providers",

		resolveId(id) {
			if (id !== VIRTUAL_ID) return null;
			if (existsSync(modulePath)) return modulePath;
			return RESOLVED_ID;
		},

		load(id) {
			if (id !== RESOLVED_ID) return null;
			return PROVIDERS_STUB;
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
