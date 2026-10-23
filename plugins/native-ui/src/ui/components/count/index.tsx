import {
	type Datum,
	paints,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import type { Closed } from "../../lib/closed";
import { CountBase } from "./base";

export interface CountProps extends Closed {
	/** The number, or its drawn form where it is capped (`tabCount`). A selection paints the figure until its read lands. */
	value: Datum<number | string>;
}

// A number in the muted ink, its figures at one width.
export function Count({ value }: CountProps) {
	const [figure] = useSelections([value]);
	if (paints(figure)) return <CountBase value="" painted />;
	// An ended read draws no figure; the frame that holds it says why.
	return figure.painted ? null : <CountBase value={figure.value} />;
}
