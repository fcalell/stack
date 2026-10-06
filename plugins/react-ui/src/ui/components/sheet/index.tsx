import type { Act } from "@fcalell/ui-core/descriptors";
import type { SheetFit } from "@fcalell/ui-core/variants";
import { type ReactNode, use } from "react";
import type { Closed } from "../../lib/closed.ts";
import { FootPlace } from "../../lib/frame.ts";
import { SheetBase } from "./base.tsx";
import { SheetDocked } from "./docked.tsx";

/** A task over the page. */
export interface SheetProps extends Closed {
	/** The sheet is open. */
	open: boolean;
	/** Hears Escape, a press outside, the close act and Cancel. */
	onClose: () => void;
	/** The sheet's heading, which names it. */
	title: string;
	/** A sentence under the title. */
	description?: string;
	/** A second page's way back: the back act stands first in the head, on touch in the close act's place. */
	back?: () => void;
	/** The act that completes the task: after Cancel in the foot on the desktop, at the head's end on touch. A promise its `onAct` returns keeps it pending until it settles. */
	submit?: Act;
	/** A sentence in the foot, beside the submit on the desktop. */
	foot?: string;
	/** What the desktop side sheet holds: a form (the default) or a record's pane. */
	fit?: SheetFit;
	/** The body. */
	children?: ReactNode;
}

/** On the desktop a side sheet at the end over the scrim, its head (the title over the description beside the close act) over the body and the foot; on touch a bottom sheet with the close act first and the submit at the head's end, a blocked submit's reason under the head. Passed as a `Thread`'s or a `Place`'s `foot` it docks there with no scrim: the back act, the title over the description and the close act in the head, the body scrolling under the foot's bound, the `foot` line beside the `submit` in the foot, at both densities; Escape calls `onClose`, and closing hands focus to the input that returns. */
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
	if (use(FootPlace))
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
