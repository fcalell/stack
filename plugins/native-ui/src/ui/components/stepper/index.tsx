import { Pressable, Text, View } from "react-native";
import { cn } from "#lib/cn";

export interface StepperProps {
	value: number;
	onChange: (value: number) => void;
	min?: number;
	max?: number;
	step?: number;
	className?: string;
}

// Numeric +/- control for quantities (posti, portions). Clamps to [min, max]
// and disables the bound it has reached.
export function Stepper({
	value,
	onChange,
	min = 0,
	max = Number.POSITIVE_INFINITY,
	step = 1,
	className,
}: StepperProps) {
	const atMin = value <= min;
	const atMax = value >= max;
	return (
		<View className={cn("flex-row items-center gap-3", className)}>
			<Pressable
				accessibilityRole="button"
				disabled={atMin}
				onPress={() => onChange(Math.max(min, value - step))}
				className={cn(
					"h-9 w-9 items-center justify-center rounded-full border border-edge",
					atMin && "opacity-40",
				)}
			>
				<Text className="text-lg text-ink-1">−</Text>
			</Pressable>
			<Text className="min-w-8 text-center text-base text-ink-1">{value}</Text>
			<Pressable
				accessibilityRole="button"
				disabled={atMax}
				onPress={() => onChange(Math.min(max, value + step))}
				className={cn(
					"h-9 w-9 items-center justify-center rounded-full border border-edge",
					atMax && "opacity-40",
				)}
			>
				<Text className="text-lg text-ink-1">+</Text>
			</Pressable>
		</View>
	);
}
