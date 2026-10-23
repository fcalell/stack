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
	// Its horizontal extent: Sections side by side in a Pane are separate
	// columns, and a Section is judged against the ones above it in its own.
	column: number;
	width: number;
	// The text for a finding. A Section is paired by its slot, never by this
	// (its title may be a painted filler waiting and its record's loaded).
	name: string;
	// A Section (a titled stretch, not a Pane's body block): paired between the
	// forms by its position among the Sections of its column.
	section?: boolean;
	// The heading's top (a block's own top) and the height, in px from the
	// document top.
	top: number;
	height: number;
	// Whether rows, a table, a chart or text fill it, which is what may change
	// its height between the forms.
	rows: boolean;
	// The height of the column that stands centred on the page around it (the
	// Gate's `my-auto` column, while its margin is open), which moves the
	// Section by half of what the column's height changes by.
	centred?: number;
	// A block beside the Sections of a Pane that has some (a Banner, a
	// PendingBar): never judged itself, it only explains a move when it
	// arrives with the data.
	aside?: boolean;
	// A text-driven block outside any Section (a head's name, facts line or
	// description, prose): never judged itself, it only lets what stands below
	// it move by what it grew by.
	text?: boolean;
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

// The height of the column a Section stands in that the page centres with an
// auto margin (`my-auto`, the Gate's column), when the margin is open: a column
// taller than the page scrolls from its top and is not centred.
function centredHeight(section: Element): number | undefined {
	const column = section.closest(".my-auto");
	if (!column || Number.parseFloat(getComputedStyle(column).marginTop) <= 0)
		return undefined;
	return Math.round(column.getBoundingClientRect().height);
}

// Every Section in the page, in document order, and for a Pane holding none
// its body's direct blocks. A name that repeats is numbered; a Section pairs
// between the forms by slot, the other blocks by name.
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
			section: true,
			pane: pane ? panes.indexOf(pane) : -1,
			column: Math.round(section.getBoundingClientRect().left),
			width: Math.round(section.getBoundingClientRect().width),
			name: named(text),
			top: Math.round(heading.getBoundingClientRect().top + window.scrollY),
			height: Math.round(section.getBoundingClientRect().height),
			rows: holdsRows(section),
			centred: centredHeight(section),
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
				width: Math.round(rect.width),
				name: named(
					`${block.tagName.toLowerCase()}.${block.classList[0] ?? ""}`,
				),
				top: Math.round(rect.top + window.scrollY),
				height: Math.round(rect.height),
				rows: holdsRows(block),
			});
		}
	}
	// The text blocks above and beside the Sections of a Pane that has some.
	for (const [index, pane] of panes.entries()) {
		if (!boxes.some((box) => box.pane === index && !box.text)) continue;
		// The facts line is the wrapping row beside a head's name or text: a
		// wrapping row whose parent holds a heading or a paragraph.
		// A Pane with no Section is judged by its body's blocks, so the text in
		// them is their content, which their own heights already carry.
		const judged = boxes.some((box) => box.pane === index && box.aside)
			? []
			: blocksOf(pane);
		const blocks = pane.querySelectorAll(
			"p, h1, h2, :is(h1, h2, p) ~ .flex-wrap, .flex-wrap:has(~ :is(h1, h2, p))",
		);
		for (const p of blocks) {
			if (p.closest("section") !== pane) continue;
			if (judged.some((block) => block.contains(p))) continue;
			const rect = p.getBoundingClientRect();
			boxes.push({
				text: true,
				pane: index,
				column: Math.round(rect.left),
				width: Math.round(rect.width),
				name: named(
					`text.${p.matches(".flex-wrap") ? "facts" : (p.className.split(" ")[0] ?? "")}`,
				),
				top: Math.round(rect.top + window.scrollY),
				height: Math.round(rect.height),
				rows: true,
			});
		}
	}
	return boxes;
}

// Whether two boxes share a column: their horizontal extents overlap. An aside
// stands across its Pane, so it shares every column.
function sharesColumn(a: SectionBox, b: SectionBox): boolean {
	if (a.pane !== b.pane) return false;
	if (a.aside || b.aside) return true;
	return a.column < b.column + b.width && b.column < a.column + a.width;
}

// A Section's slot: its Pane, its column and its position among the Sections
// of that column from the top. The waiting form's Section and the loaded
// form's at one slot are the same Section, whatever each is titled (a Section
// titled by its record paints a filler waiting and the record's title loaded).
function slotsOf(boxes: readonly SectionBox[]): Map<SectionBox, string> {
	const columns = new Map<string, SectionBox[]>();
	for (const box of boxes) {
		if (!box.section) continue;
		const key = `${box.pane}:${box.column}`;
		columns.set(key, [...(columns.get(key) ?? []), box]);
	}
	const slots = new Map<SectionBox, string>();
	for (const [key, group] of columns)
		for (const [at, box] of group.sort((x, y) => x.top - y.top).entries())
			slots.set(box, `${key}:${at}`);
	return slots;
}

// What moved between the waiting read and the loaded one; none means the page
// held still. Sections pair by slot (see `slotsOf`), every other block by
// name; the loaded form may draw more Sections than the waiting one in a
// column (one per record), and those below the paired ones are not findings.
// Per Pane, each Section is judged against the Sections above it
// in its column (those whose horizontal extent overlaps its own and whose top
// is above its top), never against a Section beside it:
//  - a Section that stood while waiting is gone loaded: fails;
//  - a Section with none above it in its column moved by other than what the
//    text above it grew by (a head's description wrapping) plus, in a column
//    the page centres, half of what the column's height changed by: fails;
//  - a Section with some above it moved by other than what the first of its
//    column moved by plus what the Sections above it grew by: fails;
//  - a Section changed height with no rows, chart or text in either form: fails;
//    a block beside the Sections (a Diff between two) changing height the same,
//    and what it grew by moves the Sections below it;
// except that a move which a block caused, one absent while waiting and
// present loaded above the moved one (a Banner that stands only with its
// data), at least by that block's height, is reported and not failed.
export function compare(
	waiting: readonly SectionBox[],
	loaded: readonly SectionBox[],
): Shift {
	const shift: Shift = { fails: [], reports: [] };
	const before = waiting
		.filter((box) => !box.aside && !box.text)
		.sort((x, y) => x.top - y.top);
	const waitingSlots = slotsOf(waiting);
	const loadedSlots = slotsOf(loaded);
	// The loaded counterpart of a waiting box.
	const pairOf = (w: SectionBox) => {
		const slot = waitingSlots.get(w);
		return slot === undefined
			? loaded.find((box) => box.name === w.name)
			: loaded.find((box) => loadedSlots.get(box) === slot);
	};
	// The blocks that arrive with the data: a Section is paired or an extra,
	// never an arrival.
	const arrivals = loaded.filter(
		(l) => !l.text && !l.section && !waiting.some((w) => w.name === l.name),
	);
	// How much the text above a Section grew by.
	const textGrowth = (w: SectionBox) =>
		waiting
			.filter((t) => t.text && t.top < w.top && sharesColumn(t, w))
			.reduce(
				(sum, t) =>
					sum +
					((loaded.find((l) => l.name === t.name)?.height ?? t.height) -
						t.height),
				0,
			);
	// How much the blocks standing between Sections grew by: a block that stands
	// in both forms (a Diff after a Section) is filled by its data as a Section
	// is, so what it grew by moves what stands below it. A block above the first
	// Section is the head's, which holds still.
	const blockGrowth = (w: SectionBox) =>
		waiting
			.filter(
				(a) =>
					a.aside &&
					a.top < w.top &&
					sharesColumn(a, w) &&
					before.some((s) => s.top < a.top && sharesColumn(s, a)),
			)
			.reduce((sum, a) => {
				const l = pairOf(a);
				const grew = l ? l.height - a.height : 0;
				return Math.abs(grew) > ROUNDING && l && (a.rows || l.rows)
					? sum + grew
					: sum;
			}, 0);
	// What each judged Section left for the ones below it in its column.
	const done = new Map<
		SectionBox,
		{ offset: number; absorbed: number; grew: number; taken: Set<string> }
	>();
	for (const w of before) {
		const l = pairOf(w);
		if (!l) {
			shift.fails.push(`${w.name}: stood while waiting, gone loaded`);
			continue;
		}
		const over = before
			.filter((box) => box !== w && box.top < w.top && sharesColumn(box, w))
			.flatMap((box) => done.get(box) ?? []);
		// What stands above the first Section of a column (a head, a banner)
		// moves every Section after it alike; what the rows above grew by moves
		// them further, and what an arrival absorbed stays absorbed for the ones
		// after it.
		const first = over.length === 0;
		const inherited = over[0]?.offset ?? 0;
		const growth = over.reduce((sum, d) => sum + d.grew, 0);
		const earlier = over.reduce((sum, d) => sum + d.absorbed, 0);
		const taken = new Set(over.flatMap((d) => [...d.taken]));
		const moved = l.top - w.top;
		const centring =
			w.centred !== undefined && l.centred !== undefined
				? (w.centred - l.centred) / 2
				: 0;
		const due =
			(first ? textGrowth(w) + centring : inherited + growth + earlier) +
			blockGrowth(w);
		const extra = moved - due;
		let absorbed = 0;
		if (Math.abs(extra) > ROUNDING) {
			// The arrivals above this block that no Section above it has taken.
			const above = arrivals.filter(
				(a) => a.top < l.top && sharesColumn(a, l) && !taken.has(a.name),
			);
			const size = above.reduce((sum, a) => sum + a.height, 0);
			if (above.length > 0 && extra >= size - ROUNDING) {
				for (const a of above) taken.add(a.name);
				absorbed = extra;
				shift.reports.push(
					`${w.name}: moved ${extra}px for ${above.map((a) => a.name).join(", ")}, which arrive${above.length > 1 ? "" : "s"} with the data`,
				);
			} else if (first) {
				shift.fails.push(
					`${w.name}: first Section moved ${moved}px (what stands above it changed height)`,
				);
			} else {
				shift.fails.push(
					`${w.name}: moved ${moved}px, ${due === 0 ? "nothing above it changed" : `${due}px was due`}`,
				);
			}
		}
		const grew = l.height - w.height;
		let grown = 0;
		if (Math.abs(grew) > ROUNDING) {
			if (!(w.rows || l.rows))
				shift.fails.push(
					`${w.name}: height ${w.height} -> ${l.height} with no rows in it`,
				);
			grown = grew;
		}
		done.set(w, {
			offset: first ? moved - absorbed : inherited,
			absorbed,
			grew: grown,
			taken,
		});
	}
	// A block beside the Sections that changed height with nothing filling it.
	for (const a of waiting.filter((box) => box.aside)) {
		const l = loaded.find((box) => box.name === a.name);
		if (l && Math.abs(l.height - a.height) > ROUNDING && !(a.rows || l.rows))
			shift.fails.push(
				`${a.name}: height ${a.height} -> ${l.height} with no rows in it`,
			);
	}
	return shift;
}
