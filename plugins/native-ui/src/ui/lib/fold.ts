import { actsShown, marksShown } from "@fcalell/ui-core/fold";
import { useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import { tokenPx } from "./frame";
import { useCSSVariable } from "./theme";

/** The layouts of a Pane head's row, its title and its acts, and how many of its `acts` stand in the row: the rest fold into the head's more menu, the last first. The row is read off its own layout (Yoga has no container units) and `actsShown` decides from it; nothing is shown folded before the first layout. The acts' width gives one act's box from `items`, the acts and the more act that stand together. */
export function useFold(acts: number, more: boolean) {
	const gap = tokenPx(useCSSVariable("--spacing-acts"));
	const overhang = tokenPx(useCSSVariable("--spacing-icon-inset"));
	const [row, setRow] = useState(0);
	const [lead, setLead] = useState(0);
	const [unit, setUnit] = useState(0);
	const onRow = (event: LayoutChangeEvent) =>
		setRow(event.nativeEvent.layout.width);
	// The title's start in the row is what stands before it, gap included.
	const onTitle = (event: LayoutChangeEvent) =>
		setLead(event.nativeEvent.layout.x);
	const onActs = (items: number) => (event: LayoutChangeEvent) => {
		if (items > 0)
			setUnit((event.nativeEvent.layout.width - (items - 1) * gap) / items);
	};
	const shown =
		row === 0 || unit === 0
			? acts
			: actsShown({ row, fixed: lead, overhang, unit, gap, acts, more });
	return { onRow, onTitle, onActs, shown };
}

/** The layouts of a list row, its text group, the column its marks stand in and each mark, and how many of its `marks` stand in its end group: the later ones fold away, not drawn, last first, and the first always stands. The row is read off its own layout and `marksShown` decides from it; nothing is shown folded before every mark has laid out. A folded mark stands out of the flow, unseen, so it keeps laying out whole and stays in the row's content for a screen reader. */
export function useMarksFold(marks: number) {
	const pad = tokenPx(useCSSVariable("--spacing-card"));
	const gap = tokenPx(useCSSVariable("--spacing-inside"));
	const [row, setRow] = useState(0);
	const [text, setText] = useState(0);
	const [column, setColumn] = useState(0);
	const [widths, setWidths] = useState<number[]>([]);
	const onRow = (event: LayoutChangeEvent) =>
		setRow(event.nativeEvent.layout.width);
	const onText = (event: LayoutChangeEvent) =>
		setText(event.nativeEvent.layout.width);
	const onColumn = (event: LayoutChangeEvent) =>
		setColumn(event.nativeEvent.layout.width);
	const onMark = (at: number) => (event: LayoutChangeEvent) => {
		const { width } = event.nativeEvent.layout;
		setWidths((was) => {
			if (was[at] === width) return was;
			const next = [...was];
			next[at] = width;
			return next;
		});
	};
	const inner = row - 2 * pad;
	const measured = marks > 0 && row > 0 && text > 0 && widths.length >= marks;
	const shown = measured
		? marksShown({
				row: inner,
				fixed: inner - text - column,
				widths: widths.slice(0, marks),
				gap,
			})
		: marks;
	return { onRow, onText, onColumn, onMark, shown };
}
