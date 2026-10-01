import { cn } from "@fcalell/ui-core/cn";
import { COLUMN, COLUMNS } from "@fcalell/ui-core/variants";
import { Children, isValidElement, type ReactNode, use } from "react";
import type { Closed } from "../../lib/closed.ts";
import { DEEPER, HeadingContext } from "../../lib/heading.ts";

// The row bleeds to the Place's edge and insets its columns back to the page
// inset, so it scrolls sideways edge to edge.
const ROW = "flex items-start overflow-x-auto -mx-page";
const COLUMN_BOX = "flex flex-col shrink-0";

/** Sections side by side, each at the column width, the row scrolling sideways. */
export interface ColumnsProps extends Closed {
	/** The columns, one Section each. */
	children?: ReactNode;
}

/** Each child in a column at its width, the row scrolling sideways from the page inset. */
export function Columns({ children }: ColumnsProps) {
	const level = use(HeadingContext);
	return (
		<HeadingContext value={DEEPER[level]}>
			<div className={cn(COLUMNS, ROW)}>
				{Children.toArray(children).map((column) => (
					<div
						key={isValidElement(column) ? column.key : null}
						className={cn(COLUMN, COLUMN_BOX)}
					>
						{column}
					</div>
				))}
			</div>
		</HeadingContext>
	);
}
