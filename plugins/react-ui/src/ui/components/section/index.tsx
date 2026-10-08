import { Collapsible } from "@base-ui/react/collapsible";
import { cn } from "@fcalell/ui-core/cn";
import type { Act, IconAct, Part } from "@fcalell/ui-core/descriptors";
import { sectionState } from "@fcalell/ui-core/list-state";
import {
	lineBox,
	SECTION_HEAD,
	SECTION_HEAD_ROW,
	SECTION_NESTED_TITLE,
	SECTION_TITLE,
	SECTION_TOGGLE,
	section,
	skeleton,
	text,
} from "@fcalell/ui-core/variants";
import { type ReactNode, use, useId, useMemo, useState } from "react";
import type { Closed } from "../../lib/closed.ts";
import { FieldWait } from "../../lib/field-wait.tsx";
import { FormContext, FormStands } from "../../lib/form.ts";
import { ThreadRoom } from "../../lib/frame.ts";
import { DEEPER, HeadingContext } from "../../lib/heading.ts";
import { LoadingContext } from "../../lib/loading.ts";
import { ReasonHostContext, usePressed } from "../../lib/reason.ts";
import {
	SectionContext,
	type SectionKinds,
	sectionPartsOf,
} from "../../lib/section.ts";
import { useTouched } from "../../lib/touched.ts";
import { ActionBar } from "../action-bar/index.tsx";
import { BarChart } from "../bar-chart/index.tsx";
import { Button } from "../button/index.tsx";
import { Reason } from "../button/reason.tsx";
import { Code } from "../code/index.tsx";
import { Comparison } from "../comparison/index.tsx";
import { Count } from "../count/index.tsx";
import { Form } from "../form/index.tsx";
import { FormField, fieldWaitOf } from "../form-field/index.tsx";
import { Group } from "../group/index.tsx";
import { Icon } from "../icon/index.tsx";
import { IconButton } from "../icon-button/index.tsx";
import { List } from "../list/index.tsx";
import { Meter } from "../meter/index.tsx";
import { Prose } from "../prose/index.tsx";
import { QueryBoundary } from "../query-boundary/index.tsx";
import { Slider } from "../slider/index.tsx";
import { Table } from "../table/index.tsx";
import { Text } from "../text/index.tsx";
import { Thread } from "../thread/index.tsx";

const BOX = "flex flex-col min-w-0";
const HEAD = "flex flex-col";
const HEAD_ROW = "flex items-center";
// On touch a labelled act that would squeeze the title column wraps under the
// title: the column's basis is its own width, so the row breaks once the
// title, its count and its description cannot stand beside the act.
const WRAP = "touch:flex-wrap";
const TITLE_BLOCK = "flex flex-col grow min-w-0";
const TITLE_LINE = "flex items-center min-w-0";
const TITLE_FOLD = "flex min-w-0";
const TITLE = "truncate";
// The chevron draws in the toggle's ink (currentColor), stepping to the body
// ink under the pointer.
const TOGGLE =
	"flex items-center grow min-w-0 -ms-inside text-start text-ink-meta hover:bg-wash-hover hover:text-ink-body active:bg-wash-press active:text-ink-body";
const ACT_SLOT = "flex items-center shrink-0";
const BODY = "flex flex-col";
// The body's own wrapper: its children flow in the body's rhythm, and it
// stays mounted, hidden, while skeleton fields stand in for it.
const BODY_SHOWN = "contents";
const BODY_WAITS = "hidden";
// The waiting count is a bar one figure wide: an unseen figure at the
// count's type sets the width.
const COUNT_WAIT = "inline-flex shrink-0 items-center";
const FIGURE_WAIT = "opacity-0 tabular-nums";
// The description's bar stands in the meta line's box, at the sentence's half measure.
const DESCRIPTION_LINE = "flex items-center h-lh";
// The components the Section reads its body by (`sectionPartsOf`).
const KINDS: SectionKinds = {
	lists: [List, Table],
	waits: [BarChart, Comparison],
	forms: [ActionBar, Code, Form, Meter, Prose, Slider, Thread],
	boundary: QueryBoundary,
	group: Group,
	field: FormField,
};

function partText(part: Part): string {
	return typeof part === "string" ? part : `“${part.quoted}”`;
}

/** A titled region of a page over its rows. */
export interface SectionProps extends Closed {
	/** The heading (a short phrase; truncates). */
	title: Part;
	/** A total the body's lists do not hold, in the muted ink after the title; without it a List in the body counts its items there. */
	count?: number;
	/** Under the title (a sentence; wraps). While the Section loads, `""` stands one meta-height bar where the sentence will be and an undefined `description` stands none; loaded, `""` draws no line, as an undefined one. */
	description?: string;
	/** Set, the title folds the body, and this is its initial fold: `true` starts folded, `false` open; later changes are not read. */
	folded?: boolean;
	/** Called as a foldable section opens or closes, with whether it is now open. */
	onToggle?: (open: boolean) => void;
	/** The section's one act, at the head's end: a labelled act or an icon act. */
	act?: Act | IconAct;
	/** The count (when there is one) and the body wait: a Group or a List in the body draws its own skeleton rows, a Prose, Thread, Code, Form, Meter or Slider its own waiting form, and skeleton fields stand in for fields and for any other body. */
	loading?: boolean;
	/** The body: a Group, a List, or the rows a Form lays out. */
	children?: ReactNode;
}

/** A heading with its count, description and act over its body; the title folds the body when `folded` is set. A blocked act's reason draws under the head row, which never moves. */
export function Section({
	title,
	count,
	description,
	folded,
	onToggle,
	act,
	loading,
	children,
}: SectionProps) {
	const level = use(HeadingContext);
	// A Section inside a Section names itself a level below its parent.
	const nested = use(SectionContext);
	// A section in a sheet's body reads a level below the sheet's title.
	const stood = use(FormStands) === "sheet";
	// Inside a Form the section takes the fields rhythm.
	const within = use(FormContext) ? "form" : "page";
	const Heading = `h${level}` as const;
	const titleId = useId();
	const bodyId = useId();
	const { touched } = useTouched();
	const blocked =
		act !== undefined && "blocked" in act ? act.blocked : undefined;
	// `folded` is the initial fold: the section holds its fold from there.
	const [open, setOpen] = useState(folded !== true);
	const [pressed, press] = usePressed(blocked);
	// The Section reads its body's collections off its children in render (by
	// the depth rule, `sectionPartsOf`): a waiting one makes the head busy, a
	// List or a Table counts there unless the Section has its own count, and a
	// loading body with no rows waits as skeleton fields while it stays
	// mounted, hidden, so what it holds (a field's text) outlives the wait.
	const parts = sectionPartsOf(children, KINDS);
	const {
		busy,
		counted,
		count: shown,
		fields,
	} = sectionState(parts, { count, loading });
	const host = useMemo(
		() => (blocked === undefined ? undefined : { press }),
		[blocked, press],
	);
	// The description waits as a bar only when the Section says it will have
	// one: an empty string, which is no line once loaded.
	let sentence: ReactNode = null;
	if (description) sentence = <Text role="meta">{description}</Text>;
	else if (loading === true && description === "")
		sentence = (
			<span
				aria-hidden
				className={cn(lineBox({ role: "meta" }), DESCRIPTION_LINE)}
			>
				<span className={cn(skeleton({ kind: "line" }), "w-1/2")} />
			</span>
		);
	// A count waits with the body.
	let tally: ReactNode = null;
	if (counted && busy)
		tally = (
			<span aria-hidden className={cn(skeleton({ kind: "count" }), COUNT_WAIT)}>
				<span className={cn(text({ role: "caption" }), FIGURE_WAIT)}>0</span>
			</span>
		);
	else if (shown !== undefined) tally = <Count value={shown} />;
	const name = (
		<>
			<span
				id={titleId}
				className={cn(
					nested || stood || folded !== undefined
						? SECTION_NESTED_TITLE
						: text({ role: "heading" }),
					TITLE,
				)}
			>
				{partText(title)}
			</span>
			{tally}
		</>
	);
	return (
		<Collapsible.Root
			render={<section />}
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				onToggle?.(next);
			}}
			aria-labelledby={titleId}
			aria-busy={busy || undefined}
			className={cn(section({ in: within }), BOX)}
		>
			<div className={cn(SECTION_HEAD, HEAD)}>
				<div
					className={cn(
						SECTION_HEAD_ROW,
						HEAD_ROW,
						act && !("icon" in act) && WRAP,
					)}
				>
					<div className={TITLE_BLOCK}>
						{folded === undefined ? (
							<Heading className={cn(SECTION_TITLE, TITLE_LINE)}>
								{name}
							</Heading>
						) : (
							<Heading className={TITLE_FOLD}>
								<Collapsible.Trigger
									aria-controls={bodyId}
									className={cn(SECTION_TOGGLE, TOGGLE)}
								>
									<Icon name={open ? "ChevronDown" : "ChevronRight"} />
									{name}
								</Collapsible.Trigger>
							</Heading>
						)}
						{sentence}
					</div>
					{act ? (
						<div className={ACT_SLOT}>
							{"icon" in act ? (
								<IconButton
									icon={act.icon}
									fit="bar"
									label={act.label}
									onAct={act.onAct}
									loading={act.loading}
								/>
							) : (
								<ReasonHostContext value={host}>
									<Button
										act={act.destructive ? "destructive" : "secondary"}
										fit="bar"
										label={act.label}
										onAct={act.onAct}
										loading={act.loading}
										blocked={act.blocked}
									/>
								</ReasonHostContext>
							)}
						</div>
					) : null}
				</div>
				{blocked === undefined ? null : (
					<Reason shown={pressed || touched} end>
						{blocked}
					</Reason>
				)}
			</div>
			{/* Kept mounted while folded, so its `aria-controls` resolves in either state (Base UI names it only while open) and what the body holds (a field's text, a fold inside) keeps its state. A section without children draws no body. */}
			{children === undefined || children === null ? null : (
				<Collapsible.Panel
					id={bodyId}
					keepMounted
					className={cn(section({ in: within }), BODY)}
				>
					<HeadingContext value={DEEPER[level]}>
						{Array.from({ length: fields }, (_, index) => `field-${index}`).map(
							(key, index) => (
								<FieldWait
									key={key}
									{...fieldWaitOf(parts.fieldNodes[index])}
								/>
							),
						)}
						<div className={fields > 0 ? BODY_WAITS : BODY_SHOWN}>
							<LoadingContext value={loading === true}>
								<SectionContext value={true}>
									<ThreadRoom value={false}>{children}</ThreadRoom>
								</SectionContext>
							</LoadingContext>
						</div>
					</HeadingContext>
				</Collapsible.Panel>
			)}
		</Collapsible.Root>
	);
}
