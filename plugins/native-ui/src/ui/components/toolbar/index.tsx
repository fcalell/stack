import type { ReactNode } from "react";
import { View } from "react-native";
import type { Closed } from "../../lib/closed";

export interface ToolbarProps extends Closed {
	children?: ReactNode;
}

// One row of controls over a list: a picker, a segmented control, a search
// field, a switch.
export function Toolbar({ children }: ToolbarProps) {
	return (
		<View className="flex-row flex-wrap items-center gap-row">{children}</View>
	);
}
