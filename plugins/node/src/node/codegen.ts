import {
	dedupeImports,
	renderTsSourceFile,
	type TsExpression,
	type TsImportSpec,
	type TsSourceFile,
} from "@fcalell/cli/ast";
import type { CodegenServerPayload, NodeListenerOptions } from "../types.ts";

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
	];
	if (payload.host !== null) {
		properties.push({
			key: "host",
			value: { kind: "string", value: payload.host },
		});
	}
	properties.push({
		key: "origins",
		value: {
			kind: "array",
			items: payload.origins.map((o) => ({ kind: "string", value: o })),
		},
	});
	const listenerNames = Object.keys(payload.listeners).sort();
	if (listenerNames.length > 0) {
		properties.push({
			key: "listeners",
			value: {
				kind: "object",
				properties: listenerNames.map((name) => {
					const listener = payload.listeners[name] as NodeListenerOptions;
					return {
						key: name,
						value: {
							kind: "object",
							properties: [
								{
									key: "port",
									value: { kind: "number", value: listener.port },
								},
								...(listener.host === undefined
									? []
									: [
											{
												key: "host",
												value: {
													kind: "string" as const,
													value: listener.host,
												},
											},
										]),
								{
									key: "originVar",
									value: { kind: "string", value: listener.originVar },
								},
							],
						},
					};
				}),
			},
		});
	}
	properties.push(
		{ key: "maxBody", value: { kind: "number", value: payload.bounds.body } },
		{ key: "maxFrame", value: { kind: "number", value: payload.bounds.frame } },
		{
			key: "workerModule",
			value: payload.hasWorker ? moduleUrl("./worker.ts") : { kind: "null" },
		},
		{
			key: "procedureModule",
			value: payload.hasWorker ? moduleUrl("./procedure.ts") : { kind: "null" },
		},
	);
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
		value:
			payload.staticRoot === null
				? { kind: "null" }
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
