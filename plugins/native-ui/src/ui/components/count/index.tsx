import { COUNT } from "@fcalell/ui-core/variants";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";

export interface CountProps extends Closed {
	value: number;
}

// A number in a pill: a place in the shell, a section header.
export function Count({ value }: CountProps) {
	return (
		<View className="items-center justify-center">
			<RNText className={cn(COUNT, "text-center")}>{value}</RNText>
		</View>
	);
}
