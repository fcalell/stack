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

// Fails fast when a consumer-declared font specifier can't be resolved.
// Emits an actionable multi-line error (family, specifier, likely causes)
// rather than silently producing CSS that references a missing woff2 —
// the previous warn-and-continue path left consumers staring at
// unstyled text with nothing in the terminal to attribute it to.
class MissingFontError extends Error {
	constructor(font: FontEntry, cause: unknown) {
		const detail = cause instanceof Error ? cause.message : String(cause);
		super(
			`[plugin-solid-ui] could not resolve font specifier ${JSON.stringify(
				font.specifier,
			)} for family ${JSON.stringify(font.family)}.\n` +
				"  - Ensure the package providing the font file is installed in your workspace.\n" +
				"  - Check the specifier path is correct (typos, wrong `files/` subpath, missing weight).\n" +
				`  - Underlying resolver error: ${detail}`,
		);
		this.name = "MissingFontError";
	}
}

// Returns the resolved absolute path, or throws MissingFontError with a
// clear message. Consumer-declared fonts must resolve; we don't silently
// fall back to system fonts and leave the consumer wondering why their
// webfont never loads.
function resolveFontAbs(font: FontEntry): string {
	try {
		const require = createRequire(import.meta.url);
		return require.resolve(font.specifier);
	} catch (err) {
		throw new MissingFontError(font, err);
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
	fonts: Array<{ font: FontEntry; href: string }>,
): string {
	const blocks: string[] = [];
	for (const { font, href } of fonts) {
		blocks.push(`@font-face {
	font-family: '${font.family}';
	src: url('${href}') format('woff2');
	font-weight: ${font.weight};
	font-style: ${font.style};
	font-display: swap;
}`);
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

// The fonts argument is required — codegen always passes the resolved
// slot value, and direct callers should import `defaultFonts` explicitly
// rather than rely on a silent default. That keeps `fonts: []` meaning
// "no fonts" all the way from consumer config to runtime.
export function themeFontsPlugin(fonts: FontEntry[]): Plugin {
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

				const resolved: Array<{ font: FontEntry; href: string }> = [];

				for (const font of fonts) {
					// Throws MissingFontError with an actionable message if the
					// consumer's specifier is bogus. Better to surface that at
					// build time than to emit CSS pointing at a missing woff2.
					const abs = resolveFontAbs(font);
					let href: string;
					if (config.command === "build" && ctx.bundle) {
						const fromBundle = findBundleUrl(
							ctx.bundle as unknown as BundleLike,
							config.base,
							abs,
						);
						if (!fromBundle) {
							// The specifier resolved to a real file on disk, but
							// Vite didn't emit it into the bundle — typically
							// because nothing imported the font CSS. This is an
							// author-land configuration bug, not a runtime surprise.
							throw new Error(
								`[plugin-solid-ui] resolved ${JSON.stringify(
									font.specifier,
								)} for family ${JSON.stringify(font.family)}, ` +
									"but no matching asset was emitted to the bundle. " +
									"Ensure the font's package `.css` is imported somewhere " +
									"(e.g. via Tailwind or an explicit `import`) so Vite bundles it.",
							);
						}
						href = fromBundle;
					} else {
						href = `/@fs/${abs}`;
					}
					resolved.push({ font, href });

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

				// Skip the <style> tag entirely when no fonts are configured —
				// `fonts: []` means "no fonts," and that should leave the
				// document head clean instead of emitting an empty <style/>.
				if (resolved.length > 0) {
					tags.push({
						tag: "style",
						injectTo: "head",
						children: buildFontFaceCss(resolved),
					});
				}

				return tags;
			},
		},
	};
}
