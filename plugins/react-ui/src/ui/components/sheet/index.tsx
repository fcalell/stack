import { NO_HOLDS } from "@fcalell/plugin-api/read";
import type { Selection } from "@fcalell/plugin-api/tanstack-query";
import { FrameHolds } from "@fcalell/plugin-api/tanstack-query";
import type { Act } from "@fcalell/ui-core/descriptors";
import type { SheetFit } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { useAct } from "../../lib/act.ts";
import type { Closed } from "../../lib/closed.ts";
import type { Empty } from "../../lib/empty.tsx";
import { FormBody } from "../form/base.tsx";
import type { FormProps } from "../form/index.tsx";
import { SheetBase } from "./base.tsx";

/** A task over the page. */
export interface SheetProps extends Closed {
	/** The sheet is open. */
	open: boolean;
	/** Hears Escape, a press outside, the close act and Cancel. */
	onClose: () => void;
	/** The sheet's heading, which names it (a short phrase; wraps). */
	title: string;
	/** Under the title (a sentence; wraps). */
	description?: string;
	/** A second page's way back: the back act stands first in the head, on touch in the close act's place. */
	back?: () => void;
	/** The act that completes the task: after Cancel in the foot on the desktop, at the head's end on touch. A promise its `onAct` returns keeps it pending until it settles. */
	submit?: Act;
	/** In the foot, beside the submit on the desktop (a sentence; wraps). */
	foot?: string;
	/** What the sheet says when its `read` fails, in place of the generic sentence (a sentence; wraps). A rejected act draws its own sentence in the line a blocked reason keeps under the act (under the head's submit on touch), the act ready again. */
	failed?: string;
	/** What the desktop card holds, which sets its width: a form (the default) or a record's pane. */
	fit?: SheetFit;
	/** What the body holds, read once for the frame: while it waits the body's leaves paint and the submit with them, inert; its failure and a missing record stand in the body's place, the submit blocked with the failed sentence. A sheet is a surface of its own: it starts with no holds, so its read draws its state here whatever the page under it holds. */
	read?: Selection<unknown>;
	/** The body's sentence when the `read`'s selection is empty. */
	empty?: Empty;
	/** A form the body ends with, drawn in the sheet's column: its `bar` sticks to the body's foot, and the sheet asks nothing when it closes. Give the form's `bar` or the sheet's `submit` as the act that completes the task, not both. */
	form?: FormProps;
	/** The body, ahead of the `form`. */
	children?: ReactNode;
}

/** On the desktop a card centred over the scrim, capped at the viewport less the page inset with its body scrolling, its head (the title over the description beside the close act) over the body and the foot; on touch a bottom sheet with the close act first and the submit at the head's end, a blocked submit's reason under the head. Always the modal one: a docked sheet is a `Pane`'s or a `Thread`'s `sheet`. */
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
	read,
	empty,
	form,
	children,
}: SheetProps) {
	// The sheet's form has a bar of its own: one holder keeps the dismissal held
	// while either the form's act or the sheet's runs.
	const acting = useAct<number>("line");
	return (
		<FrameHolds holds={NO_HOLDS}>
			<SheetBase
				acting={acting}
				open={open}
				onClose={onClose}
				title={title}
				description={description}
				back={back}
				submit={submit}
				foot={foot}
				failed={failed}
				fit={fit}
				read={read}
				empty={empty}
			>
				{form ? (
					<>
						{children}
						<FormBody {...form} in="sheet" acting={acting} outer={read} />
					</>
				) : (
					children
				)}
			</SheetBase>
		</FrameHolds>
	);
}
