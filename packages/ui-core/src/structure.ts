// The matchers behind the packages' structure checks (`b-children`,
// `b-arbitrary`, `b-measure`, `b-context`, `b-dataset`, `b-type-prop`), one per
// rule of the guide's `structure.md`. Each reads a file's syntax tree, so a
// comment or a string never matches, and returns where it matched. The packages'
// verify scripts hold the closed lists and sweep the files; `test/structure.test.ts`
// proves each matcher fails on a bad case. devDependency-only tooling, never a
// runtime surface (the README marks the subpath internal).
import ts from "typescript";

export interface Hit {
	line: number;
	// What matched, as the finding quotes it.
	text: string;
}

function parse(source: string, file: string): ts.SourceFile {
	return ts.createSourceFile(
		file,
		source,
		ts.ScriptTarget.Latest,
		true,
		file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
	);
}

function hitAt(file: ts.SourceFile, node: ts.Node, text: string): Hit {
	return {
		line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1,
		text,
	};
}

function walk(node: ts.Node, visit: (node: ts.Node) => void): void {
	visit(node);
	ts.forEachChild(node, (child) => walk(child, visit));
}

// ── b-children ──────────────────────────────────────────────────────

const CHILD_WALKERS = new Set(["Children", "cloneElement", "isValidElement"]);

// A receiver named for a React child. A `.type` compared to a string on
// anything else is data: a markdown token, an Intl part, a MutationRecord, an
// event. A `.type` compared to a non-literal (a component, `Fragment`) is a
// React element's, whatever the receiver is called.
const CHILD_RECEIVER = /(^|\.)(child|children|element|el|node)(\[\d+\])?$/;

function isTypeAccess(node: ts.Node): node is ts.PropertyAccessExpression {
	return ts.isPropertyAccessExpression(node) && node.name.text === "type";
}

// The reads of a React child: `Children`, `cloneElement`, `isValidElement`, and an
// element's `.type` compared with a component or switched on.
export function childReads(source: string, name = "x.tsx"): Hit[] {
	const file = parse(source, name);
	const out: Hit[] = [];
	walk(file, (node) => {
		if (ts.isIdentifier(node) && CHILD_WALKERS.has(node.text))
			out.push(hitAt(file, node, node.text));
		if (
			ts.isBinaryExpression(node) &&
			[
				ts.SyntaxKind.EqualsEqualsEqualsToken,
				ts.SyntaxKind.ExclamationEqualsEqualsToken,
				ts.SyntaxKind.EqualsEqualsToken,
				ts.SyntaxKind.ExclamationEqualsToken,
			].includes(node.operatorToken.kind)
		) {
			const [typed, other] = isTypeAccess(node.left)
				? [node.left, node.right]
				: isTypeAccess(node.right)
					? [node.right, node.left]
					: [];
			if (typed && other) {
				const literal =
					ts.isStringLiteralLike(other) || ts.isNumericLiteral(other);
				if (!literal || CHILD_RECEIVER.test(typed.expression.getText(file)))
					out.push(hitAt(file, node, node.getText(file)));
			}
		}
		if (
			ts.isSwitchStatement(node) &&
			isTypeAccess(node.expression) &&
			CHILD_RECEIVER.test(node.expression.expression.getText(file))
		)
			out.push(hitAt(file, node, `switch (${node.expression.getText(file)})`));
	});
	return out;
}

// ── b-arbitrary ─────────────────────────────────────────────────────

const LENGTH_UNIT =
	"px|rem|em|%|vh|vw|vmin|vmax|dvh|svh|lvh|dvw|svw|lvw|ch|ex|cqw|cqh|cqi|cqb|pt|cm|mm|in";

// A variant spelled with an arbitrary value is a selector or a property list,
// never a length, except the viewport variants (`min-[640px]`), which are.
const VIEWPORT_VARIANT = /^(?:min|max)$/;

// The literal lengths in one arbitrary value (the text between the brackets): a number
// with a length unit, or a bare number of 1 or more. A `var(--…)` token, `0`, `1lh`, a
// `fr` track, `anchor()` and a bare factor (`/ 2`) stand.
export function literalLengths(value: string): string[] {
	if (/var\(--/.test(value)) return [];
	const rest = value
		.replace(/_/g, " ")
		.replace(/anchor\([^)]*\)/g, " ")
		.replace(/(?<![\w.-])\d+(?:\.\d+)?(?:fr|lh|rlh)(?![\w])/g, " ")
		.replace(/[/*]\s*\d+(?:\.\d+)?(?![\w%.])/g, " ");
	const out: string[] = [];
	for (const match of rest.matchAll(
		new RegExp(
			`(?<![\\w.#])(?<!\\w-)(\\d+(?:\\.\\d+)?)(${LENGTH_UNIT})?(?![\\w])`,
			"g",
		),
	)) {
		const [whole, digits, unit] = match;
		if (Number(digits) === 0) continue;
		if (unit === undefined && Number(digits) < 1) continue;
		out.push(whole);
	}
	return out;
}

// A class token's segments split on the colons outside brackets.
function segments(token: string): string[] {
	const out: string[] = [];
	let depth = 0;
	let from = 0;
	for (let at = 0; at < token.length; at++) {
		const char = token[at];
		if (char === "[" || char === "(") depth++;
		else if (char === "]" || char === ")") depth--;
		else if (char === ":" && depth === 0) {
			out.push(token.slice(from, at));
			from = at + 1;
		}
	}
	out.push(token.slice(from));
	return out;
}

// The literal lengths a class token spells inside an arbitrary value, per segment.
export function arbitraryLengths(token: string): string[] {
	const parts = segments(token);
	const out: string[] = [];
	parts.forEach((part, at) => {
		const utility = at === parts.length - 1;
		const open = part.indexOf("[");
		const close = part.lastIndexOf("]");
		if (open < 0 || close < open) return;
		const inner = part.slice(open + 1, close);
		if (open === 0) {
			// `[&>*]` is a selector variant; `[mask-type:alpha]` an arbitrary property.
			if (utility && !inner.startsWith("&"))
				out.push(...literalLengths(inner.slice(inner.indexOf(":") + 1)));
			return;
		}
		const name = part.slice(0, open - 1);
		if (utility || VIEWPORT_VARIANT.test(name))
			out.push(...literalLengths(inner));
	});
	return out;
}

// The class tokens that spell a literal length inside an arbitrary value, in the string
// literals of one file.
export function arbitraryValues(source: string, name = "x.tsx"): Hit[] {
	const file = parse(source, name);
	const out: Hit[] = [];
	walk(file, (node) => {
		let text: string | undefined;
		if (ts.isStringLiteralLike(node)) text = node.text;
		else if (
			ts.isTemplateHead(node) ||
			ts.isTemplateMiddle(node) ||
			ts.isTemplateTail(node)
		)
			text = node.text;
		if (text === undefined) return;
		for (const token of text.split(/\s+/)) {
			if (!token.includes("[")) continue;
			const lengths = arbitraryLengths(token);
			if (lengths.length > 0)
				out.push(hitAt(file, node, `${token} (${lengths.join(", ")})`));
		}
	});
	return out;
}

// ── b-measure ───────────────────────────────────────────────────────

// What measures the page on the web: observers, boxes, the computed style, the media query.
export const WEB_MEASURES = [
	"ResizeObserver",
	"getBoundingClientRect",
	"getComputedStyle",
	"offsetWidth",
	"offsetHeight",
	"scrollWidth",
	"scrollHeight",
	"clientWidth",
	"clientHeight",
	"matchMedia",
] as const;

// What measures the screen on the phone: a view's layout and the window.
export const NATIVE_MEASURES = [
	"onLayout",
	"measure",
	"measureLayout",
	"measureInWindow",
	"useWindowDimensions",
] as const;

// Each name of `names` the file spells as an identifier (a call, a property, a
// destructured binding), once per place.
export function measures(
	source: string,
	names: readonly string[],
	name = "x.tsx",
): Hit[] {
	const file = parse(source, name);
	const wanted = new Set(names);
	const out: Hit[] = [];
	walk(file, (node) => {
		if (ts.isIdentifier(node) && wanted.has(node.text))
			out.push(hitAt(file, node, node.text));
	});
	return out;
}

// ── b-context ───────────────────────────────────────────────────────

// Each `createContext` the file calls, by the name it is bound to.
export function contexts(source: string, name = "x.tsx"): Hit[] {
	const file = parse(source, name);
	const out: Hit[] = [];
	walk(file, (node) => {
		if (!ts.isCallExpression(node)) return;
		const callee = ts.isPropertyAccessExpression(node.expression)
			? node.expression.name.text
			: node.expression.getText(file);
		if (callee !== "createContext") return;
		const bound = ts.isVariableDeclaration(node.parent)
			? node.parent.name.getText(file)
			: "(unbound)";
		out.push(hitAt(file, node, bound));
	});
	return out;
}

// ── b-dataset ───────────────────────────────────────────────────────

// Each read or write of an element's `dataset`.
export function datasets(source: string, name = "x.tsx"): Hit[] {
	return measures(source, ["dataset"], name);
}

// ── b-type-prop ─────────────────────────────────────────────────────

const COMPONENT_NAME = /^[A-Z]/;

function componentOf(node: ts.Node): ts.SignatureDeclaration | undefined {
	if (ts.isFunctionDeclaration(node) && node.name)
		return COMPONENT_NAME.test(node.name.text) ? node : undefined;
	if (
		ts.isVariableDeclaration(node) &&
		ts.isIdentifier(node.name) &&
		COMPONENT_NAME.test(node.name.text) &&
		node.initializer &&
		(ts.isArrowFunction(node.initializer) ||
			ts.isFunctionExpression(node.initializer))
	)
		return node.initializer;
	return undefined;
}

// A prop named `type`: a member of a props interface or type literal, a component's
// destructured `type`, or `props.type`. A component picks its form by a prop whose value
// is the form, never a `type` string.
export function typeProps(source: string, name = "x.tsx"): Hit[] {
	const file = parse(source, name);
	const out: Hit[] = [];
	walk(file, (node) => {
		if (
			ts.isPropertySignature(node) &&
			(ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) &&
			node.name.text === "type"
		)
			out.push(hitAt(file, node, node.getText(file)));
		const component = componentOf(node);
		const first = component?.parameters[0];
		if (!component || !first) return;
		if (ts.isObjectBindingPattern(first.name)) {
			for (const element of first.name.elements) {
				const key = element.propertyName ?? element.name;
				if (ts.isIdentifier(key) && key.text === "type")
					out.push(hitAt(file, element, `{ ${element.getText(file)} }`));
			}
		} else if (ts.isIdentifier(first.name)) {
			const props = first.name.text;
			walk(component, (inner) => {
				if (
					ts.isPropertyAccessExpression(inner) &&
					inner.name.text === "type" &&
					inner.expression.getText(file) === props
				)
					out.push(hitAt(file, inner, inner.getText(file)));
			});
		}
	});
	return out;
}

// ── b-section-nest ──────────────────────────────────────────────────

function isSection(node: ts.Node): boolean {
	return (
		(ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
		node.tagName.getText() === "Section"
	);
}

// The Sections a file draws with a body, and each `<Section>` drawn inside another's body.
export function sectionNests(
	source: string,
	name = "x.tsx",
): { drawn: number; hits: Hit[] } {
	const file = parse(source, name);
	const hits: Hit[] = [];
	let drawn = 0;
	walk(file, (node) => {
		if (!ts.isJsxElement(node) || !isSection(node.openingElement)) return;
		drawn++;
		for (const child of node.children)
			walk(child, (inner) => {
				if (isSection(inner)) hits.push(hitAt(file, inner, "<Section>"));
			});
	});
	return { drawn, hits };
}

// ── The closed lists ────────────────────────────────────────────────

// A file path matches a list entry that names it, or a directory entry (ending in `/`)
// that holds it.
export function listed(path: string, list: Readonly<Record<string, string>>) {
	return Object.keys(list).find((entry) =>
		entry.endsWith("/") ? path.startsWith(entry) : path === entry,
	);
}

// The files that match outside a closed list, and the list entries nothing matches (a
// stale entry fails as a missing one does). `found` maps a file to what it matched.
export function outsideList(
	found: ReadonlyMap<string, readonly string[]>,
	list: Readonly<Record<string, string>>,
): { unlisted: string[]; stale: string[] } {
	const used = new Set<string>();
	const unlisted: string[] = [];
	for (const [path, hits] of found) {
		if (hits.length === 0) continue;
		const entry = listed(path, list);
		if (entry === undefined) unlisted.push(path);
		else used.add(entry);
	}
	return {
		unlisted,
		stale: Object.keys(list).filter((entry) => !used.has(entry)),
	};
}
