import type { Selection } from "@fcalell/plugin-api/tanstack-query";
import type { Act } from "@fcalell/ui-core/descriptors";
import type { SheetFit } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import type { Closed } from "../../lib/closed";
import type { EmptyProps } from "../../lib/empty";
import type { FormProps } from "../form";
import { FormBody } from "../form/base";
import { SheetBase } from "./base";

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
	// What the desktop card holds; on the phone a pane's title steps
	// down to body 500.
	fit?: SheetFit;
	/** What the body holds, read once for the frame: while it waits the body's leaves paint and the submit with them, inert; its failure and a missing record stand in the body's place. */
	read?: Selection<unknown>;
	/** The body's sentence when the `read`'s selection is empty. */
	empty?: EmptyProps;
	/** A form the body ends with, drawn in the sheet's column: its `bar` stands in the sheet's foot, pinned while the fields scroll, and the sheet asks nothing when it closes. Give the form's `bar` or the sheet's `submit` as the act that completes the task, not both. */
	form?: FormProps;
	// The body, ahead of the `form`.
	children?: ReactNode;
}

// A bottom sheet over the scrim, content-tall and growing with its content up to the cap: the close act first, the title, the submit
// at the head's end, the description under them; the body; the foot's line
// over the form's bar. Always the modal one: a docked sheet is a Pane's or a
// Thread's `sheet`.
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
			bar={form?.bar}
			read={read}
			empty={empty}
		>
			{form ? (
				<>
					{children}
					<FormBody {...form} bar={undefined} in="sheet" />
				</>
			) : (
				children
			)}
		</SheetBase>
	);
}
