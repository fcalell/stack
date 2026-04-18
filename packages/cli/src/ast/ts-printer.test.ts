import { describe, expect, it } from "vitest";
import type {
	TsExpression,
	TsImportSpec,
	TsStatement,
	TsTypeRef,
} from "#ast/specs";
import { renderTsSourceFile } from "#ast/ts-printer";

// Helper: wrap an expression inside `const x = <expr>;` so we can exercise
// expressions without needing full statement boilerplate each time.
function renderExpr(expr: TsExpression): string {
	return renderTsSourceFile({
		imports: [],
		statements: [{ kind: "const", name: "x", value: expr }],
	}).trim();
}

function renderType(type: TsTypeRef): string {
	return renderTsSourceFile({
		imports: [],
		statements: [{ kind: "export-type", name: "T", type }],
	}).trim();
}

function renderStmt(stmt: TsStatement): string {
	return renderTsSourceFile({ imports: [], statements: [stmt] }).trim();
}

function renderImport(spec: TsImportSpec): string {
	return renderTsSourceFile({ imports: [spec], statements: [] }).trim();
}

describe("renderTsSourceFile — empty file", () => {
	it("returns empty string when no imports and no statements", () => {
		expect(renderTsSourceFile({ imports: [], statements: [] })).toBe("");
	});
});

describe("renderTsSourceFile — imports", () => {
	it("default import", () => {
		expect(renderImport({ source: "react", default: "React" })).toBe(
			'import React from "react";',
		);
	});

	it("type-only default import", () => {
		expect(renderImport({ source: "m", default: "X", typeOnly: true })).toBe(
			'import type X from "m";',
		);
	});

	it("named imports with and without aliases", () => {
		expect(
			renderImport({
				source: "lib",
				named: ["a", { name: "b", alias: "c" }],
			}),
		).toBe('import { a, b as c } from "lib";');
	});

	it("type-only named imports", () => {
		expect(
			renderImport({ source: "t", named: ["A", "B"], typeOnly: true }),
		).toBe('import type { A, B } from "t";');
	});

	it("namespace import", () => {
		expect(renderImport({ source: "ns", namespace: "NS" })).toBe(
			'import * as NS from "ns";',
		);
	});

	it("side-effect import", () => {
		expect(renderImport({ source: "./polyfill", sideEffect: true })).toBe(
			'import "./polyfill";',
		);
	});
});

describe("renderTsSourceFile — TsExpression kinds", () => {
	it("string literal escapes quotes", () => {
		expect(renderExpr({ kind: "string", value: 'he said "hi"' })).toBe(
			'const x = "he said \\"hi\\"";',
		);
	});

	it("number literal", () => {
		expect(renderExpr({ kind: "number", value: 42 })).toBe("const x = 42;");
	});

	it("boolean literal", () => {
		expect(renderExpr({ kind: "boolean", value: true })).toBe(
			"const x = true;",
		);
	});

	it("null literal", () => {
		expect(renderExpr({ kind: "null" })).toBe("const x = null;");
	});

	it("undefined literal", () => {
		expect(renderExpr({ kind: "undefined" })).toBe("const x = undefined;");
	});

	it("identifier", () => {
		expect(renderExpr({ kind: "identifier", name: "foo" })).toBe(
			"const x = foo;",
		);
	});

	it("member access", () => {
		expect(
			renderExpr({
				kind: "member",
				object: { kind: "identifier", name: "a" },
				property: "b",
			}),
		).toBe("const x = a.b;");
	});

	it("chained member access", () => {
		expect(
			renderExpr({
				kind: "member",
				object: {
					kind: "member",
					object: { kind: "identifier", name: "a" },
					property: "b",
				},
				property: "c",
			}),
		).toBe("const x = a.b.c;");
	});

	it("call expression with args", () => {
		expect(
			renderExpr({
				kind: "call",
				callee: { kind: "identifier", name: "f" },
				args: [
					{ kind: "number", value: 1 },
					{ kind: "string", value: "a" },
				],
			}),
		).toBe('const x = f(1, "a");');
	});

	it("call expression with type arguments", () => {
		expect(
			renderExpr({
				kind: "call",
				callee: { kind: "identifier", name: "f" },
				typeArgs: [{ kind: "reference", name: "T" }],
				args: [],
			}),
		).toBe("const x = f<T>();");
	});

	it("new expression", () => {
		expect(
			renderExpr({
				kind: "new",
				callee: { kind: "identifier", name: "Foo" },
				args: [{ kind: "number", value: 1 }],
			}),
		).toBe("const x = new Foo(1);");
	});

	it("empty object", () => {
		expect(renderExpr({ kind: "object", properties: [] })).toBe(
			"const x = {};",
		);
	});

	it("object with properties and shorthand", () => {
		expect(
			renderExpr({
				kind: "object",
				properties: [
					{ key: "a", value: { kind: "number", value: 1 } },
					{
						key: "b",
						value: { kind: "identifier", name: "b" },
						shorthand: true,
					},
					{
						key: "kebab-key",
						value: { kind: "string", value: "v" },
					},
				],
			}),
		).toBe('const x = { a: 1, b, "kebab-key": "v" };');
	});

	it("array literal", () => {
		expect(
			renderExpr({
				kind: "array",
				items: [
					{ kind: "number", value: 1 },
					{ kind: "number", value: 2 },
				],
			}),
		).toBe("const x = [1, 2];");
	});

	it("arrow with expression body", () => {
		expect(
			renderExpr({
				kind: "arrow",
				params: [
					{ name: "a" },
					{ name: "b", type: { kind: "reference", name: "number" } },
				],
				body: { kind: "identifier", name: "a" },
			}),
		).toBe("const x = (a, b: number) => a;");
	});

	it("async arrow with block body", () => {
		const result = renderExpr({
			kind: "arrow",
			async: true,
			params: [],
			body: [
				{
					kind: "expression",
					value: {
						kind: "call",
						callee: { kind: "identifier", name: "doThing" },
						args: [],
					},
				},
			],
		});
		expect(result).toContain("async () =>");
		expect(result).toContain("doThing()");
	});

	it("as expression", () => {
		expect(
			renderExpr({
				kind: "as",
				expression: { kind: "identifier", name: "x" },
				type: { kind: "reference", name: "unknown" },
			}),
		).toBe("const x = x as unknown;");
	});

	it("jsx self-closing with props", () => {
		expect(
			renderExpr({
				kind: "jsx",
				tag: "Button",
				props: [
					{ name: "disabled" },
					{ name: "label", value: { kind: "string", value: "go" } },
					{ name: "onClick", value: { kind: "identifier", name: "handle" } },
				],
				children: [],
				selfClosing: true,
			}),
		).toBe('const x = <Button disabled label="go" onClick={handle} />;');
	});

	it("jsx with text and element children", () => {
		expect(
			renderExpr({
				kind: "jsx",
				tag: "div",
				props: [],
				children: [
					{ kind: "text", value: "hi " },
					{
						kind: "jsx",
						tag: "span",
						props: [],
						children: [{ kind: "text", value: "there" }],
					},
				],
			}),
		).toBe("const x = <div>hi <span>there</span></div>;");
	});

	it("jsx fragment with expression child", () => {
		expect(
			renderExpr({
				kind: "jsx-fragment",
				children: [
					{ kind: "identifier", name: "a" },
					{
						kind: "jsx",
						tag: "b",
						props: [],
						children: [],
					},
				],
			}),
		).toBe("const x = <>{a}<b /></>;");
	});

	it("template literal with interpolations", () => {
		const dollar = "$";
		expect(
			renderExpr({
				kind: "template",
				parts: ["hello ", { kind: "identifier", name: "name" }, "!"],
			}),
		).toBe(`const x = \`hello ${dollar}{name}!\`;`);
	});

	it("template literal escapes backticks and interpolations", () => {
		// Input literal part: a`b${c}d
		// Expected output: const x = `a\`b\${c}d`;
		const dollar = "$";
		const input = `a\`b${dollar}{c}d`;
		const expected = `const x = \`a\\\`b\\${dollar}{c}d\`;`;
		expect(
			renderExpr({
				kind: "template",
				parts: [input],
			}),
		).toBe(expected);
	});
});

describe("renderTsSourceFile — TsTypeRef kinds", () => {
	it("reference without args", () => {
		expect(renderType({ kind: "reference", name: "string" })).toBe(
			"export type T = string;",
		);
	});

	it("reference with type args", () => {
		expect(
			renderType({
				kind: "reference",
				name: "Array",
				args: [{ kind: "reference", name: "number" }],
			}),
		).toBe("export type T = Array<number>;");
	});

	it("literal string", () => {
		expect(renderType({ kind: "literal", value: "on" })).toBe(
			'export type T = "on";',
		);
	});

	it("literal number and boolean", () => {
		expect(renderType({ kind: "literal", value: 5 })).toBe(
			"export type T = 5;",
		);
		expect(renderType({ kind: "literal", value: false })).toBe(
			"export type T = false;",
		);
	});

	it("union", () => {
		expect(
			renderType({
				kind: "union",
				types: [
					{ kind: "literal", value: "a" },
					{ kind: "literal", value: "b" },
				],
			}),
		).toBe('export type T = "a" | "b";');
	});

	it("intersection", () => {
		expect(
			renderType({
				kind: "intersection",
				types: [
					{ kind: "reference", name: "A" },
					{ kind: "reference", name: "B" },
				],
			}),
		).toBe("export type T = A & B;");
	});

	it("object type with optional and readonly members", () => {
		expect(
			renderType({
				kind: "object",
				members: [
					{ name: "a", type: { kind: "reference", name: "string" } },
					{
						name: "b",
						type: { kind: "reference", name: "number" },
						optional: true,
					},
					{
						name: "c",
						type: { kind: "reference", name: "boolean" },
						readonly: true,
					},
				],
			}),
		).toBe("export type T = { a: string; b?: number; readonly c: boolean };");
	});

	it("array type", () => {
		expect(
			renderType({
				kind: "array",
				element: { kind: "reference", name: "string" },
			}),
		).toBe("export type T = string[];");
	});

	it("array of union parenthesizes", () => {
		expect(
			renderType({
				kind: "array",
				element: {
					kind: "union",
					types: [
						{ kind: "reference", name: "a" },
						{ kind: "reference", name: "b" },
					],
				},
			}),
		).toBe("export type T = (a | b)[];");
	});

	it("tuple type", () => {
		expect(
			renderType({
				kind: "tuple",
				elements: [
					{ kind: "reference", name: "string" },
					{ kind: "reference", name: "number" },
				],
			}),
		).toBe("export type T = [string, number];");
	});

	it("function type", () => {
		expect(
			renderType({
				kind: "function",
				params: [{ name: "n", type: { kind: "reference", name: "number" } }],
				returnType: { kind: "reference", name: "string" },
			}),
		).toBe("export type T = (n: number) => string;");
	});
});

describe("renderTsSourceFile — TsStatement kinds", () => {
	it("const without type, unexported", () => {
		expect(
			renderStmt({
				kind: "const",
				name: "y",
				value: { kind: "number", value: 1 },
			}),
		).toBe("const y = 1;");
	});

	it("const with type, exported", () => {
		expect(
			renderStmt({
				kind: "const",
				name: "y",
				value: { kind: "number", value: 1 },
				type: { kind: "reference", name: "number" },
				exported: true,
			}),
		).toBe("export const y: number = 1;");
	});

	it("let without value", () => {
		expect(
			renderStmt({
				kind: "let",
				name: "y",
				type: { kind: "reference", name: "string" },
			}),
		).toBe("let y: string;");
	});

	it("let with value and exported", () => {
		expect(
			renderStmt({
				kind: "let",
				name: "y",
				value: { kind: "number", value: 0 },
				exported: true,
			}),
		).toBe("export let y = 0;");
	});

	it("export-default", () => {
		expect(
			renderStmt({
				kind: "export-default",
				value: { kind: "identifier", name: "worker" },
			}),
		).toBe("export default worker;");
	});

	it("export-type", () => {
		expect(
			renderStmt({
				kind: "export-type",
				name: "A",
				type: { kind: "reference", name: "string" },
			}),
		).toBe("export type A = string;");
	});

	it("export-type-ref", () => {
		expect(
			renderStmt({
				kind: "export-type-ref",
				source: "./foo",
				names: ["A", "B"],
			}),
		).toBe('export type { A, B } from "./foo";');
	});

	it("interface with members", () => {
		const out = renderStmt({
			kind: "interface",
			name: "Env",
			exported: true,
			members: [
				{
					name: "DB",
					type: { kind: "reference", name: "D1Database" },
				},
				{
					name: "API_KEY",
					type: { kind: "reference", name: "string" },
					optional: true,
				},
			],
		});
		expect(out).toContain("export interface Env {");
		expect(out).toContain("DB: D1Database;");
		expect(out).toContain("API_KEY?: string;");
	});

	it("interface with extends", () => {
		const out = renderStmt({
			kind: "interface",
			name: "Child",
			extends: ["Base", "Other"],
			members: [],
		});
		expect(out).toContain("interface Child extends Base, Other {");
	});

	it("expression statement", () => {
		expect(
			renderStmt({
				kind: "expression",
				value: {
					kind: "call",
					callee: { kind: "identifier", name: "run" },
					args: [],
				},
			}),
		).toBe("run();");
	});
});

describe("renderTsSourceFile — realistic worker.ts", () => {
	it("assembles imports, const with chained calls, export-default, export-type", () => {
		const out = renderTsSourceFile({
			imports: [
				{ source: "@fcalell/plugin-api/runtime", default: "createWorker" },
				{ source: "@fcalell/plugin-db/runtime", default: "dbRuntime" },
				{ source: "../src/schema", namespace: "schema" },
				{ source: "../src/worker/routes", namespace: "routes" },
			],
			statements: [
				{
					kind: "const",
					name: "worker",
					value: {
						kind: "call",
						callee: {
							kind: "member",
							object: {
								kind: "call",
								callee: {
									kind: "member",
									object: {
										kind: "call",
										callee: { kind: "identifier", name: "createWorker" },
										args: [
											{
												kind: "object",
												properties: [
													{
														key: "domain",
														value: { kind: "string", value: "example.com" },
													},
												],
											},
										],
									},
									property: "use",
								},
								args: [
									{
										kind: "call",
										callee: { kind: "identifier", name: "dbRuntime" },
										args: [
											{
												kind: "object",
												properties: [
													{
														key: "binding",
														value: { kind: "string", value: "DB_MAIN" },
													},
													{
														key: "schema",
														value: { kind: "identifier", name: "schema" },
														shorthand: true,
													},
												],
											},
										],
									},
								],
							},
							property: "handler",
						},
						args: [{ kind: "identifier", name: "routes" }],
					},
				},
				{
					kind: "export-type",
					name: "AppRouter",
					type: {
						kind: "reference",
						name: "typeof worker._router",
					},
				},
				{
					kind: "export-default",
					value: { kind: "identifier", name: "worker" },
				},
			],
		});

		expect(out).toBe(
			[
				'import createWorker from "@fcalell/plugin-api/runtime";',
				'import dbRuntime from "@fcalell/plugin-db/runtime";',
				'import * as schema from "../src/schema";',
				'import * as routes from "../src/worker/routes";',
				'const worker = createWorker({ domain: "example.com" }).use(dbRuntime({ binding: "DB_MAIN", schema })).handler(routes);',
				"export type AppRouter = typeof worker._router;",
				"export default worker;",
				"",
			].join("\n"),
		);
	});
});
