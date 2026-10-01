import {
	type CodegenAppCssPayload,
	type CssImport,
	cssBlockSchema,
	cssImportSchema,
	cssLayerSchema,
	cssSourceInlineSchema,
} from "../types.ts";
import {
	cssIdent,
	cssProperty,
	cssString,
	cssSupportsExpression,
	cssTokenValue,
} from "./css-escape.ts";

// Emits `.stack/app.css` as `@import` statements, the `@source` declarations,
// the top-level `@theme` / `@utility` / `@custom-variant` blocks, then the `@layer` blocks. The
// block/layer split is the cascade: `@theme` compiles into `@layer theme`,
// which Tailwind sorts before `base`, so a `@layer base` block overrides a
// seeded token. Returns null when no contributions exist so consumers don't
// see an empty file.
//
// Every interpolation point is routed through the css-escape helpers —
// strings via `cssString`, idents via `cssIdent`, declaration property names
// via `cssProperty`, declaration values via `cssTokenValue`, supports
// expressions via `cssSupportsExpression`. The slot schemas (`cssImportSchema`
// / `cssBlockSchema` / `cssLayerSchema` in types.ts) reject malformed
// contributions on entry, but we re-validate on render as defense-in-depth:
// any contribution that reaches here invalid is a bug in the contributing
// plugin and we want a loud error, not silently-corrupt CSS.
export function aggregateAppCss(payload: CodegenAppCssPayload): string | null {
	if (
		payload.imports.length === 0 &&
		payload.sources.length === 0 &&
		payload.blocks.length === 0 &&
		payload.layers.length === 0
	) {
		return null;
	}

	const lines: string[] = [];
	for (const imp of payload.imports) {
		lines.push(renderImport(cssImportSchema.parse(imp) as CssImport));
	}
	// Tailwind's automatic content detection roots at this sheet's directory,
	// `.stack/`, and would scan every generated file there (the worker types,
	// wrangler's bundle). The `tailwindcss` import turns it off with
	// `source(none)`, so the consumer's sources are declared explicitly.
	lines.push(`@source "../src";`);
	for (const pattern of payload.sources) {
		lines.push(
			`@source inline(${cssString(cssSourceInlineSchema.parse(pattern))});`,
		);
	}

	for (const raw of payload.blocks) {
		const block = cssBlockSchema.parse(raw);
		lines.push("");
		if (block.kind === "variant") {
			lines.push(`@custom-variant ${cssIdent(block.name)} {`);
			lines.push(block.content.trim());
		} else {
			lines.push(
				block.kind === "theme"
					? "@theme {"
					: `@utility ${cssIdent(block.name)} {`,
			);
			lines.push(...renderDeclarations(block.declarations));
		}
		lines.push("}");
	}

	for (const raw of payload.layers) {
		const layer = cssLayerSchema.parse(raw);
		lines.push("");
		lines.push(`@layer ${cssIdent(layer.name)} {`);
		lines.push(layer.content.trim());
		lines.push("}");
	}

	return `${lines.join("\n")}\n`;
}

// A rule whose declarations cross the same render boundary as a block's.
// `appCssLayers` passes layer content through untouched, so a plugin
// contributing a token block builds it with this rather than by hand. The
// selector is the contributing plugin's own constant, never an input.
export function renderRule(
	selector: string,
	declarations: Record<string, string>,
): string {
	return [`${selector} {`, ...renderDeclarations(declarations), "}"].join("\n");
}

// A rule inside one media query: a token block a device class sets, such as
// the compact density sizes under the desktop query.
export function renderMediaRule(query: string, rule: string): string {
	return [`@media ${query} {`, rule, "}"].join("\n");
}

function renderDeclarations(declarations: Record<string, string>): string[] {
	return Object.entries(declarations).map(
		([property, value]) =>
			`\t${cssProperty(property)}: ${cssTokenValue(value)};`,
	);
}

function renderImport(imp: CssImport): string {
	if (typeof imp === "string") return `@import ${cssString(imp)};`;
	const parts = [`@import ${cssString(imp.url)}`];
	if (imp.layer !== undefined) parts.push(`layer(${cssIdent(imp.layer)})`);
	if (imp.supports !== undefined) {
		parts.push(`supports(${cssSupportsExpression(imp.supports)})`);
	}
	if (imp.source !== undefined) parts.push(`source(${imp.source})`);
	return `${parts.join(" ")};`;
}
