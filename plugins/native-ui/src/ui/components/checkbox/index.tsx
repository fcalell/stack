import { CHECKBOX_MARK, checkbox } from "@fcalell/ui-core/variants";
import { Check, type IconNode, Minus } from "lucide";
import { useContext } from "react";
import { Pressable, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useResolveClassNames } from "uniwind";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { FieldDisabled, LabelTarget } from "../../lib/field";

// Lucide's 24-unit grid at the mark's 14 px (touch): 3.5 units draw 2.04 px.
const STROKE = 3.5;
const STATES = {
	true: "checked",
	false: "unchecked",
	mixed: "mixed",
} as const;

/** A choice among others, on, off, or mixed over a set. */
export interface CheckboxProps extends Closed {
	/** Whether it is checked; `mixed` when some of the set it stands for are. */
	checked: boolean | "mixed";
	/** Hears the next value when the viewer toggles it; a mixed box checks. */
	onChange: (checked: boolean) => void;
	/** Its name, read aloud; the row around it draws the visible label. */
	label: string;
}

type State = (typeof STATES)[keyof typeof STATES];

/** A box and its mark, drawn alone inside a target-sized hit box; in a row whose label is its target, the box alone. */
export function Checkbox({ checked, onChange, label }: CheckboxProps) {
	const disabled = useContext(FieldDisabled);
	const target = useContext(LabelTarget);
	const state = STATES[`${checked}` as const];
	if (target) return <Box state={state} pressed={false} disabled={disabled} />;
	return (
		<Pressable
			accessibilityRole="checkbox"
			accessibilityLabel={label}
			accessibilityState={{ checked, disabled }}
			disabled={disabled}
			onPress={() => onChange(checked !== true)}
			className="shrink-0 items-center justify-center size-target"
		>
			{({ pressed }) => (
				<Box state={state} pressed={pressed} disabled={disabled} />
			)}
		</Pressable>
	);
}

function Box({
	state,
	pressed,
	disabled,
}: {
	state: State;
	pressed: boolean;
	disabled: boolean;
}) {
	const unchecked = state === "unchecked";
	return (
		<View
			className={cn(
				checkbox({ state }),
				"relative shrink-0 items-center justify-center overflow-hidden",
				!unchecked && pressed && "bg-toggle-on-hover",
				disabled && unchecked && "border-edge",
				disabled && "bg-fill-disabled",
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
			strokeWidth={STROKE}
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
