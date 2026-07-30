import {
	type BadgeTone,
	badge,
	badgeLabel,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { Text, View, type ViewProps } from "react-native";
import { cn } from "../../lib/cn";

// Neither badge table carries a type role, so `micro` is composed alongside
// them: 12px semibold, the size the badge has always been. The label tables
// ride the Text node because RN Text inherits nothing from its View.
const ROLE = { variant: "micro" } as const;

export interface BadgeProps extends Omit<ViewProps, "children"> {
	tone?: BadgeTone;
	children?: ReactNode;
}

export function Badge({ tone, className, children, ...rest }: BadgeProps) {
	return (
		<View
			className={cn(
				badge({ tone }),
				"flex-row items-center self-start",
				className,
			)}
			{...rest}
		>
			{typeof children === "string" ? (
				<Text
					className={cn(badgeLabel({ tone }), text(ROLE), textStrong(ROLE))}
				>
					{children}
				</Text>
			) : (
				children
			)}
		</View>
	);
}
