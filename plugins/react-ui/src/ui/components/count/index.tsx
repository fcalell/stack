import { type Datum, useSelections } from "@fcalell/plugin-api/tanstack-query";
import type { Closed } from "../../lib/closed.ts";
import { CountBase } from "./base.tsx";

/** A number in the muted ink. */
export interface CountProps extends Closed {
	/** The number, or its drawn form where it is capped (`tabCount`). A selection paints the figure, and the Count is inert, until its read lands. */
	value: Datum<number | string>;
}

/** A number in the muted ink, its figures at one width. */
export function Count({ value }: CountProps) {
	const [figure] = useSelections([value]);
	return figure.painted ? (
		<CountBase value="" painted />
	) : (
		<CountBase value={figure.value} />
	);
}
