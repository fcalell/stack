import { createPlugin } from "@fcalell/cli";
import type { TsExpression } from "@fcalell/cli/ast";
import { Codegen, Composition, Init, Remove } from "@fcalell/cli/events";
import { solid } from "@fcalell/plugin-solid";
import { defaultFonts, type FontEntry } from "@fcalell/ui/fonts-manifest";
import type { SolidUiOptions } from "./types";

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

export const solidUi = createPlugin("solid-ui", {
	label: "Design System",
	depends: [solid.events.SolidConfigured],

	config(options: SolidUiOptions = {}) {
		return options;
	},

	register(ctx, bus) {
		bus.on(Init.Scaffold, (p) => {
			p.files.push({
				source: new URL("../templates/home.tsx", import.meta.url),
				target: "src/app/pages/index.tsx",
			});
			p.dependencies["@fcalell/ui"] = "workspace:*";
		});

		bus.on(Codegen.ViteConfig, (p) => {
			const fonts = ctx.options?.fonts ?? defaultFonts;
			p.imports.push({
				source: "@fcalell/plugin-vite/preset",
				named: ["themeFontsPlugin"],
			});
			p.pluginCalls.push({
				kind: "call",
				callee: { kind: "identifier", name: "themeFontsPlugin" },
				args:
					fonts.length > 0
						? [{ kind: "array", items: fonts.map(fontEntryToExpression) }]
						: [],
			});
		});

		bus.on(Codegen.AppCss, (p) => {
			p.imports.push("@fcalell/ui/globals.css");
			const fonts = ctx.options?.fonts ?? defaultFonts;
			const layer = fontsToTokenCss(fonts);
			if (layer) p.layers.push({ name: "base", content: layer });
		});

		// MetaProvider wraps the app so <Title> / <Meta> from any page can
		// contribute to <head>. Toaster renders as a sibling alongside the
		// wrapped children so solid-sonner anchors at the root.
		bus.on(Composition.Providers, (p) => {
			p.providers.push({
				imports: [
					{ source: "@fcalell/ui/meta", named: ["MetaProvider"] },
					{ source: "@fcalell/ui/components/toast", named: ["Toaster"] },
				],
				wrap: { identifier: "MetaProvider" },
				siblings: [{ kind: "jsx", tag: "Toaster", props: [], children: [] }],
				order: 100,
			});
		});

		bus.on(Remove, (p) => {
			p.dependencies.push("@fcalell/ui");
			// Don't delete src/app/ — plugin-solid owns that directory
		});
	},
});

export type { SolidUiOptions } from "./types";
