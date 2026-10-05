import { COLUMN, type ColumnsFit, columns } from "@fcalell/ui-core/variants";
import { Children, isValidElement, type ReactNode } from "react";
import { ScrollView, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";

// The board's row bleeds to the Place's edge and insets its columns back to
// the page inset, so it scrolls sideways edge to edge.
const BLEED = "-mx-page";
const ROW = "flex-row items-start";
const COLUMN_BOX = "shrink-0";

export interface ColumnsProps extends Closed {
	// `board` (the default) scrolls sideways; `half` stacks, as the phone is
	// never at the desktop width.
	fit?: ColumnsFit;
	children?: ReactNode;
}

// At `board`, each child in a column at its width, the row scrolling sideways
// from the page inset. At `half`, the children stacked in order.
export function Columns({ fit, children }: ColumnsProps) {
	const place = fit ?? "board";
	if (place === "half")
		return <View className={columns({ fit: place })}>{children}</View>;
	return (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			className={BLEED}
			contentContainerClassName={cn(columns({ fit: place }), ROW)}
		>
			{Children.toArray(children).map((column) => (
				<View
					key={isValidElement(column) ? column.key : null}
					className={cn(COLUMN, COLUMN_BOX)}
				>
					{column}
				</View>
			))}
		</ScrollView>
	);
}
