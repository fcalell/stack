import { View, type ViewProps } from "react-native";
import { cn } from "#lib/cn";

export interface DividerProps extends ViewProps {
	orientation?: "horizontal" | "vertical";
}

// Hairline separator in the edge token. Horizontal spans its row; vertical
// stretches to its parent's height (the StatStrip column rule).
export function Divider({
	orientation = "horizontal",
	className,
	...rest
}: DividerProps) {
	return (
		<View
			className={cn(
				"bg-edge",
				orientation === "horizontal" ? "h-px w-full" : "w-px self-stretch",
				className,
			)}
			{...rest}
		/>
	);
}
