import { type DimensionValue, View, type ViewProps } from "react-native";

// A neutral placeholder block, sized by its own props (numeric dimension is
// the sanctioned vocabulary; `avatar.size` is the precedent). The shimmer
// animation stays deferred — a static surface block reads as loading without
// pulling Reanimated into every loading state.
export interface SkeletonProps extends ViewProps {
	width?: DimensionValue;
	height?: DimensionValue;
	className?: never;
	style?: never;
}

export function Skeleton({ width, height, ...rest }: SkeletonProps) {
	return (
		<View
			style={{ width, height }}
			className="rounded-md bg-surface"
			{...rest}
		/>
	);
}
