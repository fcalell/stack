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
	arbitraryValues,
	childReads,
	contexts,
	cssLayoutMotion,
	datasets,
	type Hit,
	layoutMotion,
	measures,
	outsideList,
	sectionNests,
	typeProps,
	WEB_MEASURES,
} from "@fcalell/ui-core/structure";
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
import { OVERLAYS } from "./overlays.ts";

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
	"-mb",
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
	"origin",
	"aspect",
	"transition",
	"duration",
	"ease",
	"animate",
	"z",
	"cursor",
	"pointer-events",
	"select",
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
	"sticky",
	"flex",
	"grid",
	"block",
	"contents",
	"field-sizing-content",
	"hidden",
	"truncate",
	"underline",
	"italic",
	"uppercase",
	"tabular-nums",
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
		.replace(/[^\w-]/g, (char) => `\\${char}`)
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
	const listed = [...ALL_SWEPT].filter((name) => !isStateToken(name));
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

// The waiting form is the loaded form painted, never a second tree: no file
// is named `wait.tsx` or `*-wait.tsx`, and no component is named `*Wait`.
check("b-wait", "no waiting tree stands beside the loaded one", () => {
	const hits: string[] = [];
	let files = 0;
	for (const path of walk(resolve(pkgDir, "src/ui"), /\.(ts|tsx)$/)) {
		files++;
		const rel = relative(pkgDir, path);
		if (/(^|[/-])wait\.tsx?$/.test(rel)) hits.push(`${rel}: a waiting file`);
		const source = withoutComments(readFileSync(path, "utf8"));
		for (const found of source.matchAll(
			/\b(?:function|const|class)\s+(\w*Wait)\b/g,
		))
			hits.push(`${rel}: ${found[1]}`);
	}
	assert(
		hits.length === 0,
		`a waiting tree beside the loaded one (paint the loaded form instead):\n  ${hits.join("\n  ")}`,
	);
	return `${files} source files, no waiting tree`;
});

// A Section's title is one size, so a Section inside a Section reads as its
// sibling and the page's outline flattens: no Section stands in a Section.
// Read over this package's own sources, showcase included, as the FileInput
// check is.
check("b-section-nest", "no Section stands in a Section", () => {
	const hits: string[] = [];
	let drawn = 0;
	for (const path of walk(resolve(pkgDir, "src/ui"), /\.tsx$/)) {
		const found = sectionNests(readFileSync(path, "utf8"), path);
		drawn += found.drawn;
		for (const hit of found.hits)
			hits.push(`${relative(pkgDir, path)}:${hit.line}`);
	}
	assert(hits.length === 0, `a Section in a Section:\n  ${hits.join("\n  ")}`);
	return `${drawn} Sections with a body, none holding another`;
});

// ── The structure checks ────────────────────────────────────────────
//
// `packages/ui-core/guide/structure.md` is the rule behind each: the matchers
// are `@fcalell/ui-core/structure`'s, proved to fail on a bad case by ui-core's
// tests. They sweep every file of `src/ui` but the showcase, whose stages
// spell their own sizes.

const UI_DIR = resolve(pkgDir, "src/ui");
const UI_FILES = walk(UI_DIR, /\.(ts|tsx)$/).filter(
	(path) => !relative(UI_DIR, path).startsWith("showcase/"),
);

function swept(match: (source: string, name: string) => Hit[]) {
	const found = new Map<string, Hit[]>();
	for (const path of UI_FILES)
		found.set(relative(UI_DIR, path), match(readFileSync(path, "utf8"), path));
	return found;
}

function where(found: ReadonlyMap<string, readonly Hit[]>): string[] {
	return [...found].flatMap(([path, hits]) =>
		hits.map((hit) => `${path}:${hit.line}: ${hit.text}`),
	);
}

check(
	"b-children",
	"no component reads its children: no Children, cloneElement, isValidElement or element .type",
	() => {
		const hits = where(swept(childReads));
		assert(
			hits.length === 0,
			`a component reads a React child (measured: ${hits.length}, expected: 0); take the structure as a prop:\n  ${hits.join("\n  ")}`,
		);
		return `${UI_FILES.length} files, no walk of a React child (a markdown token, an Intl part and a MutationRecord carry a string .type and are no child)`;
	},
);

check(
	"b-arbitrary",
	"no literal length inside a Tailwind arbitrary value",
	() => {
		const found = swept(arbitraryValues);
		found.set(
			"scripts/overlays.ts",
			arbitraryValues(
				readFileSync(resolve(here, "overlays.ts"), "utf8"),
				"overlays.ts",
			),
		);
		const hits = where(found);
		assert(
			hits.length === 0,
			`a literal length in an arbitrary value (measured: ${hits.length}, expected: 0); use a spacing, size or width token, or a calc() over var(--…) tokens:\n  ${hits.join("\n  ")}`,
		);
		return `${found.size} files, every arbitrary value a calc over tokens, 1lh, a selector, a property list or a track`;
	},
);

check("b-motion", "no size or place animates through layout", () => {
	const found = swept(layoutMotion);
	found.set(
		"scripts/overlays.ts",
		layoutMotion(
			readFileSync(resolve(here, "overlays.ts"), "utf8"),
			"overlays.ts",
		),
	);
	found.set(
		"src/ui/globals.css",
		cssLayoutMotion(
			readFileSync(resolve(here, "../src/ui/globals.css"), "utf8"),
		),
	);
	const hits = where(found);
	assert(
		hits.length === 0,
		`a size or place animated through layout (measured: ${hits.length}, expected: 0); move it by a transform or a view transition:\n  ${hits.join("\n  ")}`,
	);
	return `${found.size} files, every animated size or place a transform or a view transition`;
});

// The files that measure the page in JavaScript, each with the one thing it
// reads. A file not listed fails, and so does a listed file that stops.
const MEASURING: Record<string, string> = {
	"lib/fold.ts":
		"useFold: a Pane head's acts that do not fit beside the title's floor fold into its more menu, which needs the row's width and the acts' boxes, so they are observed and measured; useMarksFold: a list row's marks that do not all fit whole beside the text group's floor fold away, which needs the row's width, its text group's and each mark's, so they are observed and measured",
	"lib/frame.ts":
		"useFootRegion: a footed Pane or Thread in an auto-height column has no definite height, so its region is measured for the docked sheet",
	"lib/page.ts":
		"usePageTablet: the Table's grid or list by its page's width, a tree that differs, so CSS cannot choose",
	"lib/scrolls.ts":
		"useScrolls: a region that scrolls and holds nothing tabbable takes a tab stop, which CSS cannot set",
	"lib/media.ts":
		"the density query, the reduced-motion query and a spacing token read for a popup's offset",
	"lib/window.tsx":
		"a long collection draws only the rows near its scroller's view, placed from the rows' measured heights and the scroller's offset into the box",
	"lib/settle.ts":
		"the settle reads reduced motion and the focused field to snap instead of move, and the running view transition",
	"components/canvas/":
		"the Canvas draws its nodes, edges and viewport from measured boxes",
	"components/thread/index.tsx":
		"the log follows its end as messages arrive and the input grows",
	"components/sheet/docked.tsx":
		"the docked sheet's body gives below its floor once the log has, so its pinned head and foot are measured",
};

check(
	"b-measure",
	"the page is measured in JavaScript only in the closed list of files",
	() => {
		const found = swept((source, name) => measures(source, WEB_MEASURES, name));
		const { unlisted, stale } = outsideList(
			new Map(
				[...found].map(([path, hits]) => [path, hits.map((h) => h.text)]),
			),
			MEASURING,
		);
		assert(
			unlisted.length === 0,
			`measuring outside the closed list (expected: CSS, a container query or flex-wrap; else add the file to MEASURING with its reason):\n  ${where(new Map([...found].filter(([path]) => unlisted.includes(path)))).join("\n  ")}`,
		);
		assert(
			stale.length === 0,
			`listed files that no longer measure (remove the entry): ${stale.join(", ")}`,
		);
		return `${Object.keys(MEASURING).length} listed entries, no other file measures`;
	},
);

// Every context of src/ui and plugin-api's holds, by the file that creates it, with its class and
// why. `data` carries a value a child shows, `behaviour` a callback or a state
// a child acts on, `portal` where a popup mounts. `form` is a named exception:
// a context that changes a child's form, which no new context may join.
type ContextClass = "data" | "behaviour" | "portal" | "form";
const CONTEXTS: Record<string, [ContextClass, string]> = {
	"lib/navigate.ts:ListedRoute": [
		"data",
		"the route a List read once, which its rows read instead of each subscribing",
	],
	"lib/window.tsx:Scroller": [
		"behaviour",
		"the element that scrolls around a long collection, which it windows its rows against",
	],
	"lib/portal.ts:PortalContainer": [
		"portal",
		"the one mount point a showcase stage provides for its popups",
	],
	"lib/heading.ts:HeadingContext": [
		"data",
		"the level a title reads at, handed down one deeper per Section",
	],
	"lib/field.ts:FieldDisabled": [
		"behaviour",
		"whether the field around an act is disabled, which Base UI's field context does not hand to a Button",
	],
	"lib/field.ts:GroupName": [
		"data",
		"the id of the label that names a group of controls",
	],
	"lib/form.ts:SubmitContext": [
		"behaviour",
		"the Button an ActionBar draws is the Form's submit button",
	],
	"lib/form.ts:ActInert": [
		"behaviour",
		"an act that cannot run where it stands, drawn in its disabled cell",
	],
	"lib/toast.ts:ToastEntry": ["data", "the queued toast a Toast draws"],
	"lib/mark.tsx:MarkContext": [
		"data",
		"the app's mark, which the Shell and Gate draw",
	],
	"lib/reason.ts:ReasonHostContext": [
		"behaviour",
		"the host a blocked act tells it was pressed, which shows its reason",
	],
	"lib/frame.ts:ShellSwitcher": [
		"data",
		"the place switcher the Shell hands the Pane, which draws it as a descriptor in its touch bar; a room Place hands none",
	],
	"lib/frame.ts:ShellHome": [
		"form",
		"exception: the router mounts the page for an unknown address wherever the miss lands, and only the tree above it knows whether a Shell stands there: a Gate is a root frame with its own main, a Place of a Pane cannot draw outside one, and react-ui imports no router to ask which layout took the miss",
	],
	"lib/frame.ts:PlaceRoute": [
		"data",
		"the route of the Shell's place, where a read leads back",
	],
	"lib/frame.ts:BackRoute": [
		"data",
		"the route a Pane's back act returns to, where a read leads back",
	],
	"lib/frame.ts:PageTitle": [
		"data",
		"the id of the title that names a Pane or a Gate, which its Thread and Table label by",
	],
	"plugin-api/tanstack-query.tsx:HoldsContext": [
		"data",
		"identity that places flags: the query hashes the frames above hold, which says which frame draws a read's busy mark and its stale and paused line; no frame's form comes from it",
	],
	"lib/words.tsx:WordsContext": ["data", "the app's words"],
	"lib/touched.ts:TouchedContext": [
		"behaviour",
		"whether a Form or Sheet has taken input, and its leave",
	],
	"lib/media.ts:DistanceContext": [
		"data",
		"the Place's density for the page as a whole (room), the TV set",
	],
};

check(
	"b-context",
	"every createContext is in the closed list, classified data, behaviour or portal",
	() => {
		const found = new Map<string, string[]>();
		// The holds context lives in plugin-api, beside the hook that reads it.
		const sources = swept(contexts);
		const holds = resolve(pkgDir, "../api/src/tanstack-query.tsx");
		sources.set(
			"plugin-api/tanstack-query.tsx",
			contexts(readFileSync(holds, "utf8"), holds),
		);
		for (const [path, hits] of sources)
			for (const hit of hits) {
				const key = `${path}:${hit.text}`;
				found.set(key, [...(found.get(key) ?? []), `${path}:${hit.line}`]);
			}
		const unlisted = [...found.keys()].filter((key) => !(key in CONTEXTS));
		assert(
			unlisted.length === 0,
			`a context outside the closed list (classify it as data, behaviour or portal in CONTEXTS; a context that changes a child's form is not allowed, pass a prop):\n  ${unlisted.map((key) => `${found.get(key)?.join(", ")}: ${key}`).join("\n  ")}`,
		);
		const stale = Object.keys(CONTEXTS).filter((key) => !found.has(key));
		assert(
			stale.length === 0,
			`listed contexts that no longer exist (remove the entry): ${stale.join(", ")}`,
		);
		const forms = Object.values(CONTEXTS).filter(([kind]) => kind === "form");
		return `${found.size} contexts, each classified; ${forms.length} named exceptions that change a child's form`;
	},
);

const DATASET: Record<string, string> = {
	"lib/modality.ts":
		"the root's pointer or keyboard mark, which the ring variants read",
	"lib/media.ts": "the density pin a root names, which useTouch reads",
	"components/table/index.tsx":
		"a cell's row (by id) and column, which the grid's keyboard cursor reads back",
	"components/list/base.tsx":
		"a tree row's key, which its keys find the row's place among the visible ones by when the window leaves most rows unmounted",
	"components/picker/base.tsx":
		"a sheet option's place among all the options, which its keys move by when the window leaves most rows unmounted",
	"components/canvas/":
		"the Canvas finds its nodes, ports and labels by their marks in its hit tests and measures",
};

check(
	"b-dataset",
	"dataset is read or written only in the closed list of files",
	() => {
		const found = swept(datasets);
		const { unlisted, stale } = outsideList(
			new Map(
				[...found].map(([path, hits]) => [path, hits.map((h) => h.text)]),
			),
			DATASET,
		);
		assert(
			unlisted.length === 0,
			`a data mark read or written outside the closed list (expected: a prop, or CSS on a state; else add the file to DATASET with its reason):\n  ${where(new Map([...found].filter(([path]) => unlisted.includes(path)))).join("\n  ")}`,
		);
		assert(
			stale.length === 0,
			`listed files with no dataset (remove the entry): ${stale.join(", ")}`,
		);
		return `${Object.keys(DATASET).length} listed entries, no other file touches a dataset`;
	},
);

check("b-type-prop", "no component takes a prop named type", () => {
	const found = new Map<string, Hit[]>();
	for (const path of UI_FILES) {
		const rel = relative(UI_DIR, path);
		if (!rel.startsWith("components/")) continue;
		found.set(rel, typeProps(readFileSync(path, "utf8"), path));
	}
	const hits = where(found);
	assert(
		hits.length === 0,
		`a component takes or reads a type prop (measured: ${hits.length}, expected: 0); name the prop for what it chooses, a kind or a form:\n  ${hits.join("\n  ")}`,
	);
	return `${found.size} component files, no prop named type`;
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
		// their own, outside braces. A `>` after a trailing comma closes a
		// type-parameter list, not a tag. A `>` after a trailing comma closes a
		// type-parameter list, not a tag.
		for (const match of source.matchAll(
			/(?<![=\w])(?<!,\s*)>[ \t]*[^<>{}\n]*[A-Za-z][^<>{}\n]*[ \t]*<|(?<![=\w])(?<!,\s*)>[ \t]*\n[ \t]*[A-Za-z][^<>{}\n]*\n[ \t]*</g,
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
