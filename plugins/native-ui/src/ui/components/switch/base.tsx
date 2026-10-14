import { useDraft } from "@fcalell/plugin-api/tanstack-query";
import { switchThumb, switchTrack } from "@fcalell/ui-core/variants";
import { useContext } from "react";
import { Pressable, View } from "react-native";
import { cn } from "../../lib/cn";
import { FieldDisabled } from "../../lib/field";
import { inertProps, paintControl, useShown } from "../../lib/paint";
import type { SwitchProps } from "./index";

// The press draws the hover fill: a toggle has no press step.
const PRESSED = { off: "bg-switch-off-hover", on: "bg-toggle-on-hover" };

// The track and thumb every Switch renders. `painted` is the track while its
// data is not here: filled, the thumb not drawn, inert. Outside the package's
// exports.
export function SwitchBase({
	checked,
	onChange,
	label,
	painted: given,
}: SwitchProps & { painted?: boolean }) {
	const draft = useDraft(checked);
	const painted = given || draft.painted;
	const disabled = useContext(FieldDisabled);
	const shown = useShown(painted);
	const on = draft.value && !painted;
	const state = on ? "on" : "off";
	return (
		<Pressable
			{...inertProps(painted === true)}
			accessibilityRole="switch"
			accessibilityLabel={label}
			accessibilityState={{ checked: on, disabled }}
			disabled={disabled}
			onPress={() => {
				draft.edit(!on);
				onChange(!on);
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
							painted && "opacity-0",
						)}
					/>
				</View>
			)}
		</Pressable>
	);
}
