import { pagesOf } from "@fcalell/plugin-api/tanstack-query";
import { GROUP, GROUP_ITEM } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { between } from "../../lib/group";
import { FrameBody, FrameLine, useCollection } from "../../lib/read";
import type { ListProps } from "../list";
import { ListBase } from "../list/base";

const BOX = "overflow-hidden";

// One entry of a Group: a `row` (a ListRow, a FileRow or a DefinitionRow,
// which pads itself) drawn bare, or an `item` (a Meter, a FormField or a
// Slider) drawn in a box at the card's inset.
export type GroupItem =
	| {
			// The entry's React key, unique in the group.
			key: string;
			// The row, drawn bare.
			row: ReactNode;
			item?: never;
	  }
	| {
			// The entry's React key, unique in the group.
			key: string;
			// The item, drawn at the card's inset.
			item: ReactNode;
			row?: never;
	  };

export type GroupProps<T = unknown, V extends string | null = string> = Closed &
	(
		| {
				items: readonly GroupItem[];
				list?: never;
		  }
		| {
				list: ListProps<T, V>;
				items?: never;
		  }
	);

// Rows in a hairline card on the surface, the hairline drawn once between its
// entries, so no row carries one. Its structure is its props, `items` (each a
// `row` drawn bare or an `item` at the card's inset) or `list` (a List the
// card frames: its rows, painted while its `items` selection waits, stand on
// the card, with no bleed of its own; the Group is a frame of the
// list's items: its failed, missing and empty forms stand in place of the
// card, whatever stands above it).
export function Group<T, V extends string | null = string>(
	props: GroupProps<T, V>,
) {
	if (props.list) return <GroupList {...props.list} />;
	return (
		<View className={cn(GROUP, BOX)}>
			{props.items.map((entry, index) => (
				<View
					key={entry.key}
					className={cn(between(index), "item" in entry && GROUP_ITEM)}
				>
					{"row" in entry ? entry.row : entry.item}
				</View>
			))}
		</View>
	);
}

// The Group of a List: a frame of the list's items, so a failed, missing or
// empty read draws its form in place of the card, and the line over it.
function GroupList<T, V extends string | null>(list: ListProps<T, V>) {
	const { drawn, frame } = useCollection(list.items);
	return (
		<FrameBody frame={frame} fit="frame">
			<FrameLine frame={frame} />
			<View className={cn(GROUP, BOX)}>
				<ListBase {...list} drawn={drawn} more={pagesOf(list.items)} framed />
			</View>
		</FrameBody>
	);
}
