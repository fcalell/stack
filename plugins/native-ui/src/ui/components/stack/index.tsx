import { rhythm } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { View } from "react-native";

export interface StackProps {
	children?: ReactNode;
	className?: never;
	style?: never;
}

// A column of stacked units, gapped at the stack rung. RN lays out as a
// column by default, so the shared RHYTHM cell is the whole look.
export function Stack({ children }: StackProps) {
	return <View className={rhythm({ unit: "stack" })}>{children}</View>;
}
