import {
	type CardPadding,
	type CardRing,
	card,
} from "@fcalell/ui-core/variants";
import { View, type ViewProps } from "react-native";
import { cn } from "../../lib/cn";

export interface CardProps extends ViewProps {
	padding?: CardPadding;
	ring?: CardRing;
}

export function Card({ padding, ring, className, ...rest }: CardProps) {
	return <View className={cn(card({ padding, ring }), className)} {...rest} />;
}
