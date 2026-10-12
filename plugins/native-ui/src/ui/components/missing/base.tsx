import type { LinkAct } from "@fcalell/ui-core/descriptors";
import { useContext } from "react";
import { BackRoute, PlaceRoute } from "../../lib/frame";
import { useWords } from "../../lib/words";
import { EmptyStateBase } from "../empty-state/base";

// The Back link of a read that answers not found: to the enclosing Pane's
// back, else the Place's route; none with neither.
export function useBackAct(): LinkAct | undefined {
	const words = useWords();
	const pane = useContext(BackRoute);
	const place = useContext(PlaceRoute);
	const href = pane ?? place;
	if (href === undefined) return undefined;
	return { label: words.back, href };
}

// The missing form every Missing and every read that answers not found
// draws. Outside the package's exports: `fill` is the reads' alone, its frame
// filling the box it stands in.
export function MissingBase(props: {
	sentence?: string;
	act?: LinkAct;
	fill?: boolean;
	// A Group's List draws it: the card is its frame.
	grouped?: boolean;
}) {
	const words = useWords();
	const back = useBackAct();
	return (
		<EmptyStateBase
			tone="missing"
			sentence={props.sentence ?? words.missing}
			act={props.act ?? back}
			fill={props.fill}
			grouped={props.grouped}
		/>
	);
}
