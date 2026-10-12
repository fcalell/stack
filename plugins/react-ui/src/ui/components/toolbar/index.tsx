import { cn } from "@fcalell/ui-core/cn";
import type { ToolbarChip, ToolbarSearch } from "@fcalell/ui-core/descriptors";
import { TOOLBAR, TOOLBAR_CHIPS, TOOLBAR_ROW } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import type { Closed } from "../../lib/closed.ts";
import { Chip } from "../chip/index.tsx";
import { Input } from "../input/index.tsx";

const STRIP = "flex flex-col";
const ROW = "flex flex-wrap items-center";
// The acts row yields inside the strip's row, so a field trigger wider than the
// line truncates its value instead of holding the row at its full label.
const ACTS = "min-w-0";
const SEARCH = "flex grow min-w-0 touch:w-full";

/** A strip of controls over a list. */
export interface ToolbarProps extends Closed {
	/** The search box: its value, what it hears and its hint. Absent, the strip has none. */
	search?: ToolbarSearch;
	/** The applied filters, each a removable `Chip`, in a row under the search and the acts. */
	chips?: readonly ToolbarChip[];
	/** The acts at the bar fit (a filter's `Button` with its count, an `IconButton`, a `Picker`). Never a filled act: the create act is the page's. */
	children?: ReactNode;
}

/** The strip under a hairline: the search grows and the acts keep their width in one wrapping row (on touch the search takes its own), the applied filters' chips in a row under them; below `tablet` it leaves with its list while a record stands alone. */
export function Toolbar({ search, chips, children }: ToolbarProps) {
	return (
		<div className={cn(TOOLBAR, STRIP)}>
			<div className={cn(TOOLBAR_ROW, ROW)}>
				{search ? (
					<div className={SEARCH}>
						<Input
							kind="search"
							value={search.value}
							onChange={search.onChange}
							placeholder={search.placeholder}
						/>
					</div>
				) : null}
				{children ? (
					<div className={cn(TOOLBAR_ROW, ROW, ACTS)}>{children}</div>
				) : null}
			</div>
			{chips && chips.length > 0 ? (
				<div className={cn(TOOLBAR_CHIPS, ROW)}>
					{chips.map((chip) => (
						<Chip
							key={`${chip.family}:${chip.label}`}
							family={chip.family}
							label={chip.label}
							onRemove={chip.onRemove}
						/>
					))}
				</div>
			) : null}
		</div>
	);
}
