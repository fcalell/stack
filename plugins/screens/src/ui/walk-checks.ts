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
	// The box's floor (`min-height`), 0 where it has none: a control that sets
	// one grows past it with its content, so the floor is what the contract names.
	floor?: number;
}

// Each control's height is a size token at the density, or, where it sets a
// floor, the floor is one and the height at least it; each row at least the
// shortest row token (a row is a floor, `min-h-row`, that its content grows).
export function checkHeights(
	controls: HeightMeasure[],
	rows: HeightMeasure[],
	tokens: Tokens,
): Finding[] {
	const floor = Math.min(...tokens.rows.map((t) => t.px));
	return [
		...controls
			.filter((c) =>
				c.floor
					? !is(c.floor, tokens.controls) || c.height < c.floor - TOLERANCE
					: !is(c.height, tokens.controls),
			)
			.map((c) =>
				offToken(
					"control-height",
					c,
					c.floor ? `${c.kind} floor (min-height)` : `${c.kind} height`,
					c.floor || c.height,
					tokens.controls,
					"size the control by a size (control, target, row, icon-control) or a formula over sizes, as a height or as a floor (min-h-*)",
				),
			),
		...rows
			.filter((r) => r.height < floor - TOLERANCE)
			.map((r) => ({
				rule: "row-height",
				path: r.path,
				name: r.name,
				measured: `${r.kind} height ${px(r.height)}`,
				expected: `at least ${names(tokens.rows.slice(0, 1))}`,
				fix: "give the row the row floor (min-h-row)",
			})),
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

// The names of the entries of `values` that hold `value`, joined: the sides of
// a padding that share a length are one finding.
function sharing(names: readonly string[], values: number[], value: number) {
	return names.filter((_, i) => values[i] === value).join("/");
}

// A flex or grid container's gaps and padding are 0 or a spacing token.
export function checkSpacing(
	items: SpacingMeasure[],
	tokens: Tokens,
): Finding[] {
	const found: Finding[] = [];
	for (const item of items) {
		const gaps =
			item.rowGap === item.columnGap
				? [["gap", item.rowGap] as const]
				: ([
						["row-gap", item.rowGap],
						["column-gap", item.columnGap],
					] as const);
		const insets = [...new Set(item.padding)].map(
			(value) =>
				[`padding-${sharing(SIDES, item.padding, value)}`, value] as const,
		);
		for (const [what, value] of [...gaps, ...insets]) {
			if (value === 0 || is(value, tokens.spacing)) continue;
			const isGap = gaps.some(([name]) => name === what);
			found.push(
				offToken(
					isGap ? "gap" : "inset",
					item,
					what,
					value,
					tokens.spacing,
					isGap
						? "use a spacing role (gap, badge, pad, stack, section, page)"
						: "use a spacing role (gap, badge, pad, stack, section, page), the hairline or a centring inset over sizes",
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
		// Half the outer box's shorter side, where its radius stops growing.
		half: number;
		radii: [number, number, number, number];
		insets: [number, number, number, number];
	};
}

const CORNERS = [
	"top-left",
	"top-right",
	"bottom-right",
	"bottom-left",
] as const;

// Every radius is 0, a radius role or a pill (at least half the box's
// shorter side); a box inside a rounded box with an inset smaller than the
// outer radius has the outer radius less the inset.
export function checkRadii(items: RadiusMeasure[], tokens: Tokens): Finding[] {
	const found: Finding[] = [];
	for (const item of items) {
		const pill = Math.min(item.width, item.height) / 2;
		for (const radius of new Set(item.radii)) {
			if (
				radius === 0 ||
				radius >= pill - TOLERANCE ||
				is(radius, tokens.radius)
			)
				continue;
			found.push(
				offToken(
					"radius",
					item,
					`${sharing(CORNERS, item.radii, radius)} radius`,
					radius,
					tokens.radius,
					"use a radius role (chip, control, row, card, popover, sheet), or full for a pill",
				),
			);
		}
		if (!item.outer) continue;
		const { outer } = item;
		// A radius larger than half the shorter side draws as half of it.
		const drawn = item.radii.map((radius) => Math.min(radius, pill));
		const wanted = item.radii.map((_, corner) => {
			const out = Math.min(outer.radii[corner] ?? 0, outer.half);
			const inset = outer.insets[corner] ?? 0;
			return out === 0 || inset >= out ? null : out - inset;
		});
		const off = item.radii.flatMap((_, corner) => {
			const expected = wanted[corner];
			const radius = drawn[corner] ?? 0;
			// A pill is round by its role, whatever it stands in.
			return radius === 0 ||
				(item.radii[corner] ?? 0) >= pill - TOLERANCE ||
				expected == null ||
				Math.abs(radius - expected) <= TOLERANCE
				? []
				: [corner];
		});
		// Corners standing off by the same radius and inset are one finding.
		const seen = new Set<string>();
		for (const corner of off) {
			const key = `${drawn[corner]}|${wanted[corner]}`;
			if (seen.has(key)) continue;
			seen.add(key);
			const same = off.filter((c) => `${drawn[c]}|${wanted[c]}` === key);
			const out = Math.min(outer.radii[corner] ?? 0, outer.half);
			const inset = outer.insets[corner] ?? 0;
			found.push({
				rule: "nested-radius",
				path: item.path,
				name: item.name,
				measured: `${same.map((c) => CORNERS[c]).join("/")} radius ${px(drawn[corner] ?? 0)} inside ${outer.path} (radius ${px(out)}, inset ${px(inset)})`,
				expected: `${px(wanted[corner] ?? 0)} (outer ${px(out)} less inset ${px(inset)})`,
				fix: "give the inner box the outer radius less the inset, or inset it by at least the outer radius",
			});
		}
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
	// The element inside that reaches furthest past the box, where one does.
	widest?: { path: string; name: string; over: number };
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
			measured: `scrollWidth ${c.scrollWidth}px over clientWidth ${c.clientWidth}px${c.widest ? `, ${c.widest.path}${c.widest.name ? ` "${c.widest.name}"` : ""} reaches ${px(c.widest.over)} past it` : ""}`,
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

// A family's metric fallback face (`fallbackFace`: "<family> Fallback", whose
// source is a system font by `local()`): the browser loads it only for a glyph
// the family lacks (an arrow, "→"), and a host without that system font (a
// headless browser) fails it, which draws the platform stack's font after it.
// Nothing is served for it, so a failed one is no finding. `key` is
// `faceKey`'s: the family, weight and style. The fallback face declares no
// `font-weight`, so the browser reports its weight as the word `normal`; a
// served face reports numbers (`400`, `100 700`).
const WEIGHT = "(?:\\d+(?: \\d+)?|normal|bold|bolder|lighter)";
const STYLE = "(?:normal|italic|oblique)";
const FALLBACK_KEY = new RegExp(` Fallback"? ${WEIGHT} ${STYLE}$`);
export function isMetricFallback(key: string): boolean {
	return FALLBACK_KEY.test(key);
}

// A face the screen asked for at its first layout that was not loaded at the
// first frame draws the fallback and then jumps; a face that failed draws the
// fallback for good (a metric fallback face is a system font, which a host may
// lack: `isMetricFallback`).
export function checkFonts(faces: FontMeasure[]): Finding[] {
	return faces.flatMap((f) => {
		if (isMetricFallback(f.face)) return [];
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
	// A monospaced face draws every digit at one width already.
	monospace?: boolean;
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
			(n) =>
				isBareNumber(n.text) &&
				!n.monospace &&
				!n.variantNumeric.includes("tabular-nums"),
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

// ── headings ────────────────────────────────────────────────────────

export interface HeadingMeasure extends Located {
	level: number;
}

// Whether a heading is one the page has: one that draws (not under `display:
// none`, so a Pane folded away is not one) and is not under `aria-hidden`, or
// an inert box, except where a modal Sheet is open: the modal hides the page
// behind it (`aria-hidden`, `inert`) for as long as it stands, and the page's
// own `h1` is still the page's, so the page is judged as it stands once the
// Sheet closes.
export function isHeading(seen: {
	drawn: boolean;
	hidden: boolean;
	modal: boolean;
}): boolean {
	return seen.drawn && (!seen.hidden || seen.modal);
}

// The page's headings, in document order, the ones a reader gets (not under
// `display: none`, so a Pane folded away is not one): one `h1` names where you
// are, and a heading is never more than one level under the one before it.
export function checkHeadings(headings: HeadingMeasure[]): Finding[] {
	if (headings.length === 0) return [];
	const found: Finding[] = [];
	const ones = headings.filter((h) => h.level === 1);
	const first = headings[0];
	if (ones.length === 0 && first)
		found.push({
			rule: "heading-one",
			path: first.path,
			name: first.name,
			measured: "no h1 on the page",
			expected: "one h1, the name of where you are",
			fix: "a page in the Shell is named by its Place's title; a page outside it is a Gate, whose title is the h1",
		});
	for (const extra of ones.slice(1))
		found.push({
			rule: "heading-one",
			path: extra.path,
			name: extra.name,
			measured: `${ones.length} h1s on the page`,
			expected: "one h1",
			fix: "a Pane's title is an h2; the h1 is the Place's (or the Gate's)",
		});
	for (const [at, heading] of headings.entries()) {
		const before = headings[at - 1];
		if (before && heading.level > before.level + 1)
			found.push({
				rule: "heading-order",
				path: heading.path,
				name: heading.name,
				measured: `h${heading.level} after h${before.level}`,
				expected: `at most h${before.level + 1}`,
				fix: "a Section's title is the level under the heading above it; nothing skips a level",
			});
	}
	return found;
}

// ── canvas ──────────────────────────────────────────────────────────

export interface Rect {
	left: number;
	right: number;
	top: number;
	bottom: number;
}

// A canvas as it stands once it shows: its pane, the zoom stack's box, and the
// box each node draws (its card, or its glyph under the text floor).
export interface CanvasMeasure extends Located {
	pane: Rect;
	stack?: Rect;
	nodes: { name: string; rect: Rect }[];
}

const meetsRect = (a: Rect, b: Rect): boolean =>
	a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

// A canvas opens with every node whole at the pane's start and none under the
// zoom stack. The pane's far side may cut a node only where the graph is wider
// than the overview's floor holds, and the viewer pans for the rest; a node
// wholly outside the pane is the viewer's to pan to.
export function checkCanvases(canvases: CanvasMeasure[]): Finding[] {
	return canvases.flatMap((canvas) =>
		canvas.nodes.flatMap(({ name, rect }) => {
			const found: Finding[] = [];
			const cut = canvas.pane.left - rect.left;
			if (cut > 1 && rect.right > canvas.pane.left + 1)
				found.push({
					rule: "canvas-open",
					path: canvas.path,
					name,
					measured: `node "${name}" cut by ${px(cut)} at the pane's start`,
					expected: "every node whole at the pane's start",
					fix: "the opening fit stands the graph against the room past the zoom stack (`openingView`), so a cut node is the fit reading the wrong bounds",
				});
			if (canvas.stack && meetsRect(rect, canvas.stack))
				found.push({
					rule: "canvas-open",
					path: canvas.path,
					name,
					measured: `node "${name}" under the zoom stack`,
					expected: "every node clear of the zoom stack",
					fix: "the opening fit keeps nodes in the room the stack leaves, or opens as the overview where they cannot stand there",
				});
			return found;
		}),
	);
}

// ── alignment ───────────────────────────────────────────────────────

// The alignment rules are `align-*`: they report what a layout draws off the
// group structure (a row is a text group and an end group, a line has one
// baseline, nothing takes room and draws nothing) and fail a run with the
// walk's other rules.

// What a box was seen to draw, so a box that takes room and draws none of it
// is found.
export interface BoxMeasure extends Located {
	width: number;
	height: number;
	// Taken out of the flow (absolute, fixed): it reserves no room.
	outOfFlow: boolean;
	text: boolean;
	// A background colour or image, a border, a shadow or an outline, or a
	// pseudo-element with content.
	paints: boolean;
	// An svg, an image, a canvas, a field: it draws itself.
	replaced: boolean;
	// Focusable or a control: its hit is the box.
	interactive: boolean;
	// Some descendant draws.
	childrenDraw: boolean;
}

// A box in the flow, wider and taller than half a pixel, that draws nothing
// and holds nothing that does: the empty end square, a spacer. Room that
// holds an alignment is a group's gap or padding, never an element.
export function checkDeadBoxes(boxes: BoxMeasure[]): Finding[] {
	return boxes.flatMap((b) =>
		!b.outOfFlow &&
		b.width > TOLERANCE &&
		b.height > TOLERANCE &&
		!(b.text || b.paints || b.replaced || b.interactive || b.childrenDraw)
			? [
					{
						rule: "align-dead",
						path: b.path,
						name: b.name,
						measured: `an empty box ${px(b.width)} by ${px(b.height)} that draws nothing`,
						expected: "no element that only reserves room",
						fix: "remove the element; a group's gap or padding holds the room, and a row with no end item has no end group",
					},
				]
			: [],
	);
}

// What stands over a point of a text, from the topmost box down to the text's
// own: the page's facts about it, which the rule judges by.
export interface Above extends Located {
	// The box is the text's element, a part of it or a box it stands in.
	related: boolean;
	// It draws at the point: a background, a border, a picture or its own text.
	paints: boolean;
	// It stands in a layer that covers the page by design: a dialog, a menu, a
	// popover, a tooltip.
	layer: boolean;
	// It is a sticky box, which covers what scrolls under it.
	sticky: boolean;
}

// One text, and for each point sampled across its lines the boxes above it.
export interface CoverMeasure extends Located {
	samples: Above[][];
}

// A text is covered when a box that is no relative of it and draws at a
// point of one of its lines stands above it there. A layer, a sticky box, a
// transparent box and a hit area that draws nothing are no cover. A layer with
// `pointer-events: none` is never in the hit test: a decoration that lets the
// press through, by design, is not read.
export function checkCovered(texts: CoverMeasure[]): Finding[] {
	return texts.flatMap((t) => {
		const hits = new Map<string, { over: Above; count: number }>();
		for (const above of t.samples) {
			const over = above.find(
				(a) => !a.related && a.paints && !a.layer && !a.sticky,
			);
			if (!over) continue;
			const known = hits.get(over.path);
			if (known) known.count++;
			else hits.set(over.path, { over, count: 1 });
		}
		const worst = [...hits.values()].sort((a, b) => b.count - a.count)[0];
		return worst
			? [
					{
						rule: "text-covered",
						path: t.path,
						name: t.name,
						measured: `text covered at ${worst.count} of ${t.samples.length} sample points by ${worst.over.path} "${worst.over.name}"`,
						expected:
							"every line of a text shows, with nothing painted over it",
						fix: "stand the covering box in the flow after the text, or take it out of the text's lines; a box over a text is a layout the text's room does not hold",
					},
				]
			: [];
	});
}

// What a row's end item stands at.
export interface EndMeasure extends Located {
	// The vertical centre of what it draws, from the page's top.
	centre: number;
}

export interface RowMeasure extends Located {
	kind: string;
	// The centre of the row's content box (`contentCentre`).
	centre: number;
	// What is drawn beyond the text group: a value, a status, a control, a
	// chevron.
	ends: EndMeasure[];
}

// The vertical centre of a box's content, inside its padding: the border box's
// centre where the padding is symmetric, and the centre of the room the content
// has where a foot is taller (a row with a progress bar under its text).
export function contentCentre(
	top: number,
	height: number,
	paddingTop: number,
	paddingBottom: number,
): number {
	return top + paddingTop + (height - paddingTop - paddingBottom) / 2;
}

// The row's end items stand on one centre, the row's own, to a pixel: a value
// on the label's line beside a chevron on the row's middle is two.
export function checkCentres(rows: RowMeasure[]): Finding[] {
	return rows.flatMap((row) => {
		if (row.ends.length === 0) return [];
		const off = row.ends.filter((e) => Math.abs(e.centre - row.centre) > 1);
		if (off.length === 0) return [];
		const centres = row.ends.map((e) => `"${e.name}" ${px(e.centre)}`);
		return [
			{
				rule: "align-centre",
				path: row.path,
				name: row.name,
				measured: `${row.kind} centre ${px(row.centre)}, ends at ${centres.join(", ")}`,
				expected: "every end item on the row's centre, within 1px",
				fix: "put the end items in one end group centred on the row (align-self center), outside the text group's lines",
			},
		];
	});
}

// A bare text run on a flex-row line: where its baseline stands and the box it
// was read from.
export interface RunMeasure extends Located {
	// The flex item the run stands in: runs of one item share a line by
	// construction and are not compared.
	lane: number;
	size: number;
	// The glyph box (top and height) and the baseline, from the page's top.
	top: number;
	height: number;
	baseline: number;
}

// Texts of different sizes on one line share a baseline, to a pixel: a count
// centred by its line box beside a heading rides above the heading's
// baseline. The runs are the bare texts of one flex row's items; two share a
// line when they overlap by most of the smaller one's height (a value centred
// over a title and its meta shares neither), and are compared when their sizes
// differ.
export function checkBaselines(runs: RunMeasure[]): Finding[] {
	const found: Finding[] = [];
	for (const [i, a] of runs.entries()) {
		for (const b of runs.slice(i + 1)) {
			if (a.lane === b.lane || Math.abs(a.size - b.size) < 1) continue;
			const overlap =
				Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
			if (overlap < 0.8 * Math.min(a.height, b.height)) continue;
			const off = b.baseline - a.baseline;
			if (Math.abs(off) <= 1) continue;
			const [big, small] = a.size >= b.size ? [a, b] : [b, a];
			const by = small.baseline - big.baseline;
			found.push({
				rule: "align-baseline",
				path: small.path,
				name: small.name,
				measured: `${px(small.size)} text baseline ${px(Math.abs(by))} ${by > 0 ? "below" : "above"} the ${px(big.size)} "${big.name}" on its line`,
				expected: "one baseline for the texts of a line",
				fix: "align the line's items on the baseline (align-items baseline) instead of centring their boxes",
			});
		}
	}
	return found;
}

// An element laid out as a grid. The phone has no grid, so a layout that
// mirrors it is flex groups; a grid is found wherever it is drawn.
export interface GridMeasure extends Located {
	display: string;
}

export function checkGrids(grids: GridMeasure[]): Finding[] {
	return grids.flatMap((g) =>
		g.display === "grid" || g.display === "inline-grid"
			? [
					{
						rule: "align-grid",
						path: g.path,
						name: g.name,
						measured: `display ${g.display}`,
						expected: "flex only (the phone mirrors the layout)",
						fix: "lay the groups out with flex: a row of a text group and an end group, a column of rows",
					},
				]
			: [],
	);
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

// ── words and figures ───────────────────────────────────────────────

export interface WordMeasure extends Located {
	word: string;
	// The lines the word's glyphs stand on.
	lines: number;
}

// The most letters a word may have and never be cut across lines: a short word
// split ("Spri / nt") is a layout that starved its box, never a wrap.
export const WHOLE_WORD_LETTERS = 6;

export function checkWords(items: WordMeasure[]): Finding[] {
	return items
		.filter((w) => w.lines > 1)
		.map((w) => ({
			rule: "word-split",
			path: w.path,
			name: w.name || w.word,
			measured: `"${w.word}" on ${w.lines} lines`,
			expected: `a word of ${WHOLE_WORD_LETTERS} letters or fewer on one line`,
			fix: "give the text the room of its longest word (min-w-min over wrap-normal) and let what shares its line wrap under it",
		}));
}

export interface FigureMeasure extends Located {
	text: string;
	// How far the figure's text reaches past the box that clips it; 0 or less
	// where nothing clips it.
	over: number;
}

// A figure is read whole: a bare number cut by a clipping box (or truncated
// with an ellipsis) reads as another number.
export function checkFigures(items: FigureMeasure[]): Finding[] {
	return items
		.filter((f) => isBareNumber(f.text) && f.over > 1)
		.map((f) => ({
			rule: "figure-cut",
			path: f.path,
			name: f.name || f.text.trim(),
			measured: `"${f.text.trim()}" reaches ${px(f.over)} past its clipping box`,
			expected: "the figure whole",
			fix: "let the figure take its own width and wrap what shares its line (a unit) under it, or give its cell its own line",
		}));
}

// ── toolbars ────────────────────────────────────────────────────────

export interface ToolbarMeasure extends Located {
	// The search box's bottom and the acts group's top (page coordinates).
	searchBottom: number;
	actsTop: number;
	actsWidth: number;
	// The short measure at the search's font, the row's gap and the row's room
	// (its width less its padding).
	short: number;
	gap: number;
	row: number;
}

// A toolbar's acts stand on the search's line wherever the row holds the
// search's short measure, the gap and the acts beside it (voice 14).
export function checkToolbars(items: ToolbarMeasure[]): Finding[] {
	return items
		.filter(
			(t) =>
				t.actsTop >= t.searchBottom - 1 &&
				t.row >= t.short + t.gap + t.actsWidth + 1,
		)
		.map((t) => ({
			rule: "toolbar-wrap",
			path: t.path,
			name: t.name,
			measured: `the acts wrapped under the search in a row of ${px(t.row)}, which holds ${px(t.short)} of search, ${px(t.gap)} and ${px(t.actsWidth)} of acts`,
			expected: "the acts on the search's line",
			fix: "give the search a basis of the short measure (TOOLBAR_SEARCH) and let it grow, so it never holds the row on its own width",
		}));
}
