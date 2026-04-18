interface StackConfigOptions {
	name: string;
	domain: string;
	plugins: string[];
	pluginAnswers: Map<string, Record<string, unknown>>;
}

function toCamelCase(name: string): string {
	return name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

export function stackConfigTemplate(options: StackConfigOptions): string {
	const imports = ['import { defineConfig } from "@fcalell/cli";'];

	for (const name of options.plugins) {
		const id = toCamelCase(name);
		imports.push(`import { ${id} } from "@fcalell/plugin-${name}";`);
	}

	const pluginCalls: string[] = [];
	for (const name of options.plugins) {
		const id = toCamelCase(name);
		const answers = options.pluginAnswers.get(name);
		if (answers && Object.keys(answers).length > 0) {
			const optStr = formatOptions(answers, 2);
			pluginCalls.push(`\t\t${id}(${optStr})`);
		} else {
			pluginCalls.push(`\t\t${id}()`);
		}
	}

	const lines: string[] = [];
	lines.push("");
	lines.push("export default defineConfig({");
	lines.push("\tapp: {");
	lines.push(`\t\tname: "${options.name}",`);
	lines.push(`\t\tdomain: "${options.domain}",`);
	lines.push("\t},");
	lines.push("\tplugins: [");
	lines.push(`${pluginCalls.join(",\n")},`);
	lines.push("\t],");
	lines.push("});");
	lines.push("");

	return `${imports.join("\n")}\n${lines.join("\n")}`;
}

function formatOptions(obj: Record<string, unknown>, depth: number): string {
	const indent = "\t".repeat(depth);
	const innerIndent = "\t".repeat(depth + 1);
	const entries: string[] = [];

	for (const [key, value] of Object.entries(obj)) {
		if (typeof value === "string") {
			entries.push(`${innerIndent}${key}: "${value}"`);
		} else if (typeof value === "number" || typeof value === "boolean") {
			entries.push(`${innerIndent}${key}: ${value}`);
		} else if (
			typeof value === "object" &&
			value !== null &&
			!Array.isArray(value)
		) {
			entries.push(
				`${innerIndent}${key}: ${formatOptions(value as Record<string, unknown>, depth + 1)}`,
			);
		} else {
			entries.push(`${innerIndent}${key}: ${JSON.stringify(value)}`);
		}
	}

	return `{\n${entries.join(",\n")},\n${indent}}`;
}
