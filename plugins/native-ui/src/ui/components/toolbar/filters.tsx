import type { Datum } from "@fcalell/plugin-api/tanstack-query";
import { paints } from "@fcalell/plugin-api/tanstack-query";
import type { MultiPick, OptionPick } from "@fcalell/ui-core/descriptors";
import { filterChip, filterEmpty } from "@fcalell/ui-core/list-state";
import { TOOLBAR_FILTERS } from "@fcalell/ui-core/variants";
import { useState } from "react";
import { View } from "react-native";
import { useAct } from "../../lib/act";
import { useOptions } from "../../lib/read";
import { useWords } from "../../lib/words";
import { ButtonBase } from "../button/base";
import { ChipBase } from "../chip/base";
import { FormField } from "../form-field";
import { Sheet } from "../sheet";

// A filter as a toolbar takes it: a `Picker`'s own props, its `options` a list
// or a read of one, as the picker's are.
type Readable<F> = F extends { options: infer O }
	? Omit<F, "options"> & { options: Datum<O> }
	: never;
export type FilterProp =
	| Readable<OptionPick<string | null>>
	| Readable<MultiPick<string> & { several: true }>;

const CLEAR = "items-start";

// What setting a filter to its empty value is, run in the holder's toast: the
// consumer's `onChange` takes `null`, or `[]` for several.
function clear(filter: FilterProp) {
	return (filter.onChange as (value: null | []) => unknown)(
		filterEmpty(filter),
	);
}

// One set filter's removable chip, "Work type: Change", over its options as
// they stand: painted while the read waits, and its value as given when the
// read ended, so nothing set is hidden. Removing it sets the filter to its
// empty value, a rejection toasting. Outside the package's exports.
export function FilterChip({ filter }: { filter: FilterProp }) {
	const { drawn } = useOptions(filter.options);
	const acting = useAct("toast");
	if (paints(drawn)) return <ChipBase label="" family="neutral" painted />;
	return (
		<ChipBase
			family="neutral"
			label={filterChip(filter, drawn.painted ? [] : (drawn.value as never))}
			onRemove={() => acting.run(true, { onAct: () => clear(filter) })}
		/>
	);
}

// The one act a toolbar of three or more filters draws, "Filters" and the
// count of those set: it opens the filters as labelled picks in a bottom
// sheet, each applying at once as the viewer picks, "Clear filters" at its end
// while any is set. Outside the package's exports.
export function FiltersAct(props: {
	filters: readonly FilterProp[];
	set: number;
}) {
	const words = useWords();
	const [open, setOpen] = useState(false);
	return (
		<>
			<ButtonBase
				act="secondary"
				icon="ListFilter"
				label={words.filters}
				count={props.set > 0 ? props.set : undefined}
				pending={false}
				onAct={() => setOpen(true)}
			/>
			<Sheet open={open} onClose={() => setOpen(false)} title={words.filters}>
				<View className={TOOLBAR_FILTERS}>
					{props.filters.map(({ label, ...picker }) => (
						<FormField key={label} label={label} picker={picker as never} />
					))}
					{props.set > 0 ? (
						<View className={CLEAR}>
							<ButtonBase
								act="quiet"
								label={words.clearFilters}
								onAct={() => Promise.all(props.filters.map(clear))}
							/>
						</View>
					) : null}
				</View>
			</Sheet>
		</>
	);
}
