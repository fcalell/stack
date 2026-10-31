import {
	RADIUS_ROLES,
	SIZES,
	SPACING_ROLES,
	TYPE_ROLES,
} from "@fcalell/ui-core/tokens";
import {
	type BoxMeasure,
	type ClipMeasure,
	checkBaselines,
	checkCentres,
	checkClip,
	checkDeadBoxes,
	checkDigits,
	checkFonts,
	checkGrids,
	checkHeights,
	checkRadii,
	checkRegions,
	checkSpacing,
	checkType,
	type EndMeasure,
	type Finding,
	type FontMeasure,
	type GridMeasure,
	type HeightMeasure,
	type Located,
	type NumberMeasure,
	type RadiusMeasure,
	type RegionMeasure,
	type RowMeasure,
	type RunMeasure,
	type SpacingMeasure,
	type TextMeasure,
	type Token,
	type Tokens,
} from "./walk-checks.ts";

// The render walk: one pass over the page's elements that reads what is drawn
// against the contract's values, in the page's own computed custom
// properties at the density it is in (so the numbers are the ones the theme
// emitted, never a second copy). The test run calls it once per width after
// the resize settles.

export type { Finding } from "./walk-checks.ts";
export { format } from "./walk-checks.ts";

// The named exceptions, the one place the walk lets a rule pass over an
// element: the rule, a selector the element (or an ancestor) matches, for
// `nested-radius` the selector of the rounded box it stands in, and why. Never
// a baseline: each stands for a thing the contract itself draws off the rule.
export interface Exception {
	rule: string;
	selector: string;
	outer?: string;
	/** The element itself must match, not an ancestor: the rule names the element, not what it holds. */
	self?: true;
	reason: string;
}

export const EXCEPTIONS: Exception[] = [
	{
		rule: "clip",
		selector: ".flex-wrap.h-chip.overflow-hidden",
		reason:
			"a row's chip slot shows a chip whole or not at all: a chip wider than the room wraps under the slot's one line and is clipped away",
	},
	{
		rule: "clip",
		selector: ":has(> [data-painted], > * > [data-painted])",
		reason:
			"a painted text clips at its slot's edge where a loaded one ends in an ellipsis: the filler is no words to cut short (`globals.css`); a line of meta parts holds each part's filler one box down",
	},
	{
		rule: "gap",
		selector: '[class*="gap-x-[calc(var(--spacing-gap)*1.5)]"]',
		self: true,
		reason:
			"a line of meta parts parts them by a word space, the dot and a word space: a gap and a half, the dot's box a gap and a half wide pulled into the gap before its part, so the dot of a part that starts a line stands past the line's clipped edge (`parts-line.tsx`)",
	},
	{
		rule: "inset",
		selector: '[class~="pt-[calc(1lh/2)]"]',
		reason:
			"a chart's plot starts half a tick label's line below its top, so the top gridline's label centres on the line",
	},
	{
		rule: "row-height",
		selector: "tr.text-code",
		reason:
			"a code line of a Diff or Code is one code leading tall, not a row of a list",
	},
	{
		rule: "type-size",
		selector: "main.min-h-screen",
		reason:
			"the Foundations page is the contract's specimen: it draws every type role, so its sizes are the roles, not a screen's",
	},
	{
		rule: "nested-radius",
		selector: ".rounded-control, .rounded-row, .rounded-chip",
		outer: ".rounded-card, .rounded-popover, .rounded-sheet",
		reason:
			"a control, a row or a chip inside a card, a popover or a sheet keeps its role's radius at the float or card inset (6 in 8 at 5): two roles, not a concentric pair",
	},
	{
		rule: "nested-radius",
		selector: ".rounded-t-sheet, .rounded-b-sheet, .rounded-t-card",
		reason:
			"a head or foot that carries its box's ground to the corners (a sheet's panel and foot, a group's head) follows the box's radius under the hairline",
	},
	{
		rule: "nested-radius",
		selector: ".rounded-popover",
		reason:
			"a popover floats over the page: the box beneath it is no part of it",
	},
	{
		rule: "clip",
		selector: '[class~="@container/canvas"]',
		reason:
			"a canvas clips the graph beyond its view, which its pan and zoom reach",
	},
	{
		rule: "control-height",
		selector: "button.block.relative.shrink-0.overflow-hidden",
		reason:
			"an image that opens is a button sized by its picture, up to the image cap, not as a control",
	},
	{
		rule: "control-height",
		selector: "input.text-code",
		reason:
			"a code field's input is the text line inside the field box, which holds the control height",
	},
	{
		rule: "align-dead",
		selector: "td > .min-h-row",
		reason:
			"a table's empty cell holds its column's room so the columns line up under the header: a cell with no value has nothing to draw",
	},
	{
		rule: "align-dead",
		selector:
			'header.border-b > [class~="min-h-[calc(var(--spacing-control)+2*var(--spacing-gap))]"]',
		self: true,
		reason:
			"a page is its bar across the top over one hairline, and the Panes of a Place stand it on one line (voice 1, 2): a Pane whose read answered not found beside another has no back act (the missing form's Back is the one way out), no title and no acts, and its bar keeps the line its neighbours' bars stand on",
	},
	{
		rule: "align-dead",
		selector: ":has(> div > section.opacity-0)",
		reason:
			"a canvas is transparent until it has measured its fit and fades in: its region holds it, not nothing",
	},
	{
		rule: "align-grid",
		selector: '[class~="grid-cols-[auto_minmax(0,1fr)]"]',
		self: true,
		reason:
			"the run of rows (a sheet's, a Form's) is one two-column grid, so a definition row's label column is as wide as the widest label of the run (structure rule 1)",
	},
	{
		rule: "align-grid",
		selector: '[class~="grid-cols-subgrid"]',
		self: true,
		reason:
			"a definition row subgrids the run's two columns, and a form's group subgrids them for its own rows, so their labels align with the rest (structure rule 1)",
	},
	{
		rule: "control-height",
		selector: ".py-hairline.-my-hairline",
		reason:
			"a pick of several's trigger grows with the chips it wraps, from the compact control's floor",
	},
];

function excepted(rule: string, element: Element, outer?: Element): boolean {
	return EXCEPTIONS.some(
		(e) =>
			e.rule === rule &&
			(e.self
				? element.matches(e.selector)
				: element.closest(e.selector) !== null) &&
			(e.outer === undefined || outer?.matches(e.outer) === true),
	);
}

// ── the contract's values ───────────────────────────────────────────

// The sizes a control's height is one of, and a row's: the contract names
// them, the page says how many pixels at its density.
const CONTROL_SIZES = [
	"control",
	"control-compact",
	"field",
	"target",
	"chip",
	"chip-compact",
	"otp",
	"avatar",
	"switch-h",
	"check",
	"image-tile",
	"row",
	"row-2",
	"strip",
] as const;
const ROW_SIZES = ["row", "row-2"] as const;
// Insets that are not spacing roles: a field's border, a pick's chips, an
// icon act's glyph, a switch's knob.
const INSET_SIZES = [
	"hairline",
	"chips-inset",
	"icon-inset",
	"switch-inset",
] as const;

// A length the page gives a custom property, in pixels where the element
// stands: `calc`s and `rem`s resolve through a probe, which is also what the
// room scope's values (`calc`s over its own unit) need.
function resolveTokens(scope: Element): Tokens {
	const declared = getComputedStyle(scope);
	const probe = document.createElement("div");
	probe.style.cssText =
		"position:absolute;visibility:hidden;pointer-events:none;inset:0 auto auto 0";
	scope.append(probe);
	const read = (prefix: string, name: string): Token[] => {
		const property = `--${prefix}-${name}`;
		if (declared.getPropertyValue(property).trim() === "") return [];
		if (prefix === "text") {
			probe.style.fontSize = `var(${property})`;
			return [
				{ name, px: Number.parseFloat(getComputedStyle(probe).fontSize) },
			];
		}
		probe.style.width = `var(${property})`;
		return [{ name, px: probe.getBoundingClientRect().width }];
	};
	const sizes = (names: readonly string[]) =>
		SIZES.filter((s) => names.includes(s)).flatMap((s) => read("spacing", s));
	try {
		return {
			text: TYPE_ROLES.flatMap((r) => read("text", r)),
			spacing: [
				...SPACING_ROLES.flatMap((r) => read("spacing", r)),
				...sizes(INSET_SIZES),
			],
			controls: sizes(CONTROL_SIZES),
			rows: sizes(ROW_SIZES),
			radius: RADIUS_ROLES.filter((r) => r !== "full").flatMap((r) =>
				read("radius", r),
			),
		};
	} finally {
		probe.remove();
	}
}

// The properties that tell one token scope from another: a box that holds its
// own values (the room's `Place` draws every length from its own unit) differs
// from the root in these.
const SENTINELS = [
	`--spacing-${SIZES[0]}`,
	`--spacing-${SPACING_ROLES[0]}`,
	`--text-${TYPE_ROLES[0]}`,
];

// The contract's values for the elements of one scope, read once.
class Scopes {
	private known = new Map<string, Tokens>();

	of(
		element: Element,
		style: CSSStyleDeclaration,
	): { key: string; tokens: Tokens } {
		const key = SENTINELS.map((p) => style.getPropertyValue(p).trim()).join(
			"|",
		);
		let tokens = this.known.get(key);
		if (!tokens) {
			tokens = resolveTokens(element);
			this.known.set(key, tokens);
		}
		return { key, tokens };
	}
}

// The mark of the token set the page draws now: the first size token's value
// as the root holds it, which differs between the touch and desktop sets. The
// test run compares it across widths to know that the density followed them.
export function densityMark(): string {
	return getComputedStyle(document.documentElement)
		.getPropertyValue(`--spacing-${SIZES[0]}`)
		.trim();
}

// ── what is drawn ───────────────────────────────────────────────────

interface Seen {
	element: Element;
	style: CSSStyleDeclaration;
	rect: DOMRect;
}

const SKIPPED = new Set(["SCRIPT", "STYLE", "TEMPLATE", "NOSCRIPT", "HEAD"]);

// The elements that draw a box, in document order: none of display none, none
// under `aria-hidden`, none of visibility hidden or under a pixel on a side
// (a visually hidden input is no control), and `display: contents` seen
// through, so its children are measured and it is not. An svg is one element:
// its parts are drawn in the drawing's own units.
function drawn(roots: Element[]): Seen[] {
	const seen: Seen[] = [];
	const visit = (element: Element): void => {
		if (SKIPPED.has(element.tagName)) return;
		if (element.getAttribute("aria-hidden") === "true") return;
		const style = getComputedStyle(element);
		if (style.display === "none") return;
		if (style.display !== "contents") {
			const rect = element.getBoundingClientRect();
			// A pixel-wide box that clips holds nothing to see: the visually
			// hidden text pattern.
			if (
				(style.overflowX === "hidden" || style.overflowX === "clip") &&
				(rect.width <= 1 || rect.height <= 1)
			)
				return;
			if (style.visibility === "visible" && rect.width > 1 && rect.height > 1)
				seen.push({ element, style, rect });
		}
		if (element instanceof SVGElement) return;
		for (const child of element.children) visit(child);
	};
	for (const root of roots) visit(root);
	return seen;
}

// Where an element stands and what it is called, for a finding.
function locate(element: Element, leaf = true): Located {
	const part = (node: Element, withClasses: boolean): string => {
		const role = node.getAttribute("role");
		const classes = withClasses
			? [...node.classList]
					.filter((c) => !/^(light|dark)$/.test(c))
					.slice(0, 2)
					.map((c) => `.${c}`)
					.join("")
			: "";
		return `${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ""}${role ? `[${role}]` : ""}${classes}`;
	};
	const chain: string[] = [part(element, leaf)];
	let up = element.parentElement;
	for (let n = 0; up && n < 3 && up !== document.body; n++) {
		chain.push(part(up, false));
		up = up.parentElement;
	}
	return { path: chain.join(" < "), name: nameOf(element) };
}

function nameOf(element: Element): string {
	const label = element.getAttribute("aria-label");
	if (label) return label.slice(0, 40);
	const by = element.getAttribute("aria-labelledby");
	if (by) {
		const text = by
			.split(/\s+/)
			.map((id) => document.getElementById(id)?.textContent?.trim() ?? "")
			.join(" ")
			.trim();
		if (text) return text.slice(0, 40);
	}
	if (element instanceof HTMLInputElement && element.placeholder)
		return element.placeholder.slice(0, 40);
	return (element.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
}

const px = (value: string): number => Number.parseFloat(value) || 0;

// The text nodes of the drawn elements that hold something to read.
function texts(seen: Seen[]): Array<{ node: Text; seen: Seen }> {
	const out: Array<{ node: Text; seen: Seen }> = [];
	for (const s of seen) {
		if (s.element.tagName === "OPTION") continue;
		for (const node of s.element.childNodes) {
			if (node.nodeType === Node.TEXT_NODE && node.nodeValue?.trim())
				out.push({ node: node as Text, seen: s });
		}
	}
	return out;
}

// Elements whose scroll size says nothing of a layout error: a field's own
// text, an image.
const REPLACED = new Set([
	"INPUT",
	"TEXTAREA",
	"SELECT",
	"IMG",
	"VIDEO",
	"CANVAS",
]);

const INPUT_TYPES = new Set([
	"text",
	"email",
	"password",
	"search",
	"tel",
	"url",
	"number",
]);

// A control by its element or role: what a person presses, types in or picks
// from, never an inline link or a field that grows with its text.
function controlKind(
	element: Element,
	style: CSSStyleDeclaration,
): string | null {
	// A hit overlay stretched over its row or field takes the box's height.
	if (
		style.position === "absolute" &&
		style.top === "0px" &&
		style.bottom === "0px"
	)
		return null;
	const role = element.getAttribute("role");
	if (role === "button" || role === "switch" || role === "checkbox")
		return role;
	if (role === "radio" || role === "tab" || role === "combobox") return role;
	if (role === "textbox" || role === "searchbox" || role === "spinbutton")
		return element.getAttribute("aria-multiline") === "true" ? null : role;
	if (element.tagName === "BUTTON") return "button";
	if (element.tagName === "SELECT") return "select";
	if (element instanceof HTMLInputElement) {
		if (element.type === "checkbox" || element.type === "radio")
			return element.type;
		return INPUT_TYPES.has(element.type) ? "input" : null;
	}
	return null;
}

// A row by role: a prose list's item is text, not a row.
const ROW_ROLES = new Set([
	"row",
	"option",
	"menuitem",
	"menuitemcheckbox",
	"menuitemradio",
	"treeitem",
	"listitem",
]);

function rowKind(element: Element): string | null {
	const role = element.getAttribute("role");
	if (role) return ROW_ROLES.has(role) ? role : null;
	return element.tagName === "TR" ? "row" : null;
}

// A region landmark: an explicit region or a section with a name, whose name
// is the label it carries or the text it points at.
function regionName(element: Element): string | null {
	const role = element.getAttribute("role");
	if (role !== "region" && !(role === null && element.tagName === "SECTION"))
		return null;
	const name = nameOf(element);
	const named =
		element.hasAttribute("aria-label") ||
		element.hasAttribute("aria-labelledby");
	return named && name ? name : null;
}

function corners(style: CSSStyleDeclaration, rect: DOMRect) {
	const read = (value: string): number => {
		const first = value.split(" ")[0] ?? "0";
		return first.endsWith("%")
			? (Number.parseFloat(first) / 100) * Math.min(rect.width, rect.height)
			: px(first);
	};
	return [
		read(style.borderTopLeftRadius),
		read(style.borderTopRightRadius),
		read(style.borderBottomRightRadius),
		read(style.borderBottomLeftRadius),
	] as [number, number, number, number];
}

const painted = (style: CSSStyleDeclaration): boolean =>
	(style.backgroundColor !== "rgba(0, 0, 0, 0)" &&
		style.backgroundColor !== "transparent") ||
	["Top", "Right", "Bottom", "Left"].some(
		(side) =>
			px(style.getPropertyValue(`border-${side.toLowerCase()}-width`)) > 0,
	);

// ── the walk ────────────────────────────────────────────────────────

// Waits for the finite animations and transitions on the page to end, so a
// popup still opening or a sheet sliding in is judged where it settles (an
// endless one, a spinner or a shimmer, is left running). Gives up after
// `timeout` ms.
export async function settled(timeout = 2000): Promise<void> {
	const end = performance.now() + timeout;
	while (performance.now() < end) {
		const running = document
			.getAnimations()
			.filter(
				(animation) =>
					animation.playState === "running" &&
					Number.isFinite(animation.effect?.getComputedTiming().endTime ?? 0),
			);
		if (running.length === 0) return;
		await Promise.race([
			Promise.allSettled(running.map((animation) => animation.finished)),
			new Promise((resolve) => setTimeout(resolve, 100)),
		]);
	}
}

// The first frame a screen draws, after its first layout: the status of every
// font face then. A face a screen asks for starts loading at its first layout,
// so one still loading at the first frame is a face that arrives late.
let paintFaces = new Map<string, string>();
let watching: MutationObserver | undefined;

function faceKey(face: FontFace): string {
	return `${face.family} ${face.weight} ${face.style}`;
}

// Starts watching for the screen's first frame: the first element the root
// gains. Call it before the story renders; a later call starts over.
export function watchFirstPaint(root: Element = document.body): void {
	watching?.disconnect();
	paintFaces = new Map();
	watching = new MutationObserver((records) => {
		const added = records.some((record) =>
			[...record.addedNodes].some(
				(node) => node.nodeType === Node.ELEMENT_NODE,
			),
		);
		if (!added) return;
		watching?.disconnect();
		watching = undefined;
		requestAnimationFrame(() => {
			// A read that forces layout, which is what starts the faces the
			// screen asks for.
			void document.body.offsetHeight;
			for (const face of document.fonts)
				paintFaces.set(faceKey(face), face.status);
		});
	});
	watching.observe(root, { childList: true, subtree: true });
}

function fonts(): FontMeasure[] {
	return [...document.fonts].map((face) => ({
		face: faceKey(face),
		atPaint: paintFaces.get(faceKey(face)) ?? "unseen",
		now: face.status,
	}));
}

export interface WalkOptions {
	// The elements to walk, the whole page by default; one component's frames in
	// a roster story. The checks that read the page (its fonts, its count of
	// type sizes) are left to the whole page.
	roots?: Element[];
	// Whether the fonts are judged too (once a screen: they do not change with
	// the width); on by default.
	fonts?: boolean;
}

// What the elements of one token scope measured.
interface Group {
	tokens: Tokens;
	controls: HeightMeasure[];
	rows: HeightMeasure[];
	spacing: SpacingMeasure[];
	radii: RadiusMeasure[];
}

// Whether the alignment rules (`align-*`) fail a run: they do, and `findings()`
// holds them with the layout rules; `alignFindings()` returns them alone.
export const ALIGN_FAILS: boolean = true;

// Every finding on the page, or under `roots`, the alignment rules among them.
export function findings(options: WalkOptions = {}): Finding[] {
	return ALIGN_FAILS
		? [...layoutFindings(options), ...alignFindings(options)]
		: layoutFindings(options);
}

function layoutFindings(options: WalkOptions): Finding[] {
	const roots = options.roots ?? [document.body];
	const scoped = options.roots !== undefined;
	const seen = drawn(roots);
	const scopes = new Scopes();
	const groups = new Map<string, Group>();
	const groupOf = (element: Element, style: CSSStyleDeclaration): Group => {
		const { key, tokens } = scopes.of(element, style);
		let group = groups.get(key);
		if (!group) {
			group = { tokens, controls: [], rows: [], spacing: [], radii: [] };
			groups.set(key, group);
		}
		return group;
	};

	const type: TextMeasure[] = [];
	const numbers: NumberMeasure[] = [];
	for (const { node, seen: s } of texts(seen)) {
		if (excepted("type-size", s.element)) continue;
		const at = locate(s.element);
		type.push({ ...at, size: px(s.style.fontSize) });
		numbers.push({
			...at,
			text: node.nodeValue ?? "",
			variantNumeric: s.style.fontVariantNumeric,
			monospace: /mono/i.test(s.style.fontFamily),
		});
	}

	const clips: ClipMeasure[] = [];
	const regions: RegionMeasure[] = [];

	for (const { element, style, rect } of seen) {
		const at = () => locate(element);
		const group = groupOf(element, style);
		const control = controlKind(element, style);
		if (control && !excepted("control-height", element))
			group.controls.push({
				...at(),
				kind: control,
				height: rect.height,
				floor: px(style.minHeight),
			});
		const row = rowKind(element);
		if (row && !excepted("row-height", element))
			group.rows.push({ ...at(), kind: row, height: rect.height });

		if (/(flex|grid)/.test(style.display)) {
			const inFlow = [...element.children].filter((child) => {
				const position = getComputedStyle(child).position;
				return position !== "absolute" && position !== "fixed";
			}).length;
			if (!excepted("gap", element) && !excepted("inset", element))
				group.spacing.push({
					...at(),
					rowGap: inFlow > 1 ? px(style.rowGap) : 0,
					columnGap: inFlow > 1 ? px(style.columnGap) : 0,
					padding: [
						px(style.paddingTop),
						px(style.paddingRight),
						px(style.paddingBottom),
						px(style.paddingLeft),
					],
				});
		}

		const radius = corners(style, rect);
		if (radius.some((r) => r > 0) && !excepted("radius", element)) {
			const measure: RadiusMeasure = {
				...at(),
				radii: radius,
				width: rect.width,
				height: rect.height,
			};
			if (painted(style) || style.overflowX !== "visible")
				measure.outer = outerOf(element, rect, roots);
			group.radii.push(measure);
		}

		if (
			(style.overflowX === "hidden" || style.overflowX === "clip") &&
			!REPLACED.has(element.tagName) &&
			!excepted("clip", element)
		) {
			clips.push({
				...at(),
				overflowX: style.overflowX,
				textOverflow: style.textOverflow,
				lineClamp: style.getPropertyValue("-webkit-line-clamp"),
				scrollWidth: element.scrollWidth,
				clientWidth: element.clientWidth,
				widest:
					element.scrollWidth > element.clientWidth + 1
						? widest(element)
						: undefined,
			});
		}

		const name = regionName(element);
		if (name !== null && !excepted("region-name", element)) {
			const within: RegionMeasure["within"] = [];
			for (let up = element.parentElement; up; up = up.parentElement) {
				const outer = regionName(up);
				if (outer !== null)
					within.push({ path: locate(up, false).path, regionName: outer });
			}
			regions.push({ ...at(), regionName: name, within });
		}
	}

	return [
		...checkType(type).filter((f) => !scoped || f.rule !== "type-sizes"),
		...[...groups.values()].flatMap((g) => [
			...checkHeights(g.controls, g.rows, g.tokens),
			...checkSpacing(g.spacing, g.tokens),
			...checkRadii(g.radii, g.tokens),
		]),
		...checkClip(clips),
		...checkDigits(numbers),
		...checkRegions(regions),
		...(scoped || options.fonts === false ? [] : checkFonts(fonts())),
	];
}

// The descendant of a box that reaches furthest past its right edge.
function widest(box: Element): ClipMeasure["widest"] {
	const edge = box.getBoundingClientRect().right;
	let best: ClipMeasure["widest"];
	for (const element of box.querySelectorAll("*")) {
		const over = element.getBoundingClientRect().right - edge;
		if (over > 1 && (!best || over > best.over)) {
			const at = locate(element);
			best = { ...at, over };
		}
	}
	return best;
}

// The nearest ancestor that paints a rounded box, and how far `element`
// stands inside it at each corner.
function outerOf(
	element: Element,
	rect: DOMRect,
	roots: Element[],
): RadiusMeasure["outer"] | undefined {
	for (
		let up = element.parentElement;
		up && up !== document.body && !roots.includes(up);
		up = up.parentElement
	) {
		const style = getComputedStyle(up);
		const box = up.getBoundingClientRect();
		const radii = corners(style, box);
		if (!radii.some((r) => r > 0) || !painted(style)) continue;
		// A box that stands outside it (a popup drawn beside its trigger) is
		// not inside it.
		if (
			rect.left < box.left - 0.5 ||
			rect.top < box.top - 0.5 ||
			rect.right > box.right + 0.5 ||
			rect.bottom > box.bottom + 0.5
		)
			continue;
		if (excepted("nested-radius", element, up)) return undefined;
		const left = rect.left - box.left;
		const top = rect.top - box.top;
		const right = box.right - rect.right;
		const bottom = box.bottom - rect.bottom;
		return {
			path: locate(up, false).path,
			half: Math.min(box.width, box.height) / 2,
			radii,
			insets: [
				Math.min(left, top),
				Math.min(right, top),
				Math.min(right, bottom),
				Math.min(left, bottom),
			],
		};
	}
	return undefined;
}

// ── alignment ───────────────────────────────────────────────────────

// What a row, a line and a box are held to (`align-*`): a row is a text group
// and an end group centred on the row, a line of mixed sizes has one baseline,
// nothing takes room and draws nothing, and the layout is flex alone.

// The colour draws nothing: transparent, or an alpha of zero in either
// notation the page's computed colours take.
const clear = (color: string): boolean =>
	color === "transparent" ||
	/^rgba\(.*,\s*0\)$/.test(color) ||
	/\/\s*0(\.0+)?%?\s*\)$/.test(color);

// A box draws by itself: a background colour or image, a border that shows, a
// shadow, an outline, or a pseudo-element with content (a rule or a ring).
function paintsOwn(element: Element, style: CSSStyleDeclaration): boolean {
	if (!clear(style.backgroundColor) || style.backgroundImage !== "none")
		return true;
	if (style.boxShadow !== "none") return true;
	if (
		["Top", "Right", "Bottom", "Left"].some((side) => {
			const edge = `border-${side.toLowerCase()}`;
			return (
				px(style.getPropertyValue(`${edge}-width`)) > 0 &&
				style.getPropertyValue(`${edge}-style`) !== "none" &&
				!clear(style.getPropertyValue(`${edge}-color`))
			);
		})
	)
		return true;
	if (px(style.outlineWidth) > 0 && style.outlineStyle !== "none") return true;
	return (["::before", "::after"] as const).some((pseudo) => {
		const content = getComputedStyle(element, pseudo).content;
		return content !== "none" && content !== "normal";
	});
}

// Elements that draw themselves, or are a table's own structure (an empty cell
// is a column's room, not a spacer).
const SELF_DRAWN = new Set([
	...REPLACED,
	"IFRAME",
	"OBJECT",
	"EMBED",
	"METER",
	"PROGRESS",
	"AUDIO",
	"HR",
	"BR",
	"TD",
	"TH",
	"TR",
	"COL",
	"COLGROUP",
	"CAPTION",
]);

const INTERACTIVE_ROLES = new Set([
	"button",
	"switch",
	"checkbox",
	"radio",
	"tab",
	"combobox",
	"slider",
	"textbox",
	"searchbox",
	"spinbutton",
	"menuitem",
	"menuitemcheckbox",
	"menuitemradio",
	"option",
	"link",
	"treeitem",
]);

// Focusable, or a control: its hit is its box.
function interactive(element: Element): boolean {
	if (element instanceof HTMLElement && element.tabIndex >= 0) return true;
	if (
		element.matches(
			"a[href], button, input, select, textarea, summary, [contenteditable]",
		)
	)
		return true;
	const role = element.getAttribute("role");
	return role !== null && INTERACTIVE_ROLES.has(role);
}

const replaced = (element: Element): boolean =>
	element instanceof SVGElement || SELF_DRAWN.has(element.tagName);

// Text the element draws: a text node with a character in it, white space
// alone only where the box preserves it (a code line's indent is its text).
const hasText = (element: Element): boolean => {
	const preserved = /^(pre|pre-wrap|break-spaces)$/.test(
		getComputedStyle(element).whiteSpace,
	);
	return [...element.childNodes].some(
		(node) =>
			node.nodeType === Node.TEXT_NODE &&
			(preserved ? node.nodeValue : node.nodeValue?.trim()),
	);
};

const outOfFlow = (style: CSSStyleDeclaration): boolean =>
	style.position === "absolute" || style.position === "fixed";

// Whether an element, or something in it, draws: text, paint, a picture, a
// control. What is not displayed or fully transparent draws nothing, and an
// element placed out of the flow still draws what it holds.
function draws(element: Element, memo: Map<Element, boolean>): boolean {
	const known = memo.get(element);
	if (known !== undefined) return known;
	const style = getComputedStyle(element);
	let found = false;
	// A box fading in (the paint's fade, transparent until its delay passes) is
	// content on its way, not nothing.
	if (
		style.display !== "none" &&
		(style.opacity !== "0" || style.animationName !== "none")
	) {
		found =
			style.display !== "contents" &&
			style.visibility === "visible" &&
			(hasText(element) ||
				paintsOwn(element, style) ||
				replaced(element) ||
				interactive(element));
		if (!found && !(element instanceof SVGElement))
			found = [...element.children].some((child) => draws(child, memo));
	}
	memo.set(element, found);
	return found;
}

// Every box in the flow under `roots` with what it draws, outermost empty box
// first: one that is found is not entered, for what it holds is as empty.
// `aria-hidden` is no excuse here: the empty end square is hidden from a screen
// reader and still takes room.
function boxes(roots: Element[]): BoxMeasure[] {
	const out: BoxMeasure[] = [];
	const memo = new Map<Element, boolean>();
	const visit = (element: Element): void => {
		if (SKIPPED.has(element.tagName) || element instanceof SVGElement) return;
		// A window's spacer stands for the rows outside the window: its room is
		// theirs, drawn or not.
		if (element.hasAttribute("data-spacer")) return;
		const style = getComputedStyle(element);
		if (style.display === "none" || style.opacity === "0") return;
		if (style.display !== "contents" && style.visibility === "visible") {
			const rect = element.getBoundingClientRect();
			if (rect.width > 0.5 && rect.height > 0.5) {
				const measure: BoxMeasure = {
					...locate(element),
					width: rect.width,
					height: rect.height,
					outOfFlow: outOfFlow(style),
					text: hasText(element),
					paints: paintsOwn(element, style),
					replaced: replaced(element),
					interactive: interactive(element),
					childrenDraw: [...element.children].some((child) =>
						draws(child, memo),
					),
				};
				if (
					checkDeadBoxes([measure]).length > 0 &&
					!excepted("align-dead", element)
				) {
					out.push(measure);
					return;
				}
			}
		}
		for (const child of element.children) visit(child);
	};
	for (const root of roots) visit(root);
	return out;
}

// Every element of the page that is laid out as a grid.
function grids(roots: Element[]): GridMeasure[] {
	const out: GridMeasure[] = [];
	const visit = (element: Element): void => {
		if (SKIPPED.has(element.tagName) || element instanceof SVGElement) return;
		const display = getComputedStyle(element).display;
		if (display === "none") return;
		if (
			(display === "grid" || display === "inline-grid") &&
			!excepted("align-grid", element)
		)
			out.push({ ...locate(element), display });
		for (const child of element.children) visit(child);
	};
	for (const root of roots) visit(root);
	return out;
}

const isRow = (style: CSSStyleDeclaration): boolean =>
	/flex/.test(style.display) && !style.flexDirection.startsWith("column");

// A drawn box's rectangle clipped by the clipping boxes it stands in.
interface Box {
	left: number;
	right: number;
	top: number;
	bottom: number;
}

function clipTo(box: Box, clip: Box | undefined): Box | undefined {
	if (!clip) return box;
	const out = {
		left: Math.max(box.left, clip.left),
		right: Math.min(box.right, clip.right),
		top: Math.max(box.top, clip.top),
		bottom: Math.min(box.bottom, clip.bottom),
	};
	return out.right - out.left > 0.5 && out.bottom - out.top > 0.5
		? out
		: undefined;
}

const boxOf = (rect: DOMRect): Box => ({
	left: rect.left,
	right: rect.right,
	top: rect.top,
	bottom: rect.bottom,
});

// The union of the rectangles a text node's lines take.
function textBox(node: Text): { box: Box; lines: number } | undefined {
	const range = document.createRange();
	range.selectNodeContents(node);
	const rects = [...range.getClientRects()].filter(
		(r) => r.width > 0 && r.height > 0,
	);
	const first = rects[0];
	if (!first) return undefined;
	return {
		lines: rects.length,
		box: rects.map(boxOf).reduce((a, b) => ({
			left: Math.min(a.left, b.left),
			right: Math.max(a.right, b.right),
			top: Math.min(a.top, b.top),
			bottom: Math.max(a.bottom, b.bottom),
		})),
	};
}

// What a row draws, in document order: each text, picture and painted box
// (a chip, a switch, an avatar, a button) once, at the rectangle it shows
// (clipped by the boxes that cut it, so a truncated label ends where its slot
// does). Out-of-flow boxes (a row's hit overlay), what is not displayed and
// the rows nested inside are left out.
interface Leaf extends EndMeasure {
	text: boolean;
	left: number;
	top: number;
	bottom: number;
	element: Element;
}

function leavesOf(row: Element): Array<Leaf & { right: number }> {
	const out: Array<Leaf & { right: number }> = [];
	const push = (
		box: Box | undefined,
		text: boolean,
		element: Element,
		name: string,
	) => {
		if (box)
			out.push({
				...locate(element),
				name,
				text,
				left: box.left,
				right: box.right,
				top: box.top,
				bottom: box.bottom,
				centre: (box.top + box.bottom) / 2,
				element,
			});
	};
	const visit = (element: Element, clip: Box | undefined): void => {
		const style = getComputedStyle(element);
		if (style.display === "none" || style.opacity === "0") return;
		if (outOfFlow(style) || (element !== row && rowKind(element) !== null))
			return;
		let inside = clip;
		if (style.display !== "contents") {
			const rect = element.getBoundingClientRect();
			if (
				(style.overflowX === "hidden" || style.overflowX === "clip") &&
				(rect.width <= 1 || rect.height <= 1)
			)
				return;
			if (style.visibility === "visible" && element !== row) {
				if (replaced(element) || paintsOwn(element, style)) {
					// A text's filler stands for its text: the waiting row's label is
					// its first filler, as the loaded row's is its first text.
					push(
						clipTo(boxOf(rect), clip),
						element.hasAttribute("data-painted") && hasText(element),
						element,
						nameOf(element) || `<${element.tagName.toLowerCase()}>`,
					);
					return;
				}
			}
			if (style.overflowX === "hidden" || style.overflowX === "clip") {
				inside = clipTo(boxOf(rect), clip);
				if (!inside) return;
			}
		}
		for (const node of element.childNodes) {
			if (node instanceof Element) visit(node, inside);
			else if (
				node.nodeType === Node.TEXT_NODE &&
				node.nodeValue?.trim() &&
				style.visibility === "visible"
			) {
				const shown = textBox(node as Text);
				if (shown)
					push(
						clipTo(shown.box, inside),
						true,
						element,
						(node.nodeValue ?? "").trim().replace(/\s+/g, " ").slice(0, 24),
					);
			}
		}
	};
	visit(row, undefined);
	return out;
}

// The row's item that holds an element: the row's own child it stands in, or
// the element itself where that child is only a wrapper that adds no box.
function itemOf(row: Element, element: Element): Element {
	if (element === row) return element;
	let item = element;
	while (item.parentElement && item.parentElement !== row)
		item = item.parentElement;
	return getComputedStyle(item).display === "contents" ? element : item;
}

// A row that is a flex column (a definition row: its label line over its
// description) holds its end items on its first flex-row child, the label line.
function lineOf(column: Element): Element | undefined {
	return itemsOf(column).find(
		(item): item is Element =>
			item instanceof Element && isRow(getComputedStyle(item)),
	);
}

// The rows on the page and what stands at the end of each: a row is a flex
// row with a row's role, or one whose floor is a row token's (a control with
// that floor is no row); a flex column that is one stands its end items on its
// label line, which is then the row measured, centre and all. Its label is its
// first text, and its end items are what draws beyond the label's right edge.
function rows(seen: Seen[], scopes: Scopes): RowMeasure[] {
	const out: RowMeasure[] = [];
	for (const { element, style } of seen) {
		if (!style.display.includes("flex") || excepted("align-centre", element))
			continue;
		const kind = rowKind(element);
		if (kind === null) {
			const floor = px(style.minHeight);
			if (
				floor <= 0 ||
				controlKind(element, style) !== null ||
				!scopes
					.of(element, style)
					.tokens.rows.some((t) => Math.abs(t.px - floor) <= 0.5)
			)
				continue;
		}
		const line = isRow(style) ? element : lineOf(element);
		if (!line) continue;
		const leaves = leavesOf(line);
		const label = leaves.find((leaf) => leaf.text);
		if (!label) continue;
		// The label's own group: what stands in it below its first line (a meta
		// line running past the title) is its text, no end. An end item is
		// beside the text, so one only off the row's middle is still an end.
		const group = itemOf(line, label.element);
		const first = leaves.find((leaf) => group.contains(leaf.element)) ?? label;
		// A label that is several runs (a code title cut into its stem and its tail)
		// is one text: the runs of its own item are the label, no end.
		const own = group === line ? label.element : itemOf(group, label.element);
		const ends = leaves.filter(
			(leaf) =>
				leaf !== label &&
				leaf.left >= label.right - 0.5 &&
				!own.contains(leaf.element) &&
				(group === line ||
					!group.contains(leaf.element) ||
					(leaf.centre >= first.top && leaf.centre <= first.bottom)),
		);
		if (ends.length === 0) continue;
		const box = line.getBoundingClientRect();
		out.push({
			...locate(element),
			kind: kind ?? "row",
			centre: box.top + box.height / 2,
			ends: endItems(ends, line, label.element),
		});
	}
	return out;
}

// The flex column an end leaf stands in, below the row: the item of an end
// group that stacks lines.
function stackOf(row: Element, leaf: Element): Element | undefined {
	for (let at: Element | null = leaf; at && at !== row; at = at.parentElement) {
		const style = getComputedStyle(at);
		if (style.display.includes("flex") && style.flexDirection === "column")
			return at;
	}
	return undefined;
}

// A row's end items. An end group may stack two lines on purpose (a value over
// its status): the two are one end item, which stands centred on the row as a
// whole, so it is measured by the stack's own box. A stack of more lines is no
// such item, and its lines are measured one by one, as is whatever stands in the
// label's own group, which is text and no end item.
function endItems(ends: Leaf[], row: Element, label: Element): EndMeasure[] {
	const stacks = new Map<Element, Leaf[]>();
	const items: EndMeasure[] = [];
	for (const leaf of ends) {
		const stack = stackOf(row, leaf.element);
		if (!stack || stack.contains(label)) items.push(leaf);
		else stacks.set(stack, [...(stacks.get(stack) ?? []), leaf]);
	}
	for (const [stack, held] of stacks) {
		const lines = [...held]
			.sort((a, b) => a.top - b.top)
			.reduce((count, leaf, at, all) => {
				const before = all[at - 1];
				return before && leaf.top < before.bottom - 0.5 ? count : count + 1;
			}, 0);
		const [head] = held;
		if (lines > 2 || !head) {
			items.push(...held);
			continue;
		}
		const box = stack.getBoundingClientRect();
		items.push({
			path: head.path,
			name: held.map((leaf) => leaf.name).join(" over "),
			centre: (box.top + box.bottom) / 2,
		});
	}
	return items;
}

// The items of a flex container: its children in the flow (seen through
// `display: contents`) and its bare text, which is an anonymous item.
function itemsOf(container: Element): Node[] {
	return [...container.childNodes].flatMap((node) => {
		if (node.nodeType === Node.TEXT_NODE)
			return node.nodeValue?.trim() ? [node] : [];
		if (!(node instanceof Element)) return [];
		const style = getComputedStyle(node);
		if (style.display === "none") return [];
		if (style.display === "contents") return itemsOf(node);
		return outOfFlow(style) ? [] : [node];
	});
}

const nestedRow = (element: Element, style: CSSStyleDeclaration): boolean =>
	isRow(style) && itemsOf(element).length > 1;

let ruler: CanvasRenderingContext2D | null | undefined;

// A font's ascent: the glyph box's top sits this far above the baseline.
function ascent(style: CSSStyleDeclaration): number {
	ruler ??= document.createElement("canvas").getContext("2d");
	if (!ruler) return 0;
	ruler.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
	return ruler.measureText("x").fontBoundingBoxAscent;
}

// The bare texts of one flex item, each one line: not inside a box that paints
// or is a control (a chip, a button), not in a row nested inside it (that row
// is a line of its own).
function runsOf(item: Node, lane: number): RunMeasure[] {
	const out: RunMeasure[] = [];
	const read = (node: Text, element: Element): void => {
		const shown = textBox(node);
		if (!shown) return;
		if (shown.lines !== 1) return;
		const style = getComputedStyle(element);
		const top = shown.box.top;
		out.push({
			...locate(element),
			name: (node.nodeValue ?? "").trim().replace(/\s+/g, " ").slice(0, 24),
			lane,
			size: px(style.fontSize),
			top,
			height: shown.box.bottom - top,
			baseline: top + ascent(style),
		});
	};
	const visit = (element: Element): void => {
		const style = getComputedStyle(element);
		if (style.display === "none" || style.opacity === "0") return;
		if (outOfFlow(style)) return;
		if (
			style.display !== "contents" &&
			(replaced(element) ||
				(interactive(element) && element.tagName !== "A") ||
				paintsOwn(element, style) ||
				nestedRow(element, style))
		)
			return;
		for (const child of element.childNodes) {
			if (child instanceof Element) visit(child);
			else if (
				child.nodeType === Node.TEXT_NODE &&
				child.nodeValue?.trim() &&
				style.visibility === "visible"
			)
				read(child as Text, element);
		}
	};
	if (item instanceof Element) visit(item);
	else if (item.parentElement) read(item as Text, item.parentElement);
	return out;
}

// The bare texts of each flex row's items, an item that is one line alone: an
// item of two lines is a stack, and what stands beside it centres on the stack,
// not on a line of it.
function lines(seen: Seen[]): RunMeasure[][] {
	const out: RunMeasure[][] = [];
	for (const { element, style } of seen) {
		if (
			!isRow(style) ||
			paintsOwn(element, style) ||
			interactive(element) ||
			excepted("align-baseline", element)
		)
			continue;
		const lanes = itemsOf(element)
			.map((item, lane) => runsOf(item, lane))
			.filter((runs) => {
				const tops = runs.map((r) => r.top);
				const height = Math.min(...runs.map((r) => r.height));
				return (
					runs.length > 0 && Math.max(...tops) - Math.min(...tops) < height / 2
				);
			});
		if (lanes.length > 1) out.push(lanes.flat());
	}
	return out;
}

// The alignment findings on the page, or under `roots`: what `findings()` adds
// to the layout rules.
export function alignFindings(options: WalkOptions = {}): Finding[] {
	const roots = options.roots ?? [document.body];
	const seen = drawn(roots);
	return [
		...checkDeadBoxes(boxes(roots)),
		...checkCentres(rows(seen, new Scopes())),
		...lines(seen).flatMap(checkBaselines),
		...checkGrids(grids(roots)),
	];
}
