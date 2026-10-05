import { cn } from "@fcalell/ui-core/cn";
import { TOOLBAR, TOOLBAR_CHIPS, TOOLBAR_ROW } from "@fcalell/ui-core/variants";
import { Children, isValidElement, type ReactNode } from "react";
import type { Closed } from "../../lib/closed.ts";
import { Chip } from "../chip/index.tsx";
import { Input } from "../input/index.tsx";

const STRIP = "flex flex-col";
const ROW = "flex flex-wrap items-center";
// The acts row yields inside the strip's row, so a field trigger wider than the
// line truncates its value instead of holding the row at its full label.
const ACTS = "min-w-0";
const SEARCH = "flex grow min-w-0 touch:w-full";
// Below `tablet` of its page, with a record standing alone (its Split marked
// `data-record`), the strip leaves with the list it works on.
const BEHIND = "page-max-tablet:group-has-data-record/page:hidden";

/** A strip of controls over a list. */
export interface ToolbarProps extends Closed {
	/** The controls: a search `Input`, the acts at the bar fit (a filter's `Button` with its count, an `IconButton`), and the applied filters as removable `Chip`s. Never a filled act: the create act is the page's. */
	children?: ReactNode;
}

/** The strip under a hairline: the search grows and the acts keep their width in one wrapping row (on touch the search takes its own), the applied filters' chips in a row under them; below `tablet` it leaves with its list while a record stands alone. */
export function Toolbar({ children }: ToolbarProps) {
	const search: ReactNode[] = [];
	const acts: ReactNode[] = [];
	const chips: ReactNode[] = [];
	for (const child of Children.toArray(children)) {
		if (isValidElement(child) && child.type === Input) search.push(child);
		else if (isValidElement(child) && child.type === Chip) chips.push(child);
		else acts.push(child);
	}
	return (
		<div className={cn(TOOLBAR, STRIP, BEHIND)}>
			<div className={cn(TOOLBAR_ROW, ROW)}>
				{search.length > 0 ? <div className={SEARCH}>{search}</div> : null}
				{acts.length > 0 ? (
					<div className={cn(TOOLBAR_ROW, ROW, ACTS)}>{acts}</div>
				) : null}
			</div>
			{chips.length > 0 ? (
				<div className={cn(TOOLBAR_CHIPS, ROW)}>{chips}</div>
			) : null}
		</div>
	);
}
