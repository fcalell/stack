import { cn } from "@fcalell/ui-core/cn";
import type { FieldShape } from "@fcalell/ui-core/list-state";
import {
	formField,
	lineBox,
	skeleton,
	skeletonRow,
} from "@fcalell/ui-core/variants";
import { Children, Fragment, isValidElement, type ReactNode } from "react";

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

// A form field's waiting form, in the form of the field it stands in for: a
// label bar over the control's box, a switch's box at the label's end, a
// checkbox's on the label's first line, and a description's bar under the
// label or the control. A loading `Section` stands it for each field it
// counts and a `Form` for each of its own, so the two never differ.
export function FieldWait({
	holds = "field",
	described = false,
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
