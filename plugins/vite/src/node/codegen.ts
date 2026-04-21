import {
	renderTsSourceFile,
	type TsExpression,
	type TsImportSpec,
	type TsSourceFile,
} from "@fcalell/cli/ast";
import type { CodegenViteConfigPayload } from "../types";

export function aggregateViteConfig(payload: CodegenViteConfigPayload): string {
	const imports: TsImportSpec[] = [
		{ source: "node:url", named: ["fileURLToPath"] },
		{ source: "vite", named: ["defineConfig"] },
		...payload.imports,
	];

	const configProps: Array<{
		key: string;
		value: TsExpression;
		shorthand?: boolean;
	}> = [
		{
			key: "root",
			value: {
				kind: "call",
				callee: { kind: "identifier", name: "fileURLToPath" },
				args: [
					{
						kind: "new",
						callee: { kind: "identifier", name: "URL" },
						args: [
							{ kind: "string", value: "." },
							{
								kind: "member",
								object: { kind: "identifier", name: "import.meta" },
								property: "url",
							},
						],
					},
				],
			},
		},
		{ key: "publicDir", value: { kind: "string", value: "../public" } },
		{
			key: "build",
			value: {
				kind: "object",
				properties: [
					{ key: "outDir", value: { kind: "string", value: "../dist/client" } },
					{ key: "emptyOutDir", value: { kind: "boolean", value: true } },
				],
			},
		},
		{
			key: "plugins",
			value: { kind: "array", items: payload.pluginCalls },
		},
	];

	if (payload.devServerPort > 0) {
		configProps.push({
			key: "server",
			value: {
				kind: "object",
				properties: [
					{
						key: "port",
						value: { kind: "number", value: payload.devServerPort },
					},
				],
			},
		});
	}

	if (payload.resolveAliases.length > 0) {
		configProps.push({
			key: "resolve",
			value: {
				kind: "object",
				properties: [
					{
						key: "alias",
						value: {
							kind: "object",
							properties: payload.resolveAliases.map((a) => ({
								key: a.find,
								value: { kind: "string", value: a.replacement },
							})),
						},
					},
				],
			},
		});
	}

	const spec: TsSourceFile = {
		imports,
		statements: [
			{
				kind: "export-default",
				value: {
					kind: "call",
					callee: { kind: "identifier", name: "defineConfig" },
					args: [{ kind: "object", properties: configProps }],
				},
			},
		],
	};

	const rendered = renderTsSourceFile(spec);
	return rendered.endsWith("\n") ? rendered : `${rendered}\n`;
}
