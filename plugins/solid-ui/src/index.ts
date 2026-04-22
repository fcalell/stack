import { plugin, slot } from "@fcalell/cli";
import type {
	ProviderSpec,
	ScaffoldSpec,
	TsExpression,
	TsImportSpec,
} from "@fcalell/cli/ast";
import { cliSlots } from "@fcalell/cli/cli-slots";
import { solid } from "@fcalell/plugin-solid";
import { vite } from "@fcalell/plugin-vite";
import { aggregateAppCss } from "./node/codegen";
import { defaultFonts, type FontEntry } from "./node/fonts";
import { type SolidUiOptions, solidUiOptionsSchema } from "./types";

const SOURCE = "solid-ui";

const ROLE_FALLBACKS: Record<NonNullable<FontEntry["role"]>, string[]> = {
	sans: ["ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
	mono: ["ui-monospace", '"Cascadia Code"', '"Source Code Pro"', "monospace"],
	serif: ["ui-serif", "Georgia", "Cambria", '"Times New Roman"', "serif"],
};

function fontEntryToExpression(font: FontEntry): TsExpression {
	const props: Array<{ key: string; value: TsExpression }> = [
		{ key: "family", value: { kind: "string", value: font.family } },
		{ key: "specifier", value: { kind: "string", value: font.specifier } },
		{ key: "weight", value: { kind: "string", value: font.weight } },
		{ key: "style", value: { kind: "string", value: font.style } },
	];
	if (font.role) {
		props.push({ key: "role", value: { kind: "string", value: font.role } });
	}
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

function fontsToTokenCss(fonts: FontEntry[]): string | null {
	const byRole = new Map<NonNullable<FontEntry["role"]>, FontEntry>();
	for (const font of fonts) {
		if (!font.role || byRole.has(font.role)) continue;
		byRole.set(font.role, font);
	}
	if (byRole.size === 0) return null;

	const decls: string[] = [];
	for (const [role, font] of byRole) {
		const stack = [
			`"${font.family}"`,
			`"${font.family} Fallback"`,
			...ROLE_FALLBACKS[role],
		];
		decls.push(`\t--ui-font-${role}: ${stack.join(", ")};`);
	}
	return `:root {\n${decls.join("\n")}\n}`;
}

// ── Slot declarations ──────────────────────────────────────────────

const appCssImports = slot.list<string>({
	source: SOURCE,
	name: "appCssImports",
});

const appCssLayers = slot.list<{ name: string; content: string }>({
	source: SOURCE,
	name: "appCssLayers",
});

// Resolved font entries. Derived from options only (no cross-slot inputs) so
// every other contribution can read the same source of truth.
const fonts = slot.derived<FontEntry[], Record<string, never>>({
	source: SOURCE,
	name: "fonts",
	inputs: {},
	compute: (_inp, ctx) => {
		const opts = (ctx.options ?? {}) as SolidUiOptions;
		return opts.fonts ?? defaultFonts;
	},
});

// Rendered `.stack/app.css`. Returns null when no imports or layers landed.
const appCssSource = slot.derived<
	string | null,
	{ imports: typeof appCssImports; layers: typeof appCssLayers }
>({
	source: SOURCE,
	name: "appCssSource",
	inputs: { imports: appCssImports, layers: appCssLayers },
	compute: (inp) =>
		aggregateAppCss({ imports: inp.imports, layers: inp.layers }),
});

export const solidUi = plugin<
	"solid-ui",
	SolidUiOptions,
	{
		appCssImports: typeof appCssImports;
		appCssLayers: typeof appCssLayers;
		fonts: typeof fonts;
		appCssSource: typeof appCssSource;
	}
>("solid-ui", {
	label: "Design System",

	schema: solidUiOptionsSchema,

	dependencies: {
		tailwindcss: "^4.1.7",
	},
	devDependencies: {
		"@tailwindcss/vite": "^4.1.7",
	},

	slots: {
		appCssImports,
		appCssLayers,
		fonts,
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
		vite.slots.pluginCalls.contribute(async (ctx): Promise<TsExpression> => {
			const entries = await ctx.resolve(self.slots.fonts);
			return {
				kind: "call",
				callee: { kind: "identifier", name: "themeFontsPlugin" },
				args:
					entries.length > 0
						? [
								{
									kind: "array",
									items: entries.map(fontEntryToExpression),
								},
							]
						: [],
			};
		}),

		// ── Composition providers ───────────────────────────────────────
		// MetaProvider wraps the app so <Title>/<Meta> from any page can
		// contribute to <head>. Toaster renders as a sibling alongside the
		// wrapped children so solid-sonner anchors at the root. order = 0
		// keeps MetaProvider outermost even as more providers compose in.
		solid.slots.providers.contribute(
			(): ProviderSpec => ({
				imports: [
					{ source: "@fcalell/plugin-solid-ui/meta", named: ["MetaProvider"] },
					{
						source: "@fcalell/plugin-solid-ui/components/toast",
						named: ["Toaster"],
					},
				],
				wrap: { identifier: "MetaProvider" },
				siblings: [{ kind: "jsx", tag: "Toaster", props: [], children: [] }],
				order: 0,
			}),
		),

		// ── App CSS ─────────────────────────────────────────────────────
		self.slots.appCssImports.contribute(() => "tailwindcss"),
		self.slots.appCssImports.contribute(
			() => "@fcalell/plugin-solid-ui/globals.css",
		),
		self.slots.appCssLayers.contribute(async (ctx) => {
			const entries = await ctx.resolve(self.slots.fonts);
			const content = fontsToTokenCss(entries);
			if (content === null) return undefined;
			return { name: "base", content };
		}),

		// Emit `.stack/app.css`.
		cliSlots.artifactFiles.contribute(async (ctx) => {
			const src = await ctx.resolve(self.slots.appCssSource);
			if (src === null) return undefined;
			return { path: ".stack/app.css", content: src };
		}),

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

export type { SolidUiOptions } from "./types";
