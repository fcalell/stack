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
	const { bundle } = payload;
	const imports: TsImportSpec[] = [
		{ source: "@fcalell/plugin-node/server", named: ["startNodeServer"] },
	];
	// The bundle imports what the source entry loads by URL, so a bundler
	// follows it; "virtual:stack-procedure" is the bundler's alias.
	if (bundle) imports.push(...bundle.imports);
	if (bundle && payload.hasWorker) {
		imports.push({ source: "./worker.ts", default: "worker" });
	}
	if (bundle && payload.hasConsumerServices) {
		imports.push({
			source: "../src/server/services/index.ts",
			namespace: "consumerServices",
		});
	}
	for (const entry of payload.services) {
		imports.push(...entry.imports);
	}

	const properties: Array<{ key: string; value: TsExpression }> = [
		{ key: "port", value: { kind: "number", value: payload.port } },
	];
	if (payload.host !== null) {
		properties.push({
			key: "host",
			value: { kind: "string", value: payload.host },
		});
	}
	properties.push(
		{ key: "maxBody", value: { kind: "number", value: payload.bounds.body } },
		{ key: "maxFrame", value: { kind: "number", value: payload.bounds.frame } },
	);
	if (bundle) {
		properties.push({
			key: "modules",
			value: {
				kind: "object",
				properties: [
					{
						key: "worker",
						value: payload.hasWorker
							? { kind: "identifier", name: "worker" }
							: { kind: "null" },
					},
					{
						key: "services",
						value: payload.hasConsumerServices
							? {
									kind: "member",
									object: { kind: "identifier", name: "consumerServices" },
									property: "services",
								}
							: { kind: "array", items: [] },
					},
				],
			},
		});
	} else {
		properties.push(
			{
				key: "workerModule",
				value: payload.hasWorker ? moduleUrl("./worker.ts") : { kind: "null" },
			},
			{
				key: "procedureModule",
				value: payload.hasWorker
					? moduleUrl("./procedure.ts")
					: { kind: "null" },
			},
		);
	}
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
		key: bundle ? "staticDir" : "staticRoot",
		value:
			payload.staticRoot === null
				? { kind: "null" }
				: bundle
					? moduleUrl(bundle.staticDir ?? "../client")
					: { kind: "string", value: payload.staticRoot },
	});
	const headerNames = Object.keys(payload.clientHeaders).sort();
	if (payload.staticRoot !== null && headerNames.length > 0) {
		properties.push({
			key: "clientHeaders",
			value: {
				kind: "object",
				properties: headerNames.map((name) => ({
					key: name,
					value: {
						kind: "string",
						value: payload.clientHeaders[name] as string,
					},
				})),
			},
		});
	}
	if (!bundle) {
		properties.push({
			key: "servicesModule",
			value: payload.hasConsumerServices
				? moduleUrl("../src/server/services/index.ts")
				: { kind: "null" },
		});
	} else if (bundle.boot.length > 0) {
		properties.push({
			key: "boot",
			value: { kind: "array", items: bundle.boot },
		});
	}
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
