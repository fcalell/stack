import { cn } from "@fcalell/ui-core/cn";
import { COLUMN, COLUMNS } from "@fcalell/ui-core/variants";
import { Children, isValidElement, type ReactNode, use } from "react";
import type { Closed } from "../../lib/closed.ts";
import { PageTitle } from "../../lib/frame.ts";

// The row bleeds to the Place's edge and insets its columns back to the page
// inset, so it scrolls sideways edge to edge; the body clips past that edge,
// so its focus ring draws inside it.
const ROW =
	"flex items-start overflow-x-auto -mx-page focus-visible:-outline-offset-2";
const COLUMN_BOX = "flex flex-col shrink-0";

/** Sections side by side, each at the column width, the row scrolling sideways. */
export interface ColumnsProps extends Closed {
	/** The columns, one Section each. */
	children?: ReactNode;
}

/** Each child in a column at its width, the row scrolling sideways from the page inset. */
export function Columns({ children }: ColumnsProps) {
	const title = use(PageTitle);
	// The row scrolls, so it is the region its page names and takes focus for
	// the keyboard to scroll it even when its columns hold nothing focusable.
	return (
		<section
			aria-labelledby={title}
			// biome-ignore lint/a11y/noNoninteractiveTabindex: a scrolling region is reached by the keyboard (WCAG 2.1.1, axe scrollable-region-focusable)
			tabIndex={0}
			className={cn(COLUMNS, ROW)}
		>
			{Children.toArray(children).map((column) => (
				<div
					key={isValidElement(column) ? column.key : null}
					className={cn(COLUMN, COLUMN_BOX)}
				>
					{column}
				</div>
			))}
		</section>
	);
}
