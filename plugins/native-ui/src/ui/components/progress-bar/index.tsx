import { View, type ViewProps } from "react-native";
import { cn } from "#lib/cn";

export interface ProgressBarProps extends Omit<ViewProps, "children"> {
	// Fraction filled, 0–1. Clamped.
	value: number;
}

// Thin determinate track (surface) with an ink fill. For setup progress,
// coverage, quota — prefer a big mono number where one would read better.
export function ProgressBar({ value, className, ...rest }: ProgressBarProps) {
	const pct = Math.max(0, Math.min(1, value)) * 100;
	return (
		<View
			accessibilityRole="progressbar"
			className={cn(
				"h-1.5 w-full overflow-hidden rounded-full bg-surface",
				className,
			)}
			{...rest}
		>
			<View
				style={{ width: `${pct}%` }}
				className="h-full rounded-full bg-ink-1"
			/>
		</View>
	);
}
