import { rhythm } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { View } from "react-native";
import { cn } from "../../lib/cn";

export interface PairProps {
	children?: ReactNode;
	row?: boolean;
	className?: never;
	style?: never;
}

// A glued micro-pair (label to control, title to meta), gapped at the pair
// rung. Column by default (RN's own layout); `row` lays it inline.
export function Pair({ children, row }: PairProps) {
	return (
		<View className={cn(rhythm({ unit: "pair" }), row && "flex-row items-center")}>
			{children}
		</View>
	);
}
