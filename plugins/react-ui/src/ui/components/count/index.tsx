import { cn } from "@fcalell/ui-core/cn";
import { COUNT, COUNT_LABEL } from "@fcalell/ui-core/variants";
import { use } from "react";
import { InAct } from "../../lib/act-ink.ts";
import type { Closed } from "../../lib/closed.ts";

/** A number in the muted ink. */
export interface CountProps extends Closed {
	/** The number, or its drawn form where it is capped (`tabCount`). */
	value: number | string;
}

/** A number in the muted ink, its figures at one width; in a `Button` it draws in the act's ink. */
export function Count({ value }: CountProps) {
	const inAct = use(InAct);
	return (
		<span className={inAct ? COUNT_LABEL : cn(COUNT, COUNT_LABEL)}>
			{value}
		</span>
	);
}
