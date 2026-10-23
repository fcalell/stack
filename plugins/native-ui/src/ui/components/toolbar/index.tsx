import type { ToolbarChip, ToolbarSearch } from "@fcalell/ui-core/descriptors";
import { filterSet, filtersFold } from "@fcalell/ui-core/list-state";
import { TOOLBAR, TOOLBAR_CHIPS, TOOLBAR_ROW } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { View } from "react-native";
import { CHIP_LINES } from "../../lib/chip-lines";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { blockIn, FadingView } from "../../lib/motion";
import { Chip } from "../chip";
import { Input } from "../input";
import type { PickerMenuProps } from "../picker";
import { HeldPicker } from "../picker/base";
import { FilterChip, type FilterProp, FiltersAct } from "./filters";

const ROW = "flex-row flex-wrap items-center";
const SEARCH = "w-full";

export interface ToolbarProps extends Closed {
	// The search box: its value, what it hears and its hint.
	search?: ToolbarSearch;
	// The filters, each a `Picker`'s own props (its `label`, `options` as a list or a read, `value` and `onChange`; a `value` that is an array picks several). Every filter folds (the phone is touch), all of them, behind one Filters act that opens them as labelled picks in a sheet and shows the count of those set, a removable chip for each one set in the chips row.
	filters?: readonly FilterProp[];
	// The applied filters of the app's own, each a removable `Chip`, in a row under the acts, after the filters' chips.
	chips?: readonly ToolbarChip[];
	// The acts at the bar fit (a filter's `Button` with its count, an icon `Button`).
	children?: ReactNode;
}

// The strip under a hairline: the search on a row of its own, the filters (or
// the one Filters act they fold behind from three) and the acts at their width
// in a wrapping row under it, the applied filters' chips in a row under them.
// Never a filled act: the create act is the page's.
export function Toolbar({
	search,
	filters = [],
	chips,
	children,
}: ToolbarProps) {
	const folded = filtersFold(filters.length, true);
	const set = filters.filter(filterSet);
	const applied = (folded ? set.length : 0) + (chips?.length ?? 0);
	return (
		<View className={TOOLBAR}>
			<View className={cn(TOOLBAR_ROW, ROW)}>
				{search ? (
					<View className={SEARCH}>
						<Input
							kind="search"
							value={search.value}
							onChange={search.onChange}
							placeholder={search.placeholder}
						/>
					</View>
				) : null}
				{filters.length > 0 || children ? (
					<View className={cn(TOOLBAR_ROW, ROW)}>
						{folded ? (
							<FiltersAct filters={filters} set={set.length} />
						) : (
							filters.map((filter) => (
								<HeldPicker
									key={filter.label}
									{...(filter as PickerMenuProps<string | null>)}
								/>
							))
						)}
						{children}
					</View>
				) : null}
			</View>
			{applied > 0 ? (
				// The chips row is a block: it fades in as it mounts.
				<FadingView
					entering={blockIn()}
					className={cn(TOOLBAR_CHIPS, ROW, CHIP_LINES)}
				>
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
				</FadingView>
			) : null}
		</View>
	);
}
