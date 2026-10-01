import { GROUP_GROUND } from "@fcalell/ui-core/variants";
import { createContext } from "react";
import { View } from "react-native";
import { cn } from "./cn";

// Set by a loading `Section` around its body: a `Group` or a `List` in it
// draws its own skeleton rows unless its own `loading` says otherwise.
export const LoadingContext = createContext(false);

// The loading form every container and content molecule draws: three row
// forms on the group fill. A screen never places a skeleton of its own.
export function LoadingRows() {
	return (
		<View className="gap-fields" accessibilityState={{ busy: true }}>
			<View className={cn(GROUP_GROUND, "min-h-11")} />
			<View className={cn(GROUP_GROUND, "min-h-11")} />
			<View className={cn(GROUP_GROUND, "min-h-11")} />
		</View>
	);
}
