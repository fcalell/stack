import { cn } from "@fcalell/ui-core/cn";
import {
	type FieldShape,
	OPTION_WAIT_ROWS,
	type OptionsWait,
} from "@fcalell/ui-core/list-state";
import {
	FORM_FIELD_SUMMARY,
	FORM_FIELD_SUMMARY_GLYPH,
	formField,
	lineBox,
	OPTION_LIST,
	skeleton,
	skeletonRow,
} from "@fcalell/ui-core/variants";
import { Children, Fragment, isValidElement, type ReactNode } from "react";
import { GroundContext } from "./ground.ts";
import { OptionWait } from "./option-wait.tsx";
import { SliderWait } from "./slider-wait.tsx";

// The loaded field's geometry (`../components/form-field/index.tsx`): the
// label over the control, a switch beside the label block, a checkbox ahead
// of it, the description under the label (a switch's and a checkbox's) or the
// control.
const FIELD_WAIT = "flex flex-col";
const BESIDE = "flex items-center min-w-0";
const AHEAD = "flex items-start min-w-0";
const LABEL_BLOCK = "flex flex-col grow min-w-0";
// The label line at the length of a field label, the description's at the
// sentence's half measure.
const LABEL_WAIT = "w-1/4";
const NOTE_WAIT = "w-1/2";
// A bar stands in its text's line box, at its line height.
const LINE = "flex items-center h-lh";
// The switch's hit box and the checkbox's line, which the controls set.
const SWITCH_HIT =
	"flex shrink-0 items-center justify-center min-h-target min-w-target";
const BOX_LINE = "flex shrink-0 items-center h-lh";
// An option list's card, a segmented control's track at half the column, and
// an answered field's summary row: its glyph, label, answer and Edit act.
const OPTIONS_CARD = "flex flex-col";
const SEGMENTS_WAIT = "w-1/2";
const SUMMARY_WAIT = "flex items-center min-w-0";
const SUMMARY_GLYPH_WAIT = "flex shrink-0";
const ANSWER_WAIT = "grow w-1/2";
const EDIT_WAIT =
	"flex shrink-0 items-center justify-center size-control-compact";
// An option list with no source to read stands the query's four rows.
const OPTIONS_UNKNOWN: OptionsWait = {
	rows: [OPTION_WAIT_ROWS],
	described: false,
	grouped: false,
};

// A form field's waiting form, in the form of the field it stands in for: a
// label bar over the control's box, a switch's box at the label's end, a
// checkbox's on the label's first line, a slider's own head over its track,
// an option list's card of rows, a segmented control's track, an answered
// field's one summary row, and a description's bar under the label or the
// control. A loading `Section` stands it for each field it counts and a
// `Form` for each of its own, so the two never differ.
export function FieldWait({
	holds = "field",
	described = false,
	options = OPTIONS_UNKNOWN,
}: Partial<FieldShape>) {
	const label = (
		<span className={cn(lineBox({ role: "body" }), LINE)}>
			<span className={cn(skeleton({ kind: "line" }), LABEL_WAIT)} />
		</span>
	);
	const note = described ? (
		<span className={cn(lineBox({ role: "meta" }), LINE)}>
			<span className={cn(skeleton({ kind: "line" }), NOTE_WAIT)} />
		</span>
	) : null;
	if (holds === "folded")
		return (
			<div aria-hidden className={cn(FORM_FIELD_SUMMARY, SUMMARY_WAIT)}>
				<span className={cn(FORM_FIELD_SUMMARY_GLYPH, SUMMARY_GLYPH_WAIT)}>
					<span className={skeleton({ kind: "icon" })} />
				</span>
				<span className={cn(skeleton({ kind: "line" }), LABEL_WAIT)} />
				<span className={cn(skeleton({ kind: "line" }), ANSWER_WAIT)} />
				<span className={EDIT_WAIT}>
					<span className={skeleton({ kind: "icon" })} />
				</span>
			</div>
		);
	if (holds === "slider")
		return (
			<div
				aria-hidden
				className={cn(formField({ holds: "field" }), FIELD_WAIT)}
			>
				<GroundContext value="list">
					<SliderWait />
				</GroundContext>
				{note}
			</div>
		);
	if (holds === "options" || holds === "segments")
		return (
			<div
				aria-hidden
				className={cn(formField({ holds: "field" }), FIELD_WAIT)}
			>
				{label}
				{holds === "segments" ? (
					<span className={cn(skeleton({ kind: "bar" }), SEGMENTS_WAIT)} />
				) : (
					<div className={cn(OPTION_LIST, OPTIONS_CARD)}>
						<OptionWait
							shape={{
								description: options.described,
								group: options.grouped,
							}}
							mark="check"
							rows={options.rows}
						/>
					</div>
				)}
				{note}
			</div>
		);
	if (holds === "field")
		return (
			<div
				aria-hidden
				className={cn(skeletonRow({ kind: "field" }), FIELD_WAIT)}
			>
				{label}
				<span className={skeleton({ kind: "field" })} />
				{note}
			</div>
		);
	const block = (
		<div className={LABEL_BLOCK}>
			{label}
			{note}
		</div>
	);
	return (
		<div
			aria-hidden
			className={cn(formField({ holds }), holds === "switch" ? BESIDE : AHEAD)}
		>
			{holds === "switch" ? (
				<>
					{block}
					<span className={SWITCH_HIT}>
						<span className={skeleton({ kind: "switch" })} />
					</span>
				</>
			) : (
				<>
					<span className={BOX_LINE}>
						<span className={skeleton({ kind: "check" })} />
					</span>
					{block}
				</>
			)}
		</div>
	);
}

// A body's children with its direct bars (`bar`, through fragments) taken out
// while `lift` is set: each bar leaves a null at its place, so the other
// children keep their keys, and so their state, across the lift. The bars
// stand after the waiting fields.
export function liftBars(
	children: ReactNode,
	bar: unknown,
	lift: boolean,
): { bars: ReactNode[]; rest: ReactNode[] } {
	const bars: ReactNode[] = [];
	const walk = (nodes: ReactNode): ReactNode[] =>
		Children.toArray(nodes).map((node) => {
			if (!isValidElement<{ children?: ReactNode }>(node)) return node;
			if (node.type === Fragment)
				return <Fragment key={node.key}>{walk(node.props.children)}</Fragment>;
			if (node.type !== bar || !lift) return node;
			bars.push(node);
			return null;
		});
	return { bars, rest: walk(children) };
}
