import type { ReactNode } from "react";
import { View } from "react-native";
import type { Closed } from "../../lib/closed";

export interface ActionBarProps extends Closed {
	children?: ReactNode;
}

// Buttons only, at most three, or one PendingBar in their place: full width,
// stacked, the primary first. A Screen pins it above the home indicator; a
// Form or a Sheet keeps it in flow.
export function ActionBar({ children }: ActionBarProps) {
	return <View className="gap-row">{children}</View>;
}
