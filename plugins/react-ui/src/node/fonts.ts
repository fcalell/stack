import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename } from "node:path";
import { fallbackFace } from "@fcalell/ui-core/tokens";
import type { Plugin, ResolvedConfig } from "vite";
import type { FontEntry } from "../types.ts";
import { cssString, cssUrl } from "./css-escape.ts";

export type { FontEntry };

// IBM Plex Sans's variable files on their weight axis, upright and italic.
// The fallback metrics size Arial to Plex's box (ascender 1025 and descender
// 275 over a 1000 em, at the ratio of Plex's average width 451/1000 to
// Arial's 913/2048), so the swap moves nothing. A family declares one
// fallback face, so the italic carries the upright's metrics.
const plexSansFallback: FontEntry["fallback"] = {
	family: "Arial",
	ascentOverride: "101.32%",
	descentOverride: "27.18%",
	lineGapOverride: "0%",
	sizeAdjust: "101.17%",
};

export const plexSans: FontEntry = {
	family: "IBM Plex Sans",
	specifier:
		"@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2",
	weight: "100 700",
	style: "normal",
	fallback: plexSansFallback,
};

export const plexSansItalic: FontEntry = {
	family: "IBM Plex Sans",
	specifier:
		"@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-italic.woff2",
	weight: "100 700",
	style: "italic",
	fallback: plexSansFallback,
};

// IBM Plex Mono ships static cuts only: 400 for code, 500 for emphasis inside
// it, 600 for the one-time-code digit. The fallback metrics size Courier New
// to Plex Mono's box (ascender 1025 and descender 275 over a 1000 em, at the
// ratio of its 600/1000 advance to Courier New's 1229/2048).
function plexMono(weight: "400" | "500" | "600"): FontEntry {
	return {
		family: "IBM Plex Mono",
		specifier: `@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-${weight}-normal.woff2`,
		weight,
		style: "normal",
		fallback: {
			family: "Courier New",
			ascentOverride: "102.52%",
			descentOverride: "27.5%",
			lineGapOverride: "0%",
			sizeAdjust: "99.98%",
		},
	};
}

export const defaultFonts: FontEntry[] = [
	plexSans,
	plexSansItalic,
	plexMono("400"),
	plexMono("500"),
	plexMono("600"),
];

interface AssetLike {
	type: "asset" | "chunk";
	fileName: string;
	originalFileNames?: string[];
}
type BundleLike = Record<string, AssetLike>;

// Fails fast when a consumer-declared font specifier can't be resolved.
// Emits an actionable multi-line error (family, specifier, likely causes)
// rather than silently producing CSS that references a missing woff2.
class MissingFontError extends Error {
	constructor(font: FontEntry, cause: unknown) {
		const detail = cause instanceof Error ? cause.message : String(cause);
		super(
			`[plugin-react-ui] could not resolve font specifier ${JSON.stringify(
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

export function buildFontFaceCss(
	fonts: Array<{ font: FontEntry; href: string }>,
): string {
	const blocks: string[] = [];
	// A family's static cuts share one metric fallback face.
	const fallbacks = new Set<string>();
	for (const { font, href } of fonts) {
		// Every consumer-supplied value crosses a CSS context boundary —
		// family names land inside a `font-family:` declaration, URLs land
		// inside `url(...)`. Without escaping, a stray quote or paren
		// terminates the declaration early and the rest of the @font-face
		// block becomes attacker- or accident-controlled CSS.
		blocks.push(`@font-face {
	font-family: ${cssString(font.family)};
	src: ${cssUrl(href)} format("woff2");
	font-weight: ${font.weight};
	font-style: ${font.style};
	font-display: swap;
}`);
		if (fallbacks.has(font.family)) continue;
		fallbacks.add(font.family);
		blocks.push(`@font-face {
	font-family: ${cssString(fallbackFace(font.family))};
	src: local(${cssString(font.fallback.family)});
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

		// Nothing in the module graph imports the woff2 files — the
		// @font-face CSS is injected as a raw <style> tag in
		// transformIndexHtml below, not through an `import` Rollup can trace
		// — so a build never bundles them on its own. Emit each configured
		// font as a build asset explicitly; transformIndexHtml then finds it
		// in `ctx.bundle` by original filename (`findBundleUrl`).
		// `transformIndexHtml`'s hook `this` is only a
		// `MinimalPluginContext` (no `emitFile`/`getFileName`), so the
		// emission has to happen in a real Rollup hook like this one.
		buildStart() {
			if (config.command !== "build") return;
			for (const font of fonts) {
				const abs = resolveFontAbs(font);
				this.emitFile({
					type: "asset",
					name: basename(abs),
					originalFileName: abs,
					source: readFileSync(abs),
				});
			}
		},

		transformIndexHtml: {
			order: "post",
			handler(_html, ctx) {
				const tags: Array<{
					tag: string;
					injectTo: "head" | "head-prepend";
					attrs?: Record<string, string | boolean>;
					children?: string;
				}> = [];

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
							// `buildStart` above emits every configured font before
							// this hook runs, so this branch is an internal
							// invariant violation (e.g. another plugin stripped the
							// asset from the bundle), not an author-land mistake.
							throw new Error(
								`[plugin-react-ui] internal error: resolved ${JSON.stringify(
									font.specifier,
								)} for family ${JSON.stringify(font.family)}, ` +
									"but it was not found in the emitted bundle even though " +
									"buildStart emits it as an asset. This should not happen — " +
									"please report a bug.",
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
