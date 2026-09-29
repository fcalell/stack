// The contract as a DESIGN.md (github.com/google-labs-code/design.md, version
// `alpha`): the tokens as YAML front matter, the matrices as its components,
// and the eight body sections as a snapshot of what the contract draws. A pure
// function of a resolved theme, so the committed file is checked against it.
import type { ResolvedTheme } from "./derive.ts";
import { rosterEntries } from "./roster.ts";
import {
	BREAKPOINTS,
	DENSITY_SIZES,
	DURATIONS,
	EASINGS,
	type FontWeight,
	INVARIANT_COLORS,
	LABEL,
	MODES,
	MONO_FEATURES,
	type Mode,
	PER_MODE_COLORS,
	RADIUS_RUNGS,
	SHADOW_LEVELS,
	SPACING_RUNGS,
	TRACKED_ROLES,
	TYPE_ROLES,
	TYPE_SCALE,
	type TypeRole,
	WIDTHS,
} from "./tokens.ts";
import * as variants from "./variants.ts";
import { classes, FAMILIES, type Family } from "./variants.ts";

const WEIGHT: Record<FontWeight, number> = {
	regular: 400,
	medium: 500,
	semibold: 600,
	bold: 700,
};

// What each color role is for, by use. `avatar-n` and `chip-n` share a line.
const COLOR_USE: Record<string, string> = {
	canvas: "the frame behind the content, the page around a group",
	surface: "the content column, a sheet, a picker's list",
	group: "a group's fill, an input, a search field",
	edge: "the hairline between columns and rows; a pressed row's fill",
	ink: "titles and body",
	"ink-meta": "meta lines, section labels, descriptions",
	"ink-faint": "an input's placeholder and a disabled control",
	accent: "the primary act's fill, a switch that is on, the selected place",
	"accent-soft": "a selected row",
	"on-accent": "text on `accent`",
	tint: "focus, a link, a count, an `active` status",
	ok: "a `done` mark, an added line",
	"ok-soft": "the fill under an `ok` mark",
	warn: "an `attention` mark",
	"warn-soft": "the fill under a `warn` mark",
	danger: "a `failed` mark, a destructive act's text, an error ring",
	"danger-soft": "the fill under a `danger` mark, a removed line",
	avatar: "an `Avatar`'s fill, one step per name",
	chip: "a `Chip`'s fill, one per data family",
	scrim: "the veil behind a sheet",
	thumb: "the switch's knob, white in both modes",
};

const TYPE_USE: Record<TypeRole, string> = {
	display: "one line on a screen with nothing else to read",
	title: "a place's large title, an item's title",
	heading: "a sheet's title, a heading inside an item",
	body: "prose, a row's title, an input's text",
	meta: "a row's second lines, a description, an age",
	label: "the header over a list or a group",
	mono: "code, a commit, a key, the diff",
};

const RUNG_USE: Record<(typeof SPACING_RUNGS)[number], string> = {
	pair: "a label from its value",
	row: "atoms side by side",
	stack: "fields of a form",
	inset: "the screen's side inset, a group's interior",
	section: "sections of a screen",
	room: "the item header from its body",
};

const DENSITY_USE: Record<(typeof DENSITY_SIZES)[number], string> = {
	floor: "the minimum height of a control, a row and a header",
	"row-y": "a row's vertical padding",
	"control-y": "a button's, a field's and a chip's vertical padding",
	segment: "a segment inside its padded control",
};

const RADIUS_USE: Record<(typeof RADIUS_RUNGS)[number], string> = {
	group: "groups, inputs, code, pickers and menus",
	sheet: "a sheet's corners",
	full: "buttons, chips, a search field, a count",
};

const DURATION_USE: Record<(typeof DURATIONS)[number], string> = {
	instant: "a color or opacity change under the pointer",
	fast: "a control answering a press",
	base: "a popover, a menu or a toast entering",
	slow: "a sheet or a pane moving in",
};

const EASING_USE: Record<(typeof EASINGS)[number], string> = {
	out: "what enters or answers a touch",
	in: "what leaves",
	"in-out": "what moves between two places",
};

const COLOR_NAMES: ReadonlySet<string> = new Set([
	...PER_MODE_COLORS,
	...INVARIANT_COLORS,
]);
const PER_MODE: ReadonlySet<string> = new Set(PER_MODE_COLORS);
const RADII: ReadonlySet<string> = new Set(RADIUS_RUNGS);
const ROLES: ReadonlySet<string> = new Set(TYPE_ROLES);
const SPACES: ReadonlySet<string> = new Set([
	...SPACING_RUNGS,
	...DENSITY_SIZES,
]);

// A per-mode color's token name: the light value bare, the dark value
// suffixed, so a component's light entry and its `-dark` twin each name one.
function colorName(token: string, mode: Mode): string {
	return mode === "dark" && PER_MODE.has(token) ? `${token}-dark` : token;
}

function kebab(name: string): string {
	return name.toLowerCase().replace(/_/g, "-");
}

// The component sub-tokens a class list carries. Classes the format has no
// property for (borders, weights, gaps, side paddings) stay in the matrices.
function subTokens(
	list: readonly string[],
	mode: Mode,
): Record<string, string> {
	const out: Record<string, string> = {};
	for (const name of list) {
		const [, prefix, rest] = /^(bg|text|rounded|p|min-h|min-w)-(.+)$/.exec(
			name,
		) ?? [undefined, undefined, undefined];
		if (prefix === undefined || rest === undefined) continue;
		if (prefix === "bg" && COLOR_NAMES.has(rest)) {
			out.backgroundColor = `{colors.${colorName(rest, mode)}}`;
		} else if (prefix === "text" && COLOR_NAMES.has(rest)) {
			out.textColor = `{colors.${colorName(rest, mode)}}`;
		} else if (prefix === "text" && ROLES.has(rest)) {
			out.typography = `{typography.${rest}}`;
		} else if (prefix === "rounded" && RADII.has(rest)) {
			out.rounded = `{rounded.${rest}}`;
		} else if (prefix === "p" && SPACES.has(rest)) {
			out.padding = `{spacing.${rest}}`;
		} else if (prefix === "min-h" && SPACES.has(rest)) {
			out.height = `{spacing.${rest}}`;
		} else if (prefix === "min-w" && SPACES.has(rest)) {
			out.width = `{spacing.${rest}}`;
		}
	}
	return out;
}

// Families one component draws over the same axes are one element's layers
// (a button's fill and its label), so they render as one entry.
function familyGroups(): Family[][] {
	const roster = rosterEntries();
	const groups: Family[][] = [];
	for (const family of FAMILIES) {
		const axes = JSON.stringify(family.axes);
		const group = groups.find(
			([head]) =>
				head !== undefined &&
				JSON.stringify(head.axes) === axes &&
				roster.some(
					([, , entry]) =>
						entry.draws.includes(head.name) &&
						entry.draws.includes(family.name),
				),
		);
		if (group) group.push(family);
		else groups.push([family]);
	}
	return groups;
}

// Every cell as a class list: each axis value of each family group, then
// each single-cell constant beside the matrices.
function cellLists(): Array<[string, string[]]> {
	const out: Array<[string, string[]]> = [];
	for (const group of familyGroups()) {
		const [head] = group;
		if (!head) continue;
		for (const [axis, values] of Object.entries(head.axes)) {
			for (const value of values) {
				const list = group.flatMap((family) =>
					classes(family.cva({ [axis]: value })),
				);
				out.push([`${kebab(head.name)}-${value}`, list]);
			}
		}
	}
	for (const [name, value] of Object.entries(variants)) {
		if (typeof value === "string" && /^[A-Z_]+$/.test(name)) {
			out.push([kebab(name), classes(value)]);
		}
	}
	return out;
}

function components(): Array<[string, Record<string, string>]> {
	const out: Array<[string, Record<string, string>]> = [];
	const seen = new Set<string>();
	for (const [name, list] of cellLists()) {
		for (const mode of MODES) {
			const tokens = subTokens(list, mode);
			const perMode = Object.values(tokens).some((ref) =>
				ref.endsWith("-dark}"),
			);
			if (Object.keys(tokens).length === 0) continue;
			if (mode === "dark" && !perMode) continue;
			const key = mode === "dark" ? `${name}-dark` : name;
			if (seen.has(key)) throw new Error(`[${LABEL}] ${key} is emitted twice`);
			seen.add(key);
			out.push([key, tokens]);
		}
	}
	return out;
}

// YAML's double-quoted scalar is JSON's string syntax.
const q = JSON.stringify;

function frontMatter(resolved: ResolvedTheme): string[] {
	const lines = [
		"---",
		"version: alpha",
		`name: ${q("@fcalell/stack")}`,
		`description: ${q("The design contract both stack UI plugins render: tokens derived from a few knobs, the platform-invariant matrices, and the component roster.")}`,
		"colors:",
		`  primary: ${q("{colors.accent}")}`,
	];
	for (const mode of MODES) {
		for (const token of PER_MODE_COLORS) {
			lines.push(
				`  ${colorName(token, mode)}: ${q(resolved.colors[mode][token])}`,
			);
		}
	}
	for (const token of INVARIANT_COLORS) {
		lines.push(`  ${token}: ${q(resolved.invariantColors[token])}`);
	}
	lines.push("typography:");
	for (const role of TYPE_ROLES) {
		const spec = TYPE_SCALE[role];
		lines.push(`  ${role}:`);
		lines.push(`    fontFamily: ${q(resolved.fonts[spec.family])}`);
		lines.push(`    fontSize: ${q(resolved.scales[`--text-${role}`])}`);
		lines.push(`    fontWeight: ${WEIGHT[spec.weight]}`);
		lines.push(`    lineHeight: ${q(resolved.scales[`--leading-${role}`])}`);
		const tracked = TRACKED_ROLES.find((name) => name === role);
		if (tracked) {
			const tracking = resolved.scales[`--tracking-${tracked}`];
			lines.push(`    letterSpacing: ${q(tracking)}`);
		}
		if (spec.family === "mono") {
			lines.push(`    fontFeature: ${q(MONO_FEATURES)}`);
		}
	}
	lines.push("rounded:");
	for (const rung of RADIUS_RUNGS) {
		lines.push(`  ${rung}: ${q(resolved.scales[`--radius-${rung}`])}`);
	}
	lines.push("spacing:");
	for (const rung of SPACING_RUNGS) {
		lines.push(`  ${rung}: ${q(resolved.scales[`--spacing-${rung}`])}`);
	}
	for (const size of DENSITY_SIZES) {
		lines.push(`  ${size}: ${q(resolved.sizes.touch[size])}`);
	}
	for (const size of DENSITY_SIZES) {
		lines.push(`  ${size}-compact: ${q(resolved.sizes.compact[size])}`);
	}
	lines.push("components:");
	for (const [name, tokens] of components()) {
		lines.push(`  ${name}:`);
		for (const [property, ref] of Object.entries(tokens)) {
			lines.push(`    ${property}: ${q(ref)}`);
		}
	}
	lines.push("---");
	return lines;
}

function table(head: string[], rows: string[][]): string[] {
	return [
		`| ${head.join(" | ")} |`,
		`| ${head.map(() => "---").join(" | ")} |`,
		...rows.map((row) => `| ${row.join(" | ")} |`),
	];
}

function code(value: string): string {
	return `\`${value}\``;
}

function useOf(token: string): string {
	return COLOR_USE[token.replace(/-\d$/, "")] ?? "";
}

function body(resolved: ResolvedTheme): string[] {
	const { knobs, scales, sizes, motion } = resolved;
	return [
		"# @fcalell/stack",
		"",
		"Emitted from `@fcalell/ui-core` by `pnpm --filter @fcalell/ui-core design-md`. Never edit it by hand: change the contract and emit again.",
		"",
		"## Overview",
		"",
		"One closed token contract, derived from a few knobs, drawn by two UI plugins: `react-ui` on the web and `native-ui` on React Native. A product sets knobs, never tokens; a component renders its matrix cells and takes no class or style. Every color has a light and a dark value: the front matter names the light one bare and the dark one with a `-dark` suffix, and each component entry that names a color has a `-dark` twin. `primary` is `accent`, the primary act's fill.",
		"",
		...table(
			["Knob", "Value"],
			[
				["accentHue", String(knobs.accentHue)],
				["neutralHue", String(knobs.neutralHue)],
				["neutralChroma", String(knobs.neutralChroma)],
				[
					"okHue, warnHue, dangerHue",
					`${knobs.okHue}, ${knobs.warnHue}, ${knobs.dangerHue}`,
				],
				["primary", code(knobs.primary)],
				["space", `${knobs.space} px`],
				["radius", `${knobs.radius} px`],
				["text", `${knobs.text} px`],
				["elevation", code(knobs.elevation)],
				["density", code(knobs.density)],
				["motion", `${knobs.motion} ms`],
			],
		),
		"",
		"## Colors",
		"",
		"Colors are OKLCH, named by use. One accent hue, near-achromatic greys, three state hues. `on-accent` is `canvas`; under `primary: ink` `accent` is `ink`.",
		"",
		...table(
			["Role", "Light", "Dark", "Use"],
			PER_MODE_COLORS.map((token) => [
				code(token),
				code(resolved.colors.light[token]),
				code(resolved.colors.dark[token]),
				useOf(token),
			]),
		),
		"",
		...table(
			["Invariant", "Both modes", "Use"],
			INVARIANT_COLORS.map((token) => [
				code(token),
				code(resolved.invariantColors[token]),
				useOf(token),
			]),
		),
		"",
		"Status colors: `active` is `tint`, `waiting` is `ink-meta`, `done` is `ok`, `attention` is `warn`, `failed` is `danger`, `idle` is `ink-meta`.",
		"",
		"## Typography",
		"",
		"Seven roles named by use, one scale at every width. A role carries its size, line box, weight, ink and family; a component draws copy only through a role.",
		"",
		...table(
			["Role", "Size / line", "Weight", "Ink", "Use"],
			TYPE_ROLES.map((role) => [
				code(role),
				`${scales[`--text-${role}`]} / ${scales[`--leading-${role}`]}`,
				String(WEIGHT[TYPE_SCALE[role].weight]),
				code(TYPE_SCALE[role].ink),
				TYPE_USE[role],
			]),
		),
		"",
		`\`sans\` is ${code(resolved.fonts.sans)}; \`mono\` is ${code(resolved.fonts.mono)} with its ligatures off. Each named family is followed by its metric fallback face.`,
		"",
		"## Layout",
		"",
		`Rungs are multiples of \`space\` (${knobs.space} px), named by what they separate:`,
		"",
		...table(
			["Rung", "Value", "Separates"],
			SPACING_RUNGS.map((rung) => [
				code(rung),
				scales[`--spacing-${rung}`],
				RUNG_USE[rung],
			]),
		),
		"",
		"Density moves four sizes, never a rung or a type size. Touch is every platform's set; the compact set draws where the primary pointer is fine under `density: desktop`.",
		"",
		...table(
			["Size", "Touch", "Compact", "Is"],
			DENSITY_SIZES.map((size) => [
				code(size),
				sizes.touch[size],
				sizes.compact[size],
				DENSITY_USE[size],
			]),
		),
		"",
		`Widths: ${WIDTHS.map((width) => `${code(width)} ${scales[`--container-${width}`]}`).join(", ")}. Breakpoints: ${BREAKPOINTS.map((bp) => `${code(bp)} ${scales[`--breakpoint-${bp}`]}`).join(", ")}; they are the only responsive variants.`,
		"",
		"## Elevation & Depth",
		"",
		knobs.elevation === "soft"
			? `Groups, rows and cards are flat. Two shadows lift a layer: ${SHADOW_LEVELS.map((level) => `${code(`shadow-${level}`)} (${code(scales[`--shadow-${level}`])})`).join(" and ")}. \`shadow-float\` lifts a picker's list, a menu, a toast, the selected segment and a thumb; \`shadow-sheet\` lifts a sheet.`
			: "Groups, rows and cards are flat. A lifted layer draws a 1px `edge` ring instead of a shadow.",
		"",
		"## Shapes",
		"",
		...table(
			["Radius", "Value", "Rounds"],
			RADIUS_RUNGS.map((rung) => [
				code(rung),
				scales[`--radius-${rung}`],
				RADIUS_USE[rung],
			]),
		),
		"",
		"## Components",
		"",
		"The front matter's components are the matrix cells: one entry per axis value of each family, a family's label layer folded into it, and one per single cell. Borders, weights, gaps and side paddings stay in the class strings. Every component the roster ships, the families it draws and the states it has:",
		"",
		...table(
			["Component", "Layer", "Draws", "States"],
			rosterEntries().map(([layer, name, entry]) => [
				code(name),
				layer,
				entry.draws.map(code).join(", ") || "none",
				entry.states.join(", "),
			]),
		),
		"",
		"### Motion",
		"",
		`Durations are ratios of \`motion\` (${knobs.motion} ms), read as \`duration-<rung>\`; every one is 0 under \`prefers-reduced-motion: reduce\`.`,
		"",
		...table(
			["Duration", "Value", "Times"],
			DURATIONS.map((rung) => [
				code(rung),
				`${motion.durations[rung]} ms`,
				DURATION_USE[rung],
			]),
		),
		"",
		...table(
			["Curve", "Value", "Eases"],
			EASINGS.map((easing) => [
				code(easing),
				code(`cubic-bezier(${motion.easings[easing].join(", ")})`),
				EASING_USE[easing],
			]),
		),
		"",
		"## Do's and Don'ts",
		"",
		"- Do pick the component that owns the shape before writing markup.",
		"- Do set a knob to move a scale; don't set a token.",
		"- Don't pass `class`, `className`, `classList` or `style` to a component; a look the matrices lack is a new matrix cell.",
		"- Do use tokens only: no literal color, pixel size or arbitrary value.",
		"- Do keep text at 4.5:1 or more on its fill; the contract measures every pair it draws.",
		"- Do time motion with a duration rung and a contract curve; don't write a literal duration.",
		"- Do take every word a component draws from `words`; a sentence is a prop.",
		"",
	];
}

export function designMd(resolved: ResolvedTheme): string {
	return [...frontMatter(resolved), "", ...body(resolved)].join("\n");
}
