import { cn } from "@fcalell/ui-core/cn";
import type {
	LinkSegment,
	ToolbarChip,
	ToolbarSearch,
} from "@fcalell/ui-core/descriptors";
import { filterSet, filtersFold } from "@fcalell/ui-core/list-state";
import {
	TOOLBAR_CHIPS,
	TOOLBAR_LINE,
	TOOLBAR_ROW,
	TOOLBAR_SEARCH,
	TOOLBAR_TABS,
} from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { CHIP_LINES } from "../../lib/chip-lines.ts";
import type { Closed } from "../../lib/closed.ts";
import { useTouch } from "../../lib/media.ts";
import { useWords } from "../../lib/words.tsx";
import { Chip } from "../chip/index.tsx";
import { Input } from "../input/index.tsx";
import { HeldPicker } from "../picker/base.tsx";
import { Picker, type PickerMenuProps } from "../picker/index.tsx";
import { FilterChip, type FilterProp, FiltersAct } from "./filters.tsx";

const STRIP = "flex flex-col";
const ROW = "flex flex-wrap items-center";
// The acts row yields inside the strip's row, so a field trigger wider than the
// line truncates its value instead of holding the row at its full label.
const ACTS = "min-w-0";
// The tabs yield inside the row and scroll sideways in their own box.
const TABS = "flex";
// The chips line under the row carries the room above the hairline below it.
const CHIPS = "pb-gap";

/** A strip of controls over a list. */
export interface ToolbarProps extends Closed {
	/** The views of the list, each a label and the `href` it opens, drawn first in the row, before the filters and acts, as a `Picker` in `fit: segments` draws links (28 px pill tabs on no track ground): the one the location selects is marked, and a press opens its href in place. On touch, where the row wraps, they take the first line whole and scroll sideways, and the search its own line. */
	tabs?: readonly LinkSegment[];
	/** The search box: its value, what it hears and its hint. Absent, the strip has none. */
	search?: ToolbarSearch;
	/** The filters, each a `Picker`'s own props (its `label`, `options` as a list or a read, `value` and `onChange`; a `value` that is an array picks several). On touch every filter folds; on the desktop two or fewer stand beside the acts as picks and three or more fold, all of them, behind one Filters act that opens them as labelled picks (a popover, a sheet on touch) and shows the count of those set, a removable chip for each one set in the chips row. */
	filters?: readonly FilterProp[];
	/** The applied filters of the app's own, each a removable `Chip`, in a row under the search and the acts, after the filters' chips. */
	chips?: readonly ToolbarChip[];
	/** The acts at the bar fit (a filter's `Button` with its count, an icon `Button`, a `Picker` at its default fit: `bar` fills its column and takes a line of its own here). Never a filled act: the create act is the page's. */
	children?: ReactNode;
}

/** One bar row with no hairline of its own: the `tabs` first, the search taking the room after them, then the filters and acts at the end, at the control height (on touch the tabs take a line of their own, then the search leads the row and takes the width the acts leave, the Filters act its glyph alone), the applied filters' chips in a line under it, drawn only while any is applied; below `tablet` it leaves with its list while a record stands alone. */
export function Toolbar({
	tabs,
	search,
	filters = [],
	chips,
	children,
}: ToolbarProps) {
	// The chips row is a block of the page: the viewer's filter bringing the first
	// chip or removing the last moves what follows.
	const words = useWords();
	const touch = useTouch();
	const folded = filtersFold(filters.length, touch);
	const set = filters.filter(filterSet);
	const applied = (folded ? set.length : 0) + (chips?.length ?? 0);
	return (
		<div className={STRIP}>
			<div className={cn(TOOLBAR_ROW, TOOLBAR_LINE, ROW)}>
				{tabs ? (
					<nav aria-label={words.tabs} className={cn(TOOLBAR_TABS, TABS)}>
						<Picker fit="segments" options={tabs} />
					</nav>
				) : null}
				{search ? (
					<div className={TOOLBAR_SEARCH}>
						<Input
							kind="search"
							value={search.value}
							onChange={search.onChange}
							placeholder={search.placeholder}
						/>
					</div>
				) : null}
				{filters.length > 0 || children ? (
					<div className={cn(TOOLBAR_ROW, ROW, ACTS)}>
						{folded ? (
							<FiltersAct filters={filters} set={set.length} />
						) : (
							filters.map((filter) => (
								<HeldPicker
									key={filter.label}
									{...(filter as PickerMenuProps<string | null>)}
									fit="bar"
								/>
							))
						)}
						{children}
					</div>
				) : null}
			</div>
			{applied > 0 ? (
				<div className={cn(TOOLBAR_CHIPS, CHIPS, ROW, CHIP_LINES)}>
					{folded
						? set.map((filter) => (
								<FilterChip key={filter.label} filter={filter} />
							))
						: null}
					{chips?.map((chip) => (
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
