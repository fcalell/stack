// Reproduction harness for the `.stack/global.css` emission, the uniwind
// pipeline that consumes it, and the roster the components are held to.
//
//   pnpm --filter @fcalell/plugin-native-ui verify
//
// The sheet is rendered via `aggregateGlobalCss` with default options (no
// consumer project exists to drive the graph), then compiled twice: through
// uniwind's own dist compiler (the exact code path Metro runs, minus a
// device), and through a Tailwind CLI build that decides what the vocabulary
// resolves to. The pipeline check runs before the Tailwind build on purpose:
// it re-stamps uniwind's mutable in-package `uniwind.css` artifact from our
// own emission, so the build reads a deterministic artifact.
import { execFileSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { createRequire, registerHooks } from "node:module";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { StackError } from "@fcalell/cli/errors";
import { deriveTheme } from "@fcalell/ui-core/derive";
import {
	modeTokens,
	shadowUtilities,
	themeTokens,
} from "@fcalell/ui-core/emit";
import {
	assert,
	binPath,
	blockBody,
	check,
	classes,
	declarationMap,
	declarations,
	type Family,
	normalize,
	report,
	rule,
	tailwindBuild,
} from "@fcalell/ui-core/harness";
import {
	CLOSED_PROPS,
	componentDir,
	rosterEntries,
} from "@fcalell/ui-core/roster";
import {
	ENGLISH,
	PER_MODE_COLORS,
	SHADOW_LEVELS,
	SPACING_RUNGS,
	STATUS_STATES,
	TYPE_ROLES,
	ZEROED_NAMESPACES,
} from "@fcalell/ui-core/tokens";
import * as variants from "@fcalell/ui-core/variants";
import { Node, Project } from "ts-morph";
import { aggregateGlobalCss } from "../src/node/codegen.ts";
import { runGeometryGate } from "../src/node/gate.ts";
import { nativeUiOptionsSchema, type Theme } from "../src/types.ts";

const here = dirname(fileURLToPath(import.meta.url));
const pkgDir = resolve(here, "..");
const fixtureDir = resolve(here, "fixture");

// The production `@source` roots, restated as a second opinion; a3 pins
// `src/index.ts` to the same three strings so the two cannot drift.
const SOURCES = [
	"../src",
	"../node_modules/@fcalell/plugin-native-ui/src",
	"../node_modules/@fcalell/ui-core/src",
];

// The retired vocabulary: the names the components no longer carry, and the
// shadcn-era names a consumer might type. The namespace resets must compile
// every one of them to nothing.
const RETIRED = [
	"text-sm",
	"text-base",
	"text-xs",
	"text-lg",
	"text-h1",
	"text-h3",
	"text-callout",
	"text-caption",
	"text-micro",
	"rounded-lg",
	"rounded-2xl",
	"rounded-md",
	"rounded-control",
	"rounded-xl",
	"shadow-1",
	"shadow-2",
	"shadow-3",
	"p-card",
	"text-ink-1",
	"text-ink-2",
	"text-ink-3",
	"text-ink-4",
	"bg-surface-2",
	"bg-surface-3",
	"border-edge-2",
	"bg-brand",
	"text-interactive",
	"text-accent-ink",
	"text-white",
	"bg-primary",
	"bg-black/50",
];

// The native overlay allowlist: every class the swept `src/ui` sources name,
// spelled out as a second opinion; check b5 asserts it equals the set
// enumerated from the sources, so a component edit that adds or drops a class
// fails until the list moves with it.
const NATIVE_OVERLAYS = [
	"absolute",
	"active:bg-edge",
	"active:bg-ink-meta",
	"aspect-square",
	"bg-canvas",
	"bg-danger-soft",
	"bg-group",
	"bg-ok-soft",
	"bg-on-accent",
	"border-edge",
	"border-l-2",
	"border-t",
	"bottom-0",
	"flex-1",
	"flex-row",
	"flex-wrap",
	"font-medium",
	"gap-pair",
	"gap-row",
	"gap-section",
	"gap-stack",
	"grow",
	"h-1",
	"h-2",
	"h-8",
	"inset-x-0",
	"inset-y-0",
	"italic",
	"items-center",
	"items-end",
	"items-start",
	"items-stretch",
	"justify-between",
	"justify-center",
	"justify-end",
	"left-0",
	"line-through",
	"max-w-full",
	"min-h-11",
	"min-h-20",
	"min-w-0",
	"opacity-0",
	"opacity-50",
	"overflow-hidden",
	"p-inset",
	"pb-room",
	"pb-section",
	"pb-stack",
	"pl-stack",
	"pt-stack",
	"px-0",
	"px-0.5",
	"px-4",
	"px-inset",
	"px-stack",
	"py-0",
	"py-2",
	"py-room",
	"py-row",
	"right-0",
	"rounded-full",
	"rounded-group",
	"self-center",
	"self-start",
	"shadow-float",
	"shadow-sheet",
	"shrink",
	"size-2",
	"size-6",
	"size-7",
	"size-8",
	"text-center",
	"text-danger",
	"text-ink",
	"text-ink-faint",
	"text-ok",
	"text-right",
	"text-tint",
	"underline",
	"uppercase",
	"w-13",
	"w-8",
	"w-full",
];

// ── The swept sources, enumerated ───────────────────────────────────

function walk(dir: string, pattern: RegExp): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = resolve(dir, entry.name);
		if (entry.isDirectory()) out.push(...walk(path, pattern));
		else if (pattern.test(entry.name)) out.push(path);
	}
	return out;
}

// Prose is dropped first: a comment quoting a class otherwise reads as one.
// Only whole comment lines are dropped, since a `//` inside a string is a URL.
// A quoted object key goes too: the formatter puts no space before a key's
// colon and always puts one in a ternary, which separates the two.
function literals(source: string): string[] {
	const code = source
		.split("\n")
		.filter((line) => !/^\s*(\/\/|\/\*|\*)/.test(line))
		.join("\n");
	return [
		...[...code.matchAll(/"([^"\n]*)"(:?)/g)]
			.filter((match) => match[2] !== ":")
			.map((match) => match[1] ?? ""),
		...[...code.matchAll(/`([^`]*)`/g)].map((match) => match[1] ?? ""),
	];
}

// Utility roots the components' class literals draw from. A quoted token
// counts as a class only when its root is named here, so prose strings never
// reach the build assertion.
const CLASS_ROOTS = [
	"bg",
	"text",
	"border",
	"rounded",
	"gap",
	"p",
	"px",
	"py",
	"pt",
	"pb",
	"pl",
	"m",
	"mb",
	"mt",
	"h",
	"w",
	"size",
	"min-h",
	"min-w",
	"max-w",
	"max-h",
	"flex",
	"items",
	"justify",
	"self",
	"overflow",
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
	"aspect",
];
const CLASS_EXACT = [
	"border",
	"uppercase",
	"italic",
	"underline",
	"line-through",
	"absolute",
	"relative",
	"flex",
	"shrink",
	"grow",
	"hidden",
];

function sourceClasses(): Set<string> {
	const out = new Set<string>();
	for (const path of walk(resolve(pkgDir, "src/ui"), /\.(ts|tsx)$/)) {
		const source = readFileSync(path, "utf8");
		for (const literal of literals(source)) {
			for (const token of classes(literal)) {
				if (token.includes("[") || token.includes("]")) continue;
				const bare = token.slice(token.lastIndexOf(":") + 1);
				if (
					CLASS_EXACT.includes(bare) ||
					CLASS_ROOTS.some((root) => bare.startsWith(`${root}-`))
				) {
					out.add(token);
				}
			}
		}
	}
	return out;
}

// ── The sheet, rendered with default options ────────────────────────

function emit(theme?: Theme): string {
	return aggregateGlobalCss({
		resolved: deriveTheme(theme),
		sources: SOURCES,
		extraImports: [],
	});
}

const resolved = deriveTheme();
const sheet = emit();
const themeDecls = declarations(blockBody(sheet, "@theme"));
const themeMap = new Map(themeDecls);

// ── The matrices, called for their full class inventory ─────────────

const AVATAR_STEPS = ["1", "2", "3", "4", "5", "6", "7", "8"];

// The axis values are spelled here as a second opinion; every cell string is
// produced by calling the cva, never written out.
const FAMILIES: Family[] = [
	{
		name: "TEXT",
		cva: variants.text as Family["cva"],
		axes: { role: TYPE_ROLES },
	},
	{
		name: "TEXT_STRONG",
		cva: variants.textStrong as Family["cva"],
		axes: { role: TYPE_ROLES },
	},
	{
		name: "BUTTON",
		cva: variants.button as Family["cva"],
		axes: { act: ["primary", "secondary", "destructive"] },
	},
	{
		name: "BUTTON_LABEL",
		cva: variants.buttonLabel as Family["cva"],
		axes: { act: ["primary", "secondary", "destructive"] },
	},
	{
		name: "STATUS",
		cva: variants.status as Family["cva"],
		axes: { state: STATUS_STATES },
	},
	{
		name: "FIELD",
		cva: variants.field as Family["cva"],
		axes: {
			kind: ["text", "search", "code"],
			state: ["default", "focused", "error"],
		},
	},
	{
		name: "ROW",
		cva: variants.row as Family["cva"],
		axes: { state: ["rest", "pressed", "selected"] },
	},
	{
		name: "SWITCH",
		cva: variants.switchTrack as Family["cva"],
		axes: { state: ["off", "on"] },
	},
	{
		name: "CHECKBOX",
		cva: variants.checkbox as Family["cva"],
		axes: { state: ["unchecked", "checked"] },
	},
	{
		name: "SEGMENT",
		cva: variants.segment as Family["cva"],
		axes: { state: ["idle", "selected"] },
	},
	{
		name: "BANNER",
		cva: variants.banner as Family["cva"],
		axes: { kind: ["note", "warn", "danger"] },
	},
	{
		name: "DIFF_LINE",
		cva: variants.diffLine as Family["cva"],
		axes: { kind: ["context", "added", "removed", "header"] },
	},
	{
		name: "MESSAGE",
		cva: variants.message as Family["cva"],
		axes: { author: ["you", "other", "system"] },
	},
	{
		name: "AVATAR",
		cva: variants.avatar as Family["cva"],
		axes: { step: AVATAR_STEPS },
	},
	{
		name: "PLACE",
		cva: variants.place as Family["cva"],
		axes: { state: ["idle", "selected"] },
	},
	{
		name: "RHYTHM",
		cva: variants.rhythm as Family["cva"],
		axes: { unit: SPACING_RUNGS },
	},
];

const FAMILY_ROSTER =
	"TEXT TEXT_STRONG BUTTON BUTTON_LABEL STATUS FIELD ROW SWITCH CHECKBOX SEGMENT BANNER DIFF_LINE MESSAGE AVATAR PLACE RHYTHM";

// The class-bearing constants beside the matrices, read off the module so a
// new one cannot skip the compile probe.
const CLASS_CONSTANTS = Object.entries(
	variants as unknown as Record<string, unknown>,
)
	.filter(
		(entry): entry is [string, string] =>
			typeof entry[1] === "string" && /^[A-Z_]+$/.test(entry[0]),
	)
	.map(([, value]) => value);

// Every class every cva can emit, over the cartesian product of its own axes,
// plus the class-bearing constants. The Tailwind build must resolve each one
// through the ui-core `@source` root; none of them rides the probe file.
function enumerated(): Set<string> {
	const out = new Set<string>();
	for (const family of FAMILIES) {
		let combos: Array<Record<string, string>> = [{}];
		for (const [axis, values] of Object.entries(family.axes)) {
			combos = combos.flatMap((row) =>
				values.map((value) => ({ ...row, [axis]: value })),
			);
		}
		for (const props of combos) {
			for (const name of classes(family.cva(props))) out.add(name);
		}
	}
	for (const constant of CLASS_CONSTANTS) {
		for (const name of classes(constant)) out.add(name);
	}
	return out;
}

const INVENTORY = enumerated();

// ── The fixture ─────────────────────────────────────────────────────

const stackDir = resolve(fixtureDir, ".stack");

function prepareFixture(): void {
	const srcDir = resolve(fixtureDir, "src");
	const linkDir = resolve(fixtureDir, "node_modules/@fcalell");
	for (const dir of [stackDir, srcDir, linkDir])
		mkdirSync(dir, { recursive: true });
	for (const [name, target] of [
		["plugin-native-ui", pkgDir],
		["ui-core", resolve(pkgDir, "../../packages/ui-core")],
	] as const) {
		const link = resolve(linkDir, name);
		if (!existsSync(link)) symlinkSync(relative(linkDir, target), link, "dir");
	}
	// The probe carries only the overlay allowlist and the retired list. The
	// matrix inventory is deliberately absent: it must reach the build through
	// the ui-core `@source` root or a6 fails.
	writeFileSync(
		resolve(srcDir, "probe.html"),
		`<div class="${[...NATIVE_OVERLAYS, ...RETIRED].join(" ")}"></div>\n`,
	);
	writeFileSync(resolve(stackDir, "global.css"), sheet);
}

prepareFixture();

// ── The uniwind pipeline (runs first: it re-stamps the artifact) ────

interface CompiledEntry {
	entries: Array<[string, (vars: Vars) => unknown]>;
}

type Vars = Record<string, (vars: Vars) => unknown>;

interface Compiled {
	scopedVars: Record<string, Vars>;
	vars: Vars;
	stylesheet: Record<string, CompiledEntry[] | undefined>;
}

// uniwind's dist modules import each other through unresolved `@/` aliases, so
// a resolver hook maps them into `dist/module` before anything is imported.
async function compilePipeline(): Promise<Compiled> {
	const require = createRequire(import.meta.url);
	const uniwindRoot = dirname(require.resolve("uniwind/package.json"));
	registerHooks({
		resolve(specifier, context, nextResolve) {
			if (typeof specifier === "string" && specifier.startsWith("@/")) {
				const base = resolve(uniwindRoot, "dist/module", specifier.slice(2));
				for (const candidate of [`${base}.js`, resolve(base, "index.js")]) {
					if (existsSync(candidate)) {
						return { url: pathToFileURL(candidate).href, shortCircuit: true };
					}
				}
			}
			return nextResolve(specifier, context);
		},
	});
	const { UniwindBundlerConfig } = await import(
		pathToFileURL(resolve(uniwindRoot, "dist/module/bundler/config.js")).href
	);
	const { compileCSS } = await import(
		pathToFileURL(
			resolve(uniwindRoot, "dist/module/bundler/css-compiler/index.js"),
		).href
	);

	// `cssEntryFile` resolves against cwd (uniwind's contract), so the compile
	// runs from the fixture with the exact options the plugin contributes.
	const cwd = process.cwd();
	process.chdir(fixtureDir);
	try {
		const bundlerConfig = UniwindBundlerConfig.fromMetroConfig(
			{
				cssEntryFile: "./.stack/global.css",
				dtsFile: "./.stack/uniwind-types.d.ts",
			},
			"ios",
		);
		await bundlerConfig.generateArtifacts(resolve(uniwindRoot, "uniwind.css"));
		const code: string = await compileCSS(bundlerConfig);
		return new Function("rt", `return ${code}`)({
			colorScheme: "light",
		}) as Compiled;
	} finally {
		process.chdir(cwd);
	}
}

const compiled = await compilePipeline().catch((error: unknown) =>
	error instanceof Error ? error : new Error(String(error)),
);

// ── The Tailwind build over the same sheet (after the re-stamp) ─────

const built = tailwindBuild(
	pkgDir,
	resolve(stackDir, "global.css"),
	resolve(stackDir, "global.out.css"),
	stackDir,
);

// A variant class emits as `.active\:bg-edge:active`, so the selector is
// matched by what may *not* follow it rather than by a fixed delimiter.
function emitted(css: string, name: string): boolean {
	const escaped = name
		.replace(/[.[\]()/%:!]/g, (char) => `\\${char}`)
		.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return new RegExp(`\\.${escaped}(?![\\w\\\\-])`).test(css);
}

// ── Helpers over the compiled pipeline object ───────────────────────

function pipeline(): Compiled {
	assert(
		!(compiled instanceof Error),
		`uniwind pipeline failed: ${compiled instanceof Error ? compiled.message : ""}`,
	);
	return compiled;
}

function themeScope(compiledCss: Compiled, mode: string): Vars {
	const scope = compiledCss.scopedVars[`__uniwind-theme-${mode}`];
	assert(scope, `no __uniwind-theme-${mode} scope in the compiled stylesheet`);
	return { ...compiledCss.vars, ...scope };
}

function styleValue(
	compiledCss: Compiled,
	className: string,
	property: string,
	vars: Vars,
): unknown {
	const rules = compiledCss.stylesheet[className];
	assert(rules?.[0], `${className} is absent from the compiled stylesheet`);
	const entry = rules[0].entries.find(([name]) => name === property);
	assert(entry, `${className} carries no ${property}`);
	return entry[1](vars);
}

// ── The geometry gate over its fixture trees ────────────────────────

const gateFixtureDir = resolve(fixtureDir, "gate");
const gateOutcomes = new Map<string, unknown>();
for (const tree of ["pass", "fail", "empty"]) {
	gateOutcomes.set(
		tree,
		await runGeometryGate(resolve(gateFixtureDir, tree)).then(
			() => "clean",
			(error: unknown) => error,
		),
	);
}

// ── Criteria ────────────────────────────────────────────────────────

check("a3", "the emitted sheet has the contract shape", () => {
	const resets = themeDecls
		.slice(0, ZEROED_NAMESPACES.length)
		.map(([name]) => name);
	assert(
		resets.join(" ") === ZEROED_NAMESPACES.join(" "),
		`the namespace resets do not lead @theme: ${resets.join(" ")}`,
	);

	const expected = themeTokens(resolved);
	for (const [name, value] of Object.entries(expected)) {
		assert(
			themeMap.get(name) === normalize(value),
			`@theme ${name}: expected ${value}, got ${themeMap.get(name)}`,
		);
	}
	const extra = [...themeMap.keys()].filter((name) => !(name in expected));
	assert(extra.length === 0, `@theme carries unexpected keys: ${extra}`);
	assert(
		themeMap.get("--font-mono")?.includes('"JetBrains Mono Variable"'),
		`--font-mono does not carry the knob's family: ${themeMap.get("--font-mono")}`,
	);

	const utilities = shadowUtilities(resolved);
	for (const level of SHADOW_LEVELS) {
		const body = declarationMap(blockBody(sheet, `@utility shadow-${level}`));
		assert(
			body.get("box-shadow") === normalize(utilities[`shadow-${level}`]),
			`@utility shadow-${level} does not carry its contract value`,
		);
	}
	assert(
		(sheet.match(/@utility /g) ?? []).length === SHADOW_LEVELS.length,
		"the sheet carries an extra @utility block",
	);

	const layer = blockBody(sheet, "@layer theme");
	const keySets: string[] = [];
	for (const mode of ["light", "dark"] as const) {
		const body = blockBody(layer, `@variant ${mode}`);
		assert(
			!body.includes("color-scheme"),
			`@variant ${mode} carries a color-scheme declaration`,
		);
		const colors = declarationMap(body);
		const expectedMode = modeTokens(resolved, mode);
		assert(
			colors.size === PER_MODE_COLORS.length,
			`@variant ${mode} carries ${colors.size} keys, expected ${PER_MODE_COLORS.length}`,
		);
		for (const token of PER_MODE_COLORS) {
			assert(
				colors.get(`--color-${token}`) === expectedMode[token],
				`@variant ${mode} ${token}: expected ${expectedMode[token]}, got ${colors.get(`--color-${token}`)}`,
			);
		}
		keySets.push([...colors.keys()].sort().join(" "));
	}
	assert(keySets[0] === keySets[1], "the two @variant key sets differ");
	const variantNames = new Set(
		[...sheet.matchAll(/@variant ([a-z-]+)/g)].map((match) => match[1]),
	);
	assert(
		variantNames.size === 2 &&
			variantNames.has("light") &&
			variantNames.has("dark"),
		`expected exactly the light and dark variants, got: ${[...variantNames]}`,
	);

	const indexSource = readFileSync(resolve(pkgDir, "src/index.ts"), "utf8");
	for (const src of SOURCES) {
		assert(sheet.includes(`@source "${src}";`), `no @source for ${src}`);
		assert(
			indexSource.includes(`"${src}"`),
			`src/index.ts does not name the ${src} source`,
		);
	}
	return `${Object.keys(expected).length} @theme keys behind the ${ZEROED_NAMESPACES.length} resets, ${SHADOW_LEVELS.length} shadow utilities, 2 equal variant blocks of ${PER_MODE_COLORS.length}, 3 pinned sources`;
});

check("a4", "the schema rejects off-contract keys by name", () => {
	const color = nativeUiOptionsSchema.safeParse({
		theme: {
			overrides: { colors: { light: { primary: "oklch(0.5 0.1 100)" } } },
		},
	});
	assert(!color.success, "an off-contract color token was accepted");
	assert(
		color.error.issues.some(
			(issue) =>
				issue.path.includes("primary") || issue.message.includes("primary"),
		),
		`no zod issue names "primary": ${JSON.stringify(color.error.issues)}`,
	);

	const scale = nativeUiOptionsSchema.safeParse({
		theme: { overrides: { scales: { "--radius-lg": "16px" } } },
	});
	assert(!scale.success, "an off-contract scale key was accepted");
	assert(
		scale.error.issues.some(
			(issue) =>
				issue.path.includes("--radius-lg") ||
				issue.message.includes("--radius-lg"),
		),
		`no zod issue names "--radius-lg": ${JSON.stringify(scale.error.issues)}`,
	);

	const { send: _send, ...short } = ENGLISH;
	const words = nativeUiOptionsSchema.safeParse({ words: short });
	assert(!words.success, "a words object missing a key was accepted");
	assert(
		words.error.issues.some((issue) => issue.path.includes("send")),
		`no zod issue names "send": ${JSON.stringify(words.error.issues)}`,
	);
	assert(
		nativeUiOptionsSchema.safeParse({ words: ENGLISH }).success,
		"the English words were rejected",
	);
	return "primary, --radius-lg and a missing word rejected, each named in its issue";
});

check("a5", "a knob move touches only its roles", () => {
	const moved = emit({ accentHue: 30 });
	const before = sheet.split("\n");
	const after = moved.split("\n");
	assert(
		before.length === after.length,
		"the sheets differ in line count under a knob move",
	);
	const diffs: number[] = [];
	before.forEach((line, index) => {
		if (line !== after[index]) diffs.push(index);
	});
	assert(diffs.length > 0, "accentHue: 30 changed nothing");
	for (const index of diffs) {
		const line = before[index] ?? "";
		assert(
			/--color-(tint|avatar-\d):/.test(line) &&
				/--color-(tint|avatar-\d):/.test(after[index] ?? ""),
			`a line off tint and the avatar ladder moved: ${line} -> ${after[index]}`,
		);
	}
	return `${diffs.length} lines moved, every one a --color-tint or --color-avatar-* declaration`;
});

check("a7", "uniwind's own compiler consumes the sheet", () => {
	const compiledCss = pipeline();
	const light = themeScope(compiledCss, "light");
	const dark = themeScope(compiledCss, "dark");

	const fontSize = styleValue(compiledCss, "text-title", "fontSize", light);
	assert(
		fontSize === Number.parseFloat(resolved.scales["--text-title"]),
		`text-title fontSize: ${fontSize}`,
	);
	const lineHeight = styleValue(compiledCss, "text-title", "lineHeight", light);
	assert(
		lineHeight === Number.parseFloat(resolved.scales["--leading-title"]),
		`text-title lineHeight: ${lineHeight}`,
	);
	const letterSpacing = styleValue(
		compiledCss,
		"text-title",
		"letterSpacing",
		light,
	);
	assert(
		typeof letterSpacing === "number" && letterSpacing < 0,
		`text-title letterSpacing: ${letterSpacing}`,
	);

	const boxShadow = styleValue(compiledCss, "shadow-float", "boxShadow", light);
	// uniwind folds the rgba color to hex; the offsets and blur survive.
	assert(
		typeof boxShadow === "string" && boxShadow.startsWith("0 7 18"),
		`shadow-float boxShadow: ${boxShadow}`,
	);

	const canvasLight = styleValue(
		compiledCss,
		"bg-canvas",
		"backgroundColor",
		light,
	);
	const canvasDark = styleValue(
		compiledCss,
		"bg-canvas",
		"backgroundColor",
		dark,
	);
	assert(
		typeof canvasLight === "string" &&
			typeof canvasDark === "string" &&
			canvasLight !== canvasDark,
		`bg-canvas does not switch: ${canvasLight} / ${canvasDark}`,
	);

	const accent = styleValue(compiledCss, "bg-accent", "backgroundColor", light);
	const ink = styleValue(compiledCss, "text-ink", "color", light);
	assert(accent === ink, `alias law broken: bg-accent ${accent}, ink ${ink}`);

	const alive = RETIRED.filter(
		(name) => compiledCss.stylesheet[name] !== undefined,
	);
	assert(
		alive.length === 0,
		`retired classes survive the pipeline: ${alive.join(", ")}`,
	);
	return `text-title {${fontSize}/${lineHeight}}, bg-canvas ${canvasLight} light / ${canvasDark} dark, alias law holds, ${RETIRED.length} retired absent`;
});

check("a6", "the build resolves the inventory and kills the retired", () => {
	const roster = FAMILIES.map((family) => family.name).join(" ");
	assert(roster === FAMILY_ROSTER, `the family roster drifted: ${roster}`);
	assert(rule(built, "px-5"), "px-5 emitted no rule");
	const dead = [...INVENTORY].filter((name) => !emitted(built, name));
	assert(
		dead.length === 0,
		`matrix classes the build never resolves: ${dead.sort().join(", ")}`,
	);
	const missing = NATIVE_OVERLAYS.filter((name) => !emitted(built, name));
	assert(
		missing.length === 0,
		`overlay classes that compile to nothing: ${missing.join(", ")}`,
	);
	const alive = RETIRED.filter((name) => emitted(built, name));
	assert(
		alive.length === 0,
		`retired classes still compile: ${alive.join(", ")}`,
	);
	return `${INVENTORY.size} matrix classes via the ui-core source root, ${NATIVE_OVERLAYS.length} overlays resolve, ${RETIRED.length} retired emit nothing`;
});

check("a8", "every named --color-* token is an emitted @theme key", () => {
	const files = walk(resolve(pkgDir, "src"), /\.(ts|tsx|css)$/);
	const orphans = new Set<string>();
	let named = 0;
	for (const path of files) {
		const source = readFileSync(path, "utf8");
		for (const match of source.matchAll(/--color-[a-z0-9-]+/g)) {
			named++;
			if (!themeMap.has(match[0])) orphans.add(match[0]);
		}
	}
	assert(named > 0, "no --color-* reference found anywhere in src");
	assert(
		orphans.size === 0,
		`named tokens the @theme block does not emit: ${[...orphans].sort().join(", ")}`,
	);
	return `${named} --color-* references across ${files.length} files, every one emitted`;
});

check("b5", "the overlay allowlist mirrors the swept sources", () => {
	const swept = sourceClasses();
	assert(swept.size > 0, "no class was enumerated from src/ui");
	const missing = [...swept].filter((name) => !NATIVE_OVERLAYS.includes(name));
	assert(
		missing.length === 0,
		`the sources name classes the allowlist lacks: ${missing.sort().join(", ")}`,
	);
	const stale = NATIVE_OVERLAYS.filter((name) => !swept.has(name));
	assert(
		stale.length === 0,
		`the allowlist carries classes no source names: ${stale.sort().join(", ")}`,
	);
	return `${swept.size} classes enumerated from src/ui, allowlist equal`;
});

// ── The closure ─────────────────────────────────────────────────────

const COMPONENT_DIR = resolve(pkgDir, "src/ui/components");
const COMPONENT_FILES = walk(COMPONENT_DIR, /\.(ts|tsx)$/);

function blank(span: string): string {
	return span.replace(/[^\n]/g, " ");
}

function withoutComments(source: string): string {
	return source
		.split("\n")
		.map((line) => (/^\s*(\/\/|\/\*|\*)/.test(line) ? "" : line))
		.join("\n");
}

function codeOf(source: string): string {
	return withoutComments(source).replace(/"[^"\n]*"/g, blank);
}

check(
	"b6",
	"every component closes through Closed and no channel survives",
	() => {
		const hits: string[] = [];
		for (const path of COMPONENT_FILES) {
			const raw = readFileSync(path, "utf8");
			const rawLines = raw.split("\n");
			const name = relative(pkgDir, path);
			const flag = (haystack: string, offset: number, why: string): void => {
				const line = haystack.slice(0, offset).split("\n").length;
				const text = (rawLines[line - 1] ?? "").trim();
				hits.push(`${name}:${line}: ${why}: ${text}`);
			};
			if (path.endsWith("index.tsx") && !raw.includes("extends Closed")) {
				hits.push(`${name}: the props type does not extend Closed`);
			}
			const code = codeOf(raw);
			for (const match of code.matchAll(
				/\b(?:[a-zA-Z]*[cC]lassName|style)\?:\s*(?!never\b)\S+/g,
			)) {
				flag(code, match.index ?? 0, "an open declaration");
			}
			// The component's own JSX class attributes are the one permitted form;
			// blank them, then no class channel token may remain.
			const permitted = code.replace(/\b[a-zA-Z]*[cC]lassName=/g, blank);
			for (const match of permitted.matchAll(/\b[a-zA-Z]*[cC]lassName\b/g)) {
				flag(permitted, match.index ?? 0, "a surviving class channel");
			}
			for (const match of code.matchAll(
				/\b(?:props|rest|local|others|merged)\.(?:className|style)\b/g,
			)) {
				flag(code, match.index ?? 0, "a props-sourced class value");
			}
			for (const match of withoutComments(raw).matchAll(
				/"[a-zA-Z]*[cC]lassName"/g,
			)) {
				flag(
					withoutComments(raw),
					match.index ?? 0,
					"a quoted closed-channel token",
				);
			}
		}
		assert(hits.length === 0, `the closure leaks:\n  ${hits.join("\n  ")}`);
		return `${COMPONENT_FILES.length} component files: every props type extends Closed, no surviving channel token, no props-sourced class`;
	},
);

check("b7", "the closure fixture proves every prop at the type layer", () => {
	const fixturePath = resolve(fixtureDir, "closure.tsx");
	const source = readFileSync(fixturePath, "utf8");
	const directives = source.match(/@ts-expect-error/g) ?? [];
	const components = rosterEntries().length;
	assert(
		directives.length >= components * 7,
		`only ${directives.length} @ts-expect-error sites for ${components} components`,
	);
	for (const token of [
		'className="x"',
		"style={{",
		'class="x"',
		"classList={{}}",
		'colorClassName="text-ink"',
		'placeholderTextColorClassName="text-ink"',
		'selectionColorClassName="text-ink"',
	]) {
		assert(source.includes(token), `the fixture never passes ${token}`);
	}
	for (const dir of readdirSync(COMPONENT_DIR)) {
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

check("b-roster", "every component carries exactly its roster props", () => {
	const project = new Project({
		tsConfigFilePath: resolve(pkgDir, "tsconfig.json"),
		skipAddingFilesFromTsConfig: true,
	});
	const dirs = new Set(readdirSync(COMPONENT_DIR));
	const seen = new Set<string>();
	let props = 0;
	for (const [, name, expected] of rosterEntries()) {
		const dir = componentDir(name);
		seen.add(dir);
		const file = resolve(COMPONENT_DIR, dir, "index.tsx");
		assert(
			dirs.has(dir) && existsSync(file),
			`${name}: no src/ui/components/${dir}/index.tsx`,
		);
		const sourceFile = project.addSourceFileAtPath(file);
		const exported = sourceFile.getExportedDeclarations();
		assert(
			exported.has(name),
			`${name}: components/${dir} does not export ${name}`,
		);
		const propsDecl = exported.get(`${name}Props`)?.[0];
		assert(
			propsDecl,
			`${name}: components/${dir} does not export ${name}Props`,
		);
		// A union (Sheet's two shapes) is read member by member. A prop is
		// closed only when every declaration of it is `never`; Sheet's `submit`
		// is `never` in one member and a value in the other, so it stays open.
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
	return `${seen.size} components, ${props} props, every one the roster's, every style channel closed`;
});

check("b-words", "no word is drawn from a literal", () => {
	const hits: string[] = [];
	for (const path of COMPONENT_FILES) {
		const source = withoutComments(readFileSync(path, "utf8"));
		const name = relative(pkgDir, path);
		// JSX text: letters between a `>` and a `<`, on one line or on a line of
		// their own, outside braces.
		for (const match of source.matchAll(
			/(?<![=\w])>[ \t]*[^<>{}\n]*[A-Za-z][^<>{}\n]*[ \t]*<|(?<![=\w])>[ \t]*\n[ \t]*[A-Za-z][^<>{}\n]*\n[ \t]*</g,
		)) {
			const line = source.slice(0, match.index).split("\n").length;
			hits.push(`${name}:${line}: JSX text ${JSON.stringify(match[0].trim())}`);
		}
		for (const match of source.matchAll(/accessibilityLabel="[^"]*"/g)) {
			const line = source.slice(0, match.index).split("\n").length;
			hits.push(`${name}:${line}: ${match[0]}`);
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

check("b-nouns", "no product noun in src", () => {
	const pattern = new RegExp(`\\b(${PRODUCT_NOUNS.join("|")})\\b`, "i");
	const hits: string[] = [];
	for (const path of walk(resolve(pkgDir, "src"), /\.(ts|tsx)$/)) {
		const lines = withoutComments(readFileSync(path, "utf8")).split("\n");
		lines.forEach((line, index) => {
			const match = pattern.exec(line);
			if (match)
				hits.push(`${relative(pkgDir, path)}:${index + 1}: ${match[0]}`);
		});
	}
	assert(hits.length === 0, `a product noun survives:\n  ${hits.join("\n  ")}`);
	return `${PRODUCT_NOUNS.length} nouns absent from src`;
});

check("b8", "the build-step contribution wires the real gate", () => {
	const source = readFileSync(resolve(pkgDir, "src/index.ts"), "utf8");
	const start = source.indexOf("cliSlots.buildSteps.contribute");
	assert(start >= 0, "src/index.ts contributes no build step");
	const end = source.indexOf("})),", start);
	assert(end >= 0, "the build-step contribution never closes");
	const contribution = source.slice(start, end);
	for (const pin of [
		'name: "native-ui-geometry-gate"',
		'phase: "pre"',
		"run: () => runGeometryGate(ctx.cwd)",
	]) {
		assert(contribution.includes(pin), `the contribution lacks ${pin}`);
	}
	assert(
		source.includes('from "./node/gate.ts"'),
		"src/index.ts does not import ./node/gate",
	);
	assert(
		!source.includes("ui-core/gate"),
		"src/index.ts touches the gate subpath",
	);
	const gateSource = readFileSync(resolve(pkgDir, "src/node/gate.ts"), "utf8");
	assert(
		gateSource.includes("await import(") &&
			gateSource.includes('"@fcalell/ui-core/gate"'),
		"gate.ts does not dynamic-import the scanner",
	);
	assert(
		!gateSource.includes('from "@fcalell/ui-core/gate"'),
		"gate.ts imports the gate subpath statically",
	);
	assert(
		gateSource.includes("NATIVE_GEOMETRY_HOSTS"),
		"gate.ts does not scan with the native host list",
	);
	// The words provider lands in the entry only when the consumer set words.
	assert(
		source.includes('named: ["WordsProvider"]') &&
			source.includes("if (!opts.words) return undefined;"),
		"src/index.ts does not contribute the WordsProvider on the words option",
	);
	return "one pre step, pinned name, run wired to runGeometryGate(ctx.cwd), scanner dynamic-imported, words provider gated";
});

check("b9", "the gate passes geometry and throws on the look", () => {
	for (const file of [
		"pass/src/screen.tsx",
		"pass/src/ui/look.tsx",
		"fail/src/screen.tsx",
	]) {
		assert(
			existsSync(resolve(gateFixtureDir, file)),
			`fixture ${file} is missing: is the gate tree tracked?`,
		);
	}
	const look = readFileSync(
		resolve(gateFixtureDir, "pass/src/ui/look.tsx"),
		"utf8",
	);
	assert(
		look.includes("flex-1 bg-canvas"),
		"the ui/ carve-out fixture lost its look",
	);
	assert(
		gateOutcomes.get("pass") === "clean",
		`the pass tree reported: ${String(gateOutcomes.get("pass"))}`,
	);
	assert(
		!existsSync(resolve(gateFixtureDir, "empty/src")),
		"the empty tree grew a src/",
	);
	assert(
		gateOutcomes.get("empty") === "clean",
		`the src-less tree reported: ${String(gateOutcomes.get("empty"))}`,
	);
	const failure = gateOutcomes.get("fail");
	assert(
		failure instanceof StackError,
		`the fail tree did not throw a StackError: ${String(failure)}`,
	);
	assert(failure.code === "GEOMETRY_GATE", `code: ${failure.code}`);
	const expected = [
		'src/screen.tsx:2  "bg-canvas" is not in the geometry vocabulary',
		'src/screen.tsx:3  class attribute on non-host tag "Group"',
	].join("\n");
	assert(
		failure.message === expected,
		`unexpected message:\n${failure.message}`,
	);
	return "pass and src-less trees clean, the fail tree throws GEOMETRY_GATE naming both violations in one run";
});

// ── Report ──────────────────────────────────────────────────────────

report();
