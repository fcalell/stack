import { rhythm } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { View } from "react-native";

export interface SectionProps {
	children?: ReactNode;
	className?: never;
	style?: never;
}

// The region-level container: its children are a screen's regions, gapped at
// the section rung. Web's Section carries head chrome on top of the same rung;
// that chrome is web-only per the PRD, so the native Section is just the rung.
export function Section({ children }: SectionProps) {
	return <View className={rhythm({ unit: "section" })}>{children}</View>;
}
