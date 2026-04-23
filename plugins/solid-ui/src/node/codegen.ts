import type { CodegenAppCssPayload, CssImport } from "../types";

// Emits `.stack/app.css` as a sequence of `@import` statements followed by
// `@layer` blocks. Returns null when no contributions exist so consumers
// don't see an empty file.
export function aggregateAppCss(payload: CodegenAppCssPayload): string | null {
	if (payload.imports.length === 0 && payload.layers.length === 0) {
		return null;
	}

	const lines: string[] = [];
	for (const imp of payload.imports) {
		lines.push(renderImport(imp));
	}
	if (payload.imports.length > 0 && payload.layers.length > 0) {
		lines.push("");
	}
	for (const layer of payload.layers) {
		lines.push(`@layer ${layer.name} {`);
		lines.push(layer.content.trim());
		lines.push("}");
	}

	return `${lines.join("\n")}\n`;
}

function renderImport(imp: CssImport): string {
	if (typeof imp === "string") return `@import ${JSON.stringify(imp)};`;
	const parts = [`@import ${JSON.stringify(imp.url)}`];
	if (imp.layer !== undefined) parts.push(`layer(${imp.layer})`);
	if (imp.supports !== undefined) parts.push(`supports(${imp.supports})`);
	return `${parts.join(" ")};`;
}
