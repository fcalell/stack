import type { LinkAct } from "@fcalell/ui-core/descriptors";
import { useContext } from "react";
import { EmptyBase, type EmptyFit } from "../../lib/empty";
import { BackRoute, PlaceRoute } from "../../lib/frame";
import { useWords } from "../../lib/words";

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
// draws. Outside the package's exports: `fit` is the drawer's, `fill` the reads'
// alone, its frame filling the box it stands in.
export function MissingBase(props: {
	fit: EmptyFit;
	sentence?: string;
	act?: LinkAct;
	fill?: boolean;
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
		/>
	);
}
