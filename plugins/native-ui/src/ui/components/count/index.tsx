import { COUNT, COUNT_LABEL } from "@fcalell/ui-core/variants";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";

const PILL = "items-center justify-center";

export interface CountProps extends Closed {
	value: number;
}

// A number in a grey pill, its figures at one width.
export function Count({ value }: CountProps) {
	return (
		<View className={cn(COUNT, PILL)}>
			<RNText className={COUNT_LABEL}>{value}</RNText>
		</View>
	);
}
