import { createPlugin, type } from "@fcalell/cli";
import type { TsExpression } from "@fcalell/cli/ast";
import { Generate, Init } from "@fcalell/cli/events";
import { solid } from "@fcalell/plugin-solid";
import { vite } from "@fcalell/plugin-vite";
import { aggregateAppCss } from "./node/codegen";
import { defaultFonts, type FontEntry } from "./node/fonts";
import { type CodegenAppCssPayload, solidUiOptionsSchema } from "./types";

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
	events: {
		AppCss: type<CodegenAppCssPayload>(),
	},
	after: [solid.events.SolidConfigured],

	schema: solidUiOptionsSchema,

	dependencies: {
		tailwindcss: "^4.1.7",
	},
	devDependencies: {
		"@tailwindcss/vite": "^4.1.7",
	},

	register(ctx, bus, events) {
		bus.on(Init.Scaffold, (p) => {
			p.files.push(ctx.scaffold("home.tsx", "src/app/pages/index.tsx"));
		});

		bus.on(vite.events.ViteConfig, (p) => {
			p.imports.push({
				source: "@tailwindcss/vite",
				default: "tailwindcss",
			});
			p.pluginCalls.push({
				kind: "call",
				callee: { kind: "identifier", name: "tailwindcss" },
				args: [],
			});

			const fonts = ctx.options?.fonts ?? defaultFonts;
			p.imports.push({
				source: "@fcalell/plugin-solid-ui/node/fonts",
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

		bus.on(events.AppCss, (p) => {
			p.imports.push("tailwindcss");
			p.imports.push("@fcalell/plugin-solid-ui/globals.css");
			const fonts = ctx.options?.fonts ?? defaultFonts;
			const layer = fontsToTokenCss(fonts);
			if (layer) p.layers.push({ name: "base", content: layer });
		});

		bus.on(Generate, async (p) => {
			const appCssPayload = await bus.emit(events.AppCss, {
				imports: [],
				layers: [],
			});
			const appCssSource = aggregateAppCss(appCssPayload);
			if (appCssSource !== null) {
				p.files.push({ path: ".stack/app.css", content: appCssSource });
			}
		});

		// MetaProvider wraps the app so <Title> / <Meta> from any page can
		// contribute to <head>. Toaster renders as a sibling alongside the
		// wrapped children so solid-sonner anchors at the root. order = 0 so
		// MetaProvider stays outermost even as more providers compose in.
		bus.on(solid.events.Providers, (p) => {
			p.providers.push({
				imports: [
					{
						source: "@fcalell/plugin-solid-ui/meta",
						named: ["MetaProvider"],
					},
					{
						source: "@fcalell/plugin-solid-ui/components/toast",
						named: ["Toaster"],
					},
				],
				wrap: { identifier: "MetaProvider" },
				siblings: [{ kind: "jsx", tag: "Toaster", props: [], children: [] }],
				order: 0,
			});
		});

		// No Remove handler needed: plugin-solid-ui has no consumer-owned
		// surface to tear down — plugin-solid owns `src/app/` and the package
		// itself is removed from `package.json` by the CLI remove command.
	},
});

export type { SolidUiOptions } from "./types";
