// The render walk's checks, each a pure function over plain measured data, so a
// test in node can hand one a bad case and see it found. `walk.ts` gathers the
// data from the page and the contract's values from its computed custom
// properties; nothing here reads a document.

// One thing a check found: the rule, the element, the measured value, the
// expected value and the fix.
export interface Finding {
	rule: string;
	// The element's path, tag#id[role] with its ancestors, and its name.
	path: string;
	name: string;
	measured: string;
	expected: string;
	fix: string;
}

// A contract value read from the page: its name and its pixels at the density
// the page is in.
export interface Token {
	name: string;
	px: number;
}

// What the contract emits that the checks judge by.
export interface Tokens {
	// The type roles' font sizes.
	text: Token[];
	// The spacing roles: a gap or an inset is one of these.
	spacing: Token[];
	// The sizes a control's height is one of.
	controls: Token[];
	// The sizes a row's height is one of.
	rows: Token[];
	// The radius roles, `full` apart.
	radius: Token[];
}

// A measured length is a token's to the half pixel: subpixel layout rounds.
const TOLERANCE = 0.5;

// The least font size a visible text may have, and the most distinct sizes a
// screen may draw.
export const MIN_TEXT_PX = 12;
export const MAX_TEXT_SIZES = 6;

const px = (value: number): string => `${round(value)}px`;
const round = (value: number): number => Math.round(value * 100) / 100;

const names = (tokens: Token[]): string =>
	tokens.map((t) => `${t.name} ${t.px}px`).join(", ");

// The token nearest to a value, for a fix that names it.
export function nearest(value: number, tokens: Token[]): Token | undefined {
	return [...tokens].sort(
		(a, b) => Math.abs(a.px - value) - Math.abs(b.px - value),
	)[0];
}

const is = (value: number, tokens: Token[]): boolean =>
	tokens.some((t) => Math.abs(t.px - value) <= TOLERANCE);

function offToken(
	rule: string,
	at: { path: string; name: string },
	what: string,
	value: number,
	tokens: Token[],
	fix: string,
): Finding {
	const close = nearest(value, tokens);
	return {
		rule,
		path: at.path,
		name: at.name,
		measured: `${what} ${px(value)}`,
		expected: `${what} one of ${names(tokens)}`,
		fix: close ? `${fix} (nearest: ${close.name}, ${close.px}px)` : fix,
	};
}

export interface Located {
	path: string;
	name: string;
}

// ── type ────────────────────────────────────────────────────────────

export interface TextMeasure extends Located {
	size: number;
}

// Every visible text at 12 px or more, and no more than six distinct sizes on
// the screen.
export function checkType(texts: TextMeasure[]): Finding[] {
	const found: Finding[] = texts
		.filter((t) => t.size < MIN_TEXT_PX - TOLERANCE)
		.map((t) => ({
			rule: "type-size",
			path: t.path,
			name: t.name,
			measured: px(t.size),
			expected: `at least ${MIN_TEXT_PX}px`,
			fix: "set the text role the contract sizes for this text (caption is the smallest)",
		}));
	const sizes = [...new Set(texts.map((t) => Math.round(t.size)))].sort(
		(a, b) => a - b,
	);
	if (sizes.length > MAX_TEXT_SIZES) {
		found.push({
			rule: "type-sizes",
			path: "the screen",
			name: "",
			measured: `${sizes.length} sizes (${sizes.map(px).join(", ")})`,
			expected: `at most ${MAX_TEXT_SIZES} sizes`,
			fix: "fold the extra sizes into the roles the screen already draws",
		});
	}
	return found;
}

// ── heights ─────────────────────────────────────────────────────────

export interface HeightMeasure extends Located {
	// The control or row kind, for the message.
	kind: string;
	height: number;
}

// Each control's height is a size token at the density, and each row's.
export function checkHeights(
	controls: HeightMeasure[],
	rows: HeightMeasure[],
	tokens: Tokens,
): Finding[] {
	return [
		...controls
			.filter((c) => !is(c.height, tokens.controls))
			.map((c) =>
				offToken(
					"control-height",
					c,
					`${c.kind} height`,
					c.height,
					tokens.controls,
					"size the control by a size token (control, control-compact, field, target)",
				),
			),
		...rows
			.filter((r) => !is(r.height, tokens.rows))
			.map((r) =>
				offToken(
					"row-height",
					r,
					`${r.kind} height`,
					r.height,
					tokens.rows,
					"size the row by a row token (row, row-2, row-setting)",
				),
			),
	];
}

// ── gaps and insets ─────────────────────────────────────────────────

export interface SpacingMeasure extends Located {
	rowGap: number;
	columnGap: number;
	// Top, right, bottom, left.
	padding: [number, number, number, number];
}

const SIDES = ["top", "right", "bottom", "left"] as const;

// A flex or grid container's gaps and padding are 0 or a spacing token.
export function checkSpacing(
	items: SpacingMeasure[],
	tokens: Tokens,
): Finding[] {
	const found: Finding[] = [];
	for (const item of items) {
		const values: Array<[string, number]> = [
			["row-gap", item.rowGap],
			["column-gap", item.columnGap],
			...item.padding.map((v, i): [string, number] => [
				`padding-${SIDES[i]}`,
				v,
			]),
		];
		for (const [what, value] of values) {
			if (value === 0 || is(value, tokens.spacing)) continue;
			found.push(
				offToken(
					what.includes("gap") ? "gap" : "inset",
					item,
					what,
					value,
					tokens.spacing,
					what.includes("gap")
						? "use a gap role (inside, pair, acts, rows, fields, sections)"
						: "use an inset role (control-x, card, tile, float, page)",
				),
			);
		}
	}
	return found;
}

// ── radii ───────────────────────────────────────────────────────────

export interface RadiusMeasure extends Located {
	// Top-left, top-right, bottom-right, bottom-left.
	radii: [number, number, number, number];
	width: number;
	height: number;
	// The nearest painted ancestor with a radius, and how far this box stands
	// inside it at each corner (the smaller of the two edges the corner meets).
	outer?: {
		path: string;
		radii: [number, number, number, number];
		insets: [number, number, number, number];
	};
}

const CORNERS = ["top-left", "top-right", "bottom-right", "bottom-left"];

// Every radius is 0, a radius role or a pill (at least half the box's
// shorter side); a box inside a rounded box with an inset smaller than the
// outer radius has the outer radius less the inset.
export function checkRadii(items: RadiusMeasure[], tokens: Tokens): Finding[] {
	const found: Finding[] = [];
	for (const item of items) {
		const pill = Math.min(item.width, item.height) / 2;
		item.radii.forEach((radius, corner) => {
			if (radius === 0 || radius >= pill - TOLERANCE) return;
			if (!is(radius, tokens.radius)) {
				found.push(
					offToken(
						"radius",
						item,
						`${CORNERS[corner]} radius`,
						radius,
						tokens.radius,
						"use a radius role (chip, control, row, card, popover, sheet), or full for a pill",
					),
				);
			}
		});
		if (!item.outer) continue;
		const { outer } = item;
		item.radii.forEach((radius, corner) => {
			const out = outer.radii[corner] ?? 0;
			const inset = outer.insets[corner] ?? 0;
			if (radius === 0 || out === 0 || inset >= out) return;
			const expected = out - inset;
			if (Math.abs(radius - expected) <= TOLERANCE) return;
			found.push({
				rule: "nested-radius",
				path: item.path,
				name: item.name,
				measured: `${CORNERS[corner]} radius ${px(radius)} inside ${outer.path} (radius ${px(out)}, inset ${px(inset)})`,
				expected: `${px(expected)} (outer ${px(out)} less inset ${px(inset)})`,
				fix: "give the inner box the outer radius less the inset, or inset it by at least the outer radius",
			});
		});
	}
	return found;
}

// ── clipping ────────────────────────────────────────────────────────

export interface ClipMeasure extends Located {
	overflowX: string;
	textOverflow: string;
	lineClamp: string;
	scrollWidth: number;
	clientWidth: number;
}

// A box that clips (`overflow` hidden or clip) with more inside than it
// shows, and neither an ellipsis nor a line clamp saying so, nor a scroll
// container, hides a layout error.
export function checkClip(items: ClipMeasure[]): Finding[] {
	return items
		.filter(
			(c) =>
				(c.overflowX === "hidden" || c.overflowX === "clip") &&
				c.scrollWidth > c.clientWidth + 1 &&
				c.textOverflow !== "ellipsis" &&
				!(c.lineClamp && c.lineClamp !== "none"),
		)
		.map((c) => ({
			rule: "clip",
			path: c.path,
			name: c.name,
			measured: `scrollWidth ${c.scrollWidth}px over clientWidth ${c.clientWidth}px`,
			expected:
				"scrollWidth within clientWidth + 1px, or an ellipsis or line clamp",
			fix: "let the box grow (min-w-0 on its flex parent's child, wrap), or truncate its text with an ellipsis",
		}));
}

// ── fonts ───────────────────────────────────────────────────────────

export interface FontMeasure {
	face: string;
	// The status at the screen's first frame, after its first layout, and now.
	atPaint: string;
	now: string;
}

// A face the screen asked for at its first layout that was not loaded at the
// first frame draws the fallback and then jumps; a face that failed draws the
// fallback for good.
export function checkFonts(faces: FontMeasure[]): Finding[] {
	return faces.flatMap((f) => {
		if (f.now === "error") {
			return [
				{
					rule: "font-failed",
					path: "the screen",
					name: f.face,
					measured: "status error",
					expected: "loaded",
					fix: "serve the face's file or drop it from the theme's fonts",
				},
			];
		}
		if (f.atPaint === "loading" && f.now === "loaded") {
			return [
				{
					rule: "font-late",
					path: "the screen",
					name: f.face,
					measured: "loading at the first frame, loaded after",
					expected: "loaded at the first frame",
					fix: "preload the face (a link rel=preload in the page head) so it is there before the screen paints",
				},
			];
		}
		return [];
	});
}

// ── digits ──────────────────────────────────────────────────────────

export interface NumberMeasure extends Located {
	text: string;
	variantNumeric: string;
}

// A whole text that is a number: digits with separators, a sign, a percent
// sign, a currency symbol or a unit of up to three letters.
const BARE_NUMBER =
	/^[+\-−±]?\s?[$€£¥]?\s?\d[\d.,:'   ]*(\s?%|\s?[A-Za-z]{1,3})?$/;

export const isBareNumber = (text: string): boolean =>
	BARE_NUMBER.test(text.trim());

// A bare number draws tabular figures, so a changing one never shifts its
// neighbours.
export function checkDigits(items: NumberMeasure[]): Finding[] {
	return items
		.filter(
			(n) => isBareNumber(n.text) && !n.variantNumeric.includes("tabular-nums"),
		)
		.map((n) => ({
			rule: "tabular-digits",
			path: n.path,
			name: n.name || n.text.trim(),
			measured: `font-variant-numeric ${n.variantNumeric}`,
			expected: "tabular-nums",
			fix: "draw the number in a role that sets tabular figures (display, figure) or the Count, Stat or Table cell that does",
		}));
}

// ── regions ─────────────────────────────────────────────────────────

export interface RegionMeasure extends Located {
	// The region's accessible name, and the names of the regions around it.
	regionName: string;
	within: Array<{ path: string; regionName: string }>;
}

// No landmark region stands inside another of the same name.
export function checkRegions(regions: RegionMeasure[]): Finding[] {
	return regions.flatMap((r) => {
		const same = r.within.find(
			(outer) => outer.regionName !== "" && outer.regionName === r.regionName,
		);
		return same
			? [
					{
						rule: "region-name",
						path: r.path,
						name: r.regionName,
						measured: `region "${r.regionName}" inside ${same.path} of the same name`,
						expected: "a name no region around it has",
						fix: "rename the Section or the Pane, or drop the Section's title when it only repeats the Pane's",
					},
				]
			: [];
	});
}

// ── margins ─────────────────────────────────────────────────────────

export interface MarginMeasure extends Located {
	// Top, right, bottom, left.
	margin: [number, number, number, number];
}

// A component's root has no margin: its parent places it.
export function checkRootMargins(items: MarginMeasure[]): Finding[] {
	return items.flatMap((m) =>
		m.margin.some((v) => v !== 0)
			? [
					{
						rule: "root-margin",
						path: m.path,
						name: m.name,
						measured: `margin ${m.margin.map(px).join(" ")}`,
						expected: "margin 0 on a component's root",
						fix: "remove the margin from the component's root; the parent lays it out with a gap or a flex or grid item property",
					},
				]
			: [],
	);
}

// ── focus ───────────────────────────────────────────────────────────

export interface FocusMeasure extends Located {
	// What stands at the centre of the focused element's visible part: the
	// element itself or inside it (`self`), or something else (`covered`, the
	// covering element's path and whether it is fixed or sticky).
	hit: "self" | "outside" | { covered: string; positioned: boolean };
}

// The focused element is not hidden under a fixed or sticky element.
export function checkFocus(focus: FocusMeasure | null): Finding[] {
	if (!focus || typeof focus.hit === "string") return [];
	if (!focus.hit.positioned) return [];
	return [
		{
			rule: "focus-covered",
			path: focus.path,
			name: focus.name,
			measured: `covered by ${focus.hit.covered}`,
			expected: "visible, not under a fixed or sticky element",
			fix: "scroll the focused element clear of the bar (scroll-padding on the scroller, or scroll-margin on the element)",
		},
	];
}

// ── report ──────────────────────────────────────────────────────────

// The findings as the lines a failed assertion prints: one line per rule,
// element shape and values, with a count when the same finding stands more
// than once.
export function format(findings: Finding[]): string[] {
	const groups = new Map<string, { first: Finding; count: number }>();
	for (const f of findings) {
		const key = [f.rule, f.path, f.measured, f.expected].join("\u0000");
		const group = groups.get(key);
		if (group) group.count += 1;
		else groups.set(key, { first: f, count: 1 });
	}
	return [...groups.values()].map(
		({ first: f, count }) =>
			`${f.rule}: ${f.path}${f.name ? ` "${f.name}"` : ""}${count > 1 ? ` ×${count}` : ""} measured ${f.measured}, expected ${f.expected}; fix: ${f.fix}`,
	);
}
