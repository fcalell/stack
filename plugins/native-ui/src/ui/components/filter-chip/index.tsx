import type { ReactNode } from "react";
import { Pressable, type PressableProps, Text } from "react-native";
import { cn } from "#lib/cn";

export interface FilterChipProps extends Omit<PressableProps, "children"> {
	label: string;
	active?: boolean;
	leading?: ReactNode;
}

// Top-of-list filter chip. Active = ink-1 fill + canvas label (a filter, not a
// role — this is the one chip that *does* flip fill by state, not persona).
export function FilterChip({
	label,
	active,
	leading,
	className,
	...rest
}: FilterChipProps) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityState={{ selected: active }}
			className={cn(
				"flex-row items-center gap-1.5 self-start rounded-full px-3 py-[7px]",
				active ? "bg-ink-1" : "bg-surface",
				className,
			)}
			{...rest}
		>
			{leading}
			<Text
				className={cn(
					"text-xs font-semibold",
					active ? "text-canvas" : "text-ink-2",
				)}
			>
				{label}
			</Text>
		</Pressable>
	);
}
