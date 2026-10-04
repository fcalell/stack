import { use } from "react";
import { BackRoute, PlaceRoute } from "../../lib/frame.ts";
import { useWords } from "../../lib/words.tsx";
import { EmptyStateBase } from "./base.tsx";

/** An act that goes to a route, drawn as a link. */
export interface BackLink {
	label: string;
	href: string;
}

/** The Back link of a read that answers not found: to the enclosing Screen's back, else the Place's route; none with neither. */
export function useBackAct(): BackLink | undefined {
	const words = useWords();
	const screen = use(BackRoute);
	const place = use(PlaceRoute);
	const href = screen ?? place;
	if (href === undefined) return undefined;
	return { label: words.back, href };
}

/** What a read that answers not found draws: the rest EmptyState saying it no longer exists, with Back and never Retry; with `fill` its frame fills the box it stands in. */
export function Missing(props: { fill?: boolean }) {
	const words = useWords();
	const back = useBackAct();
	return (
		<EmptyStateBase
			tone="missing"
			sentence={words.missing}
			act={back}
			fill={props.fill}
		/>
	);
}
