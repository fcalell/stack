import { GROUP, GROUP_ITEM } from "@fcalell/ui-core/variants";
import { type ReactNode, useContext } from "react";
import { View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { between } from "../../lib/group";
import { LoadingContext, useWait, VEIL } from "../../lib/loading";
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

export type GroupProps<
	T = unknown,
	V extends string | null = string,
> = Closed & {
	loading?: boolean;
} & (
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
// card frames: its rows, its waiting rows and its failed and empty forms
// stand on the card, with no bleed of its own). A loading Section's body waits
// with it: a List draws its own waiting rows, a Slider and a FormField their
// own waiting forms; a row of your own draws as it is.
export function Group<T, V extends string | null = string>(
	props: GroupProps<T, V>,
) {
	const { loading } = props;
	const inherited = useContext(LoadingContext);
	// Its own `loading` waits as a read that lasts does (drawn after a delay, held
	// a minimum); one inherited from a Section arrives already so.
	const late = useWait(loading === true);
	const waiting = loading === undefined ? inherited : late.waiting;
	let body: ReactNode;
	if (props.list) body = <ListBase {...props.list} framed />;
	else
		body = props.items.map((entry, index) => (
			<View
				key={entry.key}
				className={cn(between(index), "item" in entry && GROUP_ITEM)}
			>
				{"row" in entry ? entry.row : entry.item}
			</View>
		));
	return (
		<View
			accessibilityState={{ busy: loading === true }}
			className={cn(GROUP, BOX, late.veiled && VEIL)}
		>
			<LoadingContext.Provider value={waiting}>{body}</LoadingContext.Provider>
		</View>
	);
}
