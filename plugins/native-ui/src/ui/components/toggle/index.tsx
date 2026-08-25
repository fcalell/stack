import { CONTROL_MUTED, TOGGLE_KNOB, toggle } from "@fcalell/ui-core/variants";
import { Pressable, View } from "react-native";
import { cn } from "../../lib/cn";

export interface ToggleProps {
	checked: boolean;
	onChange: (checked: boolean) => void;
	disabled?: boolean;
	className?: never;
	style?: never;
}

// Binary switch (settings opt-ins, inline "lo prendo io"). The 40×24 visual is
// the affordance; the ≥44px tap target is the row it sits in. The knob is the
// TOGGLE_KNOB canvas fill (never #fff) so it stays visible on the accent
// track in dark mode.
export function Toggle({ checked, onChange, disabled }: ToggleProps) {
	return (
		<Pressable
			accessibilityRole="switch"
			accessibilityState={{ checked, disabled }}
			disabled={disabled}
			onPress={() => onChange(!checked)}
			className={cn(
				toggle({ state: checked ? "on" : "off" }),
				"h-6 w-10 flex-row items-center px-[3px]",
				checked ? "justify-end" : "justify-start",
				disabled && CONTROL_MUTED,
			)}
		>
			<View className={cn(TOGGLE_KNOB, "h-[18px] w-[18px]")} />
		</Pressable>
	);
}
