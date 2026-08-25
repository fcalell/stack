import { View, type ViewProps } from "react-native";
import { cn } from "../../lib/cn";

export interface SeparatorProps extends ViewProps {
	orientation?: "horizontal" | "vertical";
}

// Hairline separator in the edge token. Horizontal spans its row; vertical
// stretches to its parent's height (the StatStrip column rule).
export function Separator({
	orientation = "horizontal",
	className,
	...rest
}: SeparatorProps) {
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
