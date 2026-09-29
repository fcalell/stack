import type { Act, Part } from "@fcalell/ui-core/descriptors";
import { text } from "@fcalell/ui-core/variants";
import { ChevronDown, ChevronRight } from "lucide-react-native";
import { type ReactNode, useState } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { Glyph } from "../../lib/glyph";
import { LoadingRows } from "../../lib/loading";
import { partText } from "../../lib/parts";
import { Count } from "../count";

export interface SectionProps extends Closed {
	title: Part;
	count?: number;
	description?: string;
	folded?: boolean;
	// Called as a foldable section opens or closes, with its new state: what
	// the consumer does with what it showed, such as marking it read once it
	// folds again.
	onToggle?: (open: boolean) => void;
	act?: Act;
	loading?: boolean;
	children?: ReactNode;
}

// A labelled region of a screen: the label header with its count and act,
// the loading form. Setting `folded` makes it foldable: the label becomes a
// button with a chevron, starting folded or open as `folded` says.
export function Section({
	title,
	count,
	description,
	folded,
	onToggle,
	act,
	loading,
	children,
}: SectionProps) {
	const foldable = folded !== undefined;
	const [open, setOpen] = useState(!folded);
	const label = (
		<>
			<RNText className={cn(text({ role: "label" }), "uppercase")}>
				{partText(title)}
			</RNText>
			{count !== undefined ? <Count value={count} /> : null}
		</>
	);
	return (
		<View className="gap-stack">
			<View className="min-h-11 flex-row items-center gap-row">
				{foldable ? (
					<Pressable
						accessibilityRole="button"
						accessibilityState={{ expanded: open }}
						onPress={() => {
							const next = !open;
							setOpen(next);
							onToggle?.(next);
						}}
						className="min-h-11 flex-row items-center gap-pair"
					>
						{label}
						<Glyph
							icon={open ? ChevronDown : ChevronRight}
							tone="ink-faint"
							size={16}
						/>
					</Pressable>
				) : (
					<View
						accessibilityRole="header"
						className="flex-row items-center gap-pair"
					>
						{label}
					</View>
				)}
				<View className="flex-1" />
				{act ? (
					<Pressable
						accessibilityRole="button"
						disabled={act.blocked !== undefined || act.loading}
						onPress={act.onAct}
						className="min-h-11 justify-center"
					>
						<RNText
							className={cn(
								text({ role: "meta" }),
								"font-medium text-tint",
								act.blocked !== undefined && "text-ink-faint",
							)}
						>
							{act.label}
						</RNText>
					</Pressable>
				) : null}
			</View>
			{description ? (
				<RNText className={text({ role: "meta" })}>{description}</RNText>
			) : null}
			{open ? loading ? <LoadingRows /> : children : null}
		</View>
	);
}
