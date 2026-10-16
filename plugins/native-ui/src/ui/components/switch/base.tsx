import type { Draft } from "@fcalell/plugin-api/tanstack-query";
import { switchThumb, switchTrack } from "@fcalell/ui-core/variants";
import { useContext } from "react";
import { Pressable, View } from "react-native";
import { useHeldDraft } from "../../lib/act";
import { cn } from "../../lib/cn";
import { FieldDisabled } from "../../lib/field";
import { inertProps, paintControl, useShown } from "../../lib/paint";
import type { SwitchProps } from "./index";

// The press draws the hover fill: a toggle has no press step.
const PRESSED = { off: "bg-switch-off-hover", on: "bg-toggle-on-hover" };

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
	const shown = useShown(painted);
	const on = draft.value && !absent;
	const state = on ? "on" : "off";
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
			className="shrink-0 items-center justify-center min-h-target min-w-target"
		>
			{({ pressed }) => (
				<View
					className={cn(
						switchTrack({ state }),
						"shrink-0 flex-row items-center justify-start",
						pressed && PRESSED[state],
						disabled && "bg-fill-disabled",
						painted && paintControl(shown),
					)}
				>
					<View
						className={cn(
							switchThumb({ state }),
							disabled && "bg-ink-disabled",
							absent && "opacity-0",
						)}
					/>
				</View>
			)}
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
