import { NO_HOLDS } from "@fcalell/plugin-api/read";
import type { Selection } from "@fcalell/plugin-api/tanstack-query";
import { FrameHolds } from "@fcalell/plugin-api/tanstack-query";
import type { ProcedureCall } from "@fcalell/plugin-api/types";
import type { SheetFit } from "@fcalell/ui-core/variants";
import { type ReactNode, useRef } from "react";
import type { TextInput } from "react-native";
import type { Act } from "../../lib/act";
import { useAct } from "../../lib/act";
import type { Closed } from "../../lib/closed";
import type { Empty } from "../../lib/empty";
import { FieldClaim } from "../../lib/field";
import { type FormProps, useDerivedForm } from "../form";
import { FormBody } from "../form/base";
import { SheetBase } from "./base";

/** The sheet an act opens, or a `Pane`'s or a `Thread`'s docked one, over the procedure its form submits (`P`, read off the form's `act`, so `onDone` hears that procedure's output): a `Sheet`'s props but the two its holder owns, `open` and `onClose`. */
export interface ActSheetProps<P extends ProcedureCall = ProcedureCall>
	extends Closed {
	/** The sheet's heading, which names it (a short phrase; wraps). */
	title: string;
	/** Under the title (a sentence; wraps). */
	description?: string;
	// A second page's way back, in the close act's place.
	back?: () => void;
	// The act that completes the task, at the head's end where a keyboard
	// would cover a bar; a blocked one's reason under the head.
	submit?: Act;
	// What the desktop card holds; on the phone a pane's title steps
	// down to body 500.
	fit?: SheetFit;
	/** What the body holds, read once for the frame: while it waits the body's leaves paint and the submit with them, inert; its failure and a missing record stand in the body's place, the submit blocked with the failed sentence. A sheet starts with no holds: its read draws its state here whatever the page under it holds. */
	read?: Selection<unknown>;
	/** The body's sentence when the `read`'s selection is empty. */
	empty?: Empty;
	/** A form the body ends with, a `Form`'s props (its procedure, its fields): its rows flush on the sheet after the body's parts, its bar in the sheet's foot, pinned while the fields scroll; the sheet asks nothing when it closes, and the viewer's edits are dropped as it opens again. Give the form's submit or the sheet's `submit` as the act that completes the task, not both. */
	form?: FormProps<P>;
	// The body's parts, ahead of the `form`, at the card inset.
	children?: ReactNode;
}

export interface SheetProps<P extends ProcedureCall = ProcedureCall>
	extends ActSheetProps<P> {
	open: boolean;
	// Hears the close act, a press on the scrim and the drag down.
	onClose: () => void;
}

// A bottom sheet over the scrim, content-tall and growing with its content up to the cap: the close act first, the title, the submit
// at the head's end, the description under them; the body; the form's bar. The first `Input` or code `Input` of the body takes focus
// as the sheet opens (the keyboard rises with it), as a `Gate`'s step does.
// Always the modal one: a docked sheet is a Pane's or a Thread's `sheet`.
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
	// The form's bar is hoisted into the foot, so the sheet holds its run beside
	// its own submit's: one act pends at a time and the dismissal is held while
	// it runs.
	const acting = useAct<number>("line");
	const derived = useDerivedForm(form, open);
	// The body is the sheet's own: its first typing control claims focus as it
	// mounts. The provider stands inside `SheetBase`'s children, which the
	// bottom sheet portals out of this tree.
	const held = useRef<TextInput>(null);
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
				bar={derived?.bar}
				barRead={derived?.read}
				read={read}
				empty={empty}
				fields={
					derived ? (
						<FieldClaim.Provider value={held}>
							<FormBody {...derived} bar={undefined} in="sheet" />
						</FieldClaim.Provider>
					) : undefined
				}
			>
				{children ? (
					<FieldClaim.Provider value={held}>{children}</FieldClaim.Provider>
				) : null}
			</SheetBase>
		</FrameHolds>
	);
}
