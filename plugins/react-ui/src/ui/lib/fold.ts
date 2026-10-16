import { actsShown, marksShown } from "@fcalell/ui-core/fold";
import { useLayoutEffect, useRef, useState } from "react";

/** The refs of a Pane head's row and how many of its `acts` stand in it: the rest fold into the head's more menu, the last first. The row is measured as it resizes (the head's only measure), its title's start and its acts' boxes read once per size, and `actsShown` decides from them. The count is set in the observer's own callback, before the frame paints, so a head never draws an act it then folds. */
export function useFold(acts: number, more: boolean) {
	const row = useRef<HTMLDivElement>(null);
	const title = useRef<HTMLHeadingElement>(null);
	const group = useRef<HTMLSpanElement>(null);
	const close = useRef<HTMLSpanElement>(null);
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
			const style = getComputedStyle(end);
			const gap = Number.parseFloat(style.columnGap) || 0;
			if (first instanceof HTMLElement && first !== close.current)
				unit.current = first.offsetWidth;
			const overhang = -Math.min(
				0,
				Number.parseFloat(style.marginInlineEnd) || 0,
			);
			const next = actsShown({
				row: box.clientWidth,
				fixed:
					title.current.getBoundingClientRect().left -
					box.getBoundingClientRect().left +
					(side > 0 ? side + gap : 0),
				overhang,
				unit: unit.current,
				gap,
				acts,
				more,
			});
			setShown(next);
		};
		const resize = new ResizeObserver(measure);
		resize.observe(box);
		measure();
		return () => resize.disconnect();
	}, [acts, more]);
	return { row, title, group, close, shown: Math.min(shown, acts) };
}

/** The refs of a list row's measured boxes and how many of its `marks` stand in its end group: the later ones fold away, not drawn, last first, and the first always stands. `key` names the marks the row holds, so the measure is taken again when they change. A mark is measured whole, drawn or not (a folded one stands out of the flow, unseen, so it keeps its width and its place in the row's content), and `marksShown` decides from them, in the observer's own callback, before the frame paints. */
export function useMarksFold(marks: number, key: string) {
	const row = useRef<HTMLDivElement>(null);
	const text = useRef<HTMLSpanElement>(null);
	const column = useRef<HTMLSpanElement>(null);
	const group = useRef<HTMLSpanElement>(null);
	const [shown, setShown] = useState(marks);
	// biome-ignore lint/correctness/useExhaustiveDependencies: `key` names the marks the observer watches, which it must watch again when they change
	useLayoutEffect(() => {
		const box = row.current;
		const end = group.current;
		if (!marks || !box || !end) return;
		const measure = () => {
			if (!text.current) return;
			const stand = column.current ?? end;
			const style = getComputedStyle(box);
			const inner =
				box.clientWidth -
				(Number.parseFloat(style.paddingInlineStart) || 0) -
				(Number.parseFloat(style.paddingInlineEnd) || 0);
			const widths = Array.from(end.children, (mark) =>
				mark instanceof HTMLElement ? mark.offsetWidth : 0,
			);
			setShown(
				marksShown({
					row: inner,
					fixed: inner - text.current.offsetWidth - stand.offsetWidth,
					widths,
					gap: Number.parseFloat(getComputedStyle(end).columnGap) || 0,
				}),
			);
		};
		const resize = new ResizeObserver(measure);
		resize.observe(box);
		for (const mark of end.children) resize.observe(mark);
		measure();
		return () => resize.disconnect();
	}, [marks, key]);
	return { row, text, column, group, shown: Math.min(shown, marks) };
}
