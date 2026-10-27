import { placeholderData } from "@fcalell/plugin-api/read";
import type { Drawn, Read } from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import {
	folding,
	toggled,
	treeMove,
	treeRows,
	treeStop,
} from "@fcalell/ui-core/list-state";
import { PAINT_ROWS } from "@fcalell/ui-core/paint";
import {
	type ComponentProps,
	type FocusEvent,
	type KeyboardEvent,
	type ReactElement,
	type ReactNode,
	type RefObject,
	useCallback,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { useArrivals } from "../../lib/arrive.ts";
import { MoreRow } from "../../lib/more.tsx";
import { ListedRoute, useRoute } from "../../lib/navigate.ts";
import { Window } from "../../lib/window.tsx";
import { FileRowItem } from "../file-row/index.tsx";
import { RowItem } from "../row/index.tsx";
import { BandHead } from "./band.tsx";
import { DIVIDER } from "./card.tsx";
import type { Band, Row, RowItem as RowItemData } from "./index.tsx";

/** What the Section hands its rows; no app sets it, so it is outside `SectionProps`. */
export interface RowsInternal {
	/** The items as the Section subscribed to them: real, or the placeholder while the read waits, which paints `PAINT_ROWS` rows. */
	drawn: Drawn<readonly Row[]>;
	/** The pages read the items come from, when it has pages: the sheet ends in its more row. */
	more?: Read<unknown>;
	/** The sheet the rows stand in, which the rows window against; a painted next page stands in its Section's. */
	box?: RefObject<HTMLElement | null>;
	/** The rows are the painted next page of another sheet: its rows alone, standing in that sheet's box. */
	tail?: boolean;
	/** The Section's `groups`. */
	groups?: readonly Band[];
	/** The Section's head counts the rows, so a lone band holding every row draws no count of its own: one band, one count. */
	counted?: boolean;
	/** The list item the painted rows take their shape from; a title line over a meta line when none is given. */
	paint?: RowItemData;
}

// The painted row: a title line over a meta line, whatever kind the loaded rows
// are.
const PAINTED: RowItemData = { key: "", title: "", meta: [""] };

const isList = (item: Row): item is RowItemData => !("path" in item);
const keyOf = (item: Row) => {
	if (item.key !== undefined) return item.key;
	if (isList(item)) {
		if (typeof item.label === "string") return item.label;
		if (item.label) return item.label.code;
		if (typeof item.title === "string") return item.title;
	}
	return "";
};
const childrenOf = (item: Row) => (isList(item) ? item.children : undefined);

// A tree has no box of its own but the card: its rows stand in the tree's
// element on it, a hairline falling once between them.
const GROUP_TREE = "flex flex-col";

// A tree's keyboard: the container's role and the keys and focus its rows'
// `treeitem` stops send up.
interface TreeNav {
	onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
	onFocus: (event: FocusEvent<HTMLElement>) => void;
}

/** The rows of a Section's sheet, of whatever kinds, with its bands and its tree. Outside the package's exports: `drawn` is the Section's alone. */
export function Rows(props: RowsInternal) {
	const at = useRoute();
	// The keys of the tree's folded branches; every branch starts open.
	const [folded, setFolded] = useState<readonly string[]>([]);
	// The key of the tree's row that holds its one tab stop.
	const [active, setActive] = useState<string>();
	const fold = useCallback(
		(key: string) => setFolded((keys) => toggled(keys, key)),
		[],
	);
	const own = useRef<HTMLDivElement>(null);
	const box = props.box ?? own;
	// The tree's element, which holds its rows.
	const wrap = useRef<HTMLDivElement>(null);
	const treeBox = wrap;
	// The visible row a key is moving the focus to, by its key; it stands
	// mounted by then, the window keeping the tab stop's row, and takes the focus.
	const [wanted, setWanted] = useState<{ key: string }>();
	useLayoutEffect(() => {
		if (!wanted) return;
		treeBox.current
			?.querySelectorAll<HTMLElement>('[role="treeitem"]')
			.forEach((each) => {
				if (each.dataset.key === wanted.key) each.focus();
			});
	}, [wanted]);
	const { drawn } = props;
	const painted = drawn.painted;
	// Painted, `PAINT_ROWS` painted list items; the data's depths are not there,
	// so a painted tree draws flat.
	const loaded: readonly Row[] = drawn.painted
		? Array.from({ length: PAINT_ROWS }, () => props.paint ?? PAINTED)
		: drawn.value;
	// The groups' bands stand over a loaded standalone list of rows. Rows of no
	// group stand before the first band, the rest in their group's order, each
	// group's rows in the items' order.
	const groups = painted ? undefined : props.groups;
	const rank = (item: Row) =>
		groups?.findIndex(
			(each) => each.key === (isList(item) ? item.group : undefined),
		) ?? -1;
	const items: readonly Row[] = groups
		? [...loaded].sort((a, b) => rank(a) - rank(b))
		: loaded;
	// A sheet is a tree once any of its list items declares `children`.
	const tree = !painted && items.some((item) => childrenOf(item) !== undefined);
	// The rows that came on their own once the list was drawn fade in as they
	// mount; what it held when first drawn is not new.
	const arrived = useArrivals(painted ? [] : items.map(keyOf), !painted);
	// A painted row's key is its place, the painted rows sharing one item.
	// Only a painted row takes its place as a prop (it varies the filler): a
	// loaded row's place moves when a row lands above it, which would render
	// every row below.
	const paintedAt = (index: number) => (painted ? index : undefined);
	const keyAt = (index: number) =>
		painted ? `waiting-${index}` : keyOf(items[index] as Row);
	// The sheet is the rows' box: they stand in it directly, so its hairline
	// falls once between them, a tree's too (its rails run unbroken); facts draw
	// none. The rows read the route the Section read once, through `ListedRoute`.
	// The rows are built by their index, so a long flat list's Window builds
	// only the ones it mounts; the others draw all of them.
	const frame = (
		count: number,
		keyOf: (index: number) => string,
		rowAt: (index: number) => ReactElement,
		nav?: TreeNav,
		keep?: number,
	) => {
		const rows = () =>
			Array.from({ length: count }, (_, index) => rowAt(index));
		if (props.tail) return <ListedRoute value={at}>{rows()}</ListedRoute>;
		// The more row ends the box, so the rows it paints stand at the box's
		// rhythm; a tree's box holds treeitems alone, so its row follows it.
		const sheet = props;
		const more =
			props.more && !painted ? (
				<MoreRow
					read={props.more}
					empty={items.length === 0}
					inset
					paint={() => (
						<Rows
							{...sheet}
							more={undefined}
							tail={!nav}
							drawn={{
								painted: true,
								phase: "waiting",
								value: placeholderData(),
							}}
						/>
					)}
				/>
			) : null;
		// A tree's rows window too, the one holding the tab stop kept mounted.
		const shown = (
			<Window
				count={count}
				keyOf={keyOf}
				row={rowAt}
				box={nav ? treeBox : box}
				keep={keep}
			/>
		);
		const stand: ReactNode = nav ? (
			<div
				ref={wrap}
				role="tree"
				onKeyDown={nav.onKeyDown}
				onFocus={nav.onFocus}
				className={cn(GROUP_TREE, DIVIDER)}
			>
				{shown}
			</div>
		) : (
			shown
		);
		return (
			<ListedRoute value={at}>
				{stand}
				{more}
			</ListedRoute>
		);
	};
	// With groups, the entries are the rows with a band before the first row of
	// each group (and every empty group's, after the last): `groupAt` is a root
	// row's group index, `undefined` for a tree's child, which stands with its
	// parent.
	const banded = (
		groupAt: (index: number) => number | undefined,
		...args: Parameters<typeof frame>
	) => {
		const [count, keyOf, rowAt, nav, keep] = args;
		if (!groups) return frame(count, keyOf, rowAt, nav, keep);
		const entries: ({ band: number } | { row: number })[] = [];
		const counts = groups.map(() => 0);
		let roots = 0;
		let shown = 0;
		for (let index = 0; index < count; index++) {
			const group = groupAt(index);
			if (group !== undefined) roots++;
			if (group !== undefined && group >= 0) {
				counts[group] = (counts[group] as number) + 1;
				for (; shown <= group; shown++) entries.push({ band: shown });
			}
			entries.push({ row: index });
		}
		for (; shown < groups.length; shown++) entries.push({ band: shown });
		// One band holding every row would repeat the head's count: it draws none.
		const lone =
			props.counted === true && groups.length === 1 && counts[0] === roots;
		const bandKey = (at: number) =>
			`band:${(groups[at] as { key: string }).key}`;
		return frame(
			entries.length,
			(at) => {
				const entry = entries[at] as (typeof entries)[number];
				return "row" in entry ? keyOf(entry.row) : bandKey(entry.band);
			},
			(at) => {
				const entry = entries[at] as (typeof entries)[number];
				if ("row" in entry) return rowAt(entry.row);
				const group = groups[entry.band] as (typeof groups)[number];
				return (
					<BandHead
						key={bandKey(entry.band)}
						label={group.label}
						count={lone ? 0 : (counts[entry.band] as number)}
						act={group.act}
					/>
				);
			},
			nav,
			keep === undefined
				? undefined
				: entries.findIndex((entry) => "row" in entry && entry.row === keep),
		);
	};
	// One row by its kind: a file row alone has a shape of its own; a tree's rows take their place in it.
	const rowOf = (
		item: Row,
		key: string,
		index: number | undefined,
		place?: Omit<
			ComponentProps<typeof RowItem>,
			"item" | "id" | "painted" | "arrived"
		>,
	) => {
		if ("path" in item)
			return (
				<FileRowItem key={key} item={item} index={index} painted={painted} />
			);
		return (
			<RowItem
				key={key}
				id={key}
				{...place}
				item={item}
				index={index}
				painted={painted}
				arrived={arrived.has(key)}
			/>
		);
	};
	if (!tree) {
		return banded(
			(index) => rank(items[index] as Row),
			items.length,
			keyAt,
			(index) => rowOf(items[index] as Row, keyAt(index), paintedAt(index)),
		);
	}
	// Each row of the tree reads its depth, fold and tab stop from its own
	// provider; the keys and focus its `treeitem`s send up move the stop and
	// fold the branches (the WAI-ARIA tree pattern, `treeMove`).
	const visible = treeRows(items, { key: keyOf, children: childrenOf }, folded);
	const stop = treeStop(visible, active);
	// A row carries its key (`data-key`), so a key finds the row's place over
	// `visible` when it is pressed, whichever rows the window mounts.
	const indexOf = (target: HTMLElement) => {
		const key = target.closest<HTMLElement>('[role="treeitem"]')?.dataset.key;
		return visible.findIndex((each) => each.key === key);
	};
	const nav: TreeNav = {
		onKeyDown: (event) => {
			// A key's target is the focused element, always an HTML one here.
			const target = event.target as HTMLElement;
			if (target.getAttribute("role") !== "treeitem") return;
			const move = treeMove(visible, indexOf(target), event.key);
			if (!move) return;
			event.preventDefault();
			if ("focus" in move) {
				// The tab stop moves first: the window keeps its row, mounted by
				// this render if it was not, and the focus follows it there.
				setActive(visible[move.focus]?.key);
				setWanted({ key: visible[move.focus]?.key as string });
			} else setFolded((keys) => folding(keys, move.fold, move.open));
		},
		onFocus: (event) => {
			// A focus event's target is the element that took focus, an HTML one here.
			const target = event.target as HTMLElement;
			if (!target.closest('[role="treeitem"]')) return;
			setActive(visible[indexOf(target)]?.key);
		},
	};
	return banded(
		(index) => {
			const each = visible[index] as (typeof visible)[number];
			return each.depth === 0 ? rank(each.item) : undefined;
		},
		visible.length,
		(index) => visible[index]?.key as string,
		(index) => {
			const each = visible[index] as (typeof visible)[number];
			return rowOf(each.item, each.key, undefined, {
				fold,
				depth: each.depth,
				size: each.size,
				place: each.place,
				open: each.branch ? each.open : undefined,
				tabbable: index === stop,
			});
		},
		nav,
		stop,
	);
}
