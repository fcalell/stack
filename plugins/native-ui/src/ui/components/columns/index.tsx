import type { ReactNode } from "react";
import { View } from "react-native";
import type { Closed } from "../../lib/closed";

export interface ColumnsProps extends Closed {
	children?: ReactNode;
}

// Sections side by side on the desktop; on the phone they stack.
export function Columns({ children }: ColumnsProps) {
	return <View className="gap-section">{children}</View>;
}
