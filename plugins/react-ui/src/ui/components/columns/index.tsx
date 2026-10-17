import { cn } from "@fcalell/ui-core/cn";
import { type ColumnsFit, columns } from "@fcalell/ui-core/variants";
import { type ReactNode, use } from "react";
import type { Closed } from "../../lib/closed.ts";
import { PageTitle } from "../../lib/frame.ts";

// The board is one flex row: each child stands at the column width and does
// not shrink, so no wrapper holds a track. The row
// bleeds to the Pane's edge and insets its columns back to the page inset, so
// it scrolls sideways edge to edge; the body clips past that edge, so its
// focus ring draws inside it.
const BOARD =
	"flex items-start overflow-x-auto -mx-page *:w-(--container-column) *:shrink-0 focus-visible:-outline-offset-2";
// The half fit stacks in one column, then stands two to a row from the
// Pane's desktop width.
const HALF =
	"flex flex-col page-desktop:flex-row page-desktop:*:grow page-desktop:*:basis-0";

/** Sections side by side: a board's columns scrolling sideways, or two to a row. */
export interface ColumnsProps extends Closed {
	/** `board` (the default): each section at the column width, the row scrolling sideways. `half`: two to a row filling the body from the Pane's desktop width, stacking in order below it. */
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
	// The row scrolls, so it takes focus for the keyboard to scroll it even
	// when its columns hold nothing focusable, named by its Pane's title as a
	// group, not a second region of that name.
	return (
		// biome-ignore lint/a11y/useSemanticElements: a fieldset groups form controls; this is a row of sections that scrolls
		<div
			role="group"
			aria-labelledby={title}
			// biome-ignore lint/a11y/noNoninteractiveTabindex: a scrolling region is reached by the keyboard (WCAG 2.1.1, axe scrollable-region-focusable)
			tabIndex={0}
			className={cn(columns({ fit: place }), BOARD)}
		>
			{children}
		</div>
	);
}
