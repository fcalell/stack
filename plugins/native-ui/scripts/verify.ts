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
import { deriveTheme } from "@fcalell/ui-core/derive";
import {
	modeTokens,
	nativeMeasureTokens,
	raisedGroundTokens,
	roomMeasureTokens,
	roomTokens,
	roomUnitFor,
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
	tailwindBuild,
} from "@fcalell/ui-core/harness";
import {
	CLOSED_PROPS,
	componentDir,
	heldSpellings,
	rosterEntries,
} from "@fcalell/ui-core/roster";
import {
	arbitraryValues,
	childReads,
	contexts,
	datasets,
	type Hit,
	layoutMotion,
	measures,
	NATIVE_MEASURES,
	outsideList,
	sectionNests,
	typeProps,
} from "@fcalell/ui-core/structure";
import {
	COLOR_NAMES,
	COLORS,
	type ColorName,
	ENGLISH,
	HAIRLINE_PX,
	KNOB_DEFAULTS,
	SHADOW_LEVELS,
	STATUS_STATES,
	TYPE_ROLES,
	ZEROED_NAMESPACES,
} from "@fcalell/ui-core/tokens";
import * as variants from "@fcalell/ui-core/variants";
import { Node, Project } from "ts-morph";
import { aggregateGlobalCss } from "../src/node/codegen.ts";
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

// The retired vocabulary: the names the components no longer carry (the
// Stage 0 roles and rungs, and the shadcn-era names before them) and the
// names a consumer might type. The namespace resets must compile every one
// of them to nothing.
const RETIRED = [
	"text-sm",
	"text-base",
	"text-xs",
	"text-lg",
	"text-h1",
	"text-h3",
	"text-callout",
	"text-micro",
	"text-label",
	"text-mono",
	"rounded-lg",
	"rounded-2xl",
	"rounded-md",
	"rounded-xl",
	"rounded-group",
	"shadow-1",
	"shadow-2",
	"shadow-3",
	"shadow-sheet",
	"text-ink-1",
	"text-ink-2",
	"text-ink-3",
	"text-ink-4",
	"text-ink",
	"bg-tint",
	"bg-thumb",
	"bg-chip-1",
	"bg-surface-2",
	"bg-surface-3",
	"border-edge-2",
	"bg-brand",
	"text-interactive",
	"text-white",
	"bg-primary",
	"bg-black/50",
	// `gap-row` is missing on purpose: `row` is a size in the `--spacing-*`
	// namespace, so the utility resolves to the row height.
	"gap-stack",
	"gap-section",
	"p-inset",
	"min-h-floor",
	"w-rail",
	"px-list-x",
	"min-h-header",
];

// The native overlay allowlist: every class the swept `src/ui` sources name,
// spelled out as a second opinion; check b5 asserts it equals the set
// enumerated from the sources, so a component edit that adds or drops a class
// fails until the list moves with it.
const NATIVE_OVERLAYS = [
	"absolute",
	"active:bg-act-accent-press",
	"active:bg-act-danger-press",
	"active:bg-wash-press",
	"active:border-ink-body",
	"active:no-underline",
	"bg-act-accent-pending",
	"bg-act-danger-pending",
	"bg-edge",
	"bg-fill-disabled",
	"bg-ink-disabled",
	"bg-switch-off-hover",
	"bg-toggle-on-hover",
	"bg-transparent",
	"bg-wash-press",
	"border-edge",
	"border-t",
	"bottom-0",
	"flex-1",
	"flex-col",
	"flex-col-reverse",
	"flex-row",
	"flex-wrap",
	"gap-acts",
	"gap-inside",
	"gap-pair",
	"grow",
	"h-full",
	"h-line-body",
	"hidden",
	"inset-0",
	"inset-x-0",
	"items-baseline",
	"items-center",
	"items-end",
	"items-start",
	"items-stretch",
	"justify-between",
	"justify-center",
	"justify-end",
	"justify-start",
	"left-0",
	"left-full",
	"max-w-1/2",
	"max-w-4/5",
	"max-w-full",
	"max-w-measure-short",
	"min-h-0",
	"min-h-row",
	"min-h-row-2",
	"min-h-target",
	"min-w-0",
	"min-w-icon-meta",
	"min-w-target",
	"opacity-0",
	"overflow-hidden",
	"pb-card",
	"pb-inside",
	"pt-float",
	"pt-pair",
	"pt-rows",
	"px-card",
	"py-0",
	"py-pair",
	"py-rows",
	"relative",
	"right-0",
	"self-center",
	"self-end",
	"self-stretch",
	"self-start",
	"shrink",
	"size-full",
	"size-target",
	"text-center",
	"text-ink-body",
	"text-ink-disabled",
	"text-ink-meta",
	"text-left",
	"text-right",
	"top-0",
	"underline",
	"w-0",
	"w-2/3",
	"w-full",
	"w-icon-meta",
	"w-measure-short",
	"w-row",
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
	"no-underline",
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
const CHIPS = ["red", "amber", "green", "teal", "violet", "pink"];

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
		axes: {
			act: ["primary", "danger", "secondary", "destructive"],
			fit: ["body", "bar", "field"],
		},
	},
	{
		name: "BUTTON_LABEL",
		cva: variants.buttonLabel as Family["cva"],
		axes: { act: ["primary", "danger", "secondary", "destructive"] },
	},
	{
		name: "STATUS_DOT",
		cva: variants.statusDot as Family["cva"],
		axes: {
			state: STATUS_STATES.filter((state) => state !== "running"),
		},
	},
	{
		name: "CHIP",
		cva: variants.chip as Family["cva"],
		axes: { family: CHIPS, trailing: ["none", "remove"] },
	},
	{
		name: "CHIP_LABEL",
		cva: variants.chipLabel as Family["cva"],
		axes: { family: CHIPS },
	},
	{
		name: "FIELD",
		cva: variants.field as Family["cva"],
		axes: {
			fit: ["form", "bar"],
			trailing: ["none", "act"],
			state: ["rest", "error"],
		},
	},
	{
		name: "FIELD_VALUE",
		cva: variants.fieldValue as Family["cva"],
		axes: { kind: ["text", "search", "code"] },
	},
	{
		name: "TEXT_AREA",
		cva: variants.textArea as Family["cva"],
		axes: { state: ["rest", "error"] },
	},
	{
		name: "TEXT_AREA_BUDGET",
		cva: variants.textAreaBudget as Family["cva"],
		axes: { state: ["rest", "error"] },
	},
	{
		name: "OTP_BOX",
		cva: variants.otpBox as Family["cva"],
		axes: { state: ["rest", "error"] },
	},
	{
		name: "ROW",
		cva: variants.row as Family["cva"],
		axes: {
			lines: ["one", "two", "setting"],
			state: ["rest", "pressed", "selected"],
		},
	},
	{
		name: "SWITCH",
		cva: variants.switchTrack as Family["cva"],
		axes: { state: ["off", "on"] },
	},
	{
		name: "CHECKBOX",
		cva: variants.checkbox as Family["cva"],
		axes: { state: ["unchecked", "checked", "mixed"] },
	},
	{
		name: "SEGMENT",
		cva: variants.segment as Family["cva"],
		axes: { state: ["idle", "selected"] },
	},
	{
		name: "SEGMENT_LABEL",
		cva: variants.segmentLabel as Family["cva"],
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
		name: "PLACE_ROW",
		cva: variants.placeRow as Family["cva"],
		axes: {
			state: ["rest", "hover", "active", "selected", "selected-hover"],
		},
	},
	{
		name: "PLACE_ROW_GLYPH",
		cva: variants.placeRowGlyph as Family["cva"],
		axes: { state: ["rest", "selected"] },
	},
	{
		name: "PLACE_TAB",
		cva: variants.placeTab as Family["cva"],
		axes: { state: ["idle", "selected"] },
	},
	{
		name: "PLACE_TAB_LABEL",
		cva: variants.placeTabLabel as Family["cva"],
		axes: { state: ["idle", "selected"] },
	},
];

const FAMILY_ROSTER =
	"TEXT TEXT_STRONG BUTTON BUTTON_LABEL STATUS_DOT CHIP CHIP_LABEL FIELD FIELD_VALUE TEXT_AREA TEXT_AREA_BUDGET OTP_BOX ROW SWITCH CHECKBOX SEGMENT SEGMENT_LABEL BANNER DIFF_LINE MESSAGE AVATAR PLACE_ROW PLACE_ROW_GLYPH PLACE_TAB PLACE_TAB_LABEL";

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

// ── Criteria ────────────────────────────────────────────────────────

check("a3", "the emitted sheet has the contract shape", () => {
	const resets = themeDecls
		.slice(0, ZEROED_NAMESPACES.length)
		.map(([name]) => name);
	assert(
		resets.join(" ") === ZEROED_NAMESPACES.join(" "),
		`the namespace resets do not lead @theme: ${resets.join(" ")}`,
	);

	const expected = {
		...themeTokens(resolved),
		...nativeMeasureTokens(resolved),
		"--hairline": `${HAIRLINE_PX}px`,
	};
	for (const [name, value] of Object.entries(expected)) {
		assert(
			themeMap.get(name) === normalize(value),
			`@theme ${name}: expected ${value}, got ${themeMap.get(name)}`,
		);
	}
	const extra = [...themeMap.keys()].filter((name) => !(name in expected));
	assert(extra.length === 0, `@theme carries unexpected keys: ${extra}`);
	assert(
		themeMap.get("--font-mono")?.includes('"IBM Plex Mono"'),
		`--font-mono does not carry the knob's family: ${themeMap.get("--font-mono")}`,
	);

	const utilities = shadowUtilities();
	for (const level of SHADOW_LEVELS) {
		const body = declarationMap(blockBody(sheet, `@utility shadow-${level}`));
		for (const [property, value] of Object.entries(
			utilities[`shadow-${level}`],
		)) {
			assert(
				body.get(property) === normalize(value),
				`@utility shadow-${level} does not carry its contract ${property}`,
			);
		}
	}
	assert(
		declarationMap(blockBody(sheet, "@utility tabular-nums")).get(
			"font-variant-numeric",
		) === "tabular-nums",
		"@utility tabular-nums is not redeclared plain",
	);
	assert(
		(sheet.match(/@utility /g) ?? []).length === SHADOW_LEVELS.length + 1,
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
		const perMode = COLOR_NAMES.length + SHADOW_LEVELS.length;
		assert(
			colors.size === perMode,
			`@variant ${mode} carries ${colors.size} keys, expected ${perMode}`,
		);
		for (const [name, value] of Object.entries(expectedMode)) {
			assert(
				colors.get(name) === normalize(value),
				`@variant ${mode} ${name}: expected ${value}, got ${colors.get(name)}`,
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
	return `${Object.keys(expected).length} @theme keys behind the ${ZEROED_NAMESPACES.length} resets, ${SHADOW_LEVELS.length} shadow utilities and the plain tabular-nums, 2 equal variant blocks of ${COLOR_NAMES.length + SHADOW_LEVELS.length}, 3 pinned sources`;
});

check("a4", "the schema rejects off-contract keys by name", () => {
	// A theme sets a knob and never a token: a retired knob and a token
	// override are both unknown keys, each named in its issue.
	const knob = nativeUiOptionsSchema.safeParse({
		theme: { primary: "accent" },
	});
	assert(!knob.success, "a retired knob was accepted");
	assert(
		knob.error.issues.some(
			(issue) =>
				issue.path.includes("primary") || issue.message.includes("primary"),
		),
		`no zod issue names "primary": ${JSON.stringify(knob.error.issues)}`,
	);

	const token = nativeUiOptionsSchema.safeParse({
		theme: { overrides: { scales: { "--radius-lg": "16px" } } },
	});
	assert(!token.success, "a token override was accepted");
	assert(
		token.error.issues.some(
			(issue) =>
				issue.path.includes("overrides") || issue.message.includes("overrides"),
		),
		`no zod issue names "overrides": ${JSON.stringify(token.error.issues)}`,
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
	return "primary, overrides and a missing word rejected, each named in its issue";
});

// The colors the accent knob binds: every declaration that reaches a literal
// on the accent hue through its aliases, veils and mixes.
function accentBound(): Set<ColorName> {
	const memo = new Map<ColorName, boolean>();
	const walk = (name: ColorName): boolean => {
		const done = memo.get(name);
		if (done !== undefined) return done;
		const declaration = COLORS[name];
		let bound: boolean;
		if ("alias" in declaration) bound = walk(declaration.alias);
		else if ("veil" in declaration) bound = walk(declaration.veil);
		else if ("mix" in declaration) {
			const toward = declaration.toward;
			const targets =
				typeof toward === "string" ? [toward] : [toward.light, toward.dark];
			bound =
				walk(declaration.mix) ||
				targets.some((target) => target !== "black" && walk(target));
		} else {
			bound =
				declaration.light.hue === "accent" || declaration.dark.hue === "accent";
		}
		memo.set(name, bound);
		return bound;
	};
	return new Set(COLOR_NAMES.filter(walk));
}

check("a5", "a knob move touches only its roles", () => {
	const bound = accentBound();
	const boundLine = new RegExp(`--color-(${[...bound].join("|")}):`);
	// The cast is pinned: it follows the accent unless set.
	const moved = emit({ accentHue: 30, castHue: KNOB_DEFAULTS.accentHue });
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
			boundLine.test(line) && boundLine.test(after[index] ?? ""),
			`a line off the accent-bound colors moved: ${line} -> ${after[index]}`,
		);
	}
	return `${diffs.length} lines moved, every one an accent-bound --color-* declaration (${bound.size} bound)`;
});

check("a7", "uniwind's own compiler consumes the sheet", () => {
	const compiledCss = pipeline();
	const light = themeScope(compiledCss, "light");
	const dark = themeScope(compiledCss, "dark");

	// Native draws the touch set.
	const title = resolved.type.touch.title;
	const fontSize = styleValue(compiledCss, "text-title", "fontSize", light);
	assert(
		fontSize === Number.parseFloat(title.size),
		`text-title fontSize: ${fontSize}`,
	);
	const lineHeight = styleValue(compiledCss, "text-title", "lineHeight", light);
	assert(
		lineHeight === Number.parseFloat(title.leading),
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
	// uniwind folds the rgba color to hex; the offsets and blur of the contact
	// layer survive at the head of the list.
	assert(
		typeof boxShadow === "string" && boxShadow.startsWith("0 1 2"),
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
	const act = styleValue(
		compiledCss,
		"bg-act-accent",
		"backgroundColor",
		light,
	);
	assert(accent === act, `alias law broken: bg-accent ${accent}, act ${act}`);

	// The display cell's figures: native redeclares `tabular-nums` plain, so its
	// `fontVariant` is the one token, with no empty tokens React Native logs.
	const own = Object.fromEntries(
		(compiledCss.stylesheet["tabular-nums"]?.[0]?.entries ?? []).filter(
			([name]) => name.startsWith("--"),
		),
	);
	const figures = styleValue(compiledCss, "tabular-nums", "fontVariant", {
		...light,
		...own,
	});
	assert(
		figures === "tabular-nums",
		`tabular-nums fontVariant: ${JSON.stringify(figures)}`,
	);

	const alive = RETIRED.filter(
		(name) => compiledCss.stylesheet[name] !== undefined,
	);
	assert(
		alive.length === 0,
		`retired classes survive the pipeline: ${alive.join(", ")}`,
	);
	return `text-title {${fontSize}/${lineHeight}}, tabular-nums {${figures}}, bg-canvas ${canvasLight} light / ${canvasDark} dark, alias law holds, ${RETIRED.length} retired absent`;
});

// `RaisedGround` scopes each re-pointed variable to the value its read
// resolves to in the mode, and uniwind's store lays a scope over the theme's
// variables; a hairline class reads `--color-edge` when it draws, so inside
// the scope it draws `edge-raised`.
check("a-raised", "a raised ground re-points the hairline", () => {
	const compiledCss = pipeline();
	const drawn: string[] = [];
	for (const mode of ["light", "dark"]) {
		const theme = themeScope(compiledCss, mode);
		const scoped: Vars = { ...theme };
		for (const [name, value] of Object.entries(raisedGroundTokens())) {
			const read = theme[value.slice("var(".length, -")".length)];
			assert(read, `${mode}: ${value} is not a compiled variable`);
			const resolvedRead = read(theme);
			scoped[name] = () => resolvedRead;
		}
		const outside = styleValue(
			compiledCss,
			"border-edge",
			"borderColor",
			theme,
		);
		const edge = styleValue(compiledCss, "border-edge", "borderColor", scoped);
		const want = styleValue(
			compiledCss,
			"border-edge-raised",
			"borderColor",
			theme,
		);
		assert(
			edge === want,
			`${mode}: border-edge inside a raised ground draws ${edge}, edge-raised is ${want}`,
		);
		drawn.push(`${mode} ${outside} -> ${edge}`);
	}
	return `border-edge outside -> inside a raised ground: ${drawn.join(", ")}`;
});

// `RoomScope` scopes the room set at the window's unit; uniwind's store lays
// the scope over the theme's variables, so a size, a type role, a radius and
// a border read the scaled value when they draw.
check(
	"a-room",
	"a room scope scales sizes, type, radii and the hairline",
	() => {
		const compiledCss = pipeline();
		const theme = themeScope(compiledCss, "light");
		const scopedAt = (width: number, height: number): Vars => {
			const unit = roomUnitFor(width, height);
			const scale = (units: number) => units * unit;
			const scoped: Vars = { ...theme };
			for (const [name, value] of Object.entries({
				...roomTokens(scale),
				...roomMeasureTokens(scale),
			})) {
				scoped[name] = () => value;
			}
			return scoped;
		};
		const drawn: string[] = [];
		for (const [width, height, control, body, display, page] of [
			[1280, 720, 44 * (4 / 3), 16 * (4 / 3), 5 * 16 * (4 / 3), 48 * (4 / 3)],
			[1920, 1080, 88, 32, 160, 96],
			[3840, 2160, 176, 64, 320, 192],
		] as const) {
			const vars = scopedAt(width, height);
			const got = {
				control: styleValue(compiledCss, "min-h-control", "minHeight", vars),
				body: styleValue(compiledCss, "text-body", "fontSize", vars),
				display: styleValue(compiledCss, "text-display", "fontSize", vars),
				page: styleValue(compiledCss, "p-page", "padding", vars),
				radius: styleValue(
					compiledCss,
					"rounded-control",
					"borderRadius",
					vars,
				),
				hairline: styleValue(compiledCss, "border", "borderWidth", vars),
			};
			const unit = roomUnitFor(width, height);
			const want = {
				control,
				body,
				display,
				page,
				radius: 6 * unit,
				hairline: HAIRLINE_PX * unit,
			};
			for (const [name, value] of Object.entries(want)) {
				const read = got[name as keyof typeof got];
				assert(
					typeof read === "number" && Math.abs(read - value) < 1e-6,
					`${width} × ${height}: ${name} draws ${String(read)}, expected ${value}`,
				);
			}
			drawn.push(`${width}: control ${got.control}, body ${got.body}`);
		}
		const outside = styleValue(
			compiledCss,
			"min-h-control",
			"minHeight",
			theme,
		);
		assert(outside === 44, `outside a room the control is ${String(outside)}`);
		return `${drawn.join("; ")}; outside a room 44`;
	},
);

check("a6", "the build resolves the inventory and kills the retired", () => {
	const roster = FAMILIES.map((family) => family.name).join(" ");
	assert(roster === FAMILY_ROSTER, `the family roster drifted: ${roster}`);
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
			// A props interface extends Closed; a union of props forms intersects it.
			const closes =
				raw.includes("extends Closed") || raw.includes("= Closed &");
			if (path.endsWith("index.tsx") && !closes) {
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
	const components = rosterEntries("native").length;
	assert(
		directives.length >= components * 7,
		`only ${directives.length} @ts-expect-error sites for ${components} components`,
	);
	for (const token of [
		'className="x"',
		"style={{",
		'class="x"',
		"classList={{}}",
		'colorClassName="text-ink-body"',
		'placeholderTextColorClassName="text-ink-body"',
		'selectionColorClassName="text-ink-body"',
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
	for (const [, name, { props: expected }] of rosterEntries("native")) {
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
		// A union is read member by member. A prop is closed only when every
		// declaration of it is `never`, so one that is `never` in one member and
		// a value in another stays open.
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

check("b-holds", "no component imports a cell another one holds", () => {
	const held = heldSpellings();
	// A component is read once its artboard is approved, as its `owns` marks.
	const approved = new Set(
		rosterEntries("native")
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

// ── The structure checks ────────────────────────────────────────────
//
// `packages/ui-core/guide/structure.md` is the rule behind each: the matchers
// are `@fcalell/ui-core/structure`'s, proved to fail on a bad case by ui-core's
// tests. They sweep every file of `src/ui`.

const UI_DIR = resolve(pkgDir, "src/ui");
const UI_FILES = walk(UI_DIR, /\.(ts|tsx)$/);

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
		return `${UI_FILES.length} files, no walk of a React child (a markdown token and an Intl part carry a string .type and are no child)`;
	},
);

check(
	"b-arbitrary",
	"no literal length inside a Tailwind arbitrary value",
	() => {
		const found = swept(arbitraryValues);
		found.set(
			"scripts/verify.ts (NATIVE_OVERLAYS)",
			arbitraryValues(JSON.stringify(NATIVE_OVERLAYS)),
		);
		const hits = where(found);
		assert(
			hits.length === 0,
			`a literal length in an arbitrary value (measured: ${hits.length}, expected: 0); use a spacing, size or width token, or a calc() over var(--…) tokens:\n  ${hits.join("\n  ")}`,
		);
		return `${found.size} files, no literal length in an arbitrary value`;
	},
);

check("b-motion", "no size or place animates through layout", () => {
	const hits = where(swept(layoutMotion));
	assert(
		hits.length === 0,
		`a size or place animated through layout (measured: ${hits.length}, expected: 0); move it by a transform or a layout transition:\n  ${hits.join("\n  ")}`,
	);
	return `${UI_FILES.length} files, every animated size or place a transform or a layout transition`;
});

// The files that measure the screen in JavaScript, each with the one thing it
// reads: React Native has no container query, so a layout read is the only way
// to learn a box. A file not listed fails, and so does a listed file that stops.
const MEASURING: Record<string, string> = {
	"components/pane/head.tsx":
		"a Pane head's row, title and acts, whose layouts say how many acts fit beside the title's floor before the rest fold into the more menu",
	"components/list-row/base.tsx":
		"a list row's layout, its text group's, the column its marks stand in and each mark's, whose widths say how many marks fit whole beside the text group's floor before the rest fold away",
	"components/list-row/marks.tsx":
		"a mark's own layout, which is the width the row's fold counts",
	"components/definition-row/index.tsx":
		"a definition row's layout, its text group's and its status and lock's, which say whether the lock fits whole beside the text group's floor or folds away",
	"lib/frame.ts":
		"the toasts' box measured against the Shell's root, and the docked foot's region height (Yoga has no container units)",
	"lib/room.tsx":
		"the room set scales by the unit of the window, which a rotation or a resize changes",
	"components/toast/room.tsx":
		"the box the toasts stand in, laid out by the page and read for their layer",
	"components/slider/base.tsx":
		"the track's width, which the thumb's drag maps to a value",
	"components/pane/index.tsx":
		"a footed Pane's body region, read for the docked sheet's height",
	"components/thread/index.tsx":
		"a Thread's log region, read for the docked sheet's height",
	"components/sheet/docked.tsx":
		"the docked sheet's pinned head and foot, which the body gives below",
	"components/sheet/base.tsx":
		"the window's height, which caps a sheet and sets a tall one",
	"components/table/index.tsx":
		"the window's width, which picks the Table's grid or its list (the tree differs)",
};

check(
	"b-measure",
	"the screen is measured in JavaScript only in the closed list of files",
	() => {
		const found = swept((source, name) =>
			measures(source, NATIVE_MEASURES, name),
		);
		const { unlisted, stale } = outsideList(
			new Map(
				[...found].map(([path, hits]) => [path, hits.map((h) => h.text)]),
			),
			MEASURING,
		);
		assert(
			unlisted.length === 0,
			`measuring outside the closed list (expected: flex; else add the file to MEASURING with its reason):\n  ${where(new Map([...found].filter(([path]) => unlisted.includes(path)))).join("\n  ")}`,
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
// a child acts on, `portal` where a tree starts again. `form` is a named
// exception: a context that changes a child's form, which no new context may
// join.
type ContextClass = "data" | "behaviour" | "portal" | "form";
const CONTEXTS: Record<string, [ContextClass, string]> = {
	"lib/ink.ts:Ink": [
		"data",
		"the ink of the place a glyph sits in, React Native's stand-in for inherited currentColor",
	],
	"lib/field.ts:FieldNameContext": [
		"data",
		"the label or title that names a typing control",
	],
	"lib/field.ts:FieldDisabled": [
		"behaviour",
		"whether the field around a control is disabled, so it answers no press",
	],
	"lib/field.ts:FieldError": [
		"data",
		"whether the field is in error, which the control's box draws as its edge",
	],
	"lib/field.ts:FieldFocus": [
		"behaviour",
		"the control a sheet opens on takes focus as it mounts",
	],
	"lib/field.ts:GroupName": [
		"data",
		"the label that names a group of controls",
	],
	"lib/field.ts:FieldClaim": [
		"behaviour",
		"the typing control of a region that holds focus",
	],
	"lib/toast.ts:ToastEntry": ["data", "the queued toast a Toast draws"],
	"lib/form.ts:ActInert": [
		"behaviour",
		"an act that cannot run where it stands, drawn in its disabled cell",
	],
	"lib/reason.ts:ReasonHostContext": [
		"behaviour",
		"the host a blocked act tells it was pressed, which shows its reason",
	],
	"lib/frame.ts:ShellSwitcher": [
		"data",
		"the place switcher the Shell hands the Pane, which draws it as a descriptor in its bar; a room Place hands none",
	],
	"lib/frame.ts:ShellTabs": [
		"data",
		"the tab bar the Shell hands each Place, which draws it under its Pane",
	],
	"lib/frame.ts:ToastFrame": [
		"behaviour",
		"the Shell's root and the way to place the toasts' layer over a page's box",
	],
	"lib/frame.ts:ShellHome": [
		"form",
		"exception: the router mounts the page for an unknown address wherever the miss lands, and only the tree above it knows whether a Shell stands there: a Gate is a root frame, a Place of a Pane cannot draw outside one, and native-ui imports no router to ask which layout took the miss",
	],
	"lib/frame.ts:PlaceRoute": [
		"data",
		"the route of the Shell's place, where a read leads back",
	],
	"lib/frame.ts:BackRoute": [
		"data",
		"the route a Pane's back act returns to, where a read leads back",
	],
	"lib/frame.ts:DistanceContext": [
		"data",
		"the Place's density for the page as a whole (room), the TV set, which the Pane insets its head by; native has no density query to read it from",
	],
	"lib/frame.ts:FootReturn": [
		"behaviour",
		"the claim a leaving docked sheet sets for the input that returns to take focus",
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
	"components/sheet/base.tsx:PartsContext": [
		"portal",
		"gorhom draws the sheet outside the tree that opens it, so the sheet's parts start again at its container",
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

// React Native has no DOM, so no file of src/ui may touch a dataset; the web's
// closed list is its table, canvas, modality and density pin.
check("b-dataset", "no file touches a dataset", () => {
	const found = swept(datasets);
	const { unlisted } = outsideList(
		new Map([...found].map(([path, hits]) => [path, hits.map((h) => h.text)])),
		{},
	);
	assert(
		unlisted.length === 0,
		`a data mark read or written (expected: a prop; React Native has no dataset):\n  ${where(found).join("\n  ")}`,
	);
	return `${found.size} files, none touches a dataset`;
});

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

// The waiting form is the loaded form painted, never a second tree: no file
// is named `wait.tsx` or `*-wait.tsx`, and no component is named `*Wait`.
check("b-wait", "no waiting tree stands beside the loaded one", () => {
	const hits: string[] = [];
	for (const path of UI_FILES) {
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
	return `${UI_FILES.length} source files, no waiting tree`;
});

// A Section's title is one size, so a Section inside a Section reads as its
// sibling and the page's outline flattens: no Section stands in a Section. The
// package draws none of its own, so the check holds the sources a Section
// would join; the matcher is proved on a bad case in ui-core's tests.
check("b-section-nest", "no Section stands in a Section", () => {
	const hits: string[] = [];
	let drawn = 0;
	for (const path of UI_FILES.filter((file) => file.endsWith(".tsx"))) {
		const found = sectionNests(readFileSync(path, "utf8"), path);
		drawn += found.drawn;
		for (const hit of found.hits)
			hits.push(`${relative(pkgDir, path)}:${hit.line}`);
	}
	assert(hits.length === 0, `a Section in a Section:\n  ${hits.join("\n  ")}`);
	return `${drawn} Sections with a body, none holding another`;
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
		// JSX text: letters between a `>` and a `<`, on one line or on a line of
		// their own, outside braces. A `>` after a trailing comma closes a
		// type-parameter list, not a tag. A `>` after a trailing comma closes a
		// type-parameter list, not a tag.
		for (const match of source.matchAll(
			/(?<![=\w])(?<!,\s*)>[ \t]*[^<>{}\n]*[A-Za-z][^<>{}\n]*[ \t]*<|(?<![=\w])(?<!,\s*)>[ \t]*\n[ \t]*[A-Za-z][^<>{}\n]*\n[ \t]*</g,
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
	// A token boundary, not a word boundary: the contract's `card` role (`p-card`,
	// `rounded-card`) is a class segment, never the product noun.
	const pattern = new RegExp(
		`(?<![\\w-])(${PRODUCT_NOUNS.join("|")})(?![\\w-])`,
		"i",
	);
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

// The picker's fact the types cannot hold: its empty choice (an option
// whose value is null) reads as a placeholder.
check("b-picker", "a picker draws its empty choice as a placeholder", () => {
	// The trigger every pick draws.
	const picker = readFileSync(
		resolve(COMPONENT_DIR, "picker", "base.tsx"),
		"utf8",
	);
	// The option sheet a Picker opens.
	const sheet = readFileSync(
		resolve(COMPONENT_DIR, "picker", "sheet.tsx"),
		"utf8",
	);
	assert(
		/option\.value === null && PICKER_EMPTY/.test(sheet) &&
			/\(current\?\.value \?\? null\) === null && PICKER_EMPTY/.test(picker),
		"the empty choice does not draw as a placeholder in the list and on the control",
	);
	return "a null option and an empty control draw PICKER_EMPTY";
});

check("b8", "the words provider lands on the words option", () => {
	const source = readFileSync(resolve(pkgDir, "src/index.ts"), "utf8");
	// The words provider lands in the entry only when the consumer set words.
	assert(
		source.includes('named: ["WordsProvider"]') &&
			source.includes("if (!opts.words) return undefined;"),
		"src/index.ts does not contribute the WordsProvider on the words option",
	);
	return "words provider gated on the option";
});

// ── The exports, as a consumer resolves them ────────────────────────

// Every component and every lib module, resolved by plain node (no tsx
// hooks, which add extensions of their own) through the package's
// `exports`. A resolver takes the first target of an export array, so only a
// real resolution to an existing file proves a subpath reaches its module.
check("b-exports", "every subpath reaches its file through exports", () => {
	const libDir = resolve(pkgDir, "src/ui/lib");
	const expected = new Map<string, string>();
	for (const name of readdirSync(libDir)) {
		expected.set(`lib/${name.replace(/\.tsx?$/, "")}`, resolve(libDir, name));
	}
	for (const dir of readdirSync(COMPONENT_DIR)) {
		expected.set(`components/${dir}`, resolve(COMPONENT_DIR, dir, "index.tsx"));
	}
	const script = `const out = {}; for (const s of ${JSON.stringify([...expected.keys()])}) { try { out[s] = import.meta.resolve("@fcalell/plugin-native-ui/" + s); } catch { out[s] = null; } } console.log(JSON.stringify(out));`;
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
	return `${expected.size} lib and component subpaths, each resolved to its own file`;
});

// ── Report ──────────────────────────────────────────────────────────

report();
