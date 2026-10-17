// The loading shift: a Section stands whatever its data holds, so the page
// must not move between its waiting form and its loaded one. `measure` reads
// every Section's heading in the drawn page; `compare` judges the two reads
// (a pure function, node-tested). The floors run both around `release()`.

export interface SectionBox {
	// Which Pane (`[data-page]`, in document order) holds it; -1 for none.
	pane: number;
	// Its left edge: Sections side by side in a Pane are separate stacks.
	column: number;
	name: string;
	// The heading's top and the Section's height, in px from the document top.
	top: number;
	height: number;
	// Whether rows, a table, a chart or text fill it, which is what may change
	// its height between the forms.
	rows: boolean;
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

// Every Section in the page, in document order. A name that repeats is
// numbered, so the two forms pair Sections by name.
export function measure(): SectionBox[] {
	const panes = [...document.querySelectorAll("[data-page]")];
	const seen = new Map<string, number>();
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
		const count = (seen.get(text) ?? 0) + 1;
		seen.set(text, count);
		const pane = section.closest("[data-page]");
		boxes.push({
			pane: pane ? panes.indexOf(pane) : -1,
			column: Math.round(section.getBoundingClientRect().left),
			name: count > 1 ? `${text} #${count}` : text,
			top: Math.round(heading.getBoundingClientRect().top + window.scrollY),
			height: Math.round(section.getBoundingClientRect().height),
			rows: holdsRows(section),
		});
	}
	return boxes;
}

// What moved between the waiting read and the loaded one, one line per
// finding; none means the page held still. Per stack (a Pane's Sections
// that share a left edge):
//  - a Section that stood while waiting is gone loaded;
//  - the first Section moved (what stands above it differs);
//  - a later Section moved by other than what the first moved by plus what
//    the Sections above it grew by;
//  - a Section changed height with no rows, chart or text in either form;
//  - a Section that was not there arrived above one that was.
export function compare(
	waiting: readonly SectionBox[],
	loaded: readonly SectionBox[],
): string[] {
	const lines: string[] = [];
	const stacks = new Set(
		[...waiting, ...loaded].map((box) => `${box.pane}:${box.column}`),
	);
	for (const stack of stacks) {
		const inStack = (box: SectionBox) => `${box.pane}:${box.column}` === stack;
		const before = waiting.filter(inStack);
		const after = loaded.filter(inStack);
		// What stands above the first Section (a head, a banner) moves every
		// Section after it alike; what the rows above grew by moves them further.
		let offset = 0;
		let growth = 0;
		for (const [index, w] of before.entries()) {
			const l = after.find((box) => box.name === w.name);
			if (!l) {
				lines.push(`${w.name}: stood while waiting, gone loaded`);
				continue;
			}
			const moved = l.top - w.top;
			if (index === 0) {
				offset = moved;
				if (Math.abs(moved) > ROUNDING)
					lines.push(
						`${w.name}: first Section moved ${moved}px (what stands above it changed height)`,
					);
			} else {
				const due = offset + growth;
				if (Math.abs(moved - due) > ROUNDING)
					lines.push(
						`${w.name}: moved ${moved}px, ${due === 0 ? "nothing above it changed" : `${due}px was due`}`,
					);
			}
			const grew = l.height - w.height;
			if (Math.abs(grew) > ROUNDING) {
				if (!(w.rows || l.rows))
					lines.push(
						`${w.name}: height ${w.height} -> ${l.height} with no rows in it`,
					);
				growth += grew;
			}
		}
		// An arrival is fine below every Section that stood.
		const stood = after.filter((l) => before.some((w) => w.name === l.name));
		for (const l of after) {
			if (before.some((w) => w.name === l.name)) continue;
			if (stood.some((box) => box.top > l.top))
				lines.push(
					`${l.name}: arrived at ${l.top}px, above a Section that stood`,
				);
		}
	}
	return lines;
}
