import type { Act } from "@fcalell/ui-core/descriptors";
import { use } from "react";
import { BackRoute, PlaceRoute } from "../../lib/frame.ts";
import { navigate } from "../../lib/navigate.ts";
import { useWords } from "../../lib/words.tsx";
import { EmptyStateBase } from "./base.tsx";

/** The Back act of a read that answers not found: to the enclosing Screen's back, else the Place's route; none with neither. */
export function useBackAct(): Act | undefined {
	const words = useWords();
	const screen = use(BackRoute);
	const place = use(PlaceRoute);
	const route = screen ?? place;
	if (route === undefined) return undefined;
	return { label: words.back, onAct: () => navigate(route) };
}

/** What a read that answers not found draws: the rest EmptyState saying it no longer exists, with Back and never Retry. */
export function Missing() {
	const words = useWords();
	const back = useBackAct();
	return <EmptyStateBase tone="missing" sentence={words.missing} act={back} />;
}
