import { rhythm } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { View } from "react-native";
import { cn } from "../../lib/cn";

export interface RowProps {
	children?: ReactNode;
	className?: never;
	style?: never;
}

// Items in a group, laid inline and gapped at the row rung. A left/right
// split is justify-between geometry, not a Row. The direction classes are
// the native overlay; the gap is the shared RHYTHM cell.
export function Row({ children }: RowProps) {
	return (
		<View className={cn(rhythm({ unit: "row" }), "flex-row items-center")}>
			{children}
		</View>
	);
}
