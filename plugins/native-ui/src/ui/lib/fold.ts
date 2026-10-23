import { actStands, actsShown, marksShown } from "@fcalell/ui-core/fold";
import { useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import { tokenPx } from "./frame";
import { useCSSVariable } from "./theme";

/** The layouts of a Pane head's row, its title and its acts, and how many of its `acts` stand in the row: the rest fold into the head's more menu, the last first. The row is read off its own layout (Yoga has no container units) and `actsShown` decides from it; nothing is shown folded before the first layout. The acts' width gives one act's box from `items`, the acts and the more act that stand together. */
export function useFold(acts: number, more: boolean) {
	const gap = tokenPx(useCSSVariable("--spacing-gap"));
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

// A labelled act stands whole beside the text group's floor (`useActFold`
// decides); where it does not fit it folds into the more menu: out of the flow
// and unseen, whole as it is, so it keeps laying out, and no press, the menu's
// item running it. The act's group is `relative`, which the folded act is
// placed in.
export const ACT_SLOT = "flex-row shrink-0";
export const ACT_FOLDED = "absolute right-0 flex-row opacity-0";

/** The layouts of the boxes a labelled act is measured against, and whether it stands beside the text group's floor or folds, whole, into the more menu (the head's or the row's). The row is read off its own layout, its text group's start and width, the act (folded or not) and the more act, and `actStands` decides from them; nothing is shown folded before they have laid out. `pad` is the row's padding on each side and `gap` the gap between its items; `beside` is the width the end group's other items take whole, with the gaps between them and the one before the act's group (the value and a pick are cut to the room that is left, so they count for nothing); `more` says the row has a more menu of its own. A folded act stands out of the flow, unseen, so it keeps laying out whole and stays in the row's content for a screen reader. */
export function useActFold(room: {
	acted: boolean;
	more: boolean;
	pad: number;
	gap: number;
	beside: number;
}) {
	const { acted, more, pad, gap, beside } = room;
	const gapActs = tokenPx(useCSSVariable("--spacing-gap"));
	const [row, setRow] = useState(0);
	const [text, setText] = useState({ x: 0, width: 0 });
	const [slot, setSlot] = useState(0);
	const [menu, setMenu] = useState(0);
	const onRow = (event: LayoutChangeEvent) =>
		setRow(event.nativeEvent.layout.width);
	const onText = (event: LayoutChangeEvent) => {
		const { x, width } = event.nativeEvent.layout;
		setText((was) => (was.x === x && was.width === width ? was : { x, width }));
	};
	const onSlot = (event: LayoutChangeEvent) =>
		setSlot(event.nativeEvent.layout.width);
	const onMenu = (event: LayoutChangeEvent) =>
		setMenu(event.nativeEvent.layout.width);
	const placed = acted && row > 0 && text.width > 0 && slot > 0;
	const stands =
		!placed ||
		actStands({
			row: row - 2 * pad,
			fixed:
				text.x - pad + gap + beside + (more && menu > 0 ? menu + gapActs : 0),
			act: slot,
		});
	return { row, text, onRow, onText, onSlot, onMenu, stands };
}

/** The layouts of a list row, the column its marks stand in and each mark, and how many of its `marks` stand in its end group: the later ones fold away, not drawn, last first, and the first always stands. For a row with a labelled `act` it also says whether the act stands or folds into the row's more menu (`useActFold`): `act` gives how many items the end group holds and whether the row has a more menu of its own. `marksShown` decides from the layout; nothing is shown folded before every mark has laid out. A folded mark stands out of the flow, unseen, so it keeps laying out whole and stays in the row's content for a screen reader. The act folds first, deciding over the marks whole and the value and a pick counted for nothing (they are cut to the room that is left), so a row's folds are a function of its width alone. */
export function useMarksFold(
	marks: number,
	act?: { items: number; more: boolean },
) {
	const pad = tokenPx(useCSSVariable("--spacing-pad"));
	const gap = tokenPx(useCSSVariable("--spacing-gap"));
	const [column, setColumn] = useState(0);
	const [widths, setWidths] = useState<number[]>([]);
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
	const whole = widths.slice(0, marks);
	const wholeMarks =
		whole.reduce((sum, one) => sum + one, 0) +
		Math.max(0, whole.length - 1) * gap;
	const fold = useActFold({
		acted: act !== undefined,
		more: act?.more ?? false,
		pad,
		gap,
		beside: wholeMarks + ((act?.items ?? 1) - 1) * gap,
	});
	const { row, text } = fold;
	const inner = row - 2 * pad;
	const measured =
		marks > 0 && row > 0 && text.width > 0 && widths.length >= marks;
	const shown = measured
		? marksShown({
				row: inner,
				fixed: inner - text.width - column,
				widths: whole,
				gap,
			})
		: marks;
	return {
		onRow: fold.onRow,
		onText: fold.onText,
		onColumn,
		onMark,
		onSlot: fold.onSlot,
		onMenu: fold.onMenu,
		shown,
		stands: fold.stands,
	};
}
