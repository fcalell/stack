import {
	type CardPadding,
	type CardRing,
	card,
} from "@fcalell/ui-core/variants";
import { View, type ViewProps } from "react-native";

export interface CardProps extends ViewProps {
	padding?: CardPadding;
	ring?: CardRing;
	className?: never;
	style?: never;
}

export function Card({ padding, ring, ...rest }: CardProps) {
	return <View className={card({ padding, ring })} {...rest} />;
}
