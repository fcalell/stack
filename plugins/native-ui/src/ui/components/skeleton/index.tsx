import { View, type ViewProps } from "react-native";
import { cn } from "#lib/cn";

// A neutral placeholder block. Size it with className (`h-4 w-32`, etc.). The
// shimmer animation is intentionally deferred to PR4 — a static surface block
// reads as loading without pulling Reanimated into every loading state.
export interface SkeletonProps extends ViewProps {}

export function Skeleton({ className, ...rest }: SkeletonProps) {
	return <View className={cn("rounded-md bg-surface", className)} {...rest} />;
}
