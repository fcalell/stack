import type { LinkAct } from "@fcalell/ui-core/descriptors";
import { use } from "react";
import { EmptyBase, type EmptyFit } from "../../lib/empty.tsx";
import { BackRoute, PlaceRoute } from "../../lib/frame.ts";
import { useWords } from "../../lib/words.tsx";

/** The Back link of a read that answers not found: to the enclosing Pane's `back`, else the Place's route; none with neither. */
export function useBackAct(): LinkAct | undefined {
	const words = useWords();
	const screen = use(BackRoute);
	const place = use(PlaceRoute);
	const href = screen ?? place;
	if (href === undefined) return undefined;
	return { label: words.back, href };
}

/** The missing form every Missing and every read that answers not found draws. Outside the package's exports: `fit` is the drawer's, `fill` the reads' alone, its frame filling the box it stands in. */
export function MissingBase(props: {
	fit: EmptyFit;
	sentence?: string;
	act?: LinkAct;
	fill?: boolean;
	// A Group's List draws it: the card is its frame.
	grouped?: boolean;
}) {
	const words = useWords();
	const back = useBackAct();
	return (
		<EmptyBase
			fit={props.fit}
			tone="missing"
			sentence={props.sentence ?? words.missing}
			act={props.act ?? back}
			fill={props.fill}
			grouped={props.grouped}
		/>
	);
}
