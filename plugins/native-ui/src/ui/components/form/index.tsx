import type { Selection } from "@fcalell/plugin-api/tanstack-query";
import type { ReactNode } from "react";
import type { Closed } from "../../lib/closed";
import type { Empty } from "../../lib/empty";
import type { ActionBarProps } from "../action-bar";
import { FormBody } from "./base";

// One group of fields a `Form` draws, titled.
export interface FormGroup {
	/** The group's name, its heading (a short phrase; wraps); without it the group draws no heading, for fields that lead or close the form among titled groups. */
	title?: string;
	/** Under the title (a sentence; wraps). */
	description?: string;
	/** A note ahead of the fields (a `Banner`, a sentence). */
	lead?: ReactNode;
	/** The group's `FormField`s. */
	fields: ReactNode;
	/** What the group's fields hold, read once for the group's frame: its leaves paint while it waits, and its failure and a missing record stand in the fields' place. */
	read?: Selection<unknown>;
	/** The fields' sentence when the group's `read` is empty. */
	empty?: Empty;
	/** What the group says when its `read` fails, in place of the generic sentence (a sentence; wraps). */
	failed?: string;
}

interface FormBase extends Closed {
	/** The acts that close the form, drawn in its foot; the bar's filled act submits the form. */
	bar?: ActionBarProps;
	/** What the form's fields hold, read once for the form's frame: the fields' leaves paint while it waits, the filled act with them, inert; its failure and a missing record stand in the fields' place. Each group has its own. */
	read?: Selection<unknown>;
	/** The fields' sentence when the `read`'s selection is empty. */
	empty?: Empty;
	/** What the form says when its `read` fails, in place of the generic sentence (a sentence; wraps). */
	failed?: string;
}

// The form's structure is its props: `children`, a flat run of `FormField`s,
// or `groups`, each drawn as a titled group; never both. A form among a
// screen's other sections is `Section > Form`, so every section's head-to-body
// gap stays the pair step.
export type FormProps = FormBase &
	(
		| {
				/** A flat run of `FormField`s, a fields step apart. */
				children?: ReactNode;
				groups?: never;
		  }
		| {
				children?: never;
				/** Groups of fields, a sections step apart, each its heading with its fields a fields step apart. */
				groups: readonly FormGroup[];
		  }
	);

// One column, at most a line of running text wide: fields apart at the fields
// rhythm, or `groups` apart at the sections rhythm with the `bar` under a
// hairline across the form; the bar sits in flow, so it scrolls with the
// fields and the keyboard never covers it. A form in a sheet or a gate is
// that drawer's `form` prop, not this component. Its filled act runs its
// `onAct` (native has no implicit submission); while that promise pends the
// act is pending and the others ignore the press. A blocked act says its
// reason once a field has taken input. While the form stands edited, leaving
// its screen (a back, a navigate) asks once, "Discard your edit?" or keep
// editing; pressing the filled act ends the edit, so an act that navigates is
// not asked, and a rejected act puts it back.
export function Form(form: FormProps) {
	return <FormBody {...form} in="page" />;
}
