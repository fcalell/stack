import { COLUMN, COLUMNS } from "@fcalell/ui-core/variants";
import { Children, isValidElement, type ReactNode } from "react";
import { ScrollView, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";

// The row bleeds to the Place's edge and insets its columns back to the page
// inset, so it scrolls sideways edge to edge.
const BLEED = "-mx-page";
const ROW = "flex-row items-start";
const COLUMN_BOX = "shrink-0";

export interface ColumnsProps extends Closed {
	children?: ReactNode;
}

// Each child in a column at its width, the row scrolling sideways from the
// page inset.
export function Columns({ children }: ColumnsProps) {
	return (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			className={BLEED}
			contentContainerClassName={cn(COLUMNS, ROW)}
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
