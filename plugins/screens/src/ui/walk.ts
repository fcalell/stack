import {
	RADIUS_ROLES,
	SIZES,
	SPACING_ROLES,
	TYPE_ROLES,
} from "@fcalell/ui-core/tokens";
import {
	type ClipMeasure,
	checkClip,
	checkDigits,
	checkFocus,
	checkFonts,
	checkHeights,
	checkRadii,
	checkRegions,
	checkRootMargins,
	checkSpacing,
	checkType,
	type Finding,
	type FocusMeasure,
	type FontMeasure,
	format,
	type HeightMeasure,
	type Located,
	type MarginMeasure,
	type NumberMeasure,
	type RadiusMeasure,
	type RegionMeasure,
	type SpacingMeasure,
	type TextMeasure,
	type Token,
	type Tokens,
} from "./walk-checks.ts";

// The render walk: one pass over the page's elements that reads what is drawn
// against the contract's values, in the page's own computed custom
// properties at the density it is in (so the numbers are the ones the theme
// emitted, never a second copy). The test run calls it once per width after
// the resize settles, and a behaviour story calls it at the end of its play
// function, so a state reached by a click or a key is judged as well.

export type { Finding } from "./walk-checks.ts";
export { format } from "./walk-checks.ts";

// The named exceptions, the one place the walk lets a rule pass over an
// element: a selector, the rule it excepts and why. Never a baseline: each
// stands for a thing the contract itself draws off the rule.
export interface Exception {
	rule: string;
	selector: string;
	reason: string;
}

export const EXCEPTIONS: Exception[] = [];

function excepted(rule: string, element: Element): boolean {
	return EXCEPTIONS.some(
		(e) => e.rule === rule && element.closest(e.selector) !== null,
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
	"otp",
	"avatar",
	"switch-h",
	"check",
	"row",
	"row-2",
	"row-setting",
	"strip",
] as const;
const ROW_SIZES = ["row", "row-2", "row-setting"] as const;
// Insets that are not spacing roles: a field's border, a pick's chips, an
// icon act's glyph, a switch's knob.
const INSET_SIZES = [
	"hairline",
	"chips-inset",
	"icon-inset",
	"switch-inset",
] as const;

function token(
	style: CSSStyleDeclaration,
	prefix: string,
	name: string,
): Token[] {
	const raw = style.getPropertyValue(`--${prefix}-${name}`).trim();
	const value = raw.endsWith("px") ? Number.parseFloat(raw) : Number.NaN;
	return Number.isNaN(value) ? [] : [{ name, px: value }];
}

export function readTokens(root: Element = document.documentElement): Tokens {
	const style = getComputedStyle(root);
	const sizes = (names: readonly string[]) =>
		SIZES.filter((s) => names.includes(s)).flatMap((s) =>
			token(style, "spacing", s),
		);
	return {
		text: TYPE_ROLES.flatMap((r) => token(style, "text", r)),
		spacing: [
			...SPACING_ROLES.flatMap((r) => token(style, "spacing", r)),
			...sizes(INSET_SIZES),
		],
		controls: sizes(CONTROL_SIZES),
		rows: sizes(ROW_SIZES),
		radius: RADIUS_ROLES.filter((r) => r !== "full").flatMap((r) =>
			token(style, "radius", r),
		),
	};
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
function controlKind(element: Element): string | null {
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
	if (element.tagName === "LI") return "listitem";
	if (element.tagName === "TR") return "row";
	return null;
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

// Every finding on the page, or under `roots`.
export function findings(options: WalkOptions = {}): Finding[] {
	const roots = options.roots ?? [document.body];
	const scoped = options.roots !== undefined;
	const tokens = readTokens();
	const seen = drawn(roots);

	const type: TextMeasure[] = [];
	const numbers: NumberMeasure[] = [];
	for (const { node, seen: s } of texts(seen)) {
		const at = locate(s.element);
		if (excepted("type-size", s.element)) continue;
		type.push({ ...at, size: px(s.style.fontSize) });
		numbers.push({
			...at,
			text: node.nodeValue ?? "",
			variantNumeric: s.style.fontVariantNumeric,
		});
	}

	const controls: HeightMeasure[] = [];
	const rows: HeightMeasure[] = [];
	const spacing: SpacingMeasure[] = [];
	const radii: RadiusMeasure[] = [];
	const clips: ClipMeasure[] = [];
	const regions: RegionMeasure[] = [];

	for (const { element, style, rect } of seen) {
		const at = () => locate(element);
		const control = controlKind(element);
		if (control && !excepted("control-height", element))
			controls.push({ ...at(), kind: control, height: rect.height });
		const row = rowKind(element);
		if (row && !excepted("row-height", element))
			rows.push({ ...at(), kind: row, height: rect.height });

		if (/(flex|grid)/.test(style.display)) {
			const inFlow = [...element.children].filter((child) => {
				const position = getComputedStyle(child).position;
				return position !== "absolute" && position !== "fixed";
			}).length;
			const measure: SpacingMeasure = {
				...at(),
				rowGap: inFlow > 1 ? px(style.rowGap) : 0,
				columnGap: inFlow > 1 ? px(style.columnGap) : 0,
				padding: [
					px(style.paddingTop),
					px(style.paddingRight),
					px(style.paddingBottom),
					px(style.paddingLeft),
				],
			};
			if (!excepted("gap", element) && !excepted("inset", element))
				spacing.push(measure);
		}

		const radius = corners(style, rect);
		if (radius.some((r) => r > 0) && !excepted("radius", element)) {
			const measure: RadiusMeasure = {
				...at(),
				radii: radius,
				width: rect.width,
				height: rect.height,
			};
			const clipsBox = style.overflowX !== "visible";
			if (painted(style) || clipsBox) {
				for (
					let up = element.parentElement;
					up && up !== document.body;
					up = up.parentElement
				) {
					const outerStyle = getComputedStyle(up);
					const outerBox = up.getBoundingClientRect();
					const outerRadius = corners(outerStyle, outerBox);
					if (!outerRadius.some((r) => r > 0) || !painted(outerStyle)) continue;
					const left = rect.left - outerBox.left;
					const top = rect.top - outerBox.top;
					const right = outerBox.right - rect.right;
					const bottom = outerBox.bottom - rect.bottom;
					measure.outer = {
						path: locate(up, false).path,
						radii: outerRadius,
						insets: [
							Math.min(left, top),
							Math.min(right, top),
							Math.min(right, bottom),
							Math.min(left, bottom),
						],
					};
					break;
				}
			}
			radii.push(measure);
		}

		if (
			(style.overflowX === "hidden" || style.overflowX === "clip") &&
			!excepted("clip", element)
		) {
			clips.push({
				...at(),
				overflowX: style.overflowX,
				textOverflow: style.textOverflow,
				lineClamp: style.getPropertyValue("-webkit-line-clamp"),
				scrollWidth: element.scrollWidth,
				clientWidth: element.clientWidth,
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
		...checkHeights(controls, rows, tokens),
		...checkSpacing(spacing, tokens),
		...checkRadii(radii, tokens),
		...checkClip(clips),
		...checkDigits(numbers),
		...checkRegions(regions),
		...(scoped || options.fonts === false ? [] : checkFonts(fonts())),
	];
}

// The findings as report lines; empty when the page keeps every rule.
export function walk(options: WalkOptions = {}): string[] {
	return format(findings(options));
}

// The margins of each component's root in the frames the roster draws: a
// frame holds its caption first, then what the component draws, and a
// `display: contents` wrapper is seen through.
export function rootMargins(frames: Element[]): Finding[] {
	const items: MarginMeasure[] = [];
	const roots = (element: Element): Element[] =>
		[...element.children].flatMap((child) =>
			getComputedStyle(child).display === "contents" ? roots(child) : [child],
		);
	for (const frame of frames) {
		for (const root of roots(frame).slice(1)) {
			const style = getComputedStyle(root);
			if (style.display === "none") continue;
			items.push({
				...locate(root),
				margin: [
					px(style.marginTop),
					px(style.marginRight),
					px(style.marginBottom),
					px(style.marginLeft),
				],
			});
		}
	}
	return checkRootMargins(items);
}

// Whether the focused element is hidden under a fixed or sticky element: what
// stands at the centre of its visible part is not the element, and is
// positioned out of the flow.
export function focusCovered(): Finding[] {
	const element = document.activeElement;
	if (!element || element === document.body) return [];
	const rect = element.getBoundingClientRect();
	const x =
		Math.max(0, rect.left) +
		(Math.min(innerWidth, rect.right) - Math.max(0, rect.left)) / 2;
	const y =
		Math.max(0, rect.top) +
		(Math.min(innerHeight, rect.bottom) - Math.max(0, rect.top)) / 2;
	const hit = document.elementFromPoint(x, y);
	let measure: FocusMeasure["hit"] = "self";
	if (
		hit &&
		hit !== element &&
		!element.contains(hit) &&
		!hit.contains(element)
	) {
		let positioned = false;
		for (let up: Element | null = hit; up; up = up.parentElement) {
			const position = getComputedStyle(up).position;
			if (position === "fixed" || position === "sticky") positioned = true;
		}
		measure = { covered: locate(hit, false).path, positioned };
	}
	return checkFocus({ ...locate(element), hit: measure });
}
