import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { cn } from "#lib/cn";

export interface DefRowProps {
	label: string;
	// Value content — a string, or nodes so measured parts can use font-mono.
	children: ReactNode;
	className?: string;
}

// Label/value definition row for sheets & profile. Fixed-width label column; the
// value wraps. Wrap measured parts (coords, times, €) in font-mono yourself.
export function DefRow({ label, children, className }: DefRowProps) {
	return (
		<View className={cn("flex-row items-baseline gap-3.5", className)}>
			<Text className="w-[104px] text-xs font-semibold text-ink-2">
				{label}
			</Text>
			<View className="flex-1">
				{typeof children === "string" ? (
					<Text className="text-sm font-semibold text-ink-1">{children}</Text>
				) : (
					children
				)}
			</View>
		</View>
	);
}
