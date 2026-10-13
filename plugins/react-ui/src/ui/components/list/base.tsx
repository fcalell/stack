import { cn } from "@fcalell/ui-core/cn";
import type { RowLeading } from "@fcalell/ui-core/descriptors";
import {
	definitionShape,
	fileShape,
	folding,
	listBusy,
	listState,
	meterShape,
	retryOf,
	rowShape,
	toggled,
	treeMove,
	treeRows,
	treeStop,
	WAITING_ROWS,
} from "@fcalell/ui-core/list-state";
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
	use,
	useId,
	useState,
} from "react";
import { EmptyBase } from "../../lib/empty.tsx";
import { LoadingContext } from "../../lib/loading.ts";
import { ListedRoute, useRoute } from "../../lib/navigate.ts";
import { useWords } from "../../lib/words.tsx";
import { DefinitionRow } from "../definition-row/index.tsx";
import { DefinitionWait } from "../definition-row/wait.tsx";
import { FileRow } from "../file-row/index.tsx";
import { FileWait } from "../file-row/wait.tsx";
import { ListRowBase, type RowTree } from "../list-row/base.tsx";
import { RowWait } from "../list-row/wait.tsx";
import { Meter } from "../meter/index.tsx";
import { MeterWait } from "../meter/wait.tsx";
import { MissingBase } from "../missing/base.tsx";
import type { LeadingSlot, ListProps } from "./index.tsx";

/** What a `Group` hands the List it frames; no app sets it, so it is outside `ListProps`. */
export interface ListInternal {
	/** The List stands on a Group's card: no bleed and no box of its own, its rows and forms the card's, the card's hairline once between rows. */
	framed?: boolean;
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
const WAITING = Array.from({ length: WAITING_ROWS }, (_, index) => index);

// The item's leading mark, of the kind the slot names.
function leadingOf<T>(slot: LeadingSlot<T>, item: T): RowLeading {
	if (slot.avatar !== undefined) return { avatar: slot.avatar(item) };
	if (slot.icon !== undefined) return { icon: slot.icon(item) };
	if (slot.check !== undefined) return { check: slot.check(item) };
	return { status: slot.status(item) };
}

/** The List every List and a Group's `list` draw. Outside the package's exports: `framed` is the Group's alone. */
export function ListBase<T, V extends string | null = string>(
	props: ListProps<T, V> & ListInternal,
) {
	const words = useWords();
	const at = useRoute();
	// The list's identity: its waiting rows take their bars' widths from it.
	const list = useId();
	// The keys of the tree's folded branches; every branch starts open.
	const [folded, setFolded] = useState<readonly string[]>([]);
	// The key of the tree's row that holds its one tab stop.
	const [active, setActive] = useState<string>();
	const input = {
		query: props.query,
		items: props.items,
		loading: props.loading,
		sectionLoading: use(LoadingContext),
		hasEmpty: props.empty !== undefined,
	};
	const busy = listBusy(input);
	const framed = props.framed === true;
	// A failed, missing or empty form stands on the Group's card when framed.
	const fit = framed ? "group" : "frame";
	const state = listState(input);
	// Items given while the list loads (a row map with a trailing slot, no tree):
	// the rows stand as loaded, their trailing values waiting.
	const known =
		state === "pending" &&
		props.loading === true &&
		props.row?.trailing !== undefined &&
		props.row.children === undefined &&
		(props.items?.length ?? 0) > 0;
	// On a Group's card (framed) the card is the rows' box: they stand in it
	// directly, so its hairline falls once between them.
	// The rows read the route the List read once, through `ListedRoute`.
	// A tree's rows abut, so its rails run unbroken; two-line rows (a map with
	// a `meta`) abut under a hairline.
	const flat =
		props.row?.meta !== undefined && props.row.children === undefined
			? cn(LIST_DIVIDED, DIVIDER)
			: LIST;
	// Whether a row of the loaded list has a more act: the rows without one then
	// keep its square, so every row's end stands at one x.
	let room = false;
	const frame = (rows: ReactNode, nav?: TreeNav, abut = nav !== undefined) => {
		let box = rows;
		if (framed && nav)
			box = (
				<div {...nav} className={GROUP_TREE}>
					{rows}
				</div>
			);
		else if (!framed)
			box = (
				<div
					{...nav}
					aria-busy={busy || undefined}
					className={cn(abut ? LIST_TREE : flat, STACK)}
				>
					{rows}
				</div>
			);
		return <ListedRoute value={at}>{box}</ListedRoute>;
	};
	if (state === "pending" && !known) {
		return frame(
			WAITING.map((index) => {
				if (props.row)
					return (
						<RowWait
							key={index}
							shape={rowShape(props.row)}
							list={list}
							index={index}
						/>
					);
				if (props.meter)
					return (
						<div key={index} className={LIST_ITEM}>
							<MeterWait {...meterShape(props.meter)} />
						</div>
					);
				if (props.definition)
					return (
						<DefinitionWait
							key={index}
							shape={definitionShape(props.definition)}
							index={index}
						/>
					);
				return <FileWait key={index} {...fileShape(props.file)} />;
			}),
			undefined,
			props.row?.children !== undefined,
		);
	}
	if (state === "missing") return <MissingBase fit={fit} />;
	if (state === "failed" && props.query !== undefined) {
		return (
			<EmptyBase
				fit={fit}
				tone="failed"
				sentence={props.sentence}
				act={{ label: words.retry, onAct: retryOf(props.query) }}
			/>
		);
	}
	if (state === "empty" && props.empty)
		return <EmptyBase fit={fit} tone="rest" {...props.empty} />;
	const items = (props.query ? props.query.data : props.items) ?? [];
	if (props.row) {
		const { row } = props;
		const rowOf = (item: T, tree?: RowTree) => (
			<ListRowBase
				key={row.key(item)}
				change={row.change?.(item)}
				leading={row.leading && leadingOf(row.leading, item)}
				title={row.title(item)}
				meta={row.meta?.(item)}
				trailing={known ? undefined : row.trailing?.(item)}
				status={row.status?.(item)}
				warning={row.warning?.(item)}
				lock={row.lock?.(item)}
				chip={row.chip?.(item)}
				entry={row.entry?.(item)}
				steps={row.steps?.(item)}
				dim={row.dim?.(item)}
				wrap={row.wrap}
				act={row.act?.(item)}
				more={row.more?.(item)}
				href={row.href?.(item)}
				selected={row.selected?.(item)}
				onOpen={row.onOpen ? () => row.onOpen?.(item) : undefined}
				waits={known}
				room={room}
				tree={tree}
			/>
		);
		const { children } = row;
		const { more } = row;
		if (more !== undefined) {
			const every =
				children === undefined
					? items
					: treeRows(items, { key: row.key, children }, []).map(
							(each) => each.item,
						);
			room = every.some((item) => more(item)?.length);
		}
		if (children === undefined) return frame(items.map((item) => rowOf(item)));
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
			visible.map((each, at) =>
				rowOf(each.item, {
					depth: each.depth,
					fold: each.branch
						? {
								open: each.open,
								onToggle: () => setFolded((keys) => toggled(keys, each.key)),
							}
						: undefined,
					tabbable: at === stop,
				}),
			),
			nav,
		);
	}
	if (props.meter) {
		const { meter } = props;
		return frame(
			items.map((item) => (
				<div key={meter.key(item)} className={LIST_ITEM}>
					<Meter
						label={meter.label(item)}
						value={meter.value(item)}
						max={meter.max(item)}
						mark={meter.mark?.(item)}
						{...(meter.counts
							? { counts: meter.counts(item) }
							: { meta: meter.meta?.(item) })}
					/>
				</div>
			)),
		);
	}
	if (props.definition) {
		const { definition } = props;
		return frame(
			items.map((item) => {
				const locked = definition.locked?.(item);
				const key = definition.key(item);
				const shared = {
					change: definition.change?.(item),
					label: definition.label(item),
					value: definition.value?.(item),
					copyable: definition.copyable,
				};
				if (locked)
					return <DefinitionRow key={key} {...shared} locked={locked} />;
				return (
					<DefinitionRow
						key={key}
						{...shared}
						description={definition.description?.(item)}
						act={definition.act?.(item)}
						href={definition.href?.(item)}
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
		items.map((item) => (
			<FileRow
				key={file.key(item)}
				path={file.path(item)}
				added={file.added(item)}
				removed={file.removed(item)}
				seen={file.seen?.(item)}
				change={file.change?.(item)}
				chip={file.chip?.(item)}
				href={file.href?.(item)}
				onOpen={file.onOpen ? () => file.onOpen?.(item) : undefined}
			/>
		)),
	);
}
