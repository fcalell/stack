import type { LinkAct } from "@fcalell/ui-core/descriptors";
import { filled } from "@fcalell/ui-core/tokens";
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

/** The missing form every read that answers not found draws, and the page for an address nothing serves. Outside the package's exports: `fit` and `fill` are the reads' alone, where its form stands and whether its line fills the box it stands in; `noun` words the sentence for the kind of record (the Pane's), `sentence` replaces it. */
export function MissingBase(props: {
	fit?: EmptyFit;
	noun?: string;
	sentence?: string;
	act?: LinkAct;
	fill?: boolean;
}) {
	const words = useWords();
	const back = useBackAct();
	return (
		<EmptyBase
			fit={props.fit ?? "frame"}
			tone="missing"
			sentence={
				props.sentence ??
				(props.noun === undefined
					? words.missing
					: filled(words.missingNoun, { noun: props.noun }))
			}
			act={props.act ?? back}
			fill={props.fill}
		/>
	);
}
