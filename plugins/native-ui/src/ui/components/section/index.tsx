import type { Act } from "@fcalell/ui-core/descriptors";
import { text } from "@fcalell/ui-core/variants";
import { type ReactNode, useState } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { LoadingRows } from "../../lib/loading";
import { Count } from "../count";

export interface SectionProps extends Closed {
	title: string;
	count?: number;
	description?: string;
	folded?: boolean;
	act?: Act;
	loading?: boolean;
	children?: ReactNode;
}

// A labelled region of a screen: the label header with its count and act,
// folding, the loading form.
export function Section({
	title,
	count,
	description,
	folded,
	act,
	loading,
	children,
}: SectionProps) {
	const [open, setOpen] = useState(!folded);
	return (
		<View className="gap-stack">
			<Pressable
				accessibilityRole="header"
				accessibilityState={{ expanded: open }}
				onPress={() => setOpen((value) => !value)}
				className="min-h-11 flex-row items-center gap-row"
			>
				<RNText className={cn(text({ role: "label" }), "uppercase")}>
					{title}
				</RNText>
				{count !== undefined ? <Count value={count} /> : null}
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
			</Pressable>
			{description ? (
				<RNText className={text({ role: "meta" })}>{description}</RNText>
			) : null}
			{open ? loading ? <LoadingRows /> : children : null}
		</View>
	);
}
