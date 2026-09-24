import { SWITCH_THUMB, switchTrack, text } from "@fcalell/ui-core/variants";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";

export interface SwitchProps extends Closed {
	checked: boolean;
	onChange: (checked: boolean) => void;
	label: string;
}

// The label is part of the atom so the hit area is the whole 44 px line.
export function Switch({ checked, onChange, label }: SwitchProps) {
	return (
		<Pressable
			accessibilityRole="switch"
			accessibilityState={{ checked }}
			accessibilityLabel={label}
			onPress={() => onChange(!checked)}
			className="min-h-11 flex-row items-center justify-between gap-row"
		>
			<RNText className={cn(text({ role: "body" }), "flex-1")}>{label}</RNText>
			<View
				className={cn(
					switchTrack({ state: checked ? "on" : "off" }),
					"h-8 w-13 justify-center px-0.5",
					checked ? "items-end" : "items-start",
				)}
			>
				<View className={cn(SWITCH_THUMB, "size-7 shadow-float")} />
			</View>
		</Pressable>
	);
}
