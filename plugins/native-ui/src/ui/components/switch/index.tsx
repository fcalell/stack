import { switchThumb, switchTrack } from "@fcalell/ui-core/variants";
import { useContext } from "react";
import { Pressable, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { FieldDisabled } from "../../lib/field";

// The press draws the hover fill: a toggle has no press step.
const PRESSED = { off: "bg-switch-off-hover", on: "bg-toggle-on-hover" };

/** A setting that takes effect at once, on or off. */
export interface SwitchProps extends Closed {
	/** Whether it is on. */
	checked: boolean;
	/** Hears the next value when the viewer flips it. */
	onChange: (checked: boolean) => void;
	/** Its name, read aloud; the row around it draws the visible label. */
	label: string;
}

/** A track and its thumb, drawn alone inside a target-sized hit box. */
export function Switch({ checked, onChange, label }: SwitchProps) {
	const disabled = useContext(FieldDisabled);
	const state = checked ? "on" : "off";
	return (
		<Pressable
			accessibilityRole="switch"
			accessibilityLabel={label}
			accessibilityState={{ checked, disabled }}
			disabled={disabled}
			onPress={() => onChange(!checked)}
			className="shrink-0 items-center justify-center min-h-target min-w-target"
		>
			{({ pressed }) => (
				<View
					className={cn(
						switchTrack({ state }),
						"shrink-0 flex-row items-center justify-start",
						pressed && PRESSED[state],
						disabled && "bg-fill-disabled",
					)}
				>
					<View
						className={cn(
							switchThumb({ state }),
							disabled && "bg-ink-disabled",
						)}
					/>
				</View>
			)}
		</Pressable>
	);
}
