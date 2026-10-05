import { cn } from "@fcalell/ui-core/cn";
import { COLUMN, type ColumnsFit, columns } from "@fcalell/ui-core/variants";
import { Children, isValidElement, type ReactNode, use } from "react";
import type { Closed } from "../../lib/closed.ts";
import { PageTitle } from "../../lib/frame.ts";

// The board's row bleeds to the Place's edge and insets its columns back to
// the page inset, so it scrolls sideways edge to edge; the body clips past
// that edge, so its focus ring draws inside it.
const BOARD =
	"flex items-start overflow-x-auto -mx-page focus-visible:-outline-offset-2";
const COLUMN_BOX = "flex flex-col shrink-0";
// The half fit stacks in one column, then stands two to a row from the
// Place's desktop width.
const HALF = "grid grid-cols-1 page-desktop:grid-cols-2";

/** Sections side by side: a board's columns scrolling sideways, or two to a row. */
export interface ColumnsProps extends Closed {
	/** `board` (the default): each section at the column width, the row scrolling sideways. `half`: two to a row filling the body from the Place's desktop width, stacking in order below it. */
	fit?: ColumnsFit;
	/** The sections, one Section each. */
	children?: ReactNode;
}

/** At `board`, each child in a column at its width, the row scrolling sideways from the page inset. At `half`, the children two to a row filling the body from the desktop width, stacked below it. */
export function Columns({ fit, children }: ColumnsProps) {
	const title = use(PageTitle);
	const place = fit ?? "board";
	if (place === "half")
		return <div className={cn(columns({ fit: place }), HALF)}>{children}</div>;
	// The row scrolls, so it is the region its page names and takes focus for
	// the keyboard to scroll it even when its columns hold nothing focusable.
	return (
		<section
			aria-labelledby={title}
			// biome-ignore lint/a11y/noNoninteractiveTabindex: a scrolling region is reached by the keyboard (WCAG 2.1.1, axe scrollable-region-focusable)
			tabIndex={0}
			className={cn(columns({ fit: place }), BOARD)}
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
