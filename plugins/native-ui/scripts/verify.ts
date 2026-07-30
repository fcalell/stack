// Reproduction harness for the `.stack/global.css` emission and the uniwind
// pipeline that consumes it.
//
//   pnpm --filter @fcalell/plugin-native-ui verify
//
// Every Run A acceptance criterion of `.helm/board/epics/001-ui-core/` story
// 04 is one check below, so a failing check id traces back to a criterion.
// The sheet is rendered via `aggregateGlobalCss` with default options (no
// consumer project exists to drive the graph), then compiled twice: through
// uniwind's own dist compiler (the exact code path Metro runs, minus a
// device), and through a Tailwind CLI build that decides what the vocabulary
// resolves to. The pipeline check runs before the Tailwind build on purpose:
// it re-stamps uniwind's mutable in-package `uniwind.css` artifact from our
// own emission (machine-shared pnpm-store state another project may have
// stamped last), so the build reads a deterministic artifact.
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
import { deriveTheme } from "@fcalell/ui-core/derive";
import {
	modeTokens,
	shadowUtilities,
	themeTokens,
} from "@fcalell/ui-core/emit";
import {
	assert,
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
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { aggregateGlobalCss } from "../src/node/codegen.ts";
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

// The retired vocabulary: candidates the components still carry until Run B
// sweeps them, and the shadcn-era names a consumer might type. The namespace
// resets must compile every one of them to nothing.
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

// The target (post-sweep) native overlay allowlist: the platform classes the
// Run B components compose over the matrix cells — the decision-6 press
// grounds, display/alignment overlays, and the sweep's mapped contract
// classes. Deliberately not read from the current sources, which still carry
// retirees until Run B lands; B5 trues this list up against the swept
// components.
const NATIVE_OVERLAYS = [
	// decision-6 press grounds + the pressed label ink
	"active:bg-ink-3",
	"active:bg-danger-soft",
	"active:bg-surface-3",
	"text-danger",
	// display / alignment (RN is flex by default; these ride the overlays)
	"flex-1",
	"flex-row",
	"items-center",
	"justify-center",
	// state overlays
	"disabled:opacity-50",
	// the sweep's mapped targets (decision 12)
	"text-micro",
	"text-caption",
	"text-callout",
	"text-body",
	"text-h3",
	"rounded-md",
	"rounded-xl",
	"rounded-full",
	"rounded-sheet",
	"rounded-t-sheet",
	"text-oncover-fg",
	"text-accent-ink",
	"bg-accent",
	"bg-scrim",
	"text-ink-3",
	"min-h-11",
	"font-semibold",
	"gap-stack",
	"gap-row",
	"p-card",
	"p-4",
];

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
	const files: string[] = [];
	const walk = (dir: string): void => {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			const path = resolve(dir, entry.name);
			if (entry.isDirectory()) walk(path);
			else if (/\.(ts|tsx|css)$/.test(entry.name)) files.push(path);
		}
	};
	walk(resolve(pkgDir, "src"));

	const orphans = new Set<string>();
	let named = 0;
	for (const path of files) {
		const source = readFileSync(path, "utf8");
		for (const match of source.matchAll(/var\(\s*(--color-[a-z0-9-]+)/g)) {
			const name = match[1];
			if (!name) continue;
			named++;
			if (!themeMap.has(name)) orphans.add(name);
		}
	}
	assert(
		orphans.size === 0,
		`named tokens the @theme block does not emit: ${[...orphans].sort().join(", ")}`,
	);
	return `${named} var(--color-*) references across ${files.length} files, every one emitted`;
});

// ── Report ──────────────────────────────────────────────────────────

report();
