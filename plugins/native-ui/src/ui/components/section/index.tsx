import type { Act, Part } from "@fcalell/ui-core/descriptors";
import { text, textStrong } from "@fcalell/ui-core/variants";
import { ChevronDown, ChevronRight } from "lucide-react-native";
import { type ReactNode, useEffect, useState } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { Glyph } from "../../lib/glyph";
import { LoadingRows } from "../../lib/loading";
import { partText } from "../../lib/parts";
import { useTouched } from "../../lib/touched";
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
// button with a chevron, starting folded or open as `folded` says. A blocked
// act says its reason under it once pressed or once its form or sheet is
// touched, as a `Button` does.
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
	const { touched } = useTouched();
	const blocked = act?.blocked !== undefined;
	const [pressed, setPressed] = useState(false);
	useEffect(() => {
		if (!blocked) setPressed(false);
	}, [blocked]);
	const said = blocked && (pressed || touched);
	const label = (
		<>
			<RNText
				className={cn(
					text({ role: "meta" }),
					textStrong({ role: "meta" }),
					"uppercase",
				)}
			>
				{partText(title)}
			</RNText>
			{count !== undefined ? <Count value={count} /> : null}
		</>
	);
	return (
		<View className="gap-fields">
			<View className="min-h-11 flex-row items-center gap-inside">
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
					<View className="items-end gap-pair">
						<Pressable
							accessibilityRole="button"
							accessibilityState={{ disabled: blocked || act.loading }}
							accessibilityHint={said ? act.blocked : undefined}
							disabled={act.loading}
							onPress={() => (blocked ? setPressed(true) : act.onAct())}
							className="min-h-11 justify-center"
						>
							<RNText
								className={cn(
									text({ role: "meta" }),
									"font-medium text-accent-ink",
									blocked && "text-ink-faint",
								)}
							>
								{act.label}
							</RNText>
						</Pressable>
						{said ? (
							<RNText className={text({ role: "meta" })}>{act.blocked}</RNText>
						) : null}
					</View>
				) : null}
			</View>
			{description ? (
				<RNText className={text({ role: "meta" })}>{description}</RNText>
			) : null}
			{open ? loading ? <LoadingRows /> : children : null}
		</View>
	);
}
