import { ICON_STROKE } from "@fcalell/ui-core/tokens";
import { CHECKBOX_MARK, checkbox } from "@fcalell/ui-core/variants";
import { Check, type IconNode, Minus } from "lucide";
import { useContext } from "react";
import { Pressable, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useResolveClassNames } from "uniwind";
import { useHeldDraft } from "../../lib/act";
import { cn } from "../../lib/cn";
import { FieldDisabled } from "../../lib/field";
import { inertProps, paintControl, useShown } from "../../lib/paint";
import type { CheckboxProps } from "./index";

const STATES = {
	true: "checked",
	false: "unchecked",
	mixed: "mixed",
} as const;

type State = (typeof STATES)[keyof typeof STATES];

/** The box every Checkbox renders. `target` is a row whose label is its target: the box alone, on the label's line; `painted` is the box while its data is not here: filled, unchecked, inert. Outside the package's exports. */
export function CheckboxBase({
	checked,
	onChange,
	label,
	target,
	painted: given,
}: CheckboxProps & { target?: boolean; painted?: boolean }) {
	const draft = useHeldDraft(checked);
	const painted = given || draft.painted;
	const value = draft.value;
	const disabled = useContext(FieldDisabled);
	const state = STATES[painted ? "false" : (`${value}` as const)];
	if (target)
		return (
			<Box
				state={state}
				pressed={false}
				disabled={disabled}
				painted={painted}
			/>
		);
	return (
		<Pressable
			{...inertProps(painted === true)}
			accessibilityRole="checkbox"
			accessibilityLabel={label}
			accessibilityState={{ checked: painted ? false : value, disabled }}
			disabled={disabled}
			onPress={() => {
				const next = value !== true;
				draft.change(next, () => onChange(next));
			}}
			className="shrink-0 items-center justify-center size-target"
		>
			{({ pressed }) => (
				<Box
					state={state}
					pressed={pressed}
					disabled={disabled}
					painted={painted}
				/>
			)}
		</Pressable>
	);
}

function Box({
	state,
	pressed,
	disabled,
	painted,
}: {
	state: State;
	pressed: boolean;
	disabled: boolean;
	painted?: boolean;
}) {
	const shown = useShown(painted);
	const unchecked = state === "unchecked";
	return (
		<View
			className={cn(
				checkbox({ state }),
				"relative shrink-0 items-center justify-center overflow-hidden",
				!unchecked && pressed && "bg-toggle-on-hover",
				disabled && unchecked && "border-edge",
				disabled && "bg-fill-disabled",
				painted && paintControl(shown),
			)}
		>
			{/* An unchecked box's press is a wash over its own fill. */}
			{unchecked && pressed && !disabled ? (
				<View className="absolute inset-0 bg-wash-press" />
			) : null}
			{unchecked ? null : (
				<Mark node={state === "mixed" ? Minus : Check} disabled={disabled} />
			)}
		</View>
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
