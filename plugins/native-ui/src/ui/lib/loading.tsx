import { GROUP } from "@fcalell/ui-core/variants";
import { View } from "react-native";
import { cn } from "./cn";

// The loading form every container and content molecule draws: three row
// forms on the group fill. A screen never places a skeleton of its own.
export function LoadingRows() {
	return (
		<View className="gap-stack" accessibilityState={{ busy: true }}>
			<View className={cn(GROUP, "min-h-11")} />
			<View className={cn(GROUP, "min-h-11")} />
			<View className={cn(GROUP, "min-h-11")} />
		</View>
	);
}
