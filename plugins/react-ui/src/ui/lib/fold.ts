import {
	actStands,
	actsShown,
	firstFits,
	type MarkKind,
	markFloors,
	marksShown,
	rowStandsOneLine,
	TITLE_FLOOR,
} from "@fcalell/ui-core/fold";
import { type RefObject, useLayoutEffect, useRef, useState } from "react";

/** The refs of a Pane head's row and how many of its `acts` stand in it: the rest fold into the head's more menu, the last first. The context pick is measured whole, its word as it reads and not as it is cut: the acts fold first, and where the pick does not stand whole beside the title's floor and the more act it is `bare` (its dot and chevron, the word kept unseen through `word`) before its word is ever cut. The row is measured as it resizes (the head's only measure), its title's start, its context pick (`picks` says one stands) and its acts' boxes read once per size, and `actsShown` decides from them. The count is set in the observer's own callback, before the frame paints, so a head never draws an act it then folds. */
export function useFold(acts: number, more: boolean, picks: boolean) {
	const row = useRef<HTMLDivElement>(null);
	const title = useRef<HTMLHeadingElement>(null);
	const group = useRef<HTMLSpanElement>(null);
	const close = useRef<HTMLSpanElement>(null);
	const pill = useRef<HTMLSpanElement>(null);
	const word = useRef<HTMLSpanElement>(null);
	const [bare, setBare] = useState(false);
	const [shown, setShown] = useState(acts);
	// The acts' box is the same whether an act or the more act stands first, so
	// it is read off whichever does; with none standing it is the last one read.
	const unit = useRef(0);
	useLayoutEffect(() => {
		const box = row.current;
		if (!box) return;
		const measure = () => {
			const end = group.current;
			const first = end?.firstElementChild;
			if (!end || !title.current) return;
			// The close act stands beside the acts and takes a gap of its own.
			const side = close.current?.offsetWidth ?? 0;
			// The context pick stands between the title and the acts, a gap from each.
			const chosen = pill.current;
			const style = getComputedStyle(end);
			const gap = Number.parseFloat(style.columnGap) || 0;
			if (first instanceof HTMLElement && first !== close.current)
				unit.current = first.offsetWidth;
			// The pick at its whole width and at its bare one: its word is the span the
			// pick hands out, whole by `scrollWidth` drawn or not, and after the dot and the
			// gap only when it stands in the flow.
			const said = word.current;
			let whole = chosen?.offsetWidth ?? 0;
			let bared = whole;
			if (chosen && said) {
				const inside = gapOf(said.parentElement);
				const held = getComputedStyle(said).position === "absolute";
				bared = held ? whole : whole - said.offsetWidth - inside;
				whole = bared + inside + said.scrollWidth;
			}
			const overhang = -Math.min(
				0,
				Number.parseFloat(style.marginInlineEnd) || 0,
			);
			const before =
				title.current.getBoundingClientRect().left -
				box.getBoundingClientRect().left +
				(side > 0 ? side + gap : 0);
			const room = {
				row: box.clientWidth,
				overhang,
				unit: unit.current,
				gap,
				acts,
				more,
			};
			// The pick stands whole where the title's floor leaves room for it and the
			// more act alone (the acts fold first, as far as they go); past that its word
			// folds, never cut.
			const tail = acts > 0 || more ? unit.current : 0;
			const stands =
				whole === 0 ||
				whole === bared ||
				room.row * (1 - TITLE_FLOOR) -
					(before + whole + gap) -
					gap +
					overhang >=
					tail;
			const picked = stands ? whole : bared;
			setBare(!stands);
			setShown(
				actsShown({ ...room, fixed: before + (picked > 0 ? picked + gap : 0) }),
			);
		};
		const resize = new ResizeObserver(measure);
		resize.observe(box);
		if (picks && pill.current) resize.observe(pill.current);
		measure();
		return () => resize.disconnect();
	}, [acts, more, picks]);
	return {
		row,
		title,
		group,
		close,
		pill,
		word,
		bare,
		shown: Math.min(shown, acts),
	};
}

// A box's width with its text whole: a standing act's label is cut with an
// ellipsis where it overflows its box, and its text reaches past by `scrollWidth`.
function wholeWidth(box: HTMLElement): number {
	let cut = 0;
	for (const part of box.querySelectorAll<HTMLElement>("*"))
		cut += Math.max(0, part.scrollWidth - part.clientWidth - 1);
	return box.offsetWidth + cut;
}

// A status's width with its word whole: its dot, the gap and the word at the
// word's own width, whether the word is drawn (cut to its room or not) or stands
// unseen beside the dot alone (`bare`), so the fold decides from it and not from
// the form it chose. The word is the status root's child, after the dot.
const PILL_CHROME = new WeakMap<HTMLElement, number>();

function statusWidth(word: HTMLElement | null): number | undefined {
	const mark = word?.parentElement;
	if (!word || !mark) return undefined;
	const gap = gapOf(mark);
	const at = mark.getBoundingClientRect();
	// Drawn, the mark is its dot, the gap, the word and the pill's own padding and
	// border, so what is not the word is the mark less the word's box; the whole is
	// that plus the word's own width. Unseen, the word is out of the flow and the
	// mark is its dot alone, so the whole takes what the pill kept when it last drew
	// the word.
	if (getComputedStyle(word).position !== "absolute")
		PILL_CHROME.set(word, at.width - word.clientWidth);
	const chrome = PILL_CHROME.get(word) ?? at.width + gap;
	return chrome + word.scrollWidth;
}

// A labelled act stands whole beside the text group's floor (`useActFold`
// decides); where it does not fit it folds into the more menu: out of the flow
// and unseen, whole as it is, so it is measured, and inert, the menu's item
// running it. Standing it gives way to its group as an act always did (its
// label cut with an ellipsis) until the fold has measured it. The act's group
// is `relative`, which the folded act is placed in.
export const ACT_SLOT = "flex min-w-0 max-w-full";
export const ACT_FOLDED =
	"absolute end-0 flex w-max opacity-0 pointer-events-none";

// The act's boxes are a head's divs and a row's spans alike.
type Box = HTMLDivElement & HTMLSpanElement;

const gapOf = (element: Element | null) =>
	element ? Number.parseFloat(getComputedStyle(element).columnGap) || 0 : 0;

/** The refs of the boxes a labelled act is measured against and whether it stands beside the text group's floor or folds, whole, into the more menu (the head's or the row's); a head or a row with an icon act never asks. `row` holds the `text` group first and then the act's group `acts` (the act's `slot`, folded or not, and the more act after it, which `more` says stands). `end` is the row's end group when the act's group is one item of it, so the other items and the gaps between them count; `marks` is the group of marks the act counts whole (the value and a pick are cut to the room that is left, so they count for nothing), re-read when `key` changes. The act is measured whole, drawn or not, and `actStands` decides from it in the observer's own callback, before the frame paints, so the folds are a function of the row's width alone. */
export function useActFold(room: {
	more: boolean;
	acted: boolean;
	marks?: RefObject<HTMLElement | null>;
	word?: RefObject<HTMLElement | null>;
	key?: string;
}) {
	const { more, acted, marks, word, key } = room;
	const row = useRef<Box>(null);
	const text = useRef<Box>(null);
	const end = useRef<Box>(null);
	const acts = useRef<Box>(null);
	const slot = useRef<HTMLSpanElement>(null);
	const [stands, setStands] = useState(true);
	// biome-ignore lint/correctness/useExhaustiveDependencies: `key` names the marks the observer watches, which it must watch again when they change
	useLayoutEffect(() => {
		const box = row.current;
		if (!box || !acted) return;
		const marked = marks?.current ?? null;
		const measure = () => {
			const edge = end.current;
			const span = acts.current;
			const own = slot.current;
			if (!text.current || !span || !own) return;
			const style = getComputedStyle(box);
			const lead = Number.parseFloat(style.paddingInlineStart) || 0;
			const inner =
				box.clientWidth -
				lead -
				(Number.parseFloat(style.paddingInlineEnd) || 0);
			// What stands before the text group, and the gap after it, whole; the
			// end group's marks at their full width and its own more act, with the
			// gaps between its items.
			const widths = marked
				? Array.from(marked.children, (mark) =>
						mark instanceof HTMLElement ? mark.offsetWidth : 0,
					)
				: [];
			const said = statusWidth(word?.current ?? null);
			if (said !== undefined && widths.length) widths[0] = said;
			const wholeMarks =
				widths.reduce((sum, one) => sum + one, 0) +
				Math.max(0, widths.length - 1) * gapOf(marked);
			const menu =
				more && span.children.length > 1 ? span.lastElementChild : null;
			const menuWidth = menu instanceof HTMLElement ? menu.offsetWidth : 0;
			const before =
				text.current.getBoundingClientRect().left -
				box.getBoundingClientRect().left -
				lead +
				gapOf(box);
			setStands(
				actStands({
					row: inner,
					fixed:
						before +
						wholeMarks +
						(edge ? (edge.children.length - 1) * gapOf(edge) : 0) +
						(menuWidth > 0 ? menuWidth + gapOf(span) : 0),
					act: wholeWidth(own),
				}),
			);
		};
		const resize = new ResizeObserver(measure);
		resize.observe(box);
		for (const mark of marked?.children ?? []) resize.observe(mark);
		if (slot.current) resize.observe(slot.current);
		// The text group grows into the room a folded act leaves, and the marks
		// fold again by it.
		if (text.current) resize.observe(text.current);
		measure();
		return () => resize.disconnect();
	}, [acted, more, marks, word, key]);
	return { row, text, end, acts, slot, stands: stands || !acted };
}

/** The refs of a list row's measured boxes, how many of its marks (`kinds`, in the order they stand) stand in its end group (the later ones fold away, not drawn, last first, and the first always stands), whether its status is `bare` (the first mark when it is a status whose word does not fit alone: the dot stands, the word kept out of the flow through `word`) and, for a row with a labelled `act`, whether the act stands or folds into the row's more menu (`useActFold`). `kinds` also names the marks the row holds, so the measure is taken again when they change; `act` says the row has an act and whether it has a more menu of its own; `least` is how many marks never fold (the first by default, none beside a pick). A mark is measured whole, drawn or not (a folded one stands out of the flow, unseen, so it keeps its width and its place in the row's content; the status is read through its word's own width, so the dot alone counts at what the whole would take), and a first mark that yields its label to a glyph (a lock, the one mark that does: `markFloors`) is counted at that glyph, so the marks after it stand beside the cut label instead of folding for it; `marksShown` decides from them, in the observer's own callback, before the frame paints. The act folds first, deciding over the marks whole and the value and a pick counted for nothing (they are cut to the room that is left), so a row's folds are a function of its width alone. */
export function useMarksFold(
	kinds: readonly MarkKind[],
	act?: { more: boolean },
	least = 1,
) {
	const marks = kinds.length;
	const key = kinds.join();
	const column = useRef<HTMLSpanElement>(null);
	const group = useRef<HTMLSpanElement>(null);
	const word = useRef<HTMLSpanElement>(null);
	const fold = useActFold({
		more: act?.more ?? false,
		acted: act !== undefined,
		marks: group,
		word,
		key,
	});
	const { row, text } = fold;
	const [shown, setShown] = useState(marks);
	const [bare, setBare] = useState(false);
	// Whether the row is too narrow for its one-line form (`rowStandsOneLine`),
	// read off the row's own width before the frame paints.
	const [narrow, setNarrow] = useState(false);
	useLayoutEffect(() => {
		const box = row.current;
		if (!box) return;
		const measure = () => {
			const style = getComputedStyle(box);
			setNarrow(
				!rowStandsOneLine(
					box.clientWidth -
						(Number.parseFloat(style.paddingInlineStart) || 0) -
						(Number.parseFloat(style.paddingInlineEnd) || 0),
				),
			);
		};
		const resize = new ResizeObserver(measure);
		resize.observe(box);
		measure();
		return () => resize.disconnect();
	}, [row]);
	// biome-ignore lint/correctness/useExhaustiveDependencies: `key` names the marks the observer watches, which it must watch again when they change
	useLayoutEffect(() => {
		const box = row.current;
		const marked = group.current;
		if (!box || !marks) return;
		const measure = () => {
			const stand = column.current ?? marked;
			if (!text.current || !stand) return;
			// The marks' group is transparent to layout (its slots stand in the
			// end group's line), so its width is its in-flow slots and the gaps
			// between them.
			const flow = Array.from(stand.children).filter(
				(one): one is HTMLElement =>
					one instanceof HTMLElement &&
					getComputedStyle(one).position !== "absolute",
			);
			const standing =
				flow.reduce((sum, one) => sum + one.offsetWidth, 0) +
				Math.max(0, flow.length - 1) * gapOf(stand);
			const style = getComputedStyle(box);
			const inner =
				box.clientWidth -
				(Number.parseFloat(style.paddingInlineStart) || 0) -
				(Number.parseFloat(style.paddingInlineEnd) || 0);
			// Each mark whole, however much room its slot holds now (the first is
			// cut to the room, its label truncating), so the fold is a function of
			// the row's width and not of the last fold. The floor is what a mark
			// that yields its label keeps (a lock's glyph), which its box declares
			// as a minimum width.
			const slots = marked
				? Array.from(marked.children).filter(
						(mark): mark is HTMLElement => mark instanceof HTMLElement,
					)
				: [];
			const widths = slots.map(wholeWidth);
			// A status counts at its word's own width, drawn or not, so the decision
			// does not follow the form it chose.
			const said = statusWidth(word.current);
			if (said !== undefined && widths.length) widths[0] = said;
			const floors = markFloors(
				kinds,
				slots.map((slot) => {
					const floor = slot.firstElementChild
						? Number.parseFloat(
								getComputedStyle(slot.firstElementChild).minWidth,
							)
						: Number.NaN;
					return floor > 0 ? floor : undefined;
				}),
			);
			const room = {
				row: inner,
				fixed: inner - text.current.offsetWidth - standing,
				widths,
				floors,
				gap: gapOf(marked),
				least,
			};
			setShown(marksShown(room));
			setBare(said !== undefined && !firstFits(room));
		};
		const resize = new ResizeObserver(measure);
		resize.observe(box);
		for (const mark of marked?.children ?? []) resize.observe(mark);
		// The text group grows into the room a folded act leaves.
		if (text.current) resize.observe(text.current);
		measure();
		return () => resize.disconnect();
	}, [marks, key, row, text, least]);
	return {
		row,
		text,
		column,
		group,
		word,
		bare,
		narrow,
		end: fold.end,
		acts: fold.acts,
		slot: fold.slot,
		shown: Math.min(shown, marks),
		stands: fold.stands,
	};
}
