import { type Drawn, useSelections } from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import { GROUP, GROUP_ITEM } from "@fcalell/ui-core/variants";
import { Fragment, type ReactNode } from "react";
import type { Closed } from "../../lib/closed.ts";
import { useSettleName } from "../../lib/settle.ts";
import { ListBase } from "../list/base.tsx";
import type { ListProps } from "../list/index.tsx";

const BOX = "flex flex-col shrink-0 overflow-hidden";

/** One entry of a Group: a `row` (a ListRow, a FileRow or a DefinitionRow, which pads itself) drawn bare, or an `item` (a Meter, a FormField or a Slider) drawn in a box at the card's inset. */
export type GroupItem =
	| {
			/** The entry's React key, unique in the group. */
			key: string;
			/** The row, drawn bare. */
			row: ReactNode;
			item?: never;
	  }
	| {
			/** The entry's React key, unique in the group. */
			key: string;
			/** The item, drawn at the card's inset. */
			item: ReactNode;
			row?: never;
	  };

/** Rows in a hairline card. */
export type GroupProps<T = unknown, V extends string | null = string> = Closed &
	(
		| {
				/** The card's entries, a hairline between them. */
				items: readonly GroupItem[];
				list?: never;
		  }
		| {
				/** A List the card frames: its rows, painted while its `items` selection waits, stand on the card, with no bleed of its own. The frame around the Group draws the failed and empty forms. */
				list: ListProps<T, V>;
				items?: never;
		  }
	);

/** Rows in a hairline card on the surface, the hairline drawn once between its entries, so no row carries one. Its structure is its props, `items` or `list`. */
export function Group<T, V extends string | null = string>(
	props: GroupProps<T, V>,
) {
	// The one subscription to the list's items, handed down to its rows.
	const [drawn] = useSelections([props.list?.items] as const);
	const settle = useSettleName();
	const content = props.list ? (
		<ListBase {...props.list} drawn={drawn as Drawn<readonly T[]>} framed />
	) : (
		props.items.map((entry) =>
			"row" in entry ? (
				<Fragment key={entry.key}>{entry.row}</Fragment>
			) : (
				<div key={entry.key} className={GROUP_ITEM}>
					{entry.item}
				</div>
			),
		)
	);
	return (
		<div style={settle} className={cn(GROUP, BOX)}>
			{content}
		</div>
	);
}
