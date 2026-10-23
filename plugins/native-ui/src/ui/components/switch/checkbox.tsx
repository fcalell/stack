import type { Datum, Draft } from "@fcalell/plugin-api/tanstack-query";
import { STATES } from "@fcalell/ui-core/controls";
import { ICON_STROKE } from "@fcalell/ui-core/tokens";
import { CHECKBOX_MARK, checkbox } from "@fcalell/ui-core/variants";
import { Check, type IconNode, Minus } from "lucide";
import { useContext } from "react";
import { Pressable } from "react-native";
import type { AnimatedStyle } from "react-native-reanimated";
import Animated from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { useResolveClassNames } from "uniwind";
import { useHeldDraft } from "../../lib/act";
import { cn } from "../../lib/cn";
import { FieldDisabled } from "../../lib/field";
import { markIn, markOut, usePress } from "../../lib/motion";
import { inertProps, PAINT_CONTROL, PaintView } from "../../lib/paint";
import { Wash } from "../../lib/press";

/** A choice among others, on, off, or mixed over a set: the tick a row, a table's cell, an option or a field's `checkbox` descriptor draws. Outside the package's exports. */
export interface CheckboxProps {
	/** Whether it is checked; `mixed` when some of the set it stands for are. A selection paints the box, inert, until its read lands and follows it until the viewer toggles it. Once its read ended the control stands with no value and a change says why instead. */
	checked: Datum<boolean | "mixed">;
	/** Hears the next value when the viewer toggles it; a mixed box checks. Return the save's promise and the viewer's value holds while it pends; a refusal puts it back, with its reason. */
	onChange: (checked: boolean) => unknown;
	/** Its name; the row around it draws the visible label (a short phrase; read aloud, never drawn). */
	label: string;
}

type State = (typeof STATES)[keyof typeof STATES];

// The pressed look is an overlay that lands at once and fades out on release:
// the box's own press wash when it is empty, the hover fill when it is filled.
const WASH = {
	unchecked: "rounded-chip bg-wash-press",
	checked: "rounded-chip bg-toggle-on-hover",
	mixed: "rounded-chip bg-toggle-on-hover",
} as const;

/** The tick box every selection renders, on the `draft` its host holds: a field hosts the draft of its checkbox and draws a rejection in its own line. `target` is a row whose label is its target: the box alone, on the label's line; `painted` is the box while its data is not here: filled, unchecked, inert. Outside the package's exports. */
export function CheckboxBase({
	draft,
	onChange,
	label,
	target,
	painted: given,
}: Omit<CheckboxProps, "checked"> & {
	draft: Draft<boolean | "mixed">;
	target?: boolean;
	painted?: boolean;
}) {
	// A read that ended leaves the box empty and blocked.
	const ended = draft.ended !== undefined;
	const painted = given || (draft.painted && !ended);
	const absent = painted || ended;
	const value = draft.value;
	const disabled = useContext(FieldDisabled);
	const state = STATES[absent ? "false" : (`${value}` as const)];
	const press = usePress();
	if (target)
		return <Box state={state} disabled={disabled} painted={painted} />;
	return (
		<Pressable
			{...inertProps(painted === true)}
			accessibilityRole="checkbox"
			accessibilityLabel={label}
			accessibilityState={{
				checked: absent ? false : value,
				disabled: disabled || ended,
			}}
			disabled={disabled}
			onPress={() => {
				const next = value !== true;
				draft.change(next, () => onChange(next));
			}}
			onPressIn={press.onPressIn}
			onPressOut={press.onPressOut}
			className="shrink-0 items-center justify-center size-target"
		>
			<Box
				state={state}
				wash={press.wash}
				disabled={disabled}
				painted={painted}
			/>
		</Pressable>
	);
}

/** A tick box that holds its own draft, as a row's does; a rejection toasts. Outside the package's exports. */
export function HeldCheckbox({
	checked,
	onChange,
	label,
	target,
	painted,
}: CheckboxProps & {
	target?: boolean;
	painted?: boolean;
}) {
	return (
		<CheckboxBase
			draft={useHeldDraft(checked)}
			onChange={onChange}
			label={label}
			target={target}
			painted={painted}
		/>
	);
}

function Box({
	state,
	wash,
	disabled,
	painted,
}: {
	state: State;
	// The press's opacity; a box inside a row has none, the row answers.
	wash?: AnimatedStyle<object>;
	disabled: boolean;
	painted?: boolean;
}) {
	const unchecked = state === "unchecked";
	return (
		<PaintView
			painted={painted}
			className={cn(
				checkbox({ state }),
				"relative shrink-0 items-center justify-center overflow-hidden",
				disabled && unchecked && "border-edge",
				disabled && "bg-fill-disabled",
				painted && PAINT_CONTROL,
			)}
		>
			{wash && !disabled && !painted ? (
				<Wash className={WASH[state]} style={wash} />
			) : null}
			{unchecked ? null : (
				// The mark grows from 0.6 and fades in on checking and leaves at once;
				// checked and mixed swap as one leaves and the other grows.
				<Animated.View key={state} entering={markIn()} exiting={markOut()}>
					<Mark node={state === "mixed" ? Minus : Check} disabled={disabled} />
				</Animated.View>
			)}
		</PaintView>
	);
}
// Lucide's own path data, drawn at the check's own weight rather than `Icon`'s;
// react-native-svg takes values, so the mark's size and ink are resolved.
function Mark({ node, disabled }: { node: IconNode; disabled: boolean }) {
	const { width, color } = useResolveClassNames(
		cn(CHECKBOX_MARK, disabled && "text-ink-disabled"),
	);
	const size = typeof width === "number" ? width : undefined;
	return (
		<Svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			color={color}
			strokeWidth={ICON_STROKE.mark}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden
		>
			{node.map(([, { d }]) => (
				<Path key={String(d)} d={String(d)} />
			))}
		</Svg>
	);
}
