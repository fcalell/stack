import {
	dedupeImports,
	renderTsSourceFile,
	type TsExpression,
	type TsImportSpec,
	type TsSourceFile,
} from "@fcalell/cli/ast";
import type { CodegenServerPayload } from "../types.ts";

function moduleUrl(relativePath: string): TsExpression {
	return {
		kind: "new",
		callee: { kind: "identifier", name: "URL" },
		args: [
			{ kind: "string", value: relativePath },
			{
				kind: "member",
				object: { kind: "identifier", name: "import.meta" },
				property: "url",
			},
		],
	};
}

// Renders `.stack/server.ts`: a thin call into the runtime, so every moving
// part (module loading, mounting, static serving, service lifecycle) lives
// in `@fcalell/plugin-node/server` where it is testable, not in generated
// text. Worker/services are passed as module URLs, not imports — see
// startNodeServer for why static imports cannot work here.
export function aggregateServer(payload: CodegenServerPayload): string {
	const imports: TsImportSpec[] = [
		{ source: "@fcalell/plugin-node/server", named: ["startNodeServer"] },
	];
	for (const entry of payload.services) {
		imports.push(...entry.imports);
	}

	const properties: Array<{ key: string; value: TsExpression }> = [
		{ key: "port", value: { kind: "number", value: payload.port } },
		{
			key: "workerModule",
			value: payload.hasWorker ? moduleUrl("./worker.ts") : { kind: "null" },
		},
		{
			key: "procedureModule",
			value: payload.hasWorker ? moduleUrl("./procedure.ts") : { kind: "null" },
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
		key: "servicesModule",
		value: payload.hasConsumerServices
			? moduleUrl("../src/server/services/index.ts")
			: { kind: "null" },
	});
	if (payload.services.length > 0) {
		properties.push({
			key: "services",
			value: {
				kind: "array",
				items: payload.services.map((entry) => entry.expression),
			},
		});
	}

	const spec: TsSourceFile = {
		imports: dedupeImports(imports),
		statements: [
			{
				kind: "expression",
				value: {
					kind: "call",
					callee: { kind: "identifier", name: "startNodeServer" },
					args: [{ kind: "object", properties }],
				},
			},
		],
	};

	return renderTsSourceFile(spec);
}
