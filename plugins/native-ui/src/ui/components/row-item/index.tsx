import type { BadgeSpec } from "@fcalell/ui-core/descriptors";
import { ChevronRight, type LucideIcon } from "lucide-react-native";
import { Pressable, type PressableProps, Text, View } from "react-native";
import { cn } from "../../lib/cn";
import { useTokenColor } from "../../lib/theme";
import { Badge } from "../badge";

export interface RowItemProps extends Omit<PressableProps, "children"> {
	label: string;
	description?: string;
	// Leading glyph, rendered by the row at its own size in ink-3.
	icon?: LucideIcon;
	// Trailing measured value: money, counts, times. Mono callout.
	value?: string;
	badge?: BadgeSpec;
	// Trailing navigation affordance.
	chevron?: boolean;
}

// A single list row: an optional leading glyph, a stacked label/description,
// and the trailing data the row renders itself. Pressable so it works as a
// navigation row or a static line (omit `onPress`).
export function RowItem({
	label,
	description,
	icon: Icon,
	value,
	badge,
	chevron,
	className,
	...rest
}: RowItemProps) {
	const ink3 = useTokenColor("--color-ink-3");
	return (
		<Pressable
			className={cn("flex-row items-center gap-3 px-4 py-3", className)}
			{...rest}
		>
			{Icon ? <Icon size={20} color={ink3} /> : null}
			<View className="flex-1">
				<Text className="text-body text-ink-1">{label}</Text>
				{description ? (
					<Text className="text-caption text-ink-2">{description}</Text>
				) : null}
			</View>
			{value ? (
				<Text className="text-callout font-mono text-ink-2">{value}</Text>
			) : null}
			{badge ? <Badge tone={badge.tone}>{badge.label}</Badge> : null}
			{chevron ? <ChevronRight size={18} color={ink3} /> : null}
		</Pressable>
	);
}
