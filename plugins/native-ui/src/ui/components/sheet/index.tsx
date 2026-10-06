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
	// The sheet's heading, which names it.
	title: string;
	description?: string;
	// A second page's way back, in the close act's place.
	back?: () => void;
	// The act that completes the task, at the head's end where a keyboard
	// would cover a bar; a blocked one's reason under the head.
	submit?: Act;
	// A sentence in the foot.
	foot?: string;
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
// submit; `onClose` hears the close act, and closing hands focus to the input
// that returns.
export function Sheet({
	open,
	onClose,
	title,
	description,
	back,
	submit,
	foot,
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
			fit={fit}
		>
			{children}
		</SheetBase>
	);
}
