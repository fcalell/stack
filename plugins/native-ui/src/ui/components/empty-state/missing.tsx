import type { Act } from "@fcalell/ui-core/descriptors";
import { useContext } from "react";
import { BackRoute, PlaceRoute } from "../../lib/frame";
import { navigate } from "../../lib/navigate";
import { useWords } from "../../lib/words";
import { EmptyStateBase } from "./base";

// The Back act of a read that answers not found: to the enclosing Screen's
// back, else the Place's route; none with neither.
export function useBackAct(): Act | undefined {
	const words = useWords();
	const screen = useContext(BackRoute);
	const place = useContext(PlaceRoute);
	const route = screen ?? place;
	if (route === undefined) return undefined;
	return { label: words.back, onAct: () => navigate(route) };
}

// What a read that answers not found draws: the rest EmptyState saying it no
// longer exists, with Back and never Retry; with `fill` its frame fills the
// box it stands in.
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
