import { Pressable, Text, View } from "react-native";
import { cn } from "#lib/cn";

export interface SegmentedOption<T extends string> {
	value: T;
	label: string;
}

export interface SegmentedProps<T extends string> {
	options: SegmentedOption<T>[];
	value: T;
	onValueChange: (value: T) => void;
	className?: string;
}

// Pill-in-pill 2–3-way selector (division modes, berth type, meal moment). The
// active cell lifts onto the canvas above the surface track. Cells are
// equal-width and don't wrap — keep labels short.
export function Segmented<T extends string>({
	options,
	value,
	onValueChange,
	className,
}: SegmentedProps<T>) {
	return (
		<View className={cn("flex-row rounded-full bg-surface p-[3px]", className)}>
			{options.map((opt) => {
				const active = opt.value === value;
				return (
					<Pressable
						key={opt.value}
						accessibilityRole="button"
						accessibilityState={{ selected: active }}
						onPress={() => onValueChange(opt.value)}
						className={cn(
							"flex-1 items-center rounded-full py-2",
							active && "bg-canvas",
						)}
					>
						<Text
							className={cn(
								"text-xs",
								active ? "font-bold text-ink-1" : "font-semibold text-ink-2",
							)}
						>
							{opt.label}
						</Text>
					</Pressable>
				);
			})}
		</View>
	);
}
