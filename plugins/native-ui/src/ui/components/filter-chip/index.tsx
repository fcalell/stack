import type { LucideIcon } from "lucide-react-native";
import { Pressable, type PressableProps, Text } from "react-native";
import { cn } from "../../lib/cn";
import { useTokenColor } from "../../lib/theme";

export interface FilterChipProps extends Omit<PressableProps, "children"> {
	label: string;
	active?: boolean;
	// Leading glyph, rendered by the chip at its own size in the label's ink.
	icon?: LucideIcon;
	className?: never;
	style?: never;
}

// Top-of-list filter chip. Active = ink-1 fill + canvas label (a filter, not a
// role — this is the one chip that *does* flip fill by state, not persona).
export function FilterChip({
	label,
	active,
	icon: Icon,
	...rest
}: FilterChipProps) {
	const iconColor = useTokenColor(active ? "--color-canvas" : "--color-ink-2");
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityState={{ selected: active }}
			className={cn(
				"flex-row items-center gap-1.5 self-start rounded-full px-3 py-[7px]",
				active ? "bg-ink-1" : "bg-surface",
			)}
			{...rest}
		>
			{Icon ? <Icon size={14} color={iconColor} /> : null}
			<Text
				className={cn(
					"text-micro font-semibold",
					active ? "text-canvas" : "text-ink-2",
				)}
			>
				{label}
			</Text>
		</Pressable>
	);
}
