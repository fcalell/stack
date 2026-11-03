import type { LinkAct } from "@fcalell/ui-core/descriptors";
import { filled } from "@fcalell/ui-core/tokens";
import { useContext } from "react";
import { EmptyBase, type EmptyFit } from "../../lib/empty";
import { BackRoute, PlaceRoute } from "../../lib/frame";
import { useWords } from "../../lib/words";

// The Back link of a Pane's read that answers not found: to the Pane's back,
// else the place's route; none with neither, and none where the Pane's `back`
// is `false`.
export function useBackAct(): LinkAct | undefined {
	const words = useWords();
	const pane = useContext(BackRoute);
	const place = useContext(PlaceRoute);
	const href = pane === false ? undefined : (pane ?? place);
	if (href === undefined) return undefined;
	return { label: words.back, href };
}

// The missing form every read that answers not found draws, and the page for
// an address nothing serves. Outside the package's exports: `fit` is the
// drawer's, `fill` the reads' alone, its frame filling the box it stands in;
// `noun` words the sentence for the kind of record (the Pane's), `sentence`
// replaces it. The way back is the Pane's: its own `page` fit offers it, any
// other frame says the sentence alone.
export function MissingBase(props: {
	fit: EmptyFit;
	noun?: string;
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
			sentence={
				props.sentence ??
				(props.noun === undefined
					? words.missing
					: filled(words.missingNoun, { noun: props.noun }))
			}
			act={props.act ?? (props.fit === "page" ? back : undefined)}
			fill={props.fill}
		/>
	);
}
