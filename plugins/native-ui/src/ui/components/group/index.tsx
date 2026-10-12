import { type DefinitionShape, groupWait } from "@fcalell/ui-core/list-state";
import { GROUP, GROUP_ITEM } from "@fcalell/ui-core/variants";
import {
	type ReactNode,
	useContext,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { between, GroupContext, type GroupHost } from "../../lib/group";
import { LoadingContext, useWait, VEIL } from "../../lib/loading";
import { DefinitionWait } from "../definition-row/wait";
import type { ListProps } from "../list";
import { ListBase } from "../list/base";

const BOX = "overflow-hidden";
// A waiting Group with no List of its own draws three waiting setting rows:
// a label over a description, a switch at the end.
const SETTING: DefinitionShape = {
	change: false,
	description: true,
	end: "switch",
	code: false,
};
const SETTINGS = [0, 1, 2] as const;

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
// with it: a List draws its own waiting rows, a Meter, a Slider, a FormField
// and a DefinitionRow their own waiting forms, and skeleton setting rows stand
// in for entries none of them answers for.
export function Group<T, V extends string | null = string>(
	props: GroupProps<T, V>,
) {
	const { loading } = props;
	const inherited = useContext(LoadingContext);
	// Its own `loading` waits as a read that lasts does (drawn after a delay, held
	// a minimum); one inherited from a Section arrives already so.
	const late = useWait(loading === true);
	const waiting = loading === undefined ? inherited : late.waiting;
	// A waiting body draws the waiting forms of the parts that register (however
	// deep: a List, a Meter, a Slider, a DefinitionRow); with none, setting
	// skeletons. The body renders once to learn, and the swap lands in a
	// synchronous re-render before paint.
	const parts = useRef(0);

	const [settings, setSettings] = useState(false);
	const host = useMemo<GroupHost>(
		() => ({
			part: () => {
				parts.current += 1;
				return () => {
					parts.current -= 1;
				};
			},
		}),
		[],
	);
	useLayoutEffect(() => {
		setSettings(waiting && groupWait(parts.current) === "settings");
	}, [waiting]);
	let body: ReactNode;
	if (waiting && settings)
		body = SETTINGS.map((index) => (
			<View key={index} className={between(index)}>
				<DefinitionWait shape={SETTING} index={index} />
			</View>
		));
	else if (props.list) body = <ListBase {...props.list} framed />;
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
			<LoadingContext.Provider value={waiting}>
				<GroupContext.Provider value={host}>{body}</GroupContext.Provider>
			</LoadingContext.Provider>
		</View>
	);
}
