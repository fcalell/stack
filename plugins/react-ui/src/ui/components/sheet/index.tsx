import { NO_HOLDS } from "@fcalell/plugin-api/read";
import type { Selection } from "@fcalell/plugin-api/tanstack-query";
import { FrameHolds } from "@fcalell/plugin-api/tanstack-query";
import type { ProcedureCall } from "@fcalell/plugin-api/types";
import type { SheetFit } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { useAct } from "../../lib/act.ts";
import type { Closed } from "../../lib/closed.ts";
import type { Empty } from "../../lib/empty.tsx";
import { FormBody } from "../form/base.tsx";
import { type FormProps, useDerivedForm } from "../form/index.tsx";
import { SheetBase, type SheetSubmit } from "./base.tsx";

export type { Acknowledge, SheetSubmit } from "./base.tsx";

/** The sheet an act opens, or a `Pane`'s or a `Thread`'s docked one, over the procedure its form submits (`P`, read off the form's `act`, so `onDone` hears that procedure's output): a `Sheet`'s props but the two its holder owns, `open` and `onClose`. */
export interface ActSheetProps<P extends ProcedureCall = ProcedureCall>
	extends Closed {
	/** The sheet's heading, which names it (a short phrase; wraps). */
	title: string;
	/** Under the title (a sentence; wraps). */
	description?: string;
	/** A second page's way back: the back act stands first in the head, on touch in the close act's place. */
	back?: () => void;
	/** The act that completes the task, in the foot after the body: after Cancel on the desktop, alone on touch. A promise its `onAct` returns keeps it pending until it settles. Given with no `onAct` (`{ label: "I saved them" }`) it acknowledges what the sheet shows: the press closes the sheet, and it stands alone, with no Cancel. */
	submit?: SheetSubmit;
	/** What the desktop card holds, which sets its width: a form (the default) or a record's pane. */
	fit?: SheetFit;
	/** What the body holds, read once for the frame: while it waits the body's leaves paint and the submit with them, inert; its failure and a missing record stand in the body's place, the submit blocked with the failed sentence. A sheet starts with no holds, so its read draws its state here whatever the page under it holds. */
	read?: Selection<unknown>;
	/** The body's sentence when the `read`'s selection is empty. */
	empty?: Empty;
	/** A form the body ends with, a `Form`'s props (its procedure, its fields): its rows flush on the sheet after the body's parts, its bar stuck to the body's foot; the sheet asks "Discard your edit?" when it closes while the form stands edited (Escape, a press outside, the close act, Cancel), and the viewer's edits are dropped as it opens again. A bare control in the body (a `Picker`, an `Input` on the app's own value) asks nothing on close: its value is the app's, kept or dropped as the app decides. Give the form's submit or the sheet's `submit` as the act that completes the task, not both. */
	form?: FormProps<P>;
	/** The body's parts, ahead of the `form`, at the card inset. */
	children?: ReactNode;
}

/** A task over the page. */
export interface SheetProps<P extends ProcedureCall = ProcedureCall>
	extends ActSheetProps<P> {
	/** The sheet is open. */
	open: boolean;
	/** Hears Escape, a press outside, the close act and Cancel, once an edited form has been discarded. */
	onClose: () => void;
}

/** On the desktop a card centred across the scrim, its top a static inset under the viewport's top at every size, capped at the viewport less the page inset below it with its body scrolling, its head (the title over the description beside the close act) over the body and the foot; on touch a bottom sheet with the close act first and the submit in the foot after the body, a blocked submit's reason under the submit. Always the modal one: a docked sheet is a `Pane`'s or a `Thread`'s `sheet`. */
export function Sheet<P extends ProcedureCall>({
	open,
	onClose,
	title,
	description,
	back,
	submit,
	fit,
	read,
	empty,
	form,
	children,
}: SheetProps<P>) {
	// The sheet's form has a bar of its own: one holder keeps the dismissal held
	// while either the form's act or the sheet's runs.
	const acting = useAct<number>("line");
	const derived = useDerivedForm(form, open);
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
				fit={fit}
				read={read}
				empty={empty}
				fields={
					derived ? (
						<FormBody
							{...derived.frame}
							in="sheet"
							acting={acting}
							outer={[read, ...derived.outer]}
						/>
					) : undefined
				}
			>
				{children}
			</SheetBase>
		</FrameHolds>
	);
}
