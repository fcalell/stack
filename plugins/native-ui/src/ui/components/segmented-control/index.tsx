import { SEGMENTED_CONTROL, segment } from "@fcalell/ui-core/variants";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";

export interface Segment {
	value: string;
	label: string;
}

export interface SegmentedControlProps extends Closed {
	options: readonly Segment[];
	value: string;
	onChange: (value: string) => void;
}

// A state the control rests on, never a trigger.
export function SegmentedControl({
	options,
	value,
	onChange,
}: SegmentedControlProps) {
	return (
		<View
			accessibilityRole="tablist"
			className={cn(SEGMENTED_CONTROL, "flex-row self-start")}
		>
			{options.map((option) => {
				const selected = option.value === value;
				return (
					<Pressable
						key={option.value}
						accessibilityRole="tab"
						accessibilityState={{ selected }}
						onPress={() => onChange(option.value)}
						className={cn(
							segment({ state: selected ? "selected" : "idle" }),
							"items-center justify-center",
							selected && "shadow-float",
						)}
					>
						<RNText
							className={segment({ state: selected ? "selected" : "idle" })}
						>
							{option.label}
						</RNText>
					</Pressable>
				);
			})}
		</View>
	);
}
