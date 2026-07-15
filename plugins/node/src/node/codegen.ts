import {
	dedupeImports,
	renderTsSourceFile,
	type TsExpression,
	type TsImportSpec,
	type TsSourceFile,
} from "@fcalell/cli/ast";
import type { CodegenServerPayload } from "../types";

// Renders `.stack/server.ts`: a thin call into the runtime, so every moving
// part (mounting, static serving, service lifecycle) lives in
// `@fcalell/plugin-node/server` where it is testable, not in generated text.
export function aggregateServer(payload: CodegenServerPayload): string {
	const imports: TsImportSpec[] = [
		{ source: "@fcalell/plugin-node/server", named: ["createNodeServer"] },
	];
	if (payload.hasWorker) {
		imports.push({ source: "./worker", default: "worker" });
	}
	for (const entry of payload.services) {
		imports.push(...entry.imports);
	}

	const properties: Array<{ key: string; value: TsExpression }> = [
		{ key: "port", value: { kind: "number", value: payload.port } },
		{
			key: "worker",
			value: payload.hasWorker
				? { kind: "identifier", name: "worker" }
				: { kind: "null" },
		},
	];
	if (payload.hasWorker) {
		properties.push({
			key: "workerPaths",
			value: {
				kind: "array",
				items: payload.workerPaths.map((p) => ({
					kind: "string",
					value: p,
				})),
			},
		});
	}
	properties.push({
		key: "staticRoot",
		value: { kind: "string", value: "dist/client" },
	});
	properties.push({
		key: "services",
		value: {
			kind: "array",
			items: payload.services.map((entry) => entry.expression),
		},
	});

	const spec: TsSourceFile = {
		imports: dedupeImports(imports),
		statements: [
			{
				kind: "expression",
				value: {
					kind: "call",
					callee: {
						kind: "member",
						object: {
							kind: "call",
							callee: { kind: "identifier", name: "createNodeServer" },
							args: [{ kind: "object", properties }],
						},
						property: "start",
					},
					args: [],
				},
			},
		],
	};

	return renderTsSourceFile(spec);
}
