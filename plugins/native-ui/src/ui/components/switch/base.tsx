import type { Draft } from "@fcalell/plugin-api/tanstack-query";
import { switchThumb, switchTrack } from "@fcalell/ui-core/variants";
import { useContext } from "react";
import { Pressable } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { withUniwind } from "uniwind";
import { useHeldDraft } from "../../lib/act";
import { cn } from "../../lib/cn";
import { FieldDisabled } from "../../lib/field";
import { tokenPx } from "../../lib/frame";
import { usePress, useToggle } from "../../lib/motion";
import { inertProps, PAINT_CONTROL, PaintView } from "../../lib/paint";
import { Wash } from "../../lib/press";
import { useCSSVariable } from "../../lib/theme";
import type { SwitchProps } from "./index";

// The press draws the hover fill: a toggle has no press step. It is an overlay
// that lands at once and fades out on release.
const PRESSED = {
	off: "rounded-full bg-switch-off-hover",
	on: "rounded-full bg-toggle-on-hover",
};

// The thumb travels by transform over `fast`, in and out.
const Thumb = withUniwind(Animated.View);

// The track and thumb every Switch renders, on the `draft` its host holds: a
// field hosts the draft of its switch and draws a rejection in its own line.
// `painted` is the track while its data is not here: filled, the thumb not
// drawn, inert. A read that ended leaves the track unfilled with no thumb,
// blocked: a press says why and changes nothing. Outside the package's exports.
export function SwitchBase({
	draft,
	onChange,
	label,
	painted: given,
}: Omit<SwitchProps, "checked"> & {
	draft: Draft<boolean>;
	painted?: boolean;
}) {
	// A read that ended leaves the track standing with no thumb, blocked.
	const ended = draft.ended !== undefined;
	const painted = given || (draft.painted && !ended);
	const absent = painted || ended;
	const disabled = useContext(FieldDisabled);
	const on = draft.value && !absent;
	const state = on ? "on" : "off";
	const press = usePress();
	const travel = tokenPx(useCSSVariable("--spacing-switch-travel"));
	const slide = useToggle(on);
	const thumb = useAnimatedStyle(() => ({
		transform: [{ translateX: slide.value * travel }],
	}));
	return (
		<Pressable
			{...inertProps(painted === true)}
			accessibilityRole="switch"
			accessibilityLabel={label}
			accessibilityState={{ checked: on, disabled: disabled || ended }}
			disabled={disabled}
			onPress={() => {
				draft.change(!on, () => onChange(!on));
			}}
			onPressIn={press.onPressIn}
			onPressOut={press.onPressOut}
			className="shrink-0 items-center justify-center min-h-target min-w-target"
		>
			<PaintView
				painted={painted}
				className={cn(
					switchTrack({ state }),
					"shrink-0 flex-row items-center justify-start",
					disabled && "bg-fill-disabled",
					painted && PAINT_CONTROL,
				)}
			>
				{disabled || painted ? null : (
					<Wash className={PRESSED[state]} style={press.wash} />
				)}
				<Thumb
					className={cn(
						switchThumb({ state }),
						disabled && "bg-ink-disabled",
						absent && "opacity-0",
					)}
					style={thumb}
				/>
			</PaintView>
		</Pressable>
	);
}

// A Switch that holds its own draft, as a bare one and a row's toggle do; a
// rejection toasts. Outside the package's exports.
export function HeldSwitch({
	checked,
	onChange,
	label,
	painted,
}: SwitchProps & { painted?: boolean }) {
	return (
		<SwitchBase
			draft={useHeldDraft(checked)}
			onChange={onChange}
			label={label}
			painted={painted}
		/>
	);
}
