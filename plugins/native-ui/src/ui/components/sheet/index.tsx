import type { Act } from "@fcalell/ui-core/descriptors";
import type { SheetFit } from "@fcalell/ui-core/variants";
import { type ReactNode, useContext } from "react";
import type { Closed } from "../../lib/closed";
import { FootPlace } from "../../lib/frame";
import { SheetBase } from "./base";
import { SheetDocked } from "./docked";

export interface SheetProps extends Closed {
	open: boolean;
	// Hears the close act, a press on the scrim and the drag down.
	onClose: () => void;
	/** The sheet's heading, which names it (a short phrase; wraps). */
	title: string;
	/** Under the title (a sentence; wraps). */
	description?: string;
	// A second page's way back, in the close act's place.
	back?: () => void;
	// The act that completes the task, at the head's end where a keyboard
	// would cover a bar; a blocked one's reason under the head.
	submit?: Act;
	/** In the foot (a sentence; wraps). */
	foot?: string;
	/** What the `submit`'s last run failed with (a sentence; wraps): an error in the line a blocked reason keeps (under the head's submit, or under the docked foot's act), the act ready again. Clear it to dismiss; a blocked `submit`'s reason stands before it. */
	failed?: string;
	// What the desktop side sheet holds; on the phone a pane's title steps
	// down to body 500.
	fit?: SheetFit;
	children?: ReactNode;
}

// A bottom sheet over the scrim: the close act first, the title, the submit
// at the head's end, the description under them; the body; the foot's line.
// Passed as a Thread's or a Place's `foot` it docks there with no scrim: the
// back act, the title and the close act over the description in the head, the
// body scrolling under the foot's bound, the foot line over the
// submit and under it one kept line for a blocked reason or a failed run;
// `onClose` hears the close act, and closing hands focus to the input
// that returns.
export function Sheet({
	open,
	onClose,
	title,
	description,
	back,
	submit,
	foot,
	failed,
	fit,
	children,
}: SheetProps) {
	if (useContext(FootPlace))
		return (
			<SheetDocked
				open={open}
				onClose={onClose}
				title={title}
				description={description}
				back={back}
				submit={submit}
				foot={foot}
				failed={failed}
			>
				{children}
			</SheetDocked>
		);
	return (
		<SheetBase
			open={open}
			onClose={onClose}
			title={title}
			description={description}
			back={back}
			submit={submit}
			foot={foot}
			failed={failed}
			fit={fit}
		>
			{children}
		</SheetBase>
	);
}
