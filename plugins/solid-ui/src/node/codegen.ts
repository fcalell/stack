import {
	type CodegenAppCssPayload,
	type CssImport,
	cssImportSchema,
	cssLayerSchema,
} from "../types";
import { cssIdent, cssString, cssSupportsExpression } from "./css-escape";

// Emits `.stack/app.css` as a sequence of `@import` statements followed by
// `@layer` blocks. Returns null when no contributions exist so consumers
// don't see an empty file.
//
// Every interpolation point is routed through the css-escape helpers —
// strings via `cssString`, layer names via `cssIdent`, supports expressions
// via `cssSupportsExpression`. The slot schemas (`cssImportSchema` /
// `cssLayerSchema` in types.ts) reject malformed contributions on entry,
// but we re-validate on render as defense-in-depth: any contribution that
// reaches here invalid is a bug in the contributing plugin and we want a
// loud error, not silently-corrupt CSS.
export function aggregateAppCss(payload: CodegenAppCssPayload): string | null {
	if (payload.imports.length === 0 && payload.layers.length === 0) {
		return null;
	}

	const lines: string[] = [];
	for (const imp of payload.imports) {
		lines.push(renderImport(cssImportSchema.parse(imp) as CssImport));
	}
	if (payload.imports.length > 0 && payload.layers.length > 0) {
		lines.push("");
	}
	for (const raw of payload.layers) {
		const layer = cssLayerSchema.parse(raw);
		lines.push(`@layer ${cssIdent(layer.name)} {`);
		lines.push(layer.content.trim());
		lines.push("}");
	}

	return `${lines.join("\n")}\n`;
}

function renderImport(imp: CssImport): string {
	if (typeof imp === "string") return `@import ${cssString(imp)};`;
	const parts = [`@import ${cssString(imp.url)}`];
	if (imp.layer !== undefined) parts.push(`layer(${cssIdent(imp.layer)})`);
	if (imp.supports !== undefined) {
		parts.push(`supports(${cssSupportsExpression(imp.supports)})`);
	}
	return `${parts.join(" ")};`;
}
