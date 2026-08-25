import { View, type ViewProps } from "react-native";

export interface ProgressBarProps extends Omit<ViewProps, "children"> {
	// Fraction filled, 0–1. Clamped.
	value: number;
	className?: never;
	style?: never;
}

// Thin determinate track (surface) with an ink fill. For setup progress,
// coverage, quota — prefer a big mono number where one would read better.
export function ProgressBar({ value, ...rest }: ProgressBarProps) {
	const pct = Math.max(0, Math.min(1, value)) * 100;
	return (
		<View
			accessibilityRole="progressbar"
			className="h-1.5 w-full overflow-hidden rounded-full bg-surface"
			{...rest}
		>
			<View
				style={{ width: `${pct}%` }}
				className="h-full rounded-full bg-ink-1"
			/>
		</View>
	);
}
