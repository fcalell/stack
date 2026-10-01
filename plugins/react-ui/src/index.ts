import type { ContributionCtx } from "@fcalell/cli";
import { plugin, slot } from "@fcalell/cli";
import type {
	ProviderSpec,
	TsExpression,
	TsImportSpec,
} from "@fcalell/cli/ast";
import { emitArtifact } from "@fcalell/cli/cli-slots";
import { auth } from "@fcalell/plugin-auth";
import { react } from "@fcalell/plugin-react";
import { vite } from "@fcalell/plugin-vite";
import { deriveTheme } from "@fcalell/ui-core/derive";
import { WORD_KEYS, type Words } from "@fcalell/ui-core/tokens";
import { aggregateAppCss } from "./node/codegen.ts";
import { defaultFonts, type FontEntry } from "./node/fonts.ts";
import {
	densityLayer,
	modeLayer,
	motionLayer,
	rootLayer,
	safeAreaUtility,
	shadowBlocks,
	themeBlock,
	tokenSources,
	touchVariant,
} from "./node/theme.ts";
import {
	type CssBlock,
	type CssImport,
	type CssLayer,
	type CssSourceInline,
	type ReactUiOptions,
	reactUiOptionsSchema,
} from "./types.ts";

const SOURCE = "react-ui";

function fontEntryToExpression(font: FontEntry): TsExpression {
	return {
		kind: "object",
		properties: [
			{ key: "family", value: { kind: "string", value: font.family } },
			{ key: "specifier", value: { kind: "string", value: font.specifier } },
			{ key: "weight", value: { kind: "string", value: font.weight } },
			{ key: "style", value: { kind: "string", value: font.style } },
			{
				key: "fallback",
				value: {
					kind: "object",
					properties: [
						{
							key: "family",
							value: { kind: "string", value: font.fallback.family },
						},
						{
							key: "ascentOverride",
							value: { kind: "string", value: font.fallback.ascentOverride },
						},
						{
							key: "descentOverride",
							value: { kind: "string", value: font.fallback.descentOverride },
						},
						{
							key: "lineGapOverride",
							value: { kind: "string", value: font.fallback.lineGapOverride },
						},
						{
							key: "sizeAdjust",
							value: { kind: "string", value: font.fallback.sizeAdjust },
						},
					],
				},
			},
		],
	};
}

// The consumer's `words` as a literal object expression, so the generated
// providers mount the context with no glue file.
function wordsToExpression(words: Words): TsExpression {
	return {
		kind: "object",
		properties: WORD_KEYS.map((key) => ({
			key,
			value: { kind: "string", value: words[key] },
		})),
	};
}

// ── Slot declarations ──────────────────────────────────────────────

const appCssImports = slot.list<CssImport>({
	source: SOURCE,
	name: "appCssImports",
});

const appCssSources = slot.list<CssSourceInline>({
	source: SOURCE,
	name: "appCssSources",
});

// Top-level `@theme` / `@utility` blocks. Separate from `appCssLayers`
// because neither at-rule may sit inside a `@layer`.
const appCssBlocks = slot.list<CssBlock>({
	source: SOURCE,
	name: "appCssBlocks",
});

const appCssLayers = slot.list<CssLayer>({
	source: SOURCE,
	name: "appCssLayers",
});

// Resolved font entries, from options only so every other contribution reads
// one source of truth. The `??` is load-bearing: an omitted `fonts` takes
// `defaultFonts`, while `fonts: []` means no fonts at all (no `@font-face`,
// no preload, no `<style>` tag).
const fonts = slot.derived({
	source: SOURCE,
	name: "fonts",
	compute: (_inp, ctx: ContributionCtx<ReactUiOptions>): FontEntry[] =>
		ctx.options.fonts ?? defaultFonts,
});

// The design contract, resolved once, so knob resolution and validation
// happen exactly one time.
const resolvedTheme = slot.derived({
	source: SOURCE,
	name: "resolvedTheme",
	compute: (_inp, ctx: ContributionCtx<ReactUiOptions>) =>
		deriveTheme(ctx.options.theme),
});

// Rendered `.stack/app.css`. Returns null when no imports or layers landed.
const appCssSource = slot.derived({
	source: SOURCE,
	name: "appCssSource",
	inputs: {
		imports: appCssImports,
		sources: appCssSources,
		blocks: appCssBlocks,
		layers: appCssLayers,
	},
	compute: (inp): string | null =>
		aggregateAppCss({
			imports: inp.imports,
			sources: inp.sources,
			blocks: inp.blocks,
			layers: inp.layers,
		}),
});

export const reactUi = plugin("react-ui", {
	label: "Design System",

	schema: reactUiOptionsSchema,

	requires: ["react", "vite"],

	dependencies: {
		tailwindcss: "^4.3.3",
	},
	devDependencies: {
		"@tailwindcss/vite": "^4.3.3",
	},

	slots: {
		appCssImports,
		appCssSources,
		appCssBlocks,
		appCssLayers,
		fonts,
		resolvedTheme,
		appCssSource,
	},

	contributes: (self) => [
		// ── Vite integration ────────────────────────────────────────────
		vite.slots.configImports.contribute(
			(): TsImportSpec => ({
				source: "@tailwindcss/vite",
				default: "tailwindcss",
			}),
		),
		vite.slots.pluginCalls.contribute(
			(): TsExpression => ({
				kind: "call",
				callee: { kind: "identifier", name: "tailwindcss" },
				args: [],
			}),
		),
		vite.slots.configImports.contribute(
			(): TsImportSpec => ({
				source: "@fcalell/plugin-react-ui/node/fonts",
				named: ["themeFontsPlugin"],
			}),
		),
		// The mode before first paint, with the theme's `defaultMode` baked in
		// as the fallback for a viewer with no stored choice.
		vite.slots.configImports.contribute(
			(): TsImportSpec => ({
				source: "@fcalell/plugin-react-ui/node/mode",
				named: ["themeModePlugin"],
			}),
		),
		vite.slots.pluginCalls.contribute(async (ctx): Promise<TsExpression> => {
			const { defaultMode } = await ctx.resolve(self.slots.resolvedTheme);
			return {
				kind: "call",
				callee: { kind: "identifier", name: "themeModePlugin" },
				args: defaultMode ? [{ kind: "string", value: defaultMode }] : [],
			};
		}),
		// Fonts are served straight out of this package's node_modules
		// (@fontsource). When the stack is workspace-linked those files sit
		// outside the consumer's workspace root and Vite's dev server 403s
		// them, so allow this package's own workspace root. import.meta.resolve
		// runs in the generated config and yields the real (symlink-resolved)
		// location; installed from a registry it lands inside the consumer's
		// already-allowed root and the entry is inert.
		vite.slots.fsAllow.contribute(
			(): TsExpression => ({
				kind: "call",
				callee: { kind: "identifier", name: "searchForWorkspaceRoot" },
				args: [
					{
						kind: "call",
						callee: { kind: "identifier", name: "fileURLToPath" },
						args: [
							{
								kind: "call",
								callee: {
									kind: "member",
									object: { kind: "identifier", name: "import.meta" },
									property: "resolve",
								},
								args: [{ kind: "string", value: "@fcalell/plugin-react-ui" }],
							},
						],
					},
				],
			}),
		),
		// The array is passed even when empty, so `fonts: []` stays "no fonts"
		// all the way to the Vite plugin.
		vite.slots.pluginCalls.contribute(async (ctx): Promise<TsExpression> => {
			const entries = await ctx.resolve(self.slots.fonts);
			return {
				kind: "call",
				callee: { kind: "identifier", name: "themeFontsPlugin" },
				args: [{ kind: "array", items: entries.map(fontEntryToExpression) }],
			};
		}),

		// An organization is served at `/<slug>`, which the app's routes share,
		// so their first segments are slugs auth refuses. This plugin reads
		// both the routes and auth; neither of those reads the other.
		auth.slots.reservedSlugs.contribute((ctx) =>
			ctx.resolve(react.slots.topLevelRoutes),
		),

		// The consumer's words, mounted once; absent, the context speaks English.
		react.slots.providers.contribute((): ProviderSpec | undefined => {
			const words = self.options.words;
			if (!words) return undefined;
			return {
				imports: [
					{
						source: "@fcalell/plugin-react-ui/lib/words",
						named: ["WordsProvider"],
					},
				],
				wrap: {
					identifier: "WordsProvider",
					props: [{ name: "words", value: wordsToExpression(words) }],
				},
				order: 1,
			};
		}),

		// ── App CSS ─────────────────────────────────────────────────────
		self.slots.appCssImports.contribute(() => ({
			url: "tailwindcss",
			source: "none",
		})),
		self.slots.appCssImports.contribute(
			() => "@fcalell/plugin-react-ui/globals.css",
		),
		self.slots.appCssSources.contribute(() => tokenSources()),
		self.slots.appCssBlocks.contribute(async (ctx) =>
			themeBlock(await ctx.resolve(self.slots.resolvedTheme)),
		),
		self.slots.appCssBlocks.contribute(() => shadowBlocks()),
		self.slots.appCssBlocks.contribute(() => touchVariant()),
		self.slots.appCssBlocks.contribute(() => safeAreaUtility()),
		self.slots.appCssLayers.contribute(async (ctx) =>
			rootLayer(await ctx.resolve(self.slots.resolvedTheme)),
		),
		self.slots.appCssLayers.contribute(async (ctx) =>
			modeLayer(await ctx.resolve(self.slots.resolvedTheme)),
		),
		self.slots.appCssLayers.contribute(() => motionLayer()),
		self.slots.appCssLayers.contribute(async (ctx) =>
			densityLayer(await ctx.resolve(self.slots.resolvedTheme)),
		),

		// CSS is react-ui's domain: the entry's `import "./app.css"` pairs with
		// the artifact, so a react()-only consumer neither imports nor emits a
		// stylesheet.
		react.slots.entryImports.contribute(
			(): TsImportSpec => ({ source: "./app.css", sideEffect: true }),
		),
		emitArtifact(".stack/app.css", self.slots.appCssSource),
	],
});

export type {
	FontEntry,
	ReactUiOptions,
	Theme,
	Words,
} from "./types.ts";
