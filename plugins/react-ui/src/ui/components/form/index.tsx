import { cn } from "@fcalell/ui-core/cn";
import {
	FORM_FOOT,
	FORM_GROUP,
	FORM_LEGEND,
	form,
	SECTION_NESTED_TITLE,
	text,
} from "@fcalell/ui-core/variants";
import { type ReactNode, use, useState } from "react";
import type { Closed } from "../../lib/closed.ts";
import { FormContext, FormStands, HOLDS_FILL } from "../../lib/form.ts";
import { useLeaveGuard } from "../../lib/leave.ts";
import { LoadingContext, useWait, VEIL } from "../../lib/loading.ts";
import { TouchedContext, useTouchState } from "../../lib/touched.ts";
import { ActionBar, type ActionBarProps } from "../action-bar/index.tsx";
import { Text } from "../text/index.tsx";

const STACK = "flex flex-col";
const GROUP = "flex flex-col min-w-0";
// The fields stand in the group's own rhythm, wrapped only to carry the veil.
const FIELDS = "contents";
// In a sheet's body, which scrolls, the bar stays at the
// scroller's bottom edge. A sticky box sticks inside the scroller's padding, so
// the negative offset reaches the edge; the negative margin and matching
// padding run its ground and hairline across the scroller's inset, so what
// scrolls under it shows in no gutter.
const FOOT_STUCK =
	"sticky -bottom-card bg-raised -mx-card px-card -mb-card pb-card";

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
	/** The group's data is on its way: the group is busy and each `FormField` in it draws its own waiting form, its typed text kept. */
	loading?: boolean;
}

interface FormBase extends Closed {
	/** The acts that close the form, drawn in its foot; the bar's filled act submits the form. */
	bar?: ActionBarProps;
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

// One group: its legend, its description and lead, and its fields, which wait
// together when the group loads. The wait is a read that lasts: drawn after a
// delay and held a minimum, the fields undrawn meanwhile.
function GroupBox(props: { group: FormGroup; heading: string }) {
	const { group, heading } = props;
	const late = useWait(group.loading === true);
	// A Section around the form waits its groups too.
	const waiting = use(LoadingContext) || late.waiting;
	return (
		<fieldset
			aria-busy={late.waiting || undefined}
			className={cn(FORM_GROUP, GROUP)}
		>
			{group.title ? (
				<legend className={cn(heading, FORM_LEGEND)}>{group.title}</legend>
			) : null}
			{group.description ? <Text role="meta">{group.description}</Text> : null}
			{group.lead}
			<LoadingContext value={waiting}>
				<div className={cn(FIELDS, late.veiled && VEIL)}>{group.fields}</div>
			</LoadingContext>
		</fieldset>
	);
}

/** One column, at most a line of running text wide on a page and the sheet's width in a sheet: fields apart at the fields rhythm, or `groups` apart at the sections rhythm with the `bar` under a hairline across the form. Its bar's filled act is the submit button, so Enter in a field runs that act's `onAct`; while its promise pends the act is pending, the others ignore the press and the form is busy. A blocked act says its reason once a field has taken input. While the form stands edited, leaving its page (a navigation, the back button, a reload) asks once, "Discard your edit?" or keep editing; pressing the filled act ends the edit, so an act that navigates is not asked, and a rejected act puts the edit back. */
export function Form({ children, groups, bar }: FormProps) {
	const within = use(FormStands);
	const [pending, setPending] = useState(false);
	const [touch] = useTouchState();
	// A sheet's form is the sheet's: it closes on its own act and asks nothing.
	useLeaveGuard(touch.leave, within !== "sheet");
	const stuck = within === "sheet" ? FOOT_STUCK : undefined;
	const foot =
		bar === undefined ? null : groups || stuck ? (
			<div className={cn(FORM_FOOT, stuck)}>
				<ActionBar {...bar} />
			</div>
		) : (
			<ActionBar {...bar} />
		);
	return (
		<FormContext value={setPending}>
			<TouchedContext value={touch}>
				{/* The submit act's click runs its `onAct`; the submit only stays on the page. */}
				<form
					onSubmit={(event) => event.preventDefault()}
					onChange={touch.touch}
					aria-busy={pending || undefined}
					className={cn(
						form({ holds: groups ? "sections" : "fields", in: within }),
						STACK,
						HOLDS_FILL,
					)}
				>
					{groups
						? groups.map((group, index) => (
								<GroupBox
									key={group.title ?? index}
									group={group}
									heading={
										within === "sheet"
											? SECTION_NESTED_TITLE
											: text({ role: "heading" })
									}
								/>
							))
						: children}
					{foot}
				</form>
			</TouchedContext>
		</FormContext>
	);
}
