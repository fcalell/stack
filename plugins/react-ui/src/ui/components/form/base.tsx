import { type Selection, usePainted } from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import {
	BLOCK_IN,
	CARD,
	FORM_FOOT,
	FORM_FOOT_STUCK,
	FORM_GROUP,
	GROUP_ITEM,
	LIST_BAND,
	ROWS,
	text,
} from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { useId, useState } from "react";
import type { Acting } from "../../lib/act.ts";
import { useArrivals } from "../../lib/arrive.ts";
import type { Closed } from "../../lib/closed.ts";
import type { Empty } from "../../lib/empty.tsx";
import { useLeaveGuard } from "../../lib/leave.ts";
import {
	BusyMark,
	FrameBody,
	FrameLine,
	submitOf,
	useFrame,
} from "../../lib/read.tsx";
import {
	TouchedContext,
	useTouched,
	useTouchState,
} from "../../lib/touched.ts";
import { useWords } from "../../lib/words.tsx";
import { ActionBarBase } from "../action-bar/base.tsx";
import type { ActionBarProps } from "../action-bar/index.tsx";
import { DIVIDER } from "../section/card.tsx";
import { Text } from "../text/index.tsx";

// The form is its rows over its foot: a `ROWS` run of its own columns, or of the
// columns of the Pane's body or Section's body it stands in, its rows a
// subgrid of them (`FORM_GROUP`) so every label in the Pane shares one column.
// A group's band: the title line over the description.
const BAND = "flex flex-col";
// The legend is a line, the busy mark after its title.
const LEGEND = "flex items-center gap-gap";

const NO_OUTER: readonly unknown[] = [];

/** One group of fields a `Form` draws as a run of its rows under a band. */
export interface FormGroup {
	/** The group's name, on its band (a short phrase; wraps); without it the group is a run with no band, for fields that lead or close the form among titled groups. */
	title?: string;
	/** Under the title on the band (a sentence; wraps). */
	description?: string;
	/** A note ahead of the fields (a `Banner`, a sentence), a row at the card's inset. */
	lead?: ReactNode;
	/** The group's `FormField`s, its rows. */
	fields: ReactNode;
	/** What the group's fields hold, read once for the group's frame: its leaves paint while it waits, and its failure and a missing record stand in the fields' place. */
	read?: Selection<unknown>;
	/** The fields' sentence when the group's `read` is empty. */
	empty?: Empty;
}

interface FormBase extends Closed {
	/** The acts that close the form, its last row under a hairline; the bar's filled act submits the form. */
	bar?: ActionBarProps;
	/** `field`: each field commits itself, so the form draws no bar and, standing edited, asks nothing when its page is left. */
	commit?: "submit" | "field";
	/** What the form's fields hold, read once for the form's frame: the fields' leaves paint while it waits, the filled act with them, inert; its failure and a missing record stand in the fields' place, the filled act blocked with the failed sentence. Each group has its own, which the bar never reads. */
	read?: Selection<unknown>;
	/** The fields' sentence when the `read`'s selection is empty. */
	empty?: Empty;
}

/** The structure every form draws, which the derived `Form`, a `Sheet`'s form and a `Gate`'s form (each over a procedure) fill. Its structure is its props: `children`, a flat run of `FormField`s, or `groups`, each a run of rows under a band; never both. A form among a page's other sections is `Section > Form`, so every section's head-to-body gap stays the pair step. */
export type FormFrameProps = FormBase &
	(
		| {
				/** A flat run of `FormField`s, the form's rows. */
				children?: ReactNode;
				groups?: never;
		  }
		| {
				children?: never;
				/** Groups of fields, each a run of the form's rows under its band (the title over the description), a hairline between the runs. */
				groups: readonly FormGroup[];
		  }
	);

/** Where a form stands: on a `page` (a `Form`, a `Gate`'s form), a card of its own; in a `sheet`, its rows flush on the sheet and its foot stuck to the body's. */
export type FormIn = "page" | "sheet";

// One group: a run of the form's rows (a subgrid of the form's columns, so its
// labels align with the rest), its legend a band, then its lead and its
// fields, which are the group's own frame when it holds a `read`. A block of
// the form, fading in if it came on its own once the form was drawn (held
// from the first render, so a later commit does not cut it short).
function GroupBox(props: { group: FormGroup; arrived: boolean }) {
	const { group } = props;
	const frame = useFrame(group.read);
	const [fades] = useState(props.arrived);
	const id = useId();
	return (
		// biome-ignore lint/a11y/useSemanticElements: a fieldset lays its grid on an anonymous box, which cannot subgrid the form's columns
		<div
			role="group"
			aria-labelledby={group.title ? id : undefined}
			aria-busy={(frame.holds && frame.form === "waiting") || undefined}
			data-still={(frame.holds && frame.form === "still") || undefined}
			className={cn(FORM_GROUP, DIVIDER, fades && BLOCK_IN)}
		>
			{group.title || group.description ? (
				<div className={cn(LIST_BAND, BAND)}>
					{group.title ? (
						<span id={id} className={cn(text({ role: "heading" }), LEGEND)}>
							{group.title}
							<BusyMark frame={frame} />
						</span>
					) : null}
					{group.description ? (
						<Text role="meta">{group.description}</Text>
					) : null}
				</div>
			) : null}
			<FrameLine frame={frame} flow />
			{group.lead ? <div className={GROUP_ITEM}>{group.lead}</div> : null}
			<FrameBody frame={frame} fit="part" empty={group.empty}>
				{group.fields}
			</FrameBody>
		</div>
	);
}

/** What every form draws: the public `Form` (`in` the page), a `Sheet`'s (`in` the sheet) and a `Gate`'s (`in` the page, on the Gate's column). Outside the package's exports: `in` is the drawers' alone. */
export function FormBody({
	children,
	groups,
	bar,
	commit,
	read,
	empty,
	in: within,
	acting,
	outer,
}: FormFrameProps & {
	in: FormIn;
	/** The holder of the bar's run, when the form stands in one that holds more than the bar (a sheet's dismissal). */
	acting?: Acting<number>;
	/** The reads the form's bar paints under besides its own (the sheet's read, the ability the form is gated on); constants are no read. */
	outer?: readonly unknown[];
}) {
	const frame = useFrame(read);
	const arrived = useArrivals(
		groups?.map((group, index) => group.title ?? String(index)) ?? [],
		frame.form === "ready",
	);
	const [own] = useTouchState();
	const sheets = useTouched();
	// A sheet's form is the sheet's: its input edits the sheet's leave, which
	// the sheet asks when it is closed, so the form asks nothing of its own.
	const touch = within === "sheet" ? sheets : own;
	useLeaveGuard(touch.leave, within !== "sheet" && commit !== "field");
	// The bar submits what the form's own read gives, and the sheet's: it
	// paints while either waits and stands blocked once the form's has ended.
	// A group's read is the group's, not the bar's.
	const words = useWords();
	const { waiting, ended } = submitOf(words, frame.form);
	const outerWaits = usePainted(outer ?? NO_OUTER);
	return (
		<TouchedContext value={touch}>
			{/* The submit act's click runs its `onAct`; the submit only stays on the page. */}
			<form
				onSubmit={(event) => event.preventDefault()}
				onChange={touch.touch}
				aria-busy={(frame.holds && frame.form === "waiting") || undefined}
				data-still={(frame.holds && frame.form === "still") || undefined}
				className={cn(within === "page" && CARD, ROWS)}
			>
				<div className={cn(FORM_GROUP, DIVIDER)}>
					<FrameLine frame={frame} flow />
					<FrameBody frame={frame} fit="part" empty={empty}>
						{groups
							? groups.map((group, index) => (
									<GroupBox
										key={group.title ?? index}
										group={group}
										arrived={arrived.has(group.title ?? String(index))}
									/>
								))
							: children}
					</FrameBody>
				</div>
				{bar ? (
					<div className={cn(FORM_FOOT, within === "sheet" && FORM_FOOT_STUCK)}>
						<ActionBarBase
							{...bar}
							acting={acting}
							painted={waiting || outerWaits}
							ended={ended}
							submits
						/>
					</div>
				) : null}
			</form>
		</TouchedContext>
	);
}
