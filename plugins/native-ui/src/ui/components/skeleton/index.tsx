import { type DimensionValue, View, type ViewProps } from "react-native";
import { cn } from "../../lib/cn";

// A neutral placeholder block, sized by its own props (numeric dimension is
// the sanctioned vocabulary; `avatar.size` is the precedent). The shimmer
// animation stays deferred — a static surface block reads as loading without
// pulling Reanimated into every loading state.
export interface SkeletonProps extends ViewProps {
	width?: DimensionValue;
	height?: DimensionValue;
}

export function Skeleton({ width, height, className, ...rest }: SkeletonProps) {
	return (
		<View
			style={{ width, height }}
			className={cn("rounded-md bg-surface", className)}
			{...rest}
		/>
	);
}
