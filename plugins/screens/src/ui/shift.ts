// The loading shift: a Section stands whatever its data holds, so the page
// must not move between its waiting form and its loaded one. `measure` reads
// every Section's heading in the drawn page (a Pane with no Section, its
// body's direct blocks); `compare` judges the two reads (a pure function,
// node-tested). The floors run both around `release()`.

// What `compare` found: `fails` fail the screen; `reports` are moves a block
// that appears only with its data caused, which are accepted and told.
export interface Shift {
	fails: string[];
	reports: string[];
}

export interface SectionBox {
	// Which Pane (`[data-page]`, in document order) holds it; -1 for none.
	pane: number;
	// Its left edge: Sections side by side in a Pane are separate stacks.
	column: number;
	name: string;
	// The heading's top (a block's own top) and the height, in px from the
	// document top.
	top: number;
	height: number;
	// Whether rows, a table, a chart or text fill it, which is what may change
	// its height between the forms.
	rows: boolean;
	// A block beside the Sections of a Pane that has some (a Banner, a
	// PendingBar): never judged itself, it only explains a move when it
	// arrives with the data.
	aside?: boolean;
}

// The slack a layout rounding may take.
const ROUNDING = 2;

const FILLS =
	"[role=list],[role=table],[role=grid],ul,ol,table,li,svg,canvas,[role=img],p";

// Rows are not always a list in the markup: a run of two or more siblings
// drawn alike (same tag, same classes) is rows as well.
function holdsRows(section: Element): boolean {
	if (section.querySelector(FILLS)) return true;
	for (const parent of section.querySelectorAll("*")) {
		const kinds = new Set<string>();
		for (const child of parent.children) {
			const kind = `${child.tagName}.${child.className}`;
			if (kinds.has(kind)) return true;
			kinds.add(kind);
		}
	}
	return false;
}

// A Pane with no Section has no heading to read: its body's direct blocks
// stand in for them, and in a Pane with some they are the asides. The body is the scrolling box under the head (and beside
// the docked foot), so the first scrolling child of the Pane's region.
function blocksOf(pane: Element): Element[] {
	for (const region of pane.children) {
		if (region.tagName === "HEADER") continue;
		for (const body of region.children) {
			const overflow = getComputedStyle(body).overflowY;
			if (overflow === "auto" || overflow === "scroll")
				return [...body.children];
		}
	}
	return [];
}

// Every Section in the page, in document order, and for a Pane holding none
// its body's direct blocks. A name that repeats is numbered, so the two forms
// pair them by name.
export function measure(): SectionBox[] {
	const panes = [...document.querySelectorAll("[data-page]")];
	const seen = new Map<string, number>();
	const named = (text: string) => {
		const count = (seen.get(text) ?? 0) + 1;
		seen.set(text, count);
		return count > 1 ? `${text} #${count}` : text;
	};
	const boxes: SectionBox[] = [];
	for (const section of document.querySelectorAll("section")) {
		// The Section's own heading: the first one in it, unless a Section
		// nested in it holds that one. The page's title (`h1`) is not a Section's.
		const heading = section.querySelector("h2,h3,h4,h5,h6");
		if (!heading || heading.closest("section") !== section) continue;
		if (section.hasAttribute("data-page")) continue;
		// The title alone: the count beside it only exists once loaded, and the
		// title and count stand in one group, so the first span holding no span.
		const text =
			(
				heading.querySelector("span:not(:has(span))") ?? heading
			).textContent?.trim() ?? "";
		const pane = section.closest("[data-page]");
		boxes.push({
			pane: pane ? panes.indexOf(pane) : -1,
			column: Math.round(section.getBoundingClientRect().left),
			name: named(text),
			top: Math.round(heading.getBoundingClientRect().top + window.scrollY),
			height: Math.round(section.getBoundingClientRect().height),
			rows: holdsRows(section),
		});
	}
	for (const [index, pane] of panes.entries()) {
		const aside = boxes.some((box) => box.pane === index);
		for (const block of blocksOf(pane)) {
			if (aside && block.tagName === "SECTION") continue;
			const rect = block.getBoundingClientRect();
			boxes.push({
				aside: aside || undefined,
				pane: index,
				column: Math.round(rect.left),
				name: named(
					`${block.tagName.toLowerCase()}.${block.classList[0] ?? ""}`,
				),
				top: Math.round(rect.top + window.scrollY),
				height: Math.round(rect.height),
				rows: holdsRows(block),
			});
		}
	}
	return boxes;
}

// What moved between the waiting read and the loaded one; none means the page
// held still. Per stack (a Pane's Sections that share a left edge):
//  - a Section that stood while waiting is gone loaded: fails;
//  - the first Section moved (what stands above it differs): fails;
//  - a later Section moved by other than what the first moved by plus what
//    the Sections above it grew by: fails;
//  - a Section changed height with no rows, chart or text in either form: fails;
// except that a move which a block caused, one absent while waiting and
// present loaded above the moved one (a Banner that stands only with its
// data), at least by that block's height, is reported and not failed.
export function compare(
	waiting: readonly SectionBox[],
	loaded: readonly SectionBox[],
): Shift {
	const shift: Shift = { fails: [], reports: [] };
	const stacks = new Set(
		[...waiting, ...loaded].map((box) => `${box.pane}:${box.column}`),
	);
	for (const stack of stacks) {
		const inStack = (box: SectionBox) => `${box.pane}:${box.column}` === stack;
		// An aside stands across the Pane, whatever column its edge is in.
		const pane = Number(stack.split(":")[0]);
		const here = (box: SectionBox) =>
			inStack(box) || (box.aside === true && box.pane === pane);
		const before = waiting.filter(inStack).filter((box) => !box.aside);
		const after = loaded.filter(inStack).filter((box) => !box.aside);
		const standing = waiting.filter(here);
		const arrivals = loaded
			.filter(here)
			.filter((l) => !standing.some((w) => w.name === l.name));
		// What stands above the first Section (a head, a banner) moves every
		// Section after it alike; what the rows above grew by moves them further,
		// and what an arrival absorbed stays absorbed for the ones after it.
		let offset = 0;
		let growth = 0;
		let absorbed = 0;
		let counted = 0;
		for (const [index, w] of before.entries()) {
			const l = after.find((box) => box.name === w.name);
			if (!l) {
				shift.fails.push(`${w.name}: stood while waiting, gone loaded`);
				continue;
			}
			const moved = l.top - w.top;
			const due = index === 0 ? 0 : offset + growth + absorbed;
			const extra = moved - due;
			if (Math.abs(extra) > ROUNDING) {
				// The arrivals above this block that no earlier block has taken.
				const above = arrivals.filter((a) => a.top < l.top).slice(counted);
				const size = above.reduce((sum, a) => sum + a.height, 0);
				if (above.length > 0 && extra >= size - ROUNDING) {
					counted += above.length;
					absorbed += extra;
					shift.reports.push(
						`${w.name}: moved ${extra}px for ${above.map((a) => a.name).join(", ")}, which arrive${above.length > 1 ? "" : "s"} with the data`,
					);
				} else if (index === 0) {
					shift.fails.push(
						`${w.name}: first Section moved ${moved}px (what stands above it changed height)`,
					);
				} else {
					shift.fails.push(
						`${w.name}: moved ${moved}px, ${due === 0 ? "nothing above it changed" : `${due}px was due`}`,
					);
				}
			}
			if (index === 0) offset = moved - absorbed;
			const grew = l.height - w.height;
			if (Math.abs(grew) > ROUNDING) {
				if (!(w.rows || l.rows))
					shift.fails.push(
						`${w.name}: height ${w.height} -> ${l.height} with no rows in it`,
					);
				growth += grew;
			}
		}
	}
	return shift;
}
