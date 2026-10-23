import { Dialog } from "@base-ui/react/dialog";
import { Popover } from "@base-ui/react/popover";
import type { Datum } from "@fcalell/plugin-api/tanstack-query";
import { paints } from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import type { MultiPick, OptionPick } from "@fcalell/ui-core/descriptors";
import { filterChip, filterEmpty } from "@fcalell/ui-core/list-state";
import {
	LAYER_POPOVER,
	POPOVER,
	TOOLBAR_FILTERS,
	TOOLBAR_FILTERS_POPOVER,
} from "@fcalell/ui-core/variants";
import { use, useRef, useState } from "react";
import { useAct } from "../../lib/act.ts";
import { useQuietGuards } from "../../lib/guards.ts";
import { spacing, useTouch } from "../../lib/media.ts";
import { PortalContainer } from "../../lib/portal.ts";
import { useOptions } from "../../lib/read.tsx";
import { useWords } from "../../lib/words.tsx";
import { ButtonBase } from "../button/base.tsx";
import { IconButtonBase } from "../button/glyph.tsx";
import { ChipBase } from "../chip/base.tsx";
import { FormField } from "../form-field/index.tsx";
import { SheetBase } from "../sheet/base.tsx";

// A filter as a toolbar takes it: a `Picker`'s own props, its `options` a list
// or a read of one, as the picker's are.
type Readable<F> = F extends { options: infer O }
	? Omit<F, "options"> & { options: Datum<O> }
	: never;
export type FilterProp =
	| Readable<OptionPick<string | null>>
	| Readable<MultiPick<string> & { several: true }>;

// The popover stops at the room Base UI measures under the act, its fields
// scrolling inside it; a sheet's body scrolls itself.
const POPUP = "flex flex-col min-w-0 max-h-(--available-height)";
const POSITIONER = "z-(--layer-popover)";
const PANEL = "flex flex-col min-h-0 overflow-y-auto overscroll-contain";
// The clear act stands at the panel's start edge, under the fields.
const CLEAR = "flex items-start";

// What setting a filter to its empty value is, run in the holder's toast: the
// consumer's `onChange` takes `null`, or `[]` for several.
function clear(filter: FilterProp) {
	return (filter.onChange as (value: null | []) => unknown)(
		filterEmpty(filter),
	);
}

/** One set filter's removable chip, "Work type: Change", over its options as they stand: painted while the read waits, and its value as given when the read ended, so nothing set is hidden. Removing it sets the filter to its empty value, a rejection toasting. Outside the package's exports. */
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

// The labelled picks, each applying at once as the viewer picks, and the act
// that sets every one to its empty value while any is set. Clearing hands focus
// to the first pick, since the act it was on is gone.
function Fields(props: { filters: readonly FilterProp[]; set: number }) {
	const words = useWords();
	const panel = useRef<HTMLDivElement>(null);
	const clearAll = () => {
		panel.current?.querySelector("button")?.focus();
		return Promise.all(props.filters.map(clear));
	};
	return (
		<div ref={panel} className={cn(TOOLBAR_FILTERS, PANEL)}>
			{props.filters.map(({ label, ...picker }) => (
				<FormField key={label} label={label} picker={picker as never} />
			))}
			{props.set > 0 ? (
				<div className={CLEAR}>
					<ButtonBase act="quiet" label={words.clearFilters} onAct={clearAll} />
				</div>
			) : null}
		</div>
	);
}

/** The one act a toolbar of three or more filters draws, "Filters" and the count of those set: it opens the filters as labelled picks, in a popover under it on the desktop and a sheet on touch. Escape and a press outside close it and focus returns to the act. Outside the package's exports. */
export function FiltersAct(props: {
	filters: readonly FilterProp[];
	set: number;
}) {
	const words = useWords();
	const touch = useTouch();
	const container = use(PortalContainer);
	useQuietGuards();
	const [open, setOpen] = useState(false);
	const [sheet] = useState(() => Dialog.createHandle<unknown>());
	// On touch the act is its glyph alone at the search's end; the set filters
	// show as the chips under the row. On the desktop it is the labelled button.
	const act = touch ? (
		<IconButtonBase icon="ListFilter" label={words.filters} pending={false} />
	) : (
		<ButtonBase
			act="secondary"
			icon="ListFilter"
			label={words.filters}
			count={props.set > 0 ? props.set : undefined}
			pending={false}
		/>
	);
	const fields = <Fields filters={props.filters} set={props.set} />;
	if (touch)
		return (
			<>
				<Dialog.Trigger handle={sheet} render={act} />
				<SheetBase
					handle={sheet}
					open={open}
					onOpen={() => setOpen(true)}
					onClose={() => setOpen(false)}
					title={words.filters}
				>
					{fields}
				</SheetBase>
			</>
		);
	return (
		<Popover.Root modal={false} open={open} onOpenChange={setOpen}>
			<Popover.Trigger render={act} />
			<Popover.Portal container={container}>
				<Popover.Positioner
					className={POSITIONER}
					align="start"
					sideOffset={() => spacing("gap")}
				>
					<Popover.Popup
						aria-label={words.filters}
						className={cn(
							POPOVER,
							LAYER_POPOVER,
							TOOLBAR_FILTERS_POPOVER,
							POPUP,
						)}
					>
						{fields}
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	);
}
