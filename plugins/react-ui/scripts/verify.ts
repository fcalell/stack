// The web components held to the contract: the classes they spell, the
// sheet that must carry each one, and the roster their props answer to.
//
//   pnpm --filter @fcalell/plugin-react-ui verify
//
// The sheet is `.stack/app.css` exactly as `stack generate` resolves it for
// vite + react + react-ui with default options, compiled by the Tailwind CLI
// inside a fixture that links this package and ui-core the way an install
// does, so `globals.css` scans the real component sources.
import { execFileSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildGraphFromDiscovered } from "@fcalell/cli/build-graph";
import { cliSlots } from "@fcalell/cli/cli-slots";
import type { DiscoveredPlugin } from "@fcalell/cli/discovery";
import { react } from "@fcalell/plugin-react";
import { vite } from "@fcalell/plugin-vite";
import {
	assert,
	binPath,
	check,
	classes,
	report,
	tailwindBuild,
} from "@fcalell/ui-core/harness";
import {
	CLOSED_PROPS,
	componentDir,
	heldSpellings,
	type Owns,
	rosterEntries,
} from "@fcalell/ui-core/roster";
import {
	COLOR_NAMES,
	RADIUS_ROLES,
	SHADOW_LEVELS,
	SIZES,
	SPACING_ROLES,
	TYPE_ROLES,
	WIDTHS,
} from "@fcalell/ui-core/tokens";
import {
	GATE,
	GATE_COLUMN,
	GATE_FLOW,
	SHELL_COLUMN,
} from "@fcalell/ui-core/variants";
import { Node, Project, SyntaxKind } from "ts-morph";
import { reactUi } from "../src/index.ts";
import { OVERLAYS, SKELETON_WIDTHS } from "./overlays.ts";

const here = dirname(fileURLToPath(import.meta.url));
const pkgDir = resolve(here, "..");
const fixtureDir = resolve(here, "fixture");
const COMPONENT_DIR = resolve(pkgDir, "src/ui/components");

// ── The swept sources ───────────────────────────────────────────────

function walk(dir: string, pattern: RegExp): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = resolve(dir, entry.name);
		if (entry.isDirectory()) out.push(...walk(path, pattern));
		else if (pattern.test(entry.name)) out.push(path);
	}
	return out;
}

const COMPONENT_FILES = walk(COMPONENT_DIR, /\.(ts|tsx)$/);

function withoutComments(source: string): string {
	return source
		.split("\n")
		.map((line) => (/^\s*(\/\/|\/\*|\*)/.test(line) ? "" : line))
		.join("\n");
}

// The web's state variants, the ones `atoms-overlays.md` names.
const STATE_VARIANTS = [
	"hover",
	"active",
	"focus-visible",
	"disabled",
	"aria-disabled",
	"aria-busy",
];

// The literals where a class can stand: a `className`, the arguments of
// `cn` and of a ui-core variants call, and a module constant named in
// UPPER_SNAKE (an overlay, or a record of them). Prose, words and runtime
// strings elsewhere never reach the checks. An object key is a key, never a
// class.
const CLASS_SOURCES = new Project({ skipAddingFilesFromTsConfig: true });
const VARIANTS = "@fcalell/ui-core/variants";

function classLiterals(path: string): string[] {
	const file = CLASS_SOURCES.addSourceFileAtPath(path);
	const callers = new Set(["cn"]);
	for (const decl of file.getImportDeclarations())
		if (decl.getModuleSpecifierValue() === VARIANTS)
			for (const named of decl.getNamedImports()) callers.add(named.getName());
	const roots: Node[] = [];
	file.forEachDescendant((node) => {
		if (
			Node.isJsxAttribute(node) &&
			node.getNameNode().getText() === "className"
		)
			roots.push(node);
		else if (
			Node.isCallExpression(node) &&
			callers.has(node.getExpression().getText())
		)
			roots.push(node);
	});
	for (const statement of file.getVariableStatements())
		for (const decl of statement.getDeclarations())
			if (/^[A-Z][A-Z0-9_]*$/.test(decl.getName())) roots.push(decl);
	const out = new Set<Node>();
	for (const root of roots)
		root.forEachDescendant((node) => {
			const literal =
				Node.isStringLiteral(node) ||
				Node.isNoSubstitutionTemplateLiteral(node) ||
				Node.isTemplateHead(node) ||
				Node.isTemplateMiddle(node) ||
				Node.isTemplateTail(node);
			const key =
				Node.isPropertyAssignment(node.getParent()) &&
				node.getParent()?.getChildAtIndex(0) === node;
			if (literal && !key) out.add(node);
		});
	return [...out].map((node) =>
		Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)
			? node.getLiteralText()
			: node.getText().replace(/^[`}]|(\$\{|`)$/g, ""),
	);
}

// Utility roots a class literal draws from. A quoted token counts as a class
// only when it carries a state variant or its root is named here, so prose
// strings and prop values (`"body"`) never reach the checks.
const CLASS_ROOTS = [
	"bg",
	"text",
	"border",
	"outline",
	"-outline",
	"rounded",
	"gap",
	"p",
	"px",
	"py",
	"pt",
	"pb",
	"pl",
	"pr",
	"m",
	"mx",
	"my",
	"-m",
	"-mx",
	"-my",
	"h",
	"w",
	"size",
	"min-h",
	"min-w",
	"max-w",
	"max-h",
	"flex",
	"grid",
	"inline",
	"items",
	"justify",
	"self",
	"shrink",
	"grow",
	"overflow",
	"overscroll",
	"object",
	"whitespace",
	"font",
	"leading",
	"tracking",
	"shadow",
	"opacity",
	"inset",
	"left",
	"right",
	"bottom",
	"top",
	"translate",
	"aspect",
	"transition",
	"duration",
	"ease",
	"animate",
	"z",
	"cursor",
	"pointer-events",
	"select",
	"sr",
	"col",
	"row",
	"table",
	"wrap",
	"-indent",
	"-top",
	"-bottom",
];
const CLASS_EXACT = [
	"border",
	"outline",
	"absolute",
	"relative",
	"flex",
	"grid",
	"block",
	"field-sizing-content",
	"hidden",
	"truncate",
	"underline",
	"italic",
	"uppercase",
	"tabular-nums",
	"sr-only",
	"invisible",
	"isolate",
];

function variantOf(token: string): string | undefined {
	const colon = token.lastIndexOf(":");
	return colon < 0 ? undefined : token.slice(0, colon);
}

function bareOf(token: string): string {
	return token.slice(token.lastIndexOf(":") + 1);
}

function isClass(token: string): boolean {
	if (variantOf(token) !== undefined) return true;
	return (
		CLASS_EXACT.includes(token) ||
		CLASS_ROOTS.some((root) => token.startsWith(`${root}-`))
	);
}

// Every class each component file spells, by file.
function sweptClasses(): Map<string, Set<string>> {
	const out = new Map<string, Set<string>>();
	for (const path of COMPONENT_FILES) {
		const found = new Set<string>();
		for (const literal of classLiterals(path)) {
			for (const token of classes(literal)) {
				if (isClass(token)) found.add(token);
			}
		}
		out.set(path, found);
	}
	return out;
}

const SWEPT = sweptClasses();
const ALL_SWEPT = new Set([...SWEPT.values()].flatMap((set) => [...set]));

// ── Tokens by namespace ─────────────────────────────────────────────

// The token a class spells, by the namespace a roster entry's `owns` declares
// it under; a class that spells no contract token is empty. A role's leading
// and tracking ride with it. The same reading as ui-core's c35.
const TOKEN_NAMESPACES: ReadonlyArray<
	readonly [keyof Owns, RegExp, ReadonlySet<string>]
> = [
	["roles", /^(?:text|leading|tracking)-(.+)$/, new Set<string>(TYPE_ROLES)],
	["colors", /^(?:bg|text|border|outline)-(.+)$/, new Set<string>(COLOR_NAMES)],
	["radii", /^rounded(?:-[tblrse]{1,2})?-(.+)$/, new Set<string>(RADIUS_ROLES)],
	[
		"spacing",
		/^-?(?:gap|gap-[xy]|p[xytblrse]?|m[xytblrse]?)-(.+)$/,
		new Set<string>(SPACING_ROLES),
	],
	[
		"sizes",
		/^(?:(?:min-|max-)?[hw]|size|p[xytblrse]?|translate-[xy])-(.+)$/,
		new Set<string>([...SIZES, ...WIDTHS]),
	],
	["elevation", /^shadow-(.+)$/, new Set<string>(SHADOW_LEVELS)],
];

function spelled(name: string): Array<[keyof Owns, string]> {
	const out: Array<[keyof Owns, string]> = [];
	for (const [space, pattern, tokens] of TOKEN_NAMESPACES) {
		const token = pattern.exec(name)?.[1];
		if (token !== undefined && tokens.has(token)) out.push([space, token]);
	}
	return out;
}

function owned(owns: Owns, space: keyof Owns, token: string): boolean {
	const list: readonly string[] = owns[space] ?? [];
	return list.some(
		(entry) =>
			entry === token || (entry.endsWith("-") && token.startsWith(entry)),
	);
}

// A state variant over a contract token: the overlay form every pointer,
// focus and disabled class takes, held by ownership rather than listed.
function isStateToken(token: string): boolean {
	const parts = variantOf(token)?.split(":") ?? [];
	return (
		parts.length > 0 &&
		parts.every((part) => STATE_VARIANTS.includes(part)) &&
		spelled(bareOf(token)).length > 0
	);
}

// ── The sheet, as `stack generate` resolves it ──────────────────────

async function appCss(): Promise<string> {
	const cwd = mkdtempSync(join(tmpdir(), "stack-react-ui-verify-"));
	const plugins = [
		{ factory: vite, config: vite() },
		{ factory: react, config: react() },
		{ factory: reactUi, config: reactUi() },
	];
	const discovered = plugins.map(
		({ factory, config }) =>
			// The graph reads a discovered plugin's name, CLI, factory and options;
			// the rest of the discovery record (its package path) is unused here.
			({
				name: config.__plugin,
				cli: factory.cli,
				factory,
				options: config.options,
			}) as unknown as DiscoveredPlugin,
	);
	const { graph } = buildGraphFromDiscovered({
		discovered,
		app: { name: "verify", domain: "example.com" },
		cwd,
	});
	const files = await graph.resolve(cliSlots.artifactFiles);
	const css = files.find((file) => file.path === ".stack/app.css")?.content;
	assert(css, "the graph emits no .stack/app.css");
	return css;
}

const stackDir = resolve(fixtureDir, ".stack");

async function prepareFixture(): Promise<void> {
	const linkDir = resolve(fixtureDir, "node_modules/@fcalell");
	for (const dir of [stackDir, linkDir]) mkdirSync(dir, { recursive: true });
	for (const [name, target] of [
		["plugin-react-ui", pkgDir],
		["ui-core", resolve(pkgDir, "../../packages/ui-core")],
	] as const) {
		const link = resolve(linkDir, name);
		if (!existsSync(link)) symlinkSync(relative(linkDir, target), link, "dir");
	}
	writeFileSync(resolve(stackDir, "app.css"), await appCss());
}

await prepareFixture();

const built = tailwindBuild(
	pkgDir,
	resolve(stackDir, "app.css"),
	resolve(stackDir, "app.out.css"),
	stackDir,
);

// A variant class emits as `.hover\:bg-edge:hover` or nested under the
// variant's own rule, so the selector is matched by what may *not* follow it
// rather than by a fixed delimiter.
function emitted(css: string, name: string): boolean {
	const escaped = name
		.replace(/[.[\]()/%:!,&>]/g, (char) => `\\${char}`)
		.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return new RegExp(`\\.${escaped}(?![\\w\\\\-])`).test(css);
}

// ── Criteria ────────────────────────────────────────────────────────

check("a6", "the built sheet carries every class the components spell", () => {
	assert(
		emitted(built, "text-body") && emitted(built, "bg-canvas"),
		"the build carries no contract utility",
	);
	const dead = [...ALL_SWEPT].filter((name) => !emitted(built, name));
	assert(
		dead.length === 0,
		`classes the components spell that compile to nothing: ${dead.sort().join(", ")}`,
	);
	return `${ALL_SWEPT.size} component classes, each emitted by the built app.css`;
});

check("b5", "the overlay allowlist mirrors the swept sources", () => {
	const misplaced: string[] = [];
	for (const path of COMPONENT_FILES) {
		const source = readFileSync(path, "utf8");
		// A width composed over the line cell (`cn(skeleton({ kind: "line" }), width)`)
		// sits in a literal of widths alone, in a file that draws the cell.
		const bars = source.includes('skeleton({ kind: "line" })');
		for (const literal of classLiterals(path)) {
			const names = classes(literal);
			if (names.includes("bg-skeleton")) continue;
			if (
				bars &&
				names.length > 0 &&
				names.every((name) => SKELETON_WIDTHS.includes(name))
			)
				continue;
			for (const name of names) {
				if (SKELETON_WIDTHS.includes(name)) {
					misplaced.push(`${relative(pkgDir, path)}: ${name}`);
				}
			}
		}
	}
	assert(
		misplaced.length === 0,
		`a skeleton width off a skeleton bar: ${misplaced.join(", ")}`,
	);
	const listed = [...ALL_SWEPT].filter(
		(name) => !isStateToken(name) && !SKELETON_WIDTHS.includes(name),
	);
	const missing = listed.filter((name) => !OVERLAYS.includes(name));
	assert(
		missing.length === 0,
		`the components spell classes the allowlist lacks: ${missing.sort().join(", ")}`,
	);
	const stale = OVERLAYS.filter((name) => !listed.includes(name));
	assert(
		stale.length === 0,
		`the allowlist carries classes no component spells: ${stale.sort().join(", ")}`,
	);
	const states = ALL_SWEPT.size - listed.length;
	return `${listed.length} overlay classes equal to the allowlist, ${states} state-variant token classes`;
});

check("b-owns", "every token a component spells is one its entry owns", () => {
	const entries = new Map(
		rosterEntries().map(([, name, entry]) => [componentDir(name), entry]),
	);
	const hits: string[] = [];
	let inspected = 0;
	for (const [path, found] of SWEPT) {
		const dir = relative(COMPONENT_DIR, path).split("/")[0] ?? "";
		const owns = entries.get(dir)?.owns;
		for (const name of found) {
			for (const [space, token] of spelled(bareOf(name))) {
				inspected++;
				if (!owns || !owned(owns, space, token))
					hits.push(
						`${relative(pkgDir, path)}: ${name} spells ${space} ${token}, which ${dir} does not own`,
					);
			}
		}
	}
	assert(hits.length === 0, `unowned tokens:\n  ${hits.join("\n  ")}`);
	return `${inspected} token classes across ${SWEPT.size} files, each owned`;
});

function codeOf(source: string): string {
	return withoutComments(source).replace(/"[^"\n]*"/g, (span) =>
		span.replace(/[^\n]/g, " "),
	);
}

check(
	"b6",
	"every component closes through Closed and no channel survives",
	() => {
		const hits: string[] = [];
		for (const path of COMPONENT_FILES) {
			const raw = readFileSync(path, "utf8");
			const name = relative(pkgDir, path);
			const code = codeOf(raw);
			const flag = (offset: number, why: string): void => {
				const line = code.slice(0, offset).split("\n").length;
				hits.push(`${name}:${line}: ${why}`);
			};
			// A props interface extends Closed; a union of props forms intersects it.
			const closes =
				raw.includes("extends Closed") || raw.includes("= Closed &");
			if (path.endsWith("index.tsx") && !closes) {
				hits.push(`${name}: the props type does not extend Closed`);
			}
			for (const match of code.matchAll(
				/\b(?:className|classList|class|style)\?:\s*(?!never\b)\S+/g,
			)) {
				flag(match.index ?? 0, "an open declaration");
			}
			// The component's own JSX class attributes are the one permitted form;
			// blank them, then no class channel token may remain.
			const permitted = code.replace(/\bclassName=/g, (span) =>
				span.replace(/./g, " "),
			);
			for (const match of permitted.matchAll(/\bclassName\b/g)) {
				flag(match.index ?? 0, "a surviving class channel");
			}
			for (const match of code.matchAll(
				/\b(?:props|rest|local|others)\.(?:className|style)\b|\{\s*\.\.\.(?:props|rest)\s*\}/g,
			)) {
				flag(match.index ?? 0, "a props-sourced class value or a spread");
			}
		}
		assert(hits.length === 0, `the closure leaks:\n  ${hits.join("\n  ")}`);
		return `${COMPONENT_FILES.length} component files: every props type extends Closed, no surviving channel, no spread`;
	},
);

check("b7", "the closure fixture proves every prop at the type layer", () => {
	const source = readFileSync(resolve(fixtureDir, "closure.tsx"), "utf8");
	const directives = source.match(/@ts-expect-error/g) ?? [];
	const dirs = readdirSync(COMPONENT_DIR);
	assert(
		directives.length >= dirs.length * CLOSED_PROPS.length,
		`only ${directives.length} @ts-expect-error sites for ${dirs.length} components`,
	);
	for (const token of [
		'className="x"',
		"style={{",
		'class="x"',
		"classList={{}}",
	]) {
		assert(source.includes(token), `the fixture never passes ${token}`);
	}
	for (const dir of dirs) {
		assert(
			source.includes(`/components/${dir}"`),
			`the fixture never imports components/${dir}`,
		);
	}
	execFileSync(binPath(pkgDir, "tsc"), ["--noEmit"], {
		cwd: pkgDir,
		stdio: "pipe",
	});
	return `${directives.length} closures under @ts-expect-error, tsc --noEmit exits 0`;
});

// The web builds the roster component by component, so a directory is held
// to its entry and no directory stands off the roster; the count of entries
// still to build is reported.
check("b-roster", "every component carries exactly its roster props", () => {
	const project = new Project({
		tsConfigFilePath: resolve(pkgDir, "tsconfig.json"),
		skipAddingFilesFromTsConfig: true,
	});
	const dirs = new Set(readdirSync(COMPONENT_DIR));
	const seen = new Set<string>();
	let props = 0;
	let total = 0;
	for (const [, name, { props: expected }] of rosterEntries()) {
		total++;
		const dir = componentDir(name);
		if (!dirs.has(dir)) continue;
		seen.add(dir);
		const file = resolve(COMPONENT_DIR, dir, "index.tsx");
		assert(existsSync(file), `${name}: no src/ui/components/${dir}/index.tsx`);
		const exported = project
			.addSourceFileAtPath(file)
			.getExportedDeclarations();
		assert(
			exported.has(name),
			`${name}: components/${dir} does not export ${name}`,
		);
		const propsDecl = exported.get(`${name}Props`)?.[0];
		assert(
			propsDecl,
			`${name}: components/${dir} does not export ${name}Props`,
		);
		// A union is read member by member. A prop is closed only when every
		// declaration of it is `never`.
		const type = propsDecl.getType();
		const members = type.isUnion() ? type.getUnionTypes() : [type];
		const byName = new Map<string, boolean[]>();
		for (const member of members) {
			for (const symbol of member.getProperties()) {
				const never = symbol
					.getDeclarations()
					.map(
						(decl) =>
							Node.isPropertySignature(decl) &&
							decl.getTypeNode()?.getText() === "never",
					);
				byName.set(symbol.getName(), [
					...(byName.get(symbol.getName()) ?? []),
					...never,
				]);
			}
		}
		const open: string[] = [];
		const closed: string[] = [];
		for (const [prop, flags] of byName) {
			(flags.every(Boolean) ? closed : open).push(prop);
		}
		assert(
			open.sort().join(" ") === [...expected].sort().join(" "),
			`${name}: props are [${open.join(", ")}], the roster says [${expected.join(", ")}]`,
		);
		for (const channel of CLOSED_PROPS) {
			assert(closed.includes(channel), `${name}: ${channel} is not closed`);
		}
		props += open.length;
	}
	const extra = [...dirs].filter((dir) => !seen.has(dir));
	assert(
		extra.length === 0,
		`component directories off the roster: ${extra.join(", ")}`,
	);
	return `${seen.size} of ${total} roster components built, ${props} props, every one the roster's, every style channel closed`;
});

check("b-holds", "no component imports a cell another one holds", () => {
	const held = heldSpellings();
	// A component is read once its artboard is approved, as its `owns` marks.
	const approved = new Set(
		rosterEntries()
			.filter(([, , entry]) => entry.owns)
			.map(([, name]) => componentDir(name)),
	);
	const hits: string[] = [];
	let read = 0;
	for (const path of COMPONENT_FILES) {
		const dir = relative(COMPONENT_DIR, path).split("/")[0] ?? "";
		if (!approved.has(dir)) continue;
		read++;
		const source = readFileSync(path, "utf8");
		for (const [, names] of source.matchAll(
			/import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*"@fcalell\/ui-core\/variants"/g,
		)) {
			for (const name of (names ?? "").split(",")) {
				const spelling =
					name
						.replace(/^\s*type\s+/, "")
						.split(" as ")[0]
						?.trim() ?? "";
				const holder = held.get(spelling);
				if (holder && componentDir(holder) !== dir)
					hits.push(
						`${relative(pkgDir, path)} imports ${spelling}, which ${holder} holds: compose ${holder}`,
					);
			}
		}
	}
	assert(hits.length === 0, `held cells spelled:\n  ${hits.join("\n  ")}`);
	return `${read} component files, no held cell imported outside its holder`;
});

// A refused file stands in its `FormField`'s error line, so a `FileInput`
// outside one loses it. The check reads the JSX of this package's own sources
// (components and showcase), where an element's ancestors are visible; an
// app's `.tsx` is a consumer's and out of this script's reach.
check("b-file-input", "every FileInput stands inside a FormField", () => {
	const project = new Project({ skipAddingFilesFromTsConfig: true });
	const hits: string[] = [];
	let drawn = 0;
	for (const path of walk(resolve(pkgDir, "src/ui"), /\.tsx$/)) {
		const file = project.addSourceFileAtPath(path);
		const elements = [
			...file.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
			...file.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
		].filter((element) => element.getTagNameNode().getText() === "FileInput");
		for (const element of elements) {
			drawn++;
			const inside = element
				.getAncestors()
				.some(
					(ancestor) =>
						Node.isJsxElement(ancestor) &&
						ancestor.getOpeningElement().getTagNameNode().getText() ===
							"FormField",
				);
			if (!inside)
				hits.push(`${relative(pkgDir, path)}:${element.getStartLineNumber()}`);
		}
	}
	assert(
		hits.length === 0,
		`a FileInput outside a FormField:\n  ${hits.join("\n  ")}`,
	);
	return `${drawn} FileInput, each inside a FormField`;
});

check("b-stroke", "no stroke weight is spelled outside ICON_STROKE", () => {
	const hits: string[] = [];
	for (const path of walk(resolve(pkgDir, "src/ui"), /\.(ts|tsx)$/)) {
		const source = withoutComments(readFileSync(path, "utf8"));
		const name = relative(pkgDir, path);
		// A stroke weight is the prop or attribute, or a `stroke-<n>` class: each
		// reads the contract's `ICON_STROKE`, never a number.
		for (const match of source.matchAll(
			/\bstroke(?:Width|-width)\s*[=:]\s*(?!\{?\s*ICON_STROKE\b)[^\n]*|["'\s]stroke-(?:\d|\[)[^\s"']*/g,
		)) {
			const at = source.slice(0, match.index).split("\n").length;
			hits.push(`${name}:${at}: ${match[0].trim()}`);
		}
	}
	assert(
		hits.length === 0,
		`a stroke weight is spelled outside ICON_STROKE:\n  ${hits.join("\n  ")}`,
	);
	return "every stroke weight reads ICON_STROKE";
});

check("b-words", "no word is drawn from a literal", () => {
	const hits: string[] = [];
	for (const path of COMPONENT_FILES) {
		const source = withoutComments(readFileSync(path, "utf8"));
		const name = relative(pkgDir, path);
		const at = (index: number | undefined) =>
			source.slice(0, index).split("\n").length;
		// JSX text: letters between a `>` and a `<`, on one line or on a line of
		// their own, outside braces.
		for (const match of source.matchAll(
			/(?<![=\w])>[ \t]*[^<>{}\n]*[A-Za-z][^<>{}\n]*[ \t]*<|(?<![=\w])>[ \t]*\n[ \t]*[A-Za-z][^<>{}\n]*\n[ \t]*</g,
		)) {
			hits.push(
				`${name}:${at(match.index)}: JSX text ${JSON.stringify(match[0].trim())}`,
			);
		}
		for (const match of source.matchAll(
			/\b(?:aria-label|aria-description|title|alt|placeholder)="[^"]*"/g,
		)) {
			hits.push(`${name}:${at(match.index)}: ${match[0]}`);
		}
	}
	assert(
		hits.length === 0,
		`a word is drawn from a literal:\n  ${hits.join("\n  ")}`,
	);
	return `${COMPONENT_FILES.length} component files draw no literal word`;
});

const PRODUCT_NOUNS = [
	"stead",
	"inbox",
	"lane",
	"job",
	"epic",
	"card",
	"story",
	"brief",
	"repo",
	"sailward",
	"trip",
	"marina",
	"oggi",
	"rotta",
	"cambusa",
	"soldi",
];

// The toasts' layer stands on `--layer-toasts` over a sheet portalled into
// `<body>`, which holds only while no element between it and the root makes
// a stacking context: the Shell's frame, its column and `main`.
const STACKING_CONTEXT =
	/^(?:isolate|z-|-?(?:transform|translate|scale|rotate|skew)|opacity-|filter|backdrop-|blur|brightness|contrast|drop-shadow|grayscale|hue-rotate|invert|saturate|sepia|will-change-|contain-|mix-blend-|mask-|perspective|fixed$|sticky$)/;

check(
	"b-layers",
	"nothing under the toasts' layer makes a stacking context",
	() => {
		const read = (path: string) =>
			readFileSync(resolve(COMPONENT_DIR, path), "utf8");
		const spelled = (path: string, name: string): string => {
			const literal = new RegExp(`const ${name} =\\s*"([^"]*)"`).exec(
				read(path),
			)?.[1];
			assert(literal !== undefined, `${path} spells no ${name}`);
			return literal;
		};
		// The Shell's and the Gate's chains, root to the shared `main`.
		const ancestors = [
			spelled("shell/index.tsx", "FRAME"),
			SHELL_COLUMN,
			spelled("shell/index.tsx", "COLUMN"),
			spelled("gate/index.tsx", "FRAME"),
			spelled("shell/host.tsx", "MAIN"),
			GATE,
			spelled("gate/index.tsx", "PAGE"),
			GATE_COLUMN,
			GATE_FLOW,
			spelled("gate/index.tsx", "COLUMN"),
		];
		const hits = ancestors
			.flatMap((literal) => classes(literal))
			.filter((name) => STACKING_CONTEXT.test(bareOf(name)));
		assert(
			hits.length === 0,
			`a stacking context under the toasts' layer: ${hits.join(", ")}`,
		);
		return `${ancestors.length} class strings from each frame's root to the toasts' layer, none a stacking context`;
	},
);

check("b-nouns", "no product noun in src", () => {
	// A token boundary, not a word boundary: the contract's `card` role (`p-card`,
	// `rounded-card`) is a class segment, never the product noun, and so is the
	// role a `spacing("card")` call names.
	const pattern = new RegExp(
		`(?<![\\w-])(${PRODUCT_NOUNS.join("|")})(?![\\w-])`,
		"i",
	);
	const hits: string[] = [];
	for (const path of walk(resolve(pkgDir, "src"), /\.(ts|tsx)$/)) {
		const lines = withoutComments(readFileSync(path, "utf8")).split("\n");
		lines.forEach((line, index) => {
			const match = pattern.exec(line.replace(/\bspacing\("[\w-]+"\)/g, ""));
			if (match)
				hits.push(`${relative(pkgDir, path)}:${index + 1}: ${match[0]}`);
		});
	}
	assert(hits.length === 0, `a product noun survives:\n  ${hits.join("\n  ")}`);
	return `${PRODUCT_NOUNS.length} nouns absent from src`;
});

// Every component, lib module and frame drawer, resolved by plain node (no tsx
// hooks, which add extensions of their own) through the package's
// `exports`, so only a real resolution to an existing file passes.
check("b-exports", "every subpath reaches its file through exports", () => {
	const libDir = resolve(pkgDir, "src/ui/lib");
	const expected = new Map<string, string>();
	for (const name of readdirSync(libDir)) {
		expected.set(`lib/${name.replace(/\.tsx?$/, "")}`, resolve(libDir, name));
	}
	for (const dir of readdirSync(COMPONENT_DIR)) {
		expected.set(`components/${dir}`, resolve(COMPONENT_DIR, dir, "index.tsx"));
	}
	const framesDir = resolve(pkgDir, "src/ui/showcase/frames");
	for (const name of readdirSync(framesDir)) {
		expected.set(
			`showcase/frames/${name.replace(/\.tsx$/, "")}`,
			resolve(framesDir, name),
		);
	}
	const script = `const out = {}; for (const s of ${JSON.stringify([...expected.keys()])}) { try { out[s] = import.meta.resolve("@fcalell/plugin-react-ui/" + s); } catch { out[s] = null; } } console.log(JSON.stringify(out));`;
	const output = execFileSync(
		process.execPath,
		["--input-type=module", "-e", script],
		{
			cwd: pkgDir,
			encoding: "utf8",
			env: { ...process.env, NODE_OPTIONS: "" },
		},
	);
	const resolved = JSON.parse(output) as Record<string, string | null>;
	const broken: string[] = [];
	for (const [subpath, file] of expected) {
		const url = resolved[subpath];
		const path = url ? fileURLToPath(url) : undefined;
		if (path !== file || !existsSync(path))
			broken.push(`${subpath} -> ${path ?? "nothing"}`);
	}
	assert(
		broken.length === 0,
		`subpaths a consumer cannot import:\n  ${broken.join("\n  ")}`,
	);
	return `${expected.size} lib, component and frame drawer subpaths, each resolved to its own file`;
});

report();
