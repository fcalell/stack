import type { ContributionCtx } from "@fcalell/cli";
import { plugin, slot } from "@fcalell/cli";
import type {
	ProviderSpec,
	ScaffoldSpec,
	TsExpression,
	TsImportSpec,
} from "@fcalell/cli/ast";
import { cliSlots, emitArtifact } from "@fcalell/cli/cli-slots";
import { solid } from "@fcalell/plugin-solid";
import { vite } from "@fcalell/plugin-vite";
import { deriveTheme } from "@fcalell/ui-core/derive";
import { WORD_KEYS, type Words } from "@fcalell/ui-core/tokens";
import { aggregateAppCss } from "./node/codegen.ts";
import { defaultFonts, type FontEntry } from "./node/fonts.ts";
import { runGeometryGate } from "./node/gate.ts";
import { darkLayer, shadowBlocks, themeBlock } from "./node/theme.ts";
import {
	type CssBlock,
	type CssImport,
	type CssLayer,
	type SolidUiOptions,
	solidUiOptionsSchema,
} from "./types.ts";

const SOURCE = "solid-ui";

function fontEntryToExpression(font: FontEntry): TsExpression {
	const props: Array<{ key: string; value: TsExpression }> = [
		{ key: "family", value: { kind: "string", value: font.family } },
		{ key: "specifier", value: { kind: "string", value: font.specifier } },
		{ key: "weight", value: { kind: "string", value: font.weight } },
		{ key: "style", value: { kind: "string", value: font.style } },
	];
	props.push({
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
	});
	return { kind: "object", properties: props };
}

// The consumer's `words` as a literal object expression, so the generated
// entry mounts the provider with no glue file.
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

// The design contract, resolved once. Every block contribution reads this, so
// knob resolution and override validation happen exactly one time.
const resolvedTheme = slot.derived({
	source: SOURCE,
	name: "resolvedTheme",
	compute: (_inp, ctx: ContributionCtx<SolidUiOptions>) =>
		deriveTheme(ctx.options.theme),
});

// Resolved font entries. Derived from options only (no cross-slot inputs) so
// every other contribution can read the same source of truth.
//
// Semantics (deliberate):
//   - `fonts` omitted / undefined   → use `defaultFonts` (JetBrains Mono).
//   - `fonts: []` (explicit empty)  → use NO fonts. Zero @font-face blocks,
//                                     no --ui-font-* tokens emitted, and
//                                     `themeFontsPlugin([])` skips the
//                                     <style> tag in the HTML head.
//   - `fonts: [...]`                → use exactly those entries.
//
// The `??` here is load-bearing — we only swap in defaults when the value
// is nullish, never when it's an empty array.
const fonts = slot.derived({
	source: SOURCE,
	name: "fonts",
	compute: (_inp, ctx: ContributionCtx<SolidUiOptions>): FontEntry[] => {
		const opts = ctx.options;
		return opts.fonts ?? defaultFonts;
	},
});

// Rendered `.stack/app.css`. Returns null when no imports or layers landed.
const appCssSource = slot.derived({
	source: SOURCE,
	name: "appCssSource",
	inputs: {
		imports: appCssImports,
		blocks: appCssBlocks,
		layers: appCssLayers,
	},
	compute: (inp): string | null =>
		aggregateAppCss({
			imports: inp.imports,
			blocks: inp.blocks,
			layers: inp.layers,
		}),
});

export const solidUi = plugin("solid-ui", {
	label: "Design System",

	schema: solidUiOptionsSchema,

	requires: ["solid", "vite"],

	dependencies: {
		tailwindcss: "^4.1.7",
	},
	devDependencies: {
		"@tailwindcss/vite": "^4.1.7",
	},

	slots: {
		appCssImports,
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
				source: "@fcalell/plugin-solid-ui/node/fonts",
				named: ["themeFontsPlugin"],
			}),
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
								args: [{ kind: "string", value: "@fcalell/plugin-solid-ui" }],
							},
						],
					},
				],
			}),
		),

		vite.slots.pluginCalls.contribute(async (ctx): Promise<TsExpression> => {
			const entries = await ctx.resolve(self.slots.fonts);
			// Always pass the array explicitly — even when empty — so
			// `themeFontsPlugin`'s runtime default parameter never resurrects
			// `defaultFonts` behind a consumer's `fonts: []`. The resolved
			// `fonts` slot is the single source of truth.
			return {
				kind: "call",
				callee: { kind: "identifier", name: "themeFontsPlugin" },
				args: [
					{
						kind: "array",
						items: entries.map(fontEntryToExpression),
					},
				],
			};
		}),

		// ── Composition providers ───────────────────────────────────────
		// MetaProvider wraps the app so <Title>/<Meta> from any page can
		// contribute to <head>. order = 0 keeps it outermost as more providers
		// compose in.
		solid.slots.providers.contribute(
			(): ProviderSpec => ({
				imports: [
					{ source: "@fcalell/plugin-solid-ui/meta", named: ["MetaProvider"] },
				],
				wrap: { identifier: "MetaProvider" },
				order: 0,
			}),
		),
		// The consumer's words, mounted once; absent, the context speaks English.
		solid.slots.providers.contribute((): ProviderSpec | undefined => {
			const words = self.options.words;
			if (!words) return undefined;
			return {
				imports: [
					{
						source: "@fcalell/plugin-solid-ui/lib/words",
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
		self.slots.appCssImports.contribute(() => "tailwindcss"),
		self.slots.appCssImports.contribute(
			() => "@fcalell/plugin-solid-ui/globals.css",
		),
		self.slots.appCssBlocks.contribute(async (ctx) =>
			themeBlock(await ctx.resolve(self.slots.resolvedTheme)),
		),
		self.slots.appCssBlocks.contribute(async (ctx) =>
			shadowBlocks(await ctx.resolve(self.slots.resolvedTheme)),
		),
		self.slots.appCssLayers.contribute(async (ctx) =>
			darkLayer(await ctx.resolve(self.slots.resolvedTheme)),
		),

		// CSS is solid-ui's domain — pair the `import "./app.css"` in
		// entry.tsx with the artifact emission so a solid()-only consumer
		// neither imports nor emits a stylesheet.
		solid.slots.entryImports.contribute(
			(): TsImportSpec => ({ source: "./app.css", sideEffect: true }),
		),

		// Emit `.stack/app.css`.
		emitArtifact(".stack/app.css", self.slots.appCssSource),

		// ── Geometry gate ───────────────────────────────────────────────
		// Pre-phase, so a call-site violation stops `stack build` before the
		// Vite build spends a second on it.
		cliSlots.buildSteps.contribute((ctx) => ({
			name: "solid-ui-geometry-gate",
			phase: "pre",
			run: () => runGeometryGate(ctx.cwd),
		})),

		// ── Home scaffold override ──────────────────────────────────────
		// solid-ui owns the richer home page when the design system is in
		// the config. The `override: true` on solid.slots.homeScaffold lets
		// this contribution silently replace solid's bare seed — REVIEW #21
		// fix. No `ctx.hasPlugin` check needed; the slot semantics handle it.
		solid.slots.homeScaffold.contribute(
			(ctx): ScaffoldSpec =>
				ctx.scaffold("home.tsx", "src/app/pages/index.tsx"),
		),
	],
});

export type { SolidUiOptions, Theme, Words } from "./types.ts";
