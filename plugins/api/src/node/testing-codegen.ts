import {
	dedupeImports,
	renderTsSourceFile,
	type TsExpression,
	type TsImportSpec,
} from "@fcalell/cli/ast";
import type { TestingPayload } from "./types.ts";

// ── aggregateTesting ──────────────────────────────────────────────────
//
// Renders `.stack/testing.ts`: the consumer test entry. It names the worker
// and procedure modules beside it by URL rather than importing them, because
// route files import `virtual:stack-procedure`, which plain node resolves only
// once `createTestEntry` has registered its hook; a static import would link
// before that. Every relative specifier keeps its `.ts` extension, as plain
// node needs.

const CREATE_TEST_ENTRY_IMPORT: TsImportSpec = {
	source: "@fcalell/plugin-api/testing",
	named: ["createTestEntry"],
};

const APP_ROUTER_IMPORT: TsImportSpec = {
	source: "./worker.ts",
	named: ["AppRouter"],
	typeOnly: true,
};

function moduleUrl(path: string): TsExpression {
	return {
		kind: "new",
		callee: { kind: "identifier", name: "URL" },
		args: [
			{ kind: "string", value: path },
			{ kind: "identifier", name: "import.meta.url" },
		],
	};
}

export function aggregateTesting(payload: TestingPayload): string {
	const env: TsExpression = {
		kind: "object",
		properties: [
			{ key: "STACK_DEV", value: { kind: "string", value: "1" } },
			...payload.env.map((spec) => ({
				key: spec.name,
				value: { kind: "string" as const, value: spec.devDefault },
			})),
		],
	};

	let chain: TsExpression = {
		kind: "call",
		callee: { kind: "identifier", name: "createTestEntry" },
		typeArgs: [{ kind: "reference", name: "AppRouter" }],
		args: [
			{
				kind: "object",
				properties: [
					{ key: "worker", value: moduleUrl("./worker.ts") },
					{ key: "procedure", value: moduleUrl("./procedure.ts") },
					{ key: "root", value: moduleUrl("..") },
					{ key: "prefix", value: { kind: "string", value: payload.prefix } },
					{ key: "env", value: env },
				],
			},
		],
	};
	for (const entry of payload.entries) {
		chain = {
			kind: "call",
			callee: { kind: "member", object: chain, property: "use" },
			args: [
				{
					kind: "call",
					callee: { kind: "identifier", name: entry.identifier },
					args: [
						{
							kind: "object",
							properties: Object.entries(entry.options).map(([key, value]) => ({
								key,
								value,
							})),
						},
					],
				},
			],
		};
	}

	return renderTsSourceFile({
		imports: dedupeImports([
			CREATE_TEST_ENTRY_IMPORT,
			APP_ROUTER_IMPORT,
			...payload.imports,
			...payload.entries.map((entry) => entry.import),
		]),
		statements: [
			{ kind: "const", name: "testing", value: chain, exported: true },
		],
	});
}
