import { actsShown } from "@fcalell/ui-core/fold";
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
