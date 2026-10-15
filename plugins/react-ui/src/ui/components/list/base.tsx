import { placeholderData } from "@fcalell/plugin-api/read";
import type { Drawn, Read } from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import type { RowLeading } from "@fcalell/ui-core/descriptors";
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
	type ReactNode,
	useState,
} from "react";
import type { Closed } from "../../lib/closed.ts";
import { MoreRow } from "../../lib/more.tsx";
import { ListedRoute, useRoute } from "../../lib/navigate.ts";
import { DefinitionRowBase } from "../definition-row/index.tsx";
import { FileRowBase } from "../file-row/index.tsx";
import { ListRowBase, type RowTree } from "../list-row/base.tsx";
import { MeterBase } from "../meter/index.tsx";
import type { LeadingSlot, ListKind } from "./index.tsx";

/** What a `Group` hands the List it frames; no app sets it, so it is outside `ListProps`. */
export interface ListInternal<T> {
	/** The List stands on a Group's card: no bleed and no box of its own, its rows the card's, the card's hairline once between rows. */
	framed?: boolean;
	/** The items as the List (or the Group framing it) subscribed to them: real, or the placeholder while the read waits, which paints `PAINT_ROWS` rows. */
	drawn: Drawn<readonly T[]>;
	/** The pages read the items come from, when it has pages: the List ends in its more row. */
	more?: Read<unknown>;
	/** The List is the painted next page of another: its rows alone, standing in that List's box. */
	tail?: boolean;
}

const STACK = "flex flex-col";
// A tree in a Group has no box of its own: it stands as the card's rows, the
// card's hairline falling once between them.
const GROUP_TREE = "contents divide-y divide-edge";
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

// The item's leading mark, of the kind the slot names.
function leadingOf<T>(slot: LeadingSlot<T>, item: T): RowLeading {
	if (slot.avatar !== undefined) return { avatar: slot.avatar(item) };
	if (slot.icon !== undefined) return { icon: slot.icon(item) };
	if (slot.check !== undefined) return { check: slot.check(item) };
	return { status: slot.status(item) };
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
	const { drawn } = props;
	const painted = drawn.painted;
	// Painted, `PAINT_ROWS` rows each over the placeholder; the data's depths
	// are not there, so a painted tree draws flat.
	const items: readonly T[] = drawn.painted
		? Array.from({ length: PAINT_ROWS }, () => drawn.value as T)
		: drawn.value;
	const children = painted ? undefined : props.row?.children;
	const framed = props.framed === true;
	// A slot run over an item; over a painted one, a slot that throws on the
	// placeholder paints as the item itself.
	const slot = <R,>(fn: (item: T) => R, item: T): R =>
		painted ? (painting(fn, item) as R) : fn(item);
	// A painted row's key is its place, the slots' keys being the placeholder's.
	const keyOf = (key: (item: T) => string, item: T, index: number) =>
		painted ? `waiting-${index}` : key(item);
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
	const frame = (rows: ReactNode, nav?: TreeNav) => {
		if (props.tail) return <ListedRoute value={at}>{rows}</ListedRoute>;
		// The more row ends the box, so the rows it paints stand at the box's
		// rhythm; a tree's box holds treeitems alone, so its row follows it.
		const list = props;
		const more =
			props.more && !painted ? (
				<MoreRow
					read={props.more}
					empty={items.length === 0}
					paint={() => (
						<ListBase
							{...list}
							more={undefined}
							tail={!nav}
							drawn={{ painted: true, value: placeholderData() }}
						/>
					)}
				/>
			) : null;
		let box = rows;
		if (framed && nav)
			box = (
				<div {...nav} className={GROUP_TREE}>
					{rows}
				</div>
			);
		else if (!framed)
			box = (
				<div {...nav} className={cn(nav ? LIST_TREE : flat, STACK)}>
					{rows}
					{nav ? null : more}
				</div>
			);
		return (
			<ListedRoute value={at}>
				{box}
				{nav || framed ? more : null}
			</ListedRoute>
		);
	};
	if (props.row) {
		const { row } = props;
		const { leading } = row;
		// A painted row opens as the loaded one would: it draws the chevron, and
		// builds no hit.
		const opens = row.href !== undefined || row.onOpen !== undefined;
		const rowOf = (item: T, index: number, tree?: RowTree) => (
			<ListRowBase
				key={keyOf(row.key, item, index)}
				change={row.change && slot(row.change, item)}
				leading={leading && slot((one) => leadingOf(leading, one), item)}
				title={slot(row.title, item)}
				meta={row.meta && slot(row.meta, item)}
				trailing={row.trailing && slot(row.trailing, item)}
				status={row.status && slot(row.status, item)}
				warning={row.warning && slot(row.warning, item)}
				lock={row.lock && slot(row.lock, item)}
				chip={row.chip && slot(row.chip, item)}
				entry={row.entry && slot(row.entry, item)}
				steps={row.steps && slot(row.steps, item)}
				dim={row.dim && slot(row.dim, item)}
				wrap={row.wrap}
				act={row.act && slot(row.act, item)}
				more={row.more && slot(row.more, item)}
				href={row.href && slot(row.href, item)}
				selected={row.selected && slot(row.selected, item)}
				onOpen={row.onOpen ? () => row.onOpen?.(item) : undefined}
				room={room}
				tree={tree}
				painted={painted}
				opens={opens}
				at={index}
			/>
		);
		const { more } = row;
		if (more !== undefined) {
			const every =
				children === undefined
					? items
					: treeRows(items, { key: row.key, children }, []).map(
							(each) => each.item,
						);
			room = every.some((item) => slot(more, item)?.length);
		}
		if (children === undefined)
			return frame(items.map((item, index) => rowOf(item, index)));
		// Each row of the tree reads its depth, fold and tab stop from its own
		// provider; the keys and focus its `treeitem`s send up move the stop and
		// fold the branches (the WAI-ARIA tree pattern, `treeMove`).
		const visible = treeRows(items, { key: row.key, children }, folded);
		const stop = treeStop(visible, active);
		const rowsOf = (list: HTMLElement) => [
			...list.querySelectorAll<HTMLElement>('[role="treeitem"]'),
		];
		const nav: TreeNav = {
			role: "tree",
			onKeyDown: (event) => {
				// A key's target is the focused element, always an HTML one here.
				const target = event.target as HTMLElement;
				if (target.getAttribute("role") !== "treeitem") return;
				const rows = rowsOf(event.currentTarget);
				const move = treeMove(visible, rows.indexOf(target), event.key);
				if (!move) return;
				event.preventDefault();
				if ("focus" in move) rows[move.focus]?.focus();
				else setFolded((keys) => folding(keys, move.fold, move.open));
			},
			onFocus: (event) => {
				// A focus event's target is the element that took focus, an HTML one here.
				const target = event.target as HTMLElement;
				const item = target.closest<HTMLElement>('[role="treeitem"]');
				if (!item) return;
				setActive(visible[rowsOf(event.currentTarget).indexOf(item)]?.key);
			},
		};
		return frame(
			visible.map((each, index) =>
				rowOf(each.item, index, {
					depth: each.depth,
					fold: each.branch
						? {
								open: each.open,
								onToggle: () => setFolded((keys) => toggled(keys, each.key)),
							}
						: undefined,
					tabbable: index === stop,
				}),
			),
			nav,
		);
	}
	if (props.meter) {
		const { meter } = props;
		return frame(
			items.map((item, index) => (
				<div key={keyOf(meter.key, item, index)} className={LIST_ITEM}>
					<MeterBase
						label={slot(meter.label, item)}
						value={slot(meter.value, item)}
						max={slot(meter.max, item)}
						mark={meter.mark && slot(meter.mark, item)}
						{...(meter.counts
							? { counts: slot(meter.counts, item) }
							: { meta: meter.meta && slot(meter.meta, item) })}
						painted={painted}
						at={index}
					/>
				</div>
			)),
		);
	}
	if (props.definition) {
		const { definition } = props;
		return frame(
			items.map((item, index) => {
				const locked = definition.locked && slot(definition.locked, item);
				const key = keyOf(definition.key, item, index);
				const shared = {
					change: definition.change && slot(definition.change, item),
					label: slot(definition.label, item),
					value: definition.value && slot(definition.value, item),
					copyable: definition.copyable,
					painted,
					at: index,
				};
				if (locked)
					return <DefinitionRowBase key={key} {...shared} locked={locked} />;
				return (
					<DefinitionRowBase
						key={key}
						{...shared}
						description={
							definition.description && slot(definition.description, item)
						}
						act={definition.act && slot(definition.act, item)}
						href={definition.href && slot(definition.href, item)}
						onOpen={
							definition.onOpen ? () => definition.onOpen?.(item) : undefined
						}
					/>
				);
			}),
		);
	}
	const { file } = props;
	return frame(
		items.map((item, index) => (
			<FileRowBase
				key={keyOf(file.key, item, index)}
				path={slot(file.path, item)}
				added={slot(file.added, item)}
				removed={slot(file.removed, item)}
				seen={file.seen && slot(file.seen, item)}
				change={file.change && slot(file.change, item)}
				chip={file.chip && slot(file.chip, item)}
				href={file.href && slot(file.href, item)}
				onOpen={file.onOpen ? () => file.onOpen?.(item) : undefined}
				painted={painted}
				at={index}
			/>
		)),
	);
}
