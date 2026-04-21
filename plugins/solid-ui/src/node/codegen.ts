import type { CodegenAppCssPayload } from "../types";

// Emits `.stack/app.css` as a sequence of `@import` statements followed by
// `@layer` blocks. Returns null when no contributions exist so consumers
// don't see an empty file.
export function aggregateAppCss(payload: CodegenAppCssPayload): string | null {
	if (payload.imports.length === 0 && payload.layers.length === 0) {
		return null;
	}

	const lines: string[] = [];
	for (const imp of payload.imports) {
		lines.push(`@import ${JSON.stringify(imp)};`);
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
