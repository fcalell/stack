// The geometry gate: the closed vocabulary as data, the per-platform host
// lists, and the ts-morph scanner both UI plugins run as a pre-build step.
// Node-only, like #harness: importing this module loads ts-morph, so the
// plugins reach it through a dynamic import inside their build step and
// nothing else under src/ imports it.
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
	type CallExpression,
	type JsxOpeningElement,
	type JsxSelfClosingElement,
	Node,
	type ObjectLiteralExpression,
	Project,
	SyntaxKind,
	ts,
} from "ts-morph";
import { SPACING_RUNGS } from "#tokens";

// One shared vocabulary for both platforms: the PRD's geometry families with
// their non-numeric members spelled out. The gap cells are the spacing rungs,
// derived so the two lists cannot drift.
export const GEOMETRY: {
	exact: readonly string[];
	prefixes: readonly string[];
} = {
	exact: [
		// flex plumbing
		"flex",
		"flex-1",
		"flex-row",
		"flex-col",
		"flex-wrap",
		"grow",
		"shrink-0",
		// positioning: the zero offsets only. A numeric offset is a numeric
		// dimension; a nonzero overlay inset is component geometry for `ui/`.
		"absolute",
		"relative",
		"inset-0",
		"inset-x-0",
		"inset-y-0",
		"top-0",
		"bottom-0",
		"left-0",
		"right-0",
		// sizing: the w-full/min-h/max-w facts, non-numeric members only. Fill
		// and viewport heights (`h-full`, `h-screen`) are component geometry
		// for `ui/`.
		"w-full",
		"min-w-0",
		"min-h-0",
		"min-h-full",
		"min-h-screen",
		"max-w-full",
		"max-w-none",
		// overflow: clipping only. A scrollable pane is a `ui/` primitive, so
		// `overflow-auto` and the axis variants stay out.
		"overflow-hidden",
		...SPACING_RUNGS.map((rung) => `gap-${rung}`),
	],
	prefixes: ["items-", "justify-", "self-", "z-"],
};

// Compared against the full dotted tag text, so `Animated.View` passes as a
// member expression while every other dotted tag fails.
export const NATIVE_GEOMETRY_HOSTS = [
	"View",
	"Pressable",
	"ScrollView",
	"Animated.View",
] as const;

// The platform's host rule: `"intrinsic"` is the web rule (a bare identifier
// tag starting lowercase; a member-expression tag like `motion.div` is a
// component in JSX semantics regardless of case), a list is the native rule.
export type GeometryHosts = "intrinsic" | readonly string[];

export interface GeometryViolation {
	file: string;
	line: number;
	kind: "class" | "host";
	token: string;
}

// One source of truth for the failure text both plugins throw. `root` is the
// path prefix the caller scanned under (files are root-relative), so the
// report names the file, the line, and the token from the consumer's cwd.
export function formatViolations(
	violations: readonly GeometryViolation[],
	root: string,
): string {
	return violations
		.map(({ file, line, kind, token }) =>
			kind === "host"
				? `${root}/${file}:${line}  class attribute on non-host tag "${token}"`
				: `${root}/${file}:${line}  "${token}" is not in the geometry vocabulary`,
		)
		.join("\n");
}

// Arbitrary values in both spellings, and any variant prefix: a geometry
// class behind `hover:` has no legal reading, so the token as a whole is a
// violation before membership is checked.
const BANNED_CHARS = /[[(:]/;

const SKIPPED_DIRS = new Set(["ui", "node_modules", ".stack"]);
const CLASS_ATTRIBUTES = new Set(["class", "className"]);

function isGeometry(token: string): boolean {
	if (BANNED_CHARS.test(token)) return false;
	return (
		GEOMETRY.exact.includes(token) ||
		GEOMETRY.prefixes.some((prefix) => token.startsWith(prefix))
	);
}

// Relative paths under `root` with `/` separators, sorted per directory so a
// scan reports in a stable order on every platform.
function sourceFiles(root: string, prefix = ""): string[] {
	const out: string[] = [];
	const entries = readdirSync(root, { withFileTypes: true }).sort((a, b) =>
		a.name.localeCompare(b.name),
	);
	for (const entry of entries) {
		const relative = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
		if (entry.isDirectory()) {
			if (SKIPPED_DIRS.has(entry.name)) continue;
			out.push(...sourceFiles(join(root, entry.name), relative));
		} else if (/\.tsx?$/.test(entry.name)) {
			out.push(relative);
		}
	}
	return out;
}

interface Candidate {
	token: string;
	line: number;
}

function pushTokens(text: string, line: number, into: Candidate[]): void {
	for (const token of text.split(/\s+/)) {
		if (token) into.push({ token, line });
	}
}

function isCnCall(node: Node): node is CallExpression {
	if (!Node.isCallExpression(node)) return false;
	const callee = node.getExpression();
	return Node.isIdentifier(callee) && callee.getText() === "cn";
}

// String-literal and identifier keys both; a computed key passes silently.
function collectObjectKeys(
	object: ObjectLiteralExpression,
	into: Candidate[],
): void {
	for (const property of object.getProperties()) {
		if (
			!Node.isPropertyAssignment(property) &&
			!Node.isShorthandPropertyAssignment(property)
		) {
			continue;
		}
		const name = property.getNameNode();
		if (Node.isStringLiteral(name)) {
			pushTokens(name.getLiteralText(), name.getStartLineNumber(), into);
		} else if (Node.isIdentifier(name)) {
			into.push({ token: name.getText(), line: name.getStartLineNumber() });
		}
	}
}

// The closed recursion of decision 4. Anything else (a variable, a prop, an
// interpolated template, a non-`cn` or aliased call) passes silently: the
// scanner reads literals, and the README states that coverage plainly.
function collectCandidates(
	node: Node,
	into: Candidate[],
	seenCnCalls: Set<Node>,
): void {
	if (Node.isJsxExpression(node)) {
		const inner = node.getExpression();
		if (inner) collectCandidates(inner, into, seenCnCalls);
		return;
	}
	if (
		Node.isStringLiteral(node) ||
		Node.isNoSubstitutionTemplateLiteral(node)
	) {
		pushTokens(node.getLiteralText(), node.getStartLineNumber(), into);
		return;
	}
	if (Node.isConditionalExpression(node)) {
		collectCandidates(node.getWhenTrue(), into, seenCnCalls);
		collectCandidates(node.getWhenFalse(), into, seenCnCalls);
		return;
	}
	if (Node.isBinaryExpression(node)) {
		const operator = node.getOperatorToken().getKind();
		if (
			operator === SyntaxKind.AmpersandAmpersandToken ||
			operator === SyntaxKind.BarBarToken
		) {
			collectCandidates(node.getRight(), into, seenCnCalls);
		}
		return;
	}
	if (Node.isArrayLiteralExpression(node)) {
		for (const element of node.getElements()) {
			collectCandidates(element, into, seenCnCalls);
		}
		return;
	}
	if (Node.isObjectLiteralExpression(node)) {
		collectObjectKeys(node, into);
		return;
	}
	if (isCnCall(node)) {
		seenCnCalls.add(node);
		for (const argument of node.getArguments()) {
			collectCandidates(argument, into, seenCnCalls);
		}
	}
}

function passesHostRule(
	tagNode: Node,
	tagText: string,
	hosts: GeometryHosts,
): boolean {
	if (hosts === "intrinsic") {
		return Node.isIdentifier(tagNode) && /^[a-z]/.test(tagText);
	}
	return hosts.includes(tagText);
}

function scanElement(
	element: JsxOpeningElement | JsxSelfClosingElement,
	hosts: GeometryHosts,
	seenCnCalls: Set<Node>,
	report: (line: number, kind: "class" | "host", token: string) => void,
): void {
	const candidates: Candidate[] = [];
	let carriesClass = false;
	for (const attribute of element.getAttributes()) {
		if (!Node.isJsxAttribute(attribute)) continue;
		const name = attribute.getNameNode().getText();
		if (name !== "classList" && !CLASS_ATTRIBUTES.has(name)) continue;
		carriesClass = true;
		const initializer = attribute.getInitializer();
		if (!initializer) continue;
		if (name === "classList") {
			// `classList` takes an object whose keys are the classes; only a
			// literal object is readable, anything else passes silently.
			const inner = Node.isJsxExpression(initializer)
				? initializer.getExpression()
				: undefined;
			if (inner && Node.isObjectLiteralExpression(inner)) {
				collectObjectKeys(inner, candidates);
			}
		} else {
			collectCandidates(initializer, candidates, seenCnCalls);
		}
	}
	// The host check fires only on class-carrying elements, and a failed host
	// replaces the membership check: the class channel is illegal there
	// wholesale, whatever it carries. The candidates were still collected so
	// a `cn` call inside the attribute never re-reports as a bare call.
	if (!carriesClass) return;
	const tagNode = element.getTagNameNode();
	const tagText = tagNode.getText();
	if (!passesHostRule(tagNode, tagText, hosts)) {
		report(element.getStartLineNumber(), "host", tagText);
		return;
	}
	for (const candidate of candidates) {
		if (!isGeometry(candidate.token)) {
			report(candidate.line, "class", candidate.token);
		}
	}
}

// Walks `.ts`/`.tsx` under `root` (skipping any path with a `ui` segment,
// plus `node_modules` and `.stack` defensively) and parses each file
// syntax-only: no tsconfig, no type checking, no dependency resolution. A
// missing root is a pass, so the gate is inert on a consumer without `src/`.
export function scanGeometry(
	root: string,
	hosts: GeometryHosts,
): GeometryViolation[] {
	if (!existsSync(root)) return [];
	const project = new Project({
		compilerOptions: { jsx: ts.JsxEmit.Preserve },
		skipAddingFilesFromTsConfig: true,
		skipFileDependencyResolution: true,
		skipLoadingLibFiles: true,
	});
	const violations: GeometryViolation[] = [];
	for (const file of sourceFiles(root)) {
		const sourceFile = project.addSourceFileAtPath(join(root, file));
		const seenCnCalls = new Set<Node>();
		const report = (line: number, kind: "class" | "host", token: string) => {
			violations.push({ file, line, kind, token });
		};
		sourceFile.forEachDescendant((node) => {
			if (
				Node.isJsxOpeningElement(node) ||
				Node.isJsxSelfClosingElement(node)
			) {
				scanElement(node, hosts, seenCnCalls, report);
				return;
			}
			// A `cn(...)` anywhere else has no host and gets the membership
			// check only. Calls inside a class attribute were consumed above.
			if (isCnCall(node) && !seenCnCalls.has(node)) {
				seenCnCalls.add(node);
				const candidates: Candidate[] = [];
				for (const argument of node.getArguments()) {
					collectCandidates(argument, candidates, seenCnCalls);
				}
				for (const candidate of candidates) {
					if (!isGeometry(candidate.token)) {
						report(candidate.line, "class", candidate.token);
					}
				}
			}
		});
	}
	return violations;
}
