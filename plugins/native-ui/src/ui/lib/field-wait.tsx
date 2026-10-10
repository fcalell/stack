import {
	type FieldShape,
	OPTION_WAIT_ROWS,
	type OptionsWait,
} from "@fcalell/ui-core/list-state";
import {
	FORM_FIELD_SUMMARY,
	FORM_FIELD_SUMMARY_GLYPH,
	formField,
	OPTION_LIST,
	skeleton,
	skeletonRow,
} from "@fcalell/ui-core/variants";
import { Children, Fragment, isValidElement, type ReactNode } from "react";
import { View } from "react-native";
import { cn } from "./cn";
import { GroundContext } from "./ground";
import { OptionWait } from "./option-wait";
import { SliderWait } from "./slider-wait";
import { Strut } from "./strut";

// The label line at the length of a field label, the description's at the
// sentence's half measure.
const LABEL_WAIT = "w-1/4";
const NOTE_WAIT = "w-1/2";
// A bar stands in a text line's box: a strut sets the line's height, as the
// web's `h-lh` does.
export const LABEL_LINE = "flex-row items-center";
// The loaded field's geometry (`../components/form-field/index.tsx`): a switch
// beside the label block, a checkbox ahead of it on a line of the body role,
// the description under the label.
const BESIDE = "flex-row items-center min-w-0";
const AHEAD = "flex-row items-start min-w-0";
const LABEL_BLOCK = "flex-1 min-w-0";
const SWITCH_HIT =
	"shrink-0 items-center justify-center min-h-target min-w-target";
const BOX_LINE = "flex-row shrink-0 items-center";
// A segmented control's track at half the column, and an answered field's
// summary row: its glyph, label, answer and Edit act.
const SEGMENTS_WAIT = "w-1/2";
const SUMMARY_WAIT = "flex-row items-center min-w-0";
const SUMMARY_GLYPH_WAIT = "shrink-0";
const ANSWER_WAIT = "grow w-1/2";
const EDIT_WAIT = "shrink-0 items-center justify-center size-control-compact";
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
		<View className={LABEL_LINE}>
			<Strut role="body" />
			<View className={cn(skeleton({ kind: "line" }), LABEL_WAIT)} />
		</View>
	);
	const note = described ? (
		<View className={LABEL_LINE}>
			<Strut role="meta" />
			<View className={cn(skeleton({ kind: "line" }), NOTE_WAIT)} />
		</View>
	) : null;
	if (holds === "folded")
		return (
			<View className={cn(FORM_FIELD_SUMMARY, SUMMARY_WAIT)}>
				<View className={cn(FORM_FIELD_SUMMARY_GLYPH, SUMMARY_GLYPH_WAIT)}>
					<View className={skeleton({ kind: "icon" })} />
				</View>
				<View className={cn(skeleton({ kind: "line" }), LABEL_WAIT)} />
				<View className={cn(skeleton({ kind: "line" }), ANSWER_WAIT)} />
				<View className={EDIT_WAIT}>
					<View className={skeleton({ kind: "icon" })} />
				</View>
			</View>
		);
	if (holds === "slider")
		return (
			<View className={formField({ holds: "field" })}>
				<GroundContext.Provider value="list">
					<SliderWait />
				</GroundContext.Provider>
				{note}
			</View>
		);
	if (holds === "options" || holds === "segments")
		return (
			<View className={formField({ holds: "field" })}>
				{label}
				{holds === "segments" ? (
					<View className={cn(skeleton({ kind: "bar" }), SEGMENTS_WAIT)} />
				) : (
					<View className={OPTION_LIST}>
						<OptionWait
							shape={{
								description: options.described,
								group: options.grouped,
							}}
							mark="check"
							rows={options.rows}
						/>
					</View>
				)}
				{note}
			</View>
		);
	if (holds === "field")
		return (
			<View className={skeletonRow({ kind: "field" })}>
				{label}
				<View className={skeleton({ kind: "field" })} />
				{note}
			</View>
		);
	const block = (
		<View className={LABEL_BLOCK}>
			{label}
			{note}
		</View>
	);
	if (holds === "switch")
		return (
			<View className={cn(formField({ holds }), BESIDE)}>
				{block}
				<View className={SWITCH_HIT}>
					<View className={skeleton({ kind: "switch" })} />
				</View>
			</View>
		);
	return (
		<View className={cn(formField({ holds }), AHEAD)}>
			<View className={BOX_LINE}>
				<Strut role="body" />
				<View className={skeleton({ kind: "check" })} />
			</View>
			{block}
		</View>
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
