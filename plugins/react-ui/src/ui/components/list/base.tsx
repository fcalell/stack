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
import { PAINT_ROWS, painting } from "@fcalell/ui-core/paint";
import {
	LIST,
	LIST_DIVIDED,
	LIST_ITEM,
	LIST_TREE,
} from "@fcalell/ui-core/variants";
import {
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
import type { Closed } from "../../lib/closed.ts";
import { MoreRow } from "../../lib/more.tsx";
import { ListedRoute, useRoute } from "../../lib/navigate.ts";
import { Window } from "../../lib/window.tsx";
import { DefinitionItem } from "../definition-row/index.tsx";
import { FileItem } from "../file-row/index.tsx";
import { hasMore, ListRowItem } from "../list-row/base.tsx";
import { MeterItem } from "../meter/index.tsx";
import type { ListKind } from "./index.tsx";

/** What a `Group` hands the List it frames; no app sets it, so it is outside `ListProps`. */
export interface ListInternal<T> {
	/** The List stands on a Group's card: no bleed and no box of its own, its rows the card's, the card's hairline once between rows. */
	framed?: boolean;
	/** The items as the List (or the Group framing it) subscribed to them: real, or the placeholder while the read waits, which paints `PAINT_ROWS` rows. */
	drawn: Drawn<readonly T[]>;
	/** The pages read the items come from, when it has pages: the List ends in its more row. */
	more?: Read<unknown>;
	/** The element the rows stand in when a Group's card is it, which the rows window against; the List's own box otherwise. */
	box?: RefObject<HTMLElement | null>;
	/** The List is the painted next page of another: its rows alone, standing in that List's box. */
	tail?: boolean;
}

const STACK = "flex flex-col";
// A tree in a Group has no box of its own but the card: its rows stand in the
// tree's element on the card, the card's hairline falling once between them.
const GROUP_TREE = "flex flex-col divide-y divide-edge";
// A divided list's hairline is a pseudo-element on each row but the last, not
// the row's border, so it runs straight across the row's whole width.
const DIVIDER =
	"[&>:not(:last-child)]:relative [&>:not(:last-child)]:after:absolute [&>:not(:last-child)]:after:inset-x-0 [&>:not(:last-child)]:after:bottom-0 [&>:not(:last-child)]:after:h-px [&>:not(:last-child)]:after:bg-edge";

// A tree's keyboard: the container's role and the keys and focus its rows'
// `treeitem` stops send up.
interface TreeNav {
	role: "tree";
	onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
	onFocus: (event: FocusEvent<HTMLElement>) => void;
}

/** The List every List and a Group's `list` draw. Outside the package's exports: `framed` and `drawn` are the List's and the Group's alone. */
export function ListBase<T, V extends string | null = string>(
	props: Closed & ListKind<T, V> & ListInternal<T>,
) {
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
	// The tree's element, which holds its rows: its own box, or on a Group's card
	// a box inside it.
	const wrap = useRef<HTMLDivElement>(null);
	const treeBox = props.framed === true ? wrap : own;
	// The visible row a key is moving the focus to; it stands mounted by then,
	// the window keeping the tab stop's row, and takes the focus.
	const [wanted, setWanted] = useState<{ index: number }>();
	// biome-ignore lint/correctness/useExhaustiveDependencies: only a new `wanted` is a move to focus
	useLayoutEffect(() => {
		if (!wanted) return;
		treeBox.current
			?.querySelector<HTMLElement>(`[data-index="${wanted.index}"]`)
			?.focus();
	}, [wanted]);
	const { drawn } = props;
	const painted = drawn.painted;
	// Painted, `PAINT_ROWS` rows each over the placeholder; the data's depths
	// are not there, so a painted tree draws flat.
	const items: readonly T[] = drawn.painted
		? Array.from({ length: PAINT_ROWS }, () => drawn.value as T)
		: drawn.value;
	const children = painted ? undefined : props.row?.children;
	const framed = props.framed === true;
	// A painted row's key is its place, the slots' keys being the placeholder's.
	const keyAt = (key: (item: T) => string, index: number) =>
		painted ? `waiting-${index}` : key(items[index] as T);
	// On a Group's card (framed) the card is the rows' box: they stand in it
	// directly, so its hairline falls once between them.
	// The rows read the route the List read once, through `ListedRoute`.
	// A tree's rows abut, so its rails run unbroken; two-line rows (a map with
	// a `meta`) abut under a hairline.
	const flat =
		props.row?.meta !== undefined && children === undefined
			? cn(LIST_DIVIDED, DIVIDER)
			: LIST;
	// Whether a row of the loaded list has a more act: the rows without one then
	// keep its square, so every row's end stands at one x.
	let room = false;
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
		const list = props;
		const more =
			props.more && !painted ? (
				<MoreRow
					read={props.more}
					empty={items.length === 0}
					inset={framed || !nav}
					paint={() => (
						<ListBase
							{...list}
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
		let stand: ReactNode = shown;
		if (framed && nav)
			stand = (
				<div {...nav} ref={wrap} className={GROUP_TREE}>
					{shown}
				</div>
			);
		else if (!framed)
			stand = (
				<div {...nav} ref={own} className={cn(nav ? LIST_TREE : flat, STACK)}>
					{shown}
					{nav ? null : more}
				</div>
			);
		return (
			<ListedRoute value={at}>
				{stand}
				{nav || framed ? more : null}
			</ListedRoute>
		);
	};
	if (props.row) {
		const { row } = props;
		const { more } = row;
		if (more !== undefined) {
			const every =
				children === undefined
					? items
					: treeRows(items, { key: row.key, children }, []).map(
							(each) => each.item,
						);
			room = every.some((item) =>
				hasMore(
					painted
						? (painting(more, item) as ReturnType<typeof more>)
						: more(item),
				),
			);
		}
		const keyOf = (index: number) => keyAt(row.key, index);
		if (children === undefined)
			return frame(items.length, keyOf, (index) => (
				<ListRowItem
					key={keyOf(index)}
					item={items[index] as T}
					index={index}
					row={row}
					painted={painted}
					room={room}
				/>
			));
		// Each row of the tree reads its depth, fold and tab stop from its own
		// provider; the keys and focus its `treeitem`s send up move the stop and
		// fold the branches (the WAI-ARIA tree pattern, `treeMove`).
		const visible = treeRows(items, { key: row.key, children }, folded);
		const stop = treeStop(visible, active);
		// A row knows its place among the visible ones (`data-index`), so a key
		// moves by index over `visible`, whichever rows the window mounts.
		const indexOf = (target: HTMLElement) =>
			Number(target.closest<HTMLElement>('[role="treeitem"]')?.dataset.index);
		const nav: TreeNav = {
			role: "tree",
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
					setWanted({ index: move.focus });
				} else setFolded((keys) => folding(keys, move.fold, move.open));
			},
			onFocus: (event) => {
				// A focus event's target is the element that took focus, an HTML one here.
				const target = event.target as HTMLElement;
				if (!target.closest('[role="treeitem"]')) return;
				setActive(visible[indexOf(target)]?.key);
			},
		};
		return frame(
			visible.length,
			(index) => visible[index]?.key as string,
			(index) => {
				const each = visible[index] as (typeof visible)[number];
				return (
					<ListRowItem
						key={each.key}
						item={each.item}
						index={index}
						row={row}
						painted={painted}
						room={room}
						fold={fold}
						depth={each.depth}
						size={each.size}
						place={each.place}
						open={each.branch ? each.open : undefined}
						tabbable={index === stop}
					/>
				);
			},
			nav,
			stop,
		);
	}
	if (props.meter) {
		const { meter } = props;
		const keyOf = (index: number) => keyAt(meter.key, index);
		return frame(items.length, keyOf, (index) => (
			<div key={keyOf(index)} className={LIST_ITEM}>
				<MeterItem
					item={items[index] as T}
					index={index}
					meter={meter}
					painted={painted}
				/>
			</div>
		));
	}
	if (props.definition) {
		const { definition } = props;
		const keyOf = (index: number) => keyAt(definition.key, index);
		return frame(items.length, keyOf, (index) => (
			<DefinitionItem
				key={keyOf(index)}
				item={items[index] as T}
				index={index}
				definition={definition}
				painted={painted}
			/>
		));
	}
	const { file } = props;
	const keyOf = (index: number) => keyAt(file.key, index);
	return frame(items.length, keyOf, (index) => (
		<FileItem
			key={keyOf(index)}
			item={items[index] as T}
			index={index}
			file={file}
			painted={painted}
		/>
	));
}
