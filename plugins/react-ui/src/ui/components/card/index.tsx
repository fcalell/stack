import { cn } from "@fcalell/ui-core/cn";
import { CARD_BODY, CARD_PART, ROWS } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import type { Closed } from "../../lib/closed.ts";

const BOX = "min-w-0";

/** A card for a part of a Section's body that draws none of its own. */
export interface CardProps extends Closed {
	/** The part (a Prose, a Slider, a field, a Stages, an Image), at the card's inset. */
	children: ReactNode;
}

/** The surface inside a hairline at the card radius, its content at the card's inset: what a Section's part stands on when it is no sheet, Form, Table or Stats, which are cards of their own and never stand in one. A run of rows: a field placed alone (an `Input`, a `Picker`) takes the label column the Section's other rows share, at the desktop density. */
export function Card(props: CardProps) {
	// A run of rows, as a Section's body and a sheet are: a field placed alone in
	// it takes the run's label column, as the facts beside it do, and a part
	// spans both columns.
	return (
		<div className={cn(CARD_PART, CARD_BODY, ROWS, BOX)}>{props.children}</div>
	);
}
