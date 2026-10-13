// The roster stress floor's probe: feeds each text slot of a drawn component a
// word no line can break at and a URL, one at a time, and reports where the
// layout gives way. The slot's text node is swapped for the long string, the
// boxes are read, and the original text is put back, so the page the next slot
// is read in is the page as drawn.

// 300 characters with no break opportunity but the one `overflow-wrap` makes.
export const WORD = "Supercalifragilistic".repeat(15).slice(0, 300);
// 220 characters, one break opportunity at each `/`, `?` and `&`.
export const URL_TEXT =
	`https://example.com/organisations/acme-industries/projects/payment-terms-and-late-invoices/deployments/0123456789abcdef0123456789abcdef/logs?token=0123456789abcdef0123456789abcdef&redirect=/settings/billing/invoices/${"0".repeat(220)}`.slice(
		0,
		220,
	);

const STRINGS = { word: WORD, url: URL_TEXT } as const;
type Feed = keyof typeof STRINGS;

// A box more than this many pixels past where it must stand is a fault; the
// rest is subpixel rounding.
const TOLERANCE = 1;

export type Fault = "page" | "escapes" | "spills" | "clipped";

export interface Finding {
	fault: Fault;
	slot: string;
	text: string;
	feed: Feed;
	by: number;
	// The first box that stood past its parent, where one did.
	via?: string;
}

export interface Probed {
	// The slots fed, each once (the same slot drawn in the light and the dark
	// frame, or in two states, is one).
	probed: number;
	findings: Finding[];
	// Slots whose long text laid out no box at all: a slot that is never drawn
	// would pass every check, so it is a fault of the floor, not a pass.
	unlaid: string[];
}

// Text no free string reaches, left out of the floor:
// - a `<time>` and a text of digits and their punctuation (a list's bullet
//   among them): the system formats it (`Intl`, a count, a clock), so no user
//   word lands there;
// - an Avatar's letters: the component derives them from a name, two at most;
// - the frame's own caption (its first child): the showcase's label.
function system(element: Element, text: string, frame: Element): boolean {
	if (element.tagName === "TIME") return true;
	if (/^[\d\s.,:%$€+\-·•/×−]+$/.test(text)) return true;
	if (frame.getAttribute("data-cell")?.startsWith("Avatar/")) return true;
	return element === frame.firstElementChild;
}

function name(element: Element, up: number): string {
	const parts: string[] = [];
	let node: Element | null = element;
	for (let at = 0; node && at < up; node = node.parentElement, at++) {
		const classes = (node.getAttribute("class") ?? "")
			.split(/\s+/)
			.filter(
				(name) =>
					name &&
					!/^(light|dark)$/.test(name) &&
					!/^(text-(body|meta|caption|heading|title|code|ink|on)|leading|tracking|font-)/.test(
						name,
					),
			)
			.slice(0, 5);
		parts.push([node.tagName.toLowerCase(), ...classes].join("."));
	}
	return parts.join("<");
}

// The box an element lays out in: its parent, or the first ancestor that draws
// one (`display: contents` draws none).
function boxOf(element: Element): Element | null {
	let up = element.parentElement;
	while (up && getComputedStyle(up).display === "contents")
		up = up.parentElement;
	return up;
}

// Where a box ends for the box it stands in: a negative end margin (a control
// pulled back by its padding) reaches past the parent by design, so it counts
// as the margin box.
const reach = (element: Element): number =>
	element.getBoundingClientRect().right +
	Math.min(0, Number.parseFloat(getComputedStyle(element).marginRight));

const contentRight = (element: Element): number => {
	const style = getComputedStyle(element);
	return (
		element.getBoundingClientRect().right -
		Number.parseFloat(style.paddingRight) -
		Number.parseFloat(style.borderRightWidth)
	);
};

// Whether a box between `element` (its parent included) and the frame cuts
// what overflows it (`overflow: hidden` or `clip`), which is that box's own
// decision: a path that clips what its floor holds, a meta line that shows what
// fits. A scroll container is no cut, so what spills out of it is a fault.
function cut(element: Element, frame: Element): boolean {
	for (
		let up = boxOf(element);
		up && up !== frame.parentElement;
		up = boxOf(up)
	) {
		const x = getComputedStyle(up).overflowX;
		if (x === "hidden" || x === "clip") return true;
	}
	return false;
}

// How far each ancestor of `slot`, up to `frame`, stands past its parent's
// content box.
function overs(slot: Element, frame: Element): number[] {
	const out: number[] = [];
	for (
		let node: Element | null = slot;
		node && node !== frame;
		node = boxOf(node)
	) {
		const parent = boxOf(node);
		if (!parent) break;
		out.push(Math.max(0, reach(node) - contentRight(parent)));
	}
	return out;
}

interface Slot {
	node: Text;
	parent: Element;
	frame: Element;
	key: string;
	layer: Element | null;
}

// The text slots of `frames` that are drawn, each once by its place in its
// component: none of zero size, none the system formats.
export function collect(frames: Element[]): Slot[] {
	const seen = new Set<string>();
	const slots: Slot[] = [];
	for (const frame of frames) {
		const walker = document.createTreeWalker(frame, NodeFilter.SHOW_TEXT);
		for (let node = walker.nextNode(); node; node = walker.nextNode()) {
			const text = node.nodeValue?.trim();
			const parent = node.parentElement;
			if (!text || !parent || parent.closest("script,style,svg,textarea"))
				continue;
			if (system(parent, text, frame)) continue;
			// An unseen copy that holds a room (a ghost) is a slot of its own.
			const ghost = getComputedStyle(parent).visibility === "hidden";
			const key = `${frame.getAttribute("data-cell")?.split("/")[0]}|${name(parent, 4)}${ghost ? "|unseen" : ""}`;
			const box = parent.getBoundingClientRect();
			if (box.width === 0 && box.height === 0) continue;
			if (seen.has(key)) continue;
			seen.add(key);
			slots.push({
				node: node as Text,
				parent,
				frame,
				key,
				layer: parent.closest("[data-side]"),
			});
		}
	}
	return slots;
}

// Reads every text slot under `frames` against `pane`, the box a page stands
// in (the viewport's width at the desktop, a 320 px column on touch). A slot is
// at fault when
// - the pane's scroll width grows (`page`);
// - an ancestor grows past its parent's content box beyond where it stood
//   (`escapes`), unless a box above it cuts what overflows (`cut`) or the
//   ancestor is taken out of the flow;
// - its text is drawn outside its own box and the box neither truncates with an
//   ellipsis nor wraps (`spills`, or `clipped` where it hides the rest).
export function stress(frames: Element[], pane: HTMLElement): Probed {
	const slots = collect(frames);
	const growth = () =>
		Math.max(
			pane.scrollWidth - pane.clientWidth,
			document.documentElement.scrollWidth - innerWidth,
		);
	const rest = growth();
	const findings: Finding[] = [];
	const unlaid: string[] = [];
	// A field takes its words as a value or a placeholder, not as a text node:
	// the long string goes into both, and only the page can be grown by it.
	const fields = frames.flatMap((frame) => [
		...frame.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
			"input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]),textarea",
		),
	]);
	for (const field of fields) {
		const { placeholder, value } = field;
		for (const feed of Object.keys(STRINGS) as Feed[]) {
			field.placeholder = STRINGS[feed];
			field.value = STRINGS[feed];
			const grown = growth() - rest;
			if (grown > TOLERANCE)
				findings.push({
					fault: "page",
					slot: `field|${name(field, 3)}`,
					text: placeholder,
					feed,
					by: Math.round(grown),
				});
			field.placeholder = placeholder;
			field.value = value;
		}
	}
	for (const { node, parent, frame, key, layer } of slots) {
		const original = node.nodeValue ?? "";
		const before = overs(parent, frame);
		for (const feed of Object.keys(STRINGS) as Feed[]) {
			node.nodeValue = STRINGS[feed];
			const range = document.createRange();
			range.selectNodeContents(node);
			const rects = [...range.getClientRects()].filter(
				(rect) => rect.width > 0,
			);
			if (rects.length === 0) unlaid.push(key);
			const text = original.trim().slice(0, 28);
			const found = (fault: Fault, by: number, via?: string) =>
				findings.push({
					fault,
					slot: key,
					text,
					feed,
					by: Math.round(by),
					via,
				});
			// A tooltip or a menu is placed by the library after it measures, so
			// only its own width can be read here: it must stand inside the pane.
			if (layer) {
				const wide = layer.getBoundingClientRect().width - pane.clientWidth;
				if (wide > TOLERANCE) found("page", wide, name(layer, 1));
				node.nodeValue = original;
				continue;
			}
			const grown = growth() - rest;
			const style = getComputedStyle(parent);
			const spill =
				(rects.length ? Math.max(...rects.map((rect) => rect.right)) : 0) -
				parent.getBoundingClientRect().right;
			let first: { by: number; via: string } | undefined;
			let pushed: { by: number; via: string } | undefined;
			let level = 0;
			for (
				let up: Element | null = parent;
				up && up !== frame;
				up = boxOf(up), level++
			) {
				const box = boxOf(up);
				if (!box) break;
				const position = getComputedStyle(up).position;
				if (position === "absolute" || position === "fixed") continue;
				const over = reach(up) - contentRight(box);
				if (over <= TOLERANCE || over - (before[level] ?? 0) <= TOLERANCE)
					continue;
				const grew = {
					by: over - (before[level] ?? 0),
					via: `${name(up, 1)} in ${name(box, 1)}`,
				};
				first ??= grew;
				if (!cut(up, frame)) {
					pushed = grew;
					break;
				}
			}
			const truncates =
				style.textOverflow === "ellipsis" && style.overflowX !== "visible";
			if (grown > TOLERANCE) found("page", grown, first?.via);
			else if (pushed) found("escapes", pushed.by, pushed.via);
			else if (!truncates && spill > TOLERANCE)
				found(style.overflowX !== "visible" ? "clipped" : "spills", spill);
			node.nodeValue = original;
		}
	}
	return { probed: slots.length + fields.length, findings, unlaid };
}

// The findings as lines a failed assertion prints.
export function report(result: Probed): string[] {
	return [
		...result.findings.map(
			({ fault, slot, text, feed, by, via }) =>
				`${fault} +${by}px: ${slot} ("${text}", ${feed})${via ? ` via ${via}` : ""}`,
		),
		...result.unlaid.map((slot) => `unlaid: ${slot}`),
	];
}
