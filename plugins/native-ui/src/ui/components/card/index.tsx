import { CARD_BODY, CARD_PART } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { SectionTitle } from "../../lib/field";

const BOX = "min-w-0";

/** A card for a part of a Section's body that draws none of its own. */
export interface CardProps extends Closed {
	/** The part (a Prose, a Stats, a Table, a Stages, an Image), at the card's inset. */
	children: ReactNode;
}

/** The surface inside a hairline at the card radius, its content at the card's inset: what a Section's part stands on when it is no sheet, Form or Table, which are cards of their own and never stand in one. */
export function Card(props: CardProps) {
	return (
		// A control placed alone here draws its field, a Section around or not.
		<View className={cn(CARD_PART, CARD_BODY, BOX)}>
			<SectionTitle.Provider value={undefined}>
				{props.children}
			</SectionTitle.Provider>
		</View>
	);
}
