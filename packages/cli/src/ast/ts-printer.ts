import type { CodeBlockWriter, ImportDeclarationStructure } from "ts-morph";
import { Project, StructureKind } from "ts-morph";
import type {
	TsExpression,
	TsImportSpec,
	TsSourceFile,
	TsStatement,
	TsTypeRef,
} from "#ast/specs";

// Reserved identifier names that never need quoting as object/interface keys.
const IDENT_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function isIdentifier(name: string): boolean {
	return IDENT_RE.test(name);
}

// ── Imports ─────────────────────────────────────────────────────────

function toImportStructure(spec: TsImportSpec): ImportDeclarationStructure {
	const base = {
		kind: StructureKind.ImportDeclaration as const,
		moduleSpecifier: spec.source,
	};

	if ("sideEffect" in spec) {
		return { ...base };
	}

	if ("default" in spec) {
		return {
			...base,
			defaultImport: spec.default,
			isTypeOnly: spec.typeOnly ?? false,
		};
	}

	if ("namespace" in spec) {
		return { ...base, namespaceImport: spec.namespace };
	}

	// named
	return {
		...base,
		isTypeOnly: spec.typeOnly ?? false,
		namedImports: spec.named.map((entry) =>
			typeof entry === "string"
				? { kind: StructureKind.ImportSpecifier as const, name: entry }
				: {
						kind: StructureKind.ImportSpecifier as const,
						name: entry.name,
						alias: entry.alias,
					},
		),
	};
}

// ── Type printing ───────────────────────────────────────────────────

function writeType(writer: CodeBlockWriter, type: TsTypeRef): void {
	switch (type.kind) {
		case "reference": {
			writer.write(type.name);
			if (type.args && type.args.length > 0) {
				writer.write("<");
				type.args.forEach((arg, i) => {
					if (i > 0) writer.write(", ");
					writeType(writer, arg);
				});
				writer.write(">");
			}
			return;
		}
		case "literal": {
			if (typeof type.value === "string") {
				writer.quote(type.value);
			} else {
				writer.write(String(type.value));
			}
			return;
		}
		case "union": {
			type.types.forEach((t, i) => {
				if (i > 0) writer.write(" | ");
				writeType(writer, t);
			});
			return;
		}
		case "intersection": {
			type.types.forEach((t, i) => {
				if (i > 0) writer.write(" & ");
				writeType(writer, t);
			});
			return;
		}
		case "object": {
			writer.write("{");
			if (type.members.length > 0) {
				writer.write(" ");
				type.members.forEach((member, i) => {
					if (i > 0) writer.write("; ");
					if (member.readonly) writer.write("readonly ");
					writeMemberName(writer, member.name);
					if (member.optional) writer.write("?");
					writer.write(": ");
					writeType(writer, member.type);
				});
				writer.write(" ");
			}
			writer.write("}");
			return;
		}
		case "array": {
			// Parenthesize complex element types to preserve precedence.
			const needsParens =
				type.element.kind === "union" || type.element.kind === "intersection";
			if (needsParens) writer.write("(");
			writeType(writer, type.element);
			if (needsParens) writer.write(")");
			writer.write("[]");
			return;
		}
		case "tuple": {
			writer.write("[");
			type.elements.forEach((el, i) => {
				if (i > 0) writer.write(", ");
				writeType(writer, el);
			});
			writer.write("]");
			return;
		}
		case "function": {
			writer.write("(");
			type.params.forEach((p, i) => {
				if (i > 0) writer.write(", ");
				writer.write(p.name);
				writer.write(": ");
				writeType(writer, p.type);
			});
			writer.write(") => ");
			writeType(writer, type.returnType);
			return;
		}
	}
}

function writeMemberName(writer: CodeBlockWriter, name: string): void {
	if (isIdentifier(name)) {
		writer.write(name);
	} else {
		writer.quote(name);
	}
}

// ── Expression printing ─────────────────────────────────────────────

function writeExpression(writer: CodeBlockWriter, expr: TsExpression): void {
	switch (expr.kind) {
		case "string":
			writer.quote(expr.value);
			return;
		case "number":
			writer.write(String(expr.value));
			return;
		case "boolean":
			writer.write(expr.value ? "true" : "false");
			return;
		case "null":
			writer.write("null");
			return;
		case "undefined":
			writer.write("undefined");
			return;
		case "identifier":
			writer.write(expr.name);
			return;
		case "member":
			writeExpression(writer, expr.object);
			writer.write(".");
			writer.write(expr.property);
			return;
		case "call": {
			writeExpression(writer, expr.callee);
			if (expr.typeArgs && expr.typeArgs.length > 0) {
				writer.write("<");
				expr.typeArgs.forEach((arg, i) => {
					if (i > 0) writer.write(", ");
					writeType(writer, arg);
				});
				writer.write(">");
			}
			writer.write("(");
			expr.args.forEach((arg, i) => {
				if (i > 0) writer.write(", ");
				writeExpression(writer, arg);
			});
			writer.write(")");
			return;
		}
		case "new": {
			writer.write("new ");
			writeExpression(writer, expr.callee);
			writer.write("(");
			expr.args.forEach((arg, i) => {
				if (i > 0) writer.write(", ");
				writeExpression(writer, arg);
			});
			writer.write(")");
			return;
		}
		case "object": {
			if (expr.properties.length === 0) {
				writer.write("{}");
				return;
			}
			writer.write("{ ");
			expr.properties.forEach((prop, i) => {
				if (i > 0) writer.write(", ");
				if (prop.shorthand) {
					// Shorthand only valid when the value is an identifier matching the key.
					writeMemberName(writer, prop.key);
				} else {
					writeMemberName(writer, prop.key);
					writer.write(": ");
					writeExpression(writer, prop.value);
				}
			});
			writer.write(" }");
			return;
		}
		case "array": {
			writer.write("[");
			expr.items.forEach((item, i) => {
				if (i > 0) writer.write(", ");
				writeExpression(writer, item);
			});
			writer.write("]");
			return;
		}
		case "arrow": {
			if (expr.async) writer.write("async ");
			writer.write("(");
			expr.params.forEach((p, i) => {
				if (i > 0) writer.write(", ");
				writer.write(p.name);
				if (p.type) {
					writer.write(": ");
					writeType(writer, p.type);
				}
			});
			writer.write(") => ");
			if (Array.isArray(expr.body)) {
				writer.write("{");
				writer.newLine();
				writer.indent(() => {
					for (const stmt of expr.body as TsStatement[]) {
						writeStatement(writer, stmt);
						writer.newLine();
					}
				});
				writer.write("}");
			} else {
				writeExpression(writer, expr.body);
			}
			return;
		}
		case "as": {
			writeExpression(writer, expr.expression);
			writer.write(" as ");
			writeType(writer, expr.type);
			return;
		}
		case "jsx": {
			writer.write("<");
			writer.write(expr.tag);
			for (const prop of expr.props) {
				writer.write(" ");
				writer.write(prop.name);
				if (prop.value !== undefined) {
					writer.write("=");
					if (prop.value.kind === "string") {
						writer.quote(prop.value.value);
					} else {
						writer.write("{");
						writeExpression(writer, prop.value);
						writer.write("}");
					}
				}
			}
			const selfClosing =
				expr.selfClosing === true ||
				(expr.selfClosing === undefined && expr.children.length === 0);
			if (selfClosing) {
				writer.write(" />");
				return;
			}
			writer.write(">");
			for (const child of expr.children) {
				if ("kind" in child && child.kind === "text") {
					writer.write(child.value);
				} else {
					const childExpr = child as TsExpression;
					// JSX elements / fragments nest directly; other expressions embed via braces.
					if (childExpr.kind === "jsx" || childExpr.kind === "jsx-fragment") {
						writeExpression(writer, childExpr);
					} else {
						writer.write("{");
						writeExpression(writer, childExpr);
						writer.write("}");
					}
				}
			}
			writer.write("</");
			writer.write(expr.tag);
			writer.write(">");
			return;
		}
		case "jsx-fragment": {
			writer.write("<>");
			for (const child of expr.children) {
				if (child.kind === "jsx" || child.kind === "jsx-fragment") {
					writeExpression(writer, child);
				} else {
					writer.write("{");
					writeExpression(writer, child);
					writer.write("}");
				}
			}
			writer.write("</>");
			return;
		}
		case "template": {
			writer.write("`");
			for (const part of expr.parts) {
				if (typeof part === "string") {
					// Escape backticks, ${, and backslashes within the literal.
					const escaped = part
						.replace(/\\/g, "\\\\")
						.replace(/`/g, "\\`")
						.replace(/\$\{/g, "\\${");
					writer.write(escaped);
				} else {
					writer.write("${");
					writeExpression(writer, part);
					writer.write("}");
				}
			}
			writer.write("`");
			return;
		}
	}
}

// ── Statement printing ──────────────────────────────────────────────

function writeStatement(writer: CodeBlockWriter, stmt: TsStatement): void {
	switch (stmt.kind) {
		case "const": {
			if (stmt.exported) writer.write("export ");
			writer.write("const ");
			writer.write(stmt.name);
			if (stmt.type) {
				writer.write(": ");
				writeType(writer, stmt.type);
			}
			writer.write(" = ");
			writeExpression(writer, stmt.value);
			writer.write(";");
			return;
		}
		case "let": {
			if (stmt.exported) writer.write("export ");
			writer.write("let ");
			writer.write(stmt.name);
			if (stmt.type) {
				writer.write(": ");
				writeType(writer, stmt.type);
			}
			if (stmt.value !== undefined) {
				writer.write(" = ");
				writeExpression(writer, stmt.value);
			}
			writer.write(";");
			return;
		}
		case "export-default": {
			writer.write("export default ");
			writeExpression(writer, stmt.value);
			writer.write(";");
			return;
		}
		case "export-type": {
			writer.write("export type ");
			writer.write(stmt.name);
			writer.write(" = ");
			writeType(writer, stmt.type);
			writer.write(";");
			return;
		}
		case "export-type-ref": {
			writer.write("export type { ");
			stmt.names.forEach((name, i) => {
				if (i > 0) writer.write(", ");
				writer.write(name);
			});
			writer.write(' } from "');
			writer.write(stmt.source);
			writer.write('";');
			return;
		}
		case "interface": {
			if (stmt.exported) writer.write("export ");
			writer.write("interface ");
			writer.write(stmt.name);
			if (stmt.extends && stmt.extends.length > 0) {
				writer.write(" extends ");
				stmt.extends.forEach((base, i) => {
					if (i > 0) writer.write(", ");
					writer.write(base);
				});
			}
			writer.write(" {");
			if (stmt.members.length > 0) {
				writer.newLine();
				writer.indent(() => {
					for (const member of stmt.members) {
						writeMemberName(writer, member.name);
						if (member.optional) writer.write("?");
						writer.write(": ");
						writeType(writer, member.type);
						writer.write(";");
						writer.newLine();
					}
				});
			}
			writer.write("}");
			return;
		}
		case "expression": {
			writeExpression(writer, stmt.value);
			writer.write(";");
			return;
		}
	}
}

// ── Public entry ────────────────────────────────────────────────────

export function renderTsSourceFile(spec: TsSourceFile): string {
	if (spec.imports.length === 0 && spec.statements.length === 0) {
		return "";
	}

	const project = new Project({ useInMemoryFileSystem: true });
	const sourceFile = project.createSourceFile("__ast__.tsx", "", {
		overwrite: true,
	});

	if (spec.imports.length > 0) {
		sourceFile.addImportDeclarations(spec.imports.map(toImportStructure));
	}

	if (spec.statements.length > 0) {
		sourceFile.addStatements((writer) => {
			spec.statements.forEach((stmt, i) => {
				if (i > 0) writer.newLine();
				writeStatement(writer, stmt);
			});
		});
	}

	return sourceFile.getFullText();
}
