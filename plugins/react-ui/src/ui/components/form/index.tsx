import type { Selection } from "@fcalell/plugin-api/tanstack-query";
import type { ReactNode } from "react";
import type { Closed } from "../../lib/closed.ts";
import type { Empty } from "../../lib/empty.tsx";
import type { ActionBarProps } from "../action-bar/index.tsx";
import { FormBody } from "./base.tsx";

/** One group of fields a `Form` draws as a fieldset. */
export interface FormGroup {
	/** The group's name, its legend (a short phrase; wraps); without it the group is a fieldset with no legend, for fields that lead or close the form among titled groups. */
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
}

interface FormBase extends Closed {
	/** The acts that close the form, drawn in its foot; the bar's filled act submits the form. */
	bar?: ActionBarProps;
	/** What the form's fields hold, read once for the form's frame: the fields' leaves paint while it waits, the filled act with them, inert; its failure and a missing record stand in the fields' place, the filled act blocked with the failed sentence. Each group has its own, which the bar never reads. */
	read?: Selection<unknown>;
	/** The fields' sentence when the `read`'s selection is empty. */
	empty?: Empty;
}

/** Fields and the acts that submit them. The form's structure is its props: `children`, a flat run of `FormField`s, or `groups`, each drawn as a fieldset with a legend; never both. A form among a page's other sections is `Section > Form`, so every section's head-to-body gap stays the pair step. */
export type FormProps = FormBase &
	(
		| {
				/** A flat run of `FormField`s, a fields step apart. */
				children?: ReactNode;
				groups?: never;
		  }
		| {
				children?: never;
				/** Groups of fields, a sections step apart, each its fieldset and legend with its fields a fields step apart. */
				groups: readonly FormGroup[];
		  }
	);

/** One column, at most a line of running text wide on a page: fields apart at the fields rhythm, or `groups` apart at the sections rhythm with the `bar` under a hairline across the form. Its bar's filled act is the submit button, so Enter in a field runs that act's `onAct`; while its promise pends the act is pending and the others ignore the press; a rejection stands in the bar's line, the act ready again. The bar paints, inert, while the form's own `read` waits (a sheet's too), and stands blocked with the failed sentence once that read failed or is missing; a group's `read` is the group's and never reaches the bar. A blocked act says its reason once a field has taken input. While the form stands edited, leaving its page (a navigation, the back button, a reload) asks once, "Discard your edit?" or keep editing; pressing the filled act ends the edit, so an act that navigates is not asked, and a rejected act puts the edit back. A form in a sheet or a gate is that drawer's `form` prop, not this component. */
export function Form(form: FormProps) {
	return <FormBody {...form} in="page" />;
}
