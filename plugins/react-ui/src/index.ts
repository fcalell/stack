import type { ContributionCtx } from "@fcalell/cli";
import { plugin, slot, stackSpec } from "@fcalell/cli";
import {
	literalToProps,
	type ProviderSpec,
	type TsExpression,
	type TsImportSpec,
} from "@fcalell/cli/ast";
import { cliSlots, emitArtifact } from "@fcalell/cli/cli-slots";
import { auth } from "@fcalell/plugin-auth";
import { react } from "@fcalell/plugin-react";
import { type PreviewGlobal, screens } from "@fcalell/plugin-screens";
import { vite } from "@fcalell/plugin-vite";
import { deriveTheme } from "@fcalell/ui-core/derive";
import { uiCoreGuide } from "@fcalell/ui-core/manifest";
import { aggregateAppCss } from "./node/codegen.ts";
import { defaultFonts, type FontEntry } from "./node/fonts.ts";
import { lintPlugins } from "./node/lint.ts";
import {
	densityLayer,
	modeLayer,
	motionLayer,
	pageVariants,
	rootLayer,
	safeAreaUtilities,
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
		// The guide's index points into the consumer's node_modules for
		// ui-core's pages.
		"@fcalell/ui-core": stackSpec("@fcalell/ui-core"),
		tailwindcss: "^4.3.3",
		// The generated providers module mounts plugin-api's `QueryProvider`,
		// and `QueryBoundary` reads the queries its TanStack peers make.
		"@fcalell/plugin-api": stackSpec("@fcalell/plugin-api"),
		"@tanstack/react-query": "^5.101.0",
		"@orpc/tanstack-query": "^1.14.4",
	},
	devDependencies: {
		"@tailwindcss/vite": "^4.3.3",
	},

	guide: [
		{ page: "rules", trigger: "Writing or editing any `.tsx` of the web app" },
		{
			page: "reference",
			trigger:
				"Importing a web component, or setting the theme, words or fonts, or reasoning about density, dark mode or the page container",
		},
		{
			page: "canvas",
			trigger: "Drawing a graph of nodes and edges, a workflow or a journey",
		},
	],

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
		// Vite's dev optimizer pre-bundles this package's `.tsx`, which a
		// `?worker` import cannot survive: the canvas's layout module is served
		// as source, and ELK's CJS API is pre-bundled by name.
		vite.slots.configImports.contribute(
			(): TsImportSpec => ({
				source: "@fcalell/plugin-react-ui/node/canvas",
				named: ["canvasPlugin"],
			}),
		),
		vite.slots.pluginCalls.contribute(
			(): TsExpression => ({
				kind: "call",
				callee: { kind: "identifier", name: "canvasPlugin" },
				args: [],
			}),
		),
		vite.slots.configImports.contribute(
			(): TsImportSpec => ({ source: "node:url", named: ["fileURLToPath"] }),
		),
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
					props: Object.entries(literalToProps({ words })).map(
						([name, value]) => ({ name, value }),
					),
				},
				order: 1,
			};
		}),

		// One query client around the app, inside the words.
		react.slots.providers.contribute(
			(): ProviderSpec => ({
				imports: [
					{
						source: "@fcalell/plugin-api/tanstack-query",
						named: ["QueryProvider"],
					},
				],
				wrap: { identifier: "QueryProvider" },
				order: 2,
			}),
		),

		// The web rules, as lint rules on the app's own sources.
		cliSlots.lintPlugins.contribute(async (ctx) =>
			lintPlugins(await ctx.resolve(react.slots.routesDir)),
		),

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
		self.slots.appCssBlocks.contribute(() => pageVariants()),
		self.slots.appCssBlocks.contribute(() => safeAreaUtilities()),
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
		// The app's router, handed to react-ui's navigation, so an act opens a
		// route in place; with routing off the entry has no router to hand over.
		react.slots.routerBindings.contribute(
			async (ctx): Promise<TsImportSpec | undefined> => {
				if ((await ctx.resolve(react.slots.routesDir)) === null)
					return undefined;
				return {
					source: "@fcalell/plugin-react-ui/lib/navigate",
					named: ["bindRouter"],
				};
			},
		),
		// The page for an address nothing serves, set as the router's default
		// not-found page: the app passes nothing, and a route of its own that
		// matches (a catch-all) or sets a `notFoundComponent` wins.
		react.slots.routerBindings.contribute(
			async (ctx): Promise<TsImportSpec | undefined> => {
				if ((await ctx.resolve(react.slots.routesDir)) === null)
					return undefined;
				return {
					source: "@fcalell/plugin-react-ui/lib/not-found",
					named: ["bindNotFound"],
				};
			},
		),
		// The mode and the density the sheet keys on (a `dark` class and
		// `data-density` on the root), as toolbars the screens workbench pins
		// before a story paints. The workbench opens in the theme's default mode,
		// and a test run checks both modes at desktop density (density moves sizes,
		// not names, roles or states).
		screens.slots.previewGlobals.contribute(
			async (ctx): Promise<PreviewGlobal[]> => {
				const { defaultMode } = await ctx.resolve(self.slots.resolvedTheme);
				return [
					{
						name: "mode",
						title: "Mode",
						values: ["light", "dark"],
						default: defaultMode ?? "light",
						checked: ["light", "dark"],
						apply: { classes: { dark: "dark" } },
					},
					{
						name: "density",
						title: "Density",
						values: ["desktop", "touch"],
						default: "desktop",
						apply: { attribute: "data-density" },
					},
				];
			},
		),
		emitArtifact(".stack/app.css", self.slots.appCssSource),
		// ui-core is no plugin: each UI plugin indexes its guide pages.
		cliSlots.guide.contribute(() => uiCoreGuide),
	],
});

export type {
	FontEntry,
	ReactUiOptions,
	Theme,
	Words,
} from "./types.ts";
