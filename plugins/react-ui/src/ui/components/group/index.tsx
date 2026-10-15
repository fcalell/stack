import { pagesOf } from "@fcalell/plugin-api/tanstack-query";
import { GROUP_ITEM } from "@fcalell/ui-core/variants";
import { Fragment, type ReactNode, useRef } from "react";
import type { Closed } from "../../lib/closed.ts";
import { FrameBody, FrameLine, useCollection } from "../../lib/read.tsx";
import { ListBase } from "../list/base.tsx";
import type { ListProps } from "../list/index.tsx";
import { GroupCard } from "./base.tsx";

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
				/** A List the card frames: its rows, painted while its `items` selection waits, stand on the card, with no bleed of its own. The Group is a frame of the list's items: its failed, missing and empty forms stand in place of the card, whatever stands above it. */
				list: ListProps<T, V>;
				items?: never;
		  }
	);

/** Rows in a hairline card on the surface, the hairline drawn once between its entries, so no row carries one. Its structure is its props, `items` or `list`. */
export function Group<T, V extends string | null = string>(
	props: GroupProps<T, V>,
) {
	if (props.list) return <GroupList {...props.list} />;
	return (
		<GroupCard>
			{props.items.map((entry) =>
				"row" in entry ? (
					<Fragment key={entry.key}>{entry.row}</Fragment>
				) : (
					<div key={entry.key} className={GROUP_ITEM}>
						{entry.item}
					</div>
				),
			)}
		</GroupCard>
	);
}

// The Group of a List: a frame of the list's items, so a failed, missing or
// empty read draws its form in place of the card, and the line over it.
function GroupList<T, V extends string | null>(list: ListProps<T, V>) {
	const { drawn, frame } = useCollection(list.items);
	// The group is the box a list's rows stand in, which they window in.
	const box = useRef<HTMLDivElement>(null);
	return (
		<FrameBody frame={frame} fit="frame">
			<FrameLine frame={frame} />
			<GroupCard box={box}>
				<ListBase
					{...list}
					drawn={drawn}
					more={pagesOf(list.items)}
					box={box}
					framed
				/>
			</GroupCard>
		</FrameBody>
	);
}
