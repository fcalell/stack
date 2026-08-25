import type { ReactNode } from "react";
import { Text, View } from "react-native";

export interface DefRowProps {
	label: string;
	// Value content — a string, or nodes so measured parts can use font-mono.
	children: ReactNode;
	className?: never;
	style?: never;
}

// Label/value definition row for sheets & profile. Fixed-width label column; the
// value wraps. Wrap measured parts (coords, times, €) in font-mono yourself.
export function DefRow({ label, children }: DefRowProps) {
	return (
		<View className="flex-row items-baseline gap-3.5">
			<Text className="w-[104px] text-micro font-semibold text-ink-2">
				{label}
			</Text>
			<View className="flex-1">
				{typeof children === "string" ? (
					<Text className="text-callout font-semibold text-ink-1">
						{children}
					</Text>
				) : (
					children
				)}
			</View>
		</View>
	);
}
