// Reproduction harness for the `.stack/global.css` emission and the uniwind
// pipeline that consumes it.
//
//   pnpm --filter @fcalell/plugin-native-ui verify
//
// Every machine-checkable acceptance criterion of `.helm/board/epics/001-ui-core/`
// stories 04 and 05 (the native run) is one check below, so a failing check id
// traces back to a criterion.
// The sheet is rendered via `aggregateGlobalCss` with default options (no
// consumer project exists to drive the graph), then compiled twice: through
// uniwind's own dist compiler (the exact code path Metro runs, minus a
// device), and through a Tailwind CLI build that decides what the vocabulary
// resolves to. The pipeline check runs before the Tailwind build on purpose:
// it re-stamps uniwind's mutable in-package `uniwind.css` artifact from our
// own emission (machine-shared pnpm-store state another project may have
// stamped last), so the build reads a deterministic artifact.
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
	PER_MODE_COLORS,
	SHADOW_LEVELS,
	TYPE_ROLES,
	ZEROED_NAMESPACES,
} from "@fcalell/ui-core/tokens";
import {
	BUTTON_MUTED_LABEL,
	badge,
	badgeDot,
	badgeLabel,
	button,
	buttonLabel,
	buttonMuted,
	card,
	field,
	rhythm,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { aggregateGlobalCss } from "../src/node/codegen.ts";
import { runGeometryGate } from "../src/node/gate.ts";
import {
	type NativeFontEntry,
	nativeUiOptionsSchema,
	type Theme,
} from "../src/types.ts";

const here = dirname(fileURLToPath(import.meta.url));
const pkgDir = resolve(here, "..");
const fixtureDir = resolve(here, "fixture");

// The production `@source` roots, restated as a second opinion; a3 pins
// `src/index.ts` to the same three strings so the two cannot drift. The
// fixture mirrors the consumer layout (global.css one level under the root,
// the packages linked into node_modules), so the same strings resolve here.
const SOURCES = [
	"../src",
	"../node_modules/@fcalell/plugin-native-ui/src",
	"../node_modules/@fcalell/ui-core/src",
];

// The retired vocabulary: names the components no longer carry, and the
// shadcn-era names a consumer might type. The namespace resets must compile
// every one of them to nothing.
const RETIRED = [
	"text-sm",
	"text-base",
	"text-xs",
	"text-lg",
	"rounded-lg",
	"rounded-2xl",
	"text-white",
	"bg-primary",
	"bg-black/50",
];

// The native overlay allowlist: every class the swept `src/ui` sources name —
// the decision-6 press grounds, display/alignment overlays, and the sweep's
// mapped contract classes. Spelled out as a second opinion; check b5 asserts
// it equals the set enumerated from the sources, so a component edit that
// adds or drops a class fails until the list moves with it.
const NATIVE_OVERLAYS = [
	// decision-6 press grounds + the pressed label ink
	"active:bg-danger-soft",
	"active:bg-ink-3",
	"active:bg-surface-3",
	"text-danger",
	// contract colors
	"bg-accent",
	"bg-canvas",
	"bg-edge",
	"bg-ink-1",
	"bg-scrim",
	"bg-surface",
	"border-canvas",
	"border-danger",
	"border-edge",
	"border-ok",
	"text-accent-ink",
	"text-canvas",
	"text-ink-1",
	"text-ink-2",
	"text-ink-3",
	"text-interactive",
	"text-oncover-fg",
	// type roles and weights
	"text-body",
	"text-callout",
	"text-caption",
	"text-h3",
	"text-micro",
	"font-bold",
	"font-mono",
	"font-normal",
	"font-semibold",
	"tracking-widest",
	"uppercase",
	// radius rungs
	"rounded-full",
	"rounded-md",
	"rounded-sheet",
	"rounded-t-sheet",
	// display / alignment (RN is flex by default; these ride the overlays)
	"flex-1",
	"flex-row",
	"items-baseline",
	"items-center",
	"justify-center",
	"justify-end",
	"justify-start",
	"self-center",
	"self-start",
	"self-stretch",
	"overflow-hidden",
	"text-center",
	// numeric dimensions and spacing (the numeric base is live by design)
	"border",
	"border-2",
	"border-t",
	"gap-1",
	"gap-1.5",
	"gap-2",
	"gap-2.5",
	"gap-3",
	"gap-3.5",
	"h-1",
	"h-1.5",
	"h-12",
	"h-6",
	"h-9",
	"h-full",
	"h-px",
	"-ml-2",
	"mb-1.5",
	"mb-3",
	"mb-3.5",
	"min-h-12",
	"min-h-20",
	"min-w-8",
	"mt-4",
	"opacity-40",
	"p-5",
	"pb-8",
	"pt-3",
	"px-3",
	"px-3.5",
	"px-4",
	"px-6",
	"py-2",
	"py-3",
	"w-10",
	"w-12",
	"w-9",
	"w-full",
	"w-px",
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
// counts as a class only when its root is named here, so prose strings
// ("button", "#2A6FDB") never reach the build assertion. Arbitrary-value
// tokens (`w-[104px]`) are chrome dimensions outside the class inventory.
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
	"m",
	"mb",
	"mt",
	"ml",
	"mr",
	"-ml",
	"h",
	"w",
	"min-h",
	"min-w",
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
];
const CLASS_EXACT = ["border", "uppercase"];

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

function emit(theme?: Theme, fonts: NativeFontEntry[] = []): string {
	return aggregateGlobalCss({
		resolved: deriveTheme(theme),
		fonts,
		sources: SOURCES,
		extraImports: [],
	});
}

const resolved = deriveTheme();
const sheet = emit();
const themeDecls = declarations(blockBody(sheet, "@theme"));
const themeMap = new Map(themeDecls);

// ── The matrices, called for their full class inventory ─────────────

const TEXT_VARIANTS = [...TYPE_ROLES, "rowtitle"];
const TEXT_TONES = [
	"ink-1",
	"ink-2",
	"ink-3",
	"ink-4",
	"brand",
	"interactive",
	"ok",
	"warn",
	"danger",
	"accent-ink",
	"oncover-fg",
	"oncover-ink",
];
const BADGE_TONES = [
	"neutral",
	"brand",
	"interactive",
	"ok",
	"warn",
	"danger",
	"oncover",
];
const BUTTON_AXES = {
	emphasis: ["primary", "secondary", "tertiary"],
	tone: ["neutral", "danger"],
	size: ["sm", "md", "lg"],
};

// The axis values are spelled here as a second opinion; every cell string is
// produced by calling the cva, never written out.
const FAMILIES: Family[] = [
	{ name: "BUTTON", cva: button as Family["cva"], axes: BUTTON_AXES },
	{
		name: "BUTTON_LABEL",
		cva: buttonLabel as Family["cva"],
		axes: BUTTON_AXES,
	},
	{
		name: "BUTTON_MUTED",
		cva: buttonMuted as Family["cva"],
		axes: { emphasis: BUTTON_AXES.emphasis },
	},
	{
		name: "TEXT",
		cva: text as Family["cva"],
		axes: { variant: TEXT_VARIANTS, tone: TEXT_TONES },
	},
	{
		name: "TEXT_STRONG",
		cva: textStrong as Family["cva"],
		axes: { variant: TEXT_VARIANTS },
	},
	{ name: "BADGE", cva: badge as Family["cva"], axes: { tone: BADGE_TONES } },
	{
		name: "BADGE_LABEL",
		cva: badgeLabel as Family["cva"],
		axes: { tone: BADGE_TONES },
	},
	{ name: "BADGE_DOT", cva: badgeDot as Family["cva"], axes: {} },
	{
		name: "CARD",
		cva: card as Family["cva"],
		axes: { padding: ["card", "none"], ring: ["none", "warn"] },
	},
	{
		name: "FIELD",
		cva: field as Family["cva"],
		axes: {
			state: ["default", "focused", "error"],
			layout: ["input", "row"],
		},
	},
	{
		name: "RHYTHM",
		cva: rhythm as Family["cva"],
		axes: { unit: ["section", "stack", "row", "pair"] },
	},
];

// Every class every cva can emit, over the cartesian product of its own axes,
// plus the class-bearing constants. The Tailwind build must resolve each one
// through the ui-core `@source` root — none of them rides the probe file.
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
	for (const name of classes(BUTTON_MUTED_LABEL)) out.add(name);
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
		// What `transformer.ts` does on every build: regenerate the package's own
		// `uniwind.css` artifact from our entry stylesheet, then compile.
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

// A variant class emits as `.active\:bg-ink-3:active`, so the selector is
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

// The real `runGeometryGate` body executes here; this suite never builds a
// graph (no consumer project exists to drive it), so b8 pins the contribution
// wiring in source instead.
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
		"the sheet carries a fourth @utility block",
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
	const variants = new Set(
		[...sheet.matchAll(/@variant ([a-z-]+)/g)].map((match) => match[1]),
	);
	assert(
		variants.size === 2 && variants.has("light") && variants.has("dark"),
		`expected exactly the light and dark variants, got: ${[...variants]}`,
	);

	// The `@source` roots, in the sheet and pinned in index.ts so the fixture's
	// restated list cannot drift from production.
	const indexSource = readFileSync(resolve(pkgDir, "src/index.ts"), "utf8");
	for (const src of SOURCES) {
		assert(sheet.includes(`@source "${src}";`), `no @source for ${src}`);
		assert(
			indexSource.includes(`"${src}"`),
			`src/index.ts does not name the ${src} source`,
		);
	}
	return `${Object.keys(expected).length} @theme keys behind the ${ZEROED_NAMESPACES.length} resets, 3 shadow utilities, 2 equal variant blocks, 3 pinned sources`;
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
	return "primary and --radius-lg rejected, each named in its issue";
});

check("a5", "a knob move touches only the brand family", () => {
	const moved = emit({ knobs: { brandHue: 30 } });
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
	assert(diffs.length > 0, "brandHue: 30 changed nothing");
	for (const index of diffs) {
		assert(
			before[index]?.includes("--color-brand") &&
				after[index]?.includes("--color-brand"),
			`a non-brand line moved: ${before[index]} -> ${after[index]}`,
		);
	}
	return `${diffs.length} lines moved, every one a --color-brand* declaration`;
});

check("a7", "uniwind's own compiler consumes the sheet", () => {
	const compiledCss = pipeline();
	const light = themeScope(compiledCss, "light");
	const dark = themeScope(compiledCss, "dark");

	const fontSize = styleValue(compiledCss, "text-h1", "fontSize", light);
	assert(
		fontSize === Number.parseFloat(resolved.scales["--text-h1"]),
		`text-h1 fontSize: ${fontSize}`,
	);
	const lineHeight = styleValue(compiledCss, "text-h1", "lineHeight", light);
	assert(
		lineHeight === Number.parseFloat(resolved.scales["--leading-h1"]),
		`text-h1 lineHeight: ${lineHeight}`,
	);
	const letterSpacing = styleValue(
		compiledCss,
		"text-h1",
		"letterSpacing",
		light,
	);
	assert(
		typeof letterSpacing === "number" && letterSpacing < 0,
		`text-h1 letterSpacing: ${letterSpacing}`,
	);

	const boxShadow = styleValue(compiledCss, "shadow-1", "boxShadow", light);
	assert(
		typeof boxShadow === "string" && boxShadow.includes(","),
		`shadow-1 boxShadow: ${boxShadow}`,
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
	const ink = styleValue(compiledCss, "text-ink-1", "color", light);
	assert(accent === ink, `alias law broken: bg-accent ${accent}, ink-1 ${ink}`);

	const alive = RETIRED.filter(
		(name) => compiledCss.stylesheet[name] !== undefined,
	);
	assert(
		alive.length === 0,
		`retired classes survive the pipeline: ${alive.join(", ")}`,
	);
	return `text-h1 {${fontSize}/${lineHeight}}, bg-canvas ${canvasLight} light / ${canvasDark} dark, alias law holds, ${RETIRED.length} retired absent`;
});

check("a6", "the build resolves the inventory and kills the retired", () => {
	// The escaping oracle: a class that compiles and carries a `.` must be
	// found, or every dotted cell reports a false miss.
	assert(rule(built, "px-3.5"), "px-3.5 emitted no rule");
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

	// Context-free on purpose: a token reaches the runtime through
	// `var(--color-*)` in CSS as easily as through a quoted name handed to
	// `useCSSVariable`, and no single wrapper pattern sees both. The spinner's
	// `--color-${tone}` template evades this scan rather than tripping it
	// (nothing follows the prefix for the regex to match); harmless because
	// `ContentTone` is token-typed and ui-core pins every member.
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
	const enumerated = sourceClasses();
	assert(enumerated.size > 0, "no class was enumerated from src/ui");
	const missing = [...enumerated].filter(
		(name) => !NATIVE_OVERLAYS.includes(name),
	);
	assert(
		missing.length === 0,
		`the sources name classes the allowlist lacks: ${missing.sort().join(", ")}`,
	);
	const stale = NATIVE_OVERLAYS.filter((name) => !enumerated.has(name));
	assert(
		stale.length === 0,
		`the allowlist carries classes no source names: ${stale.sort().join(", ")}`,
	);
	return `${enumerated.size} classes enumerated from src/ui, allowlist equal`;
});

// ── The closure ─────────────────────────────────────────────────────

const COMPONENT_FILES = walk(
	resolve(pkgDir, "src/ui/components"),
	/\.(ts|tsx)$/,
);

// Every transformation below preserves the line structure (a comment line
// blanks to "", in-line spans blank to spaces), so a match offset in any
// transformed string still maps to the real source line and a hit can quote
// it verbatim instead of reconstructing text.
function blank(span: string): string {
	return span.replace(/[^\n]/g, " ");
}

// Comment lines drop (the closures are named in prose); string literals
// empty out, since a quoted value is data rather than a reachable channel.
function codeOf(source: string): string {
	return source
		.split("\n")
		.map((line) => (/^\s*(\/\/|\/\*|\*)/.test(line) ? "" : line))
		.join("\n")
		.replace(/"[^"\n]*"/g, blank);
}

check("b6", "every closed prop is ?: never and no channel survives", () => {
	const hits: string[] = [];
	for (const path of COMPONENT_FILES) {
		const raw = readFileSync(path, "utf8");
		const rawLines = raw.split("\n");
		const name = relative(pkgDir, path);
		// `haystack` is whichever transformed string the match came from; its
		// newlines are the source's, so the offset gives the real line number
		// and the hit quotes the actual source line.
		const flag = (haystack: string, offset: number, why: string): void => {
			const line = haystack.slice(0, offset).split("\n").length;
			const text = (rawLines[line - 1] ?? "").trim();
			hits.push(`${name}:${line}: ${why}: ${text}`);
		};
		// Decision 1 closes uniformly, so the declaration is demanded in every
		// component module instead of allow-listing exceptions.
		if (path.endsWith("index.tsx")) {
			for (const declaration of ["className?: never", "style?: never"]) {
				if (!raw.includes(declaration)) {
					hits.push(`${name}: no ${declaration} declaration`);
				}
			}
		}
		const code = codeOf(raw);
		// Every optional declaration of className, style, or any uniwind
		// *ClassName channel must be `?: never` (word-bounded, so an internal
		// `placeholderTextColorClassName="…"` attribute never false-positives).
		for (const match of code.matchAll(
			/\b(?:[a-zA-Z]*[cC]lassName|style)\?:\s*(?!never\b)\S+/g,
		)) {
			flag(code, match.index ?? 0, "an open declaration");
		}
		// The `?: never` declarations and the component's own JSX class
		// attributes are the two permitted forms; blank them, then no class
		// channel token may remain (a destructured `className`, a
		// props-sourced read inside cn(), a re-forward).
		const permitted = code
			.replace(/\b[a-zA-Z]*[cC]lassName\?:\s*never\b/g, blank)
			.replace(/\b[a-zA-Z]*[cC]lassName=/g, blank);
		for (const match of permitted.matchAll(/\b[a-zA-Z]*[cC]lassName\b/g)) {
			flag(permitted, match.index ?? 0, "a surviving class channel");
		}
		// No props-sourced class or style read under any destructure alias.
		for (const match of code.matchAll(
			/\b(?:props|rest|local|others|merged)\.(?:className|style)\b/g,
		)) {
			flag(code, match.index ?? 0, "a props-sourced class value");
		}
		// A quoted-key declaration (`"className"?: string`) plus bracket access
		// slips past every identifier scan above, so the quoted spelling is
		// banned outright. Comments drop; quotes have to survive, so this scan
		// runs on its own transform.
		const quoted = raw
			.split("\n")
			.map((line) => (/^\s*(\/\/|\/\*|\*)/.test(line) ? "" : line))
			.join("\n");
		for (const match of quoted.matchAll(/"[a-zA-Z]*[cC]lassName"/g)) {
			flag(quoted, match.index ?? 0, "a quoted closed-channel token");
		}
	}
	assert(hits.length === 0, `the closure leaks:\n  ${hits.join("\n  ")}`);
	return `${COMPONENT_FILES.length} component files: every declaration ?: never, no surviving channel token (quoted forms included), no props-sourced class`;
});

check("b7", "the closure fixture proves every prop at the type layer", () => {
	const fixturePath = resolve(fixtureDir, "closure.tsx");
	const source = readFileSync(fixturePath, "utf8");
	const directives = source.match(/@ts-expect-error/g) ?? [];
	assert(
		directives.length >= 90,
		`only ${directives.length} @ts-expect-error sites`,
	);
	for (const token of [
		'className="x"',
		"style={{",
		'colorClassName="text-ink-1"',
		'placeholderTextColorClassName="text-ink-1"',
		'selectionColorClassName="text-ink-1"',
		"backdropComponent",
		"containerComponent",
		"backgroundStyle",
		"onCheckedChange",
		'variant="success"',
		'color="#fff"',
	]) {
		assert(source.includes(token), `the fixture never passes ${token}`);
	}
	// Every component dir is reached through its public subpath, so the
	// closure is proven the way a consumer imports it.
	for (const dir of readdirSync(resolve(pkgDir, "src/ui/components"))) {
		assert(
			source.includes(`/components/${dir}"`),
			`the fixture never imports components/${dir}`,
		);
	}
	// tsc over the package (scripts/ is inside the include) proves every
	// directive fires and every un-annotated legal usage still compiles: a
	// reopened prop turns a directive unused and fails the run.
	execFileSync(binPath(pkgDir, "tsc"), ["--noEmit"], {
		cwd: pkgDir,
		stdio: "pipe",
	});
	return `${directives.length} closures under @ts-expect-error, tsc --noEmit exits 0`;
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
		source.includes('from "./node/gate"'),
		"src/index.ts does not import ./node/gate",
	);
	// ts-morph loads only when a build runs: the scanner reaches gate.ts
	// through a dynamic import, with the native host list.
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
	return "one pre step, pinned name, run wired to runGeometryGate(ctx.cwd), scanner dynamic-imported";
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
	// The pass tree's src/ui holds the same look the fail tree throws on, so
	// the clean pass is what proves the ui/ carve-out.
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
		'src/screen.tsx:3  class attribute on non-host tag "Text"',
	].join("\n");
	assert(
		failure.message === expected,
		`unexpected message:\n${failure.message}`,
	);
	return "pass and src-less trees clean, the fail tree throws GEOMETRY_GATE naming both violations in one run";
});

// ── Report ──────────────────────────────────────────────────────────

report();
