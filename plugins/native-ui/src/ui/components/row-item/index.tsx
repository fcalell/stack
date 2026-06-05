import type { ReactNode } from "react";
import { Pressable, type PressableProps, Text, View } from "react-native";
import { cn } from "#lib/cn";

export interface RowItemProps extends Omit<PressableProps, "children"> {
	label: string;
	description?: string;
	leading?: ReactNode;
	trailing?: ReactNode;
}

// A single list row: optional leading slot, a stacked label/description, and an
// optional trailing slot. Pressable so it works as a navigation row or a static
// line (omit `onPress`).
export function RowItem({
	label,
	description,
	leading,
	trailing,
	className,
	...rest
}: RowItemProps) {
	return (
		<Pressable
			className={cn("flex-row items-center gap-3 px-4 py-3", className)}
			{...rest}
		>
			{leading}
			<View className="flex-1">
				<Text className="text-base text-ink-1">{label}</Text>
				{description ? (
					<Text className="text-sm text-ink-2">{description}</Text>
				) : null}
			</View>
			{trailing}
		</Pressable>
	);
}
