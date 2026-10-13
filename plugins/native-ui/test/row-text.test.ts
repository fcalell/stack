import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { test } from "node:test";
import ts from "typescript";

// React Native's flex item shrinks by 0 where CSS's shrinks by 1, so a Text
// beside a sibling in a row keeps its whole word and pushes the row past the
// edge. A Text standing as a direct child of a `flex-row` element therefore
// decides: `shrink` (or `flex-1`, `min-w-0`) when its words may be long, and
// `shrink-0` when it is a figure or a stand-in that must hold.
//
// This is a source heuristic, not a layout: it reads the class strings it can
// resolve (a string literal, a const of the file, the arguments of `cn(...)`
// and of a variant call, both branches of a condition) and cannot see a class
// a variant function returns, a row reached through a prop, or a Text a
// helper component wraps. It checks the first parent that is not a provider.
const ROOT = join(import.meta.dirname, "../src/ui");
const ROW = /(^|\s)flex-row(\s|$)/;
const DECIDED = /(^|\s)(shrink(-\d+)?|flex-1|min-w-0)(\s|$)/;

function sources(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return sources(path);
		return path.endsWith(".tsx") ? [path] : [];
	});
}

// Where a `Text` or `RNText` stands in a flex row with no decision on shrink.
function undecided(file: string, text: string): string[] {
	const source = ts.createSourceFile(
		file,
		text,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TSX,
	);
	const consts = new Map<string, string[]>();
	const strings = (node: ts.Node | undefined): string[] => {
		if (!node) return [];
		if (ts.isStringLiteralLike(node)) return [node.text];
		if (ts.isTemplateExpression(node))
			return [
				node.head.text,
				...node.templateSpans.flatMap((span) => [
					...strings(span.expression),
					span.literal.text,
				]),
			];
		if (ts.isIdentifier(node)) return consts.get(node.text) ?? [];
		if (ts.isElementAccessExpression(node)) return strings(node.expression);
		if (ts.isPropertyAccessExpression(node)) return strings(node.expression);
		if (ts.isCallExpression(node)) return node.arguments.flatMap(strings);
		if (ts.isConditionalExpression(node))
			return [...strings(node.whenTrue), ...strings(node.whenFalse)];
		if (ts.isBinaryExpression(node))
			return [...strings(node.left), ...strings(node.right)];
		if (
			ts.isParenthesizedExpression(node) ||
			ts.isAsExpression(node) ||
			ts.isNonNullExpression(node) ||
			ts.isSatisfiesExpression(node)
		)
			return strings(node.expression);
		if (ts.isObjectLiteralExpression(node))
			return node.properties.flatMap((property) =>
				ts.isPropertyAssignment(property) ? strings(property.initializer) : [],
			);
		if (ts.isArrayLiteralExpression(node))
			return node.elements.flatMap(strings);
		return [];
	};
	const declare = (node: ts.Node) => {
		if (
			ts.isVariableDeclaration(node) &&
			ts.isIdentifier(node.name) &&
			node.initializer
		)
			consts.set(node.name.text, strings(node.initializer));
		node.forEachChild(declare);
	};
	declare(source);
	const classes = (element: ts.JsxOpeningLikeElement): string => {
		const attribute = element.attributes.properties.find(
			(property): property is ts.JsxAttribute =>
				ts.isJsxAttribute(property) && property.name.getText() === "className",
		);
		const value = attribute?.initializer;
		if (!value) return "";
		return (
			ts.isJsxExpression(value) ? strings(value.expression) : strings(value)
		).join(" ");
	};
	const opening = (node: ts.Node) => {
		if (ts.isJsxElement(node)) return node.openingElement;
		return ts.isJsxSelfClosingElement(node) ? node : undefined;
	};
	const found: string[] = [];
	const visit = (node: ts.Node) => {
		const element = opening(node);
		if (element && /^(Text|RNText)$/.test(element.tagName.getText())) {
			let parent: ts.Node | undefined = node.parent;
			while (parent) {
				const wrapper = opening(parent);
				const passes =
					ts.isJsxExpression(parent) ||
					ts.isJsxFragment(parent) ||
					ts.isParenthesizedExpression(parent) ||
					ts.isConditionalExpression(parent) ||
					ts.isBinaryExpression(parent) ||
					(wrapper && /\.Provider$/.test(wrapper.tagName.getText()));
				if (!passes) break;
				parent = parent.parent;
			}
			const row = parent && opening(parent);
			if (row && ROW.test(classes(row)) && !DECIDED.test(classes(element))) {
				const at = source.getLineAndCharacterOfPosition(node.getStart());
				found.push(`${file}:${at.line + 1}`);
			}
		}
		node.forEachChild(visit);
	};
	visit(source);
	return found;
}

test("no Text in a flex row leaves its shrink undecided", () => {
	const found = sources(ROOT).flatMap((file) =>
		undecided(relative(ROOT, file), readFileSync(file, "utf8")),
	);
	assert.deepEqual(found, []);
});

test("the check catches a Text with no shrink and passes one that decides", () => {
	const row = (text: string) =>
		`const ROW = "flex-row items-center";
		export const A = () => (<View className={ROW}>${text}</View>);`;
	assert.equal(undecided("a.tsx", row("<RNText>{x}</RNText>")).length, 1);
	assert.equal(
		undecided("a.tsx", row('<RNText className={cn(a, "shrink")}>x</RNText>'))
			.length,
		0,
	);
	assert.equal(
		undecided("a.tsx", row('<RNText className="shrink-0">x</RNText>')).length,
		0,
	);
	assert.equal(
		undecided(
			"a.tsx",
			row("<Ink.Provider value={a}><RNText>x</RNText></Ink.Provider>"),
		).length,
		1,
	);
	assert.equal(
		undecided(
			"a.tsx",
			`export const A = () => (<View className="flex-col"><RNText>x</RNText></View>);`,
		).length,
		0,
	);
});
