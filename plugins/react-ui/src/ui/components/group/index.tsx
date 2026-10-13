import { cn } from "@fcalell/ui-core/cn";
import { GROUP, GROUP_ITEM } from "@fcalell/ui-core/variants";
import { Fragment, type ReactNode, use } from "react";
import type { Closed } from "../../lib/closed.ts";
import {
	LoadingContext,
	useSettleName,
	useWait,
	VEIL,
} from "../../lib/loading.ts";
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
export type GroupProps<
	T = unknown,
	V extends string | null = string,
> = Closed & {
	/** The rows wait (a loading Section's body waits with it): a List in it draws its own waiting rows, a Meter, a Slider, a FormField and a DefinitionRow their own waiting forms; a row of your own draws as it is. */
	loading?: boolean;
} & (
		| {
				/** The card's entries, a hairline between them. */
				items: readonly GroupItem[];
				list?: never;
		  }
		| {
				/** A List the card frames: its rows, its waiting rows and its failed and empty forms stand on the card, with no bleed of its own. */
				list: ListProps<T, V>;
				items?: never;
		  }
	);

/** Rows in a hairline card on the surface, the hairline drawn once between its entries, so no row carries one. Its structure is its props, `items` or `list`. */
export function Group<T, V extends string | null = string>(
	props: GroupProps<T, V>,
) {
	const { loading } = props;
	const inherited = use(LoadingContext);
	// Its own `loading` waits as a read that lasts does (drawn after a delay, held
	// a minimum); one inherited from a Section arrives already so.
	const late = useWait(loading === true);
	const settle = useSettleName();
	const waiting = loading === undefined ? inherited : late.waiting;
	const content = props.list ? (
		<ListBase {...props.list} framed />
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
		<div
			aria-busy={loading || undefined}
			style={settle}
			className={cn(GROUP, BOX, late.veiled && VEIL)}
		>
			<LoadingContext value={waiting}>{content}</LoadingContext>
		</div>
	);
}
