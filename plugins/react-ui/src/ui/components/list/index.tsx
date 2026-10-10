import { cn } from "@fcalell/ui-core/cn";
import type {
	Act,
	ChangeKind,
	ChipMark,
	CountLink,
	IconAct,
	Lock,
	MenuItem,
	MeterMark,
	RowEntry,
	RowLeading,
	RowPart,
	RowStatus,
	RowTitle,
	RowTrailing,
	StatusMark,
} from "@fcalell/ui-core/descriptors";
import {
	definitionShape,
	fileShape,
	folding,
	listBusy,
	listGround,
	listState,
	meterShape,
	retryOf,
	rowShape,
	toggled,
	treeMove,
	treeRows,
	treeStop,
} from "@fcalell/ui-core/list-state";
import { LIST, LIST_DIVIDED, LIST_TREE } from "@fcalell/ui-core/variants";
import {
	type FocusEvent,
	type KeyboardEvent,
	type ReactNode,
	use,
	useState,
} from "react";
import { ActsRoom } from "../../lib/acts-room.ts";
import type { Closed } from "../../lib/closed.ts";
import { useGroupPart } from "../../lib/group.ts";
import { LoadingContext } from "../../lib/loading.ts";
import { ListedRoute, useRoute } from "../../lib/navigate.ts";
import { SectionContext } from "../../lib/section.ts";
import { TrailingWait } from "../../lib/trailing-wait.ts";
import { TreeContext } from "../../lib/tree.ts";
import { useWords } from "../../lib/words.tsx";
import {
	DefinitionRow,
	type DefinitionValue,
} from "../definition-row/index.tsx";
import { DefinitionWait } from "../definition-row/wait.tsx";
import { EmptyStateBase } from "../empty-state/base.tsx";
import type { EmptyStateProps } from "../empty-state/index.tsx";
import { FileRow } from "../file-row/index.tsx";
import { FileWait } from "../file-row/wait.tsx";
import { ListRow } from "../list-row/index.tsx";
import { RowWait, WAITING_ROWS } from "../list-row/wait.tsx";
import { Meter } from "../meter/index.tsx";
import { MeterWait } from "../meter/wait.tsx";
import { Missing } from "../missing/index.tsx";
import type { QueryLike } from "../query-boundary/index.tsx";

const STACK = "flex flex-col";
// A tree in a Group has no box of its own: it stands as the card's rows, the
// card's hairline falling once between them.
const GROUP_TREE = "contents divide-y divide-edge";
// A divided list's hairline is a pseudo-element on each row but the last, not
// the row's border, so it runs straight across the row's whole width under the
// row's rounded wash.
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

/** A list's leading slot: one key naming the kind every row leads with, its value from the item. */
export type LeadingSlot<T> =
	| {
			avatar: (item: T) => Extract<RowLeading, { avatar: unknown }>["avatar"];
			icon?: never;
			status?: never;
			check?: never;
	  }
	| {
			icon: (item: T) => Extract<RowLeading, { icon: unknown }>["icon"];
			avatar?: never;
			status?: never;
			check?: never;
	  }
	| {
			status: (item: T) => Extract<RowLeading, { status: unknown }>["status"];
			avatar?: never;
			icon?: never;
			check?: never;
	  }
	| {
			check: (item: T) => Extract<RowLeading, { check: unknown }>["check"];
			avatar?: never;
			icon?: never;
			status?: never;
	  };

// The item's leading mark, of the kind the slot names.
function leadingOf<T>(slot: LeadingSlot<T>, item: T): RowLeading {
	if (slot.avatar !== undefined) return { avatar: slot.avatar(item) };
	if (slot.icon !== undefined) return { icon: slot.icon(item) };
	if (slot.check !== undefined) return { check: slot.check(item) };
	return { status: slot.status(item) };
}

/** One function per `ListRow` slot, each called with a loaded item; the slots given are the shape the waiting rows draw. */
export interface RowSlots<T, V extends string | null = string> {
	/** The item's React key, unique in the list. */
	key: (item: T) => string;
	/** The row's title (a short phrase; truncates at its end, wraps whole while `wrap`). */
	title: (item: T) => RowTitle;
	/** The item's children, which makes the list a tree: they draw one level in under it, and its fold act folds them (open by default, the list holds the state). Every item's `key` is unique across the whole tree. */
	children?: (item: T) => readonly T[] | undefined;
	/** Where the row stands in a change set, its change mark; a row of the set that is untouched is `unchanged`. */
	change?: (item: T) => ChangeKind | undefined;
	/** The rows' leading mark, one kind for every row of the list. */
	leading?: LeadingSlot<T>;
	/** The row's meta line (each part a short phrase; one line, the later parts truncating first). */
	meta?: (item: T) => readonly RowPart[] | undefined;
	/** The row's trailing value or pick. */
	trailing?: (item: T) => RowTrailing<V> | undefined;
	/** The row's status mark. */
	status?: (item: T) => RowStatus | undefined;
	/** What is wrong with the row, a warning mark (a short phrase; truncates). */
	warning?: (item: T) => string | undefined;
	/** What the row holds, a lock mark (a short phrase; truncates). */
	lock?: (item: T) => string | undefined;
	/** The row's chip mark. */
	chip?: (item: T) => ChipMark | undefined;
	/** The row's input and its act, in the meta line's place; the waiting rows draw it in place of the meta line. */
	entry?: (item: T) => RowEntry | undefined;
	/** The steps of the work the row's act pends on, in the meta line's place; the waiting rows draw the meta line. */
	steps?: (item: T) => readonly StatusMark[] | undefined;
	/** Whether the row stands off a highlighted path. */
	dim?: (item: T) => boolean | undefined;
	/** Whether every row's title wraps whole (a list of notes); one value for the list, so the waiting rows draw it. */
	wrap?: boolean;
	/** The row's labelled act at its end. */
	act?: (item: T) => Act | undefined;
	/** The row's acts. */
	more?: (item: T) => readonly MenuItem[] | undefined;
	/** Where the row goes. */
	href?: (item: T) => string | undefined;
	/** Whether the row is the open record, washed as selected whatever its `href`. */
	selected?: (item: T) => boolean | undefined;
	/** Opens the item. */
	onOpen?: (item: T) => void;
}

/** One function per `FileRow` slot, each called with a loaded item. */
export interface FileSlots<T> {
	/** The item's React key, unique in the list. */
	key: (item: T) => string;
	/** The file's path (a path: the directory gives way first, then the name's middle). */
	path: (item: T) => string;
	/** Lines added. */
	added: (item: T) => number;
	/** Lines removed. */
	removed: (item: T) => number;
	/** Whether the reviewer has seen the file. */
	seen?: (item: T) => boolean | undefined;
	/** Where the file stands in a change set, its change mark. */
	change?: (item: T) => ChangeKind | undefined;
	/** The file's chip mark. */
	chip?: (item: T) => ChipMark | undefined;
	/** Where the row goes. */
	href?: (item: T) => string | undefined;
	/** Opens the file. */
	onOpen?: (item: T) => void;
}

interface MeterSlotsBase<T> {
	/** The item's React key, unique in the list. */
	key: (item: T) => string;
	/** What is measured (a short phrase; truncates). */
	label: (item: T) => string;
	/** How much is used. */
	value: (item: T) => number;
	/** The limit. */
	max: (item: T) => number;
	/** The tick across the bar: the meter's near point. */
	mark?: (item: T) => MeterMark | undefined;
}

/** One function per `Meter` slot, each called with a loaded item; a declared `meta` or `counts` is the line the waiting meters draw, never both. */
export type MeterSlots<T> = MeterSlotsBase<T> &
	(
		| {
				/** The line under the bar (a sentence; wraps). */
				meta?: (item: T) => string | undefined;
				counts?: never;
		  }
		| {
				/** The line under the bar as links: counts that lead to their lists. */
				counts: (item: T) => readonly CountLink[];
				meta?: never;
		  }
	);

interface DefinitionSlotsBase<T> {
	/** The item's React key, unique in the list. */
	key: (item: T) => string;
	/** What the fact is (a short phrase; wraps to the room its value leaves). */
	label: (item: T) => string;
	/** The fact: a string (a word or a short phrase; truncates at its end, an identifier of one word over eight characters cuts in its middle), a status, or a control that changes it in place. */
	value?: (item: T) => DefinitionValue | undefined;
	/** Where the fact stands in a change set, its change mark. */
	change?: (item: T) => ChangeKind | undefined;
	/** Whether every value is copied whole (identifiers): drawn in the code role with a copy act; one value for the list, so the waiting rows hold the act's square. */
	copyable?: boolean;
}

/** One function per `DefinitionRow` slot, each called with a loaded item; a declared `description`, `act`, `href` or `onOpen` is the row's editable form, a declared `locked` its locked one, never both. */
export type DefinitionSlots<T> = DefinitionSlotsBase<T> &
	(
		| {
				locked?: never;
				/** Under the label and the value (a sentence; wraps). */
				description?: (item: T) => string | undefined;
				/** The row's one icon act at its end. */
				act?: (item: T) => IconAct | undefined;
				/** Where the row goes. */
				href?: (item: T) => string | undefined;
				/** Opens what the row names. */
				onOpen?: (item: T) => void;
		  }
		| {
				/** The value outside its editable context: a lock after it and the reason under it. */
				locked: (item: T) => Lock | undefined;
				description?: never;
				act?: never;
				href?: never;
				onOpen?: never;
		  }
	);

/** What an empty list draws: an EmptyState's mark, title, sentence and the act that fills the list. */
export type ListEmpty = Pick<
	EmptyStateProps,
	"icon" | "title" | "sentence" | "act"
>;

/** Where a list's items come from. */
export type ListSource<T> =
	| {
			/** The query whose items the rows draw. */
			query: QueryLike<readonly T[]>;
			/** What failed to load, over the retry act (a sentence; wraps). */
			sentence: string;
			/** What the list draws when the query answers with no item. */
			empty: ListEmpty;
			items?: never;
			loading?: never;
	  }
	| {
			/** The items the rows draw. */
			items: readonly T[];
			/** The items are on their way (a compound body's loading form): the rows wait. Given items and a `row` map with a `trailing` slot (no tree), the rows stand as loaded and only their trailing values wait. */
			loading?: boolean;
			/** What the list draws with no item; without it an empty list draws nothing. */
			empty?: ListEmpty;
			query?: never;
			sentence?: never;
	  };

/** The one kind of row a list holds. */
type ListKind<T, V extends string | null> =
	| {
			/** The `ListRow` slots. */
			row: RowSlots<T, V>;
			file?: never;
			meter?: never;
			definition?: never;
	  }
	| {
			/** The `FileRow` slots. */
			file: FileSlots<T>;
			row?: never;
			meter?: never;
			definition?: never;
	  }
	| {
			/** The `Meter` slots. */
			meter: MeterSlots<T>;
			row?: never;
			file?: never;
			definition?: never;
	  }
	| {
			/** The `DefinitionRow` slots; the list stands in a Group. */
			definition: DefinitionSlots<T>;
			row?: never;
			file?: never;
			meter?: never;
	  };

/** A collection's rows: from a query or from items, each a ListRow, a FileRow, a Meter or a DefinitionRow. */
export type ListProps<T = unknown, V extends string | null = string> = Closed &
	ListSource<T> &
	ListKind<T, V>;

/** Rows on the ground at the rows rhythm, with no box and no hairlines: a feed. It draws its collection's four states: while its query is pending, `loading` is set or a loading Section around it waits, waiting rows stand in the slots its map declares (a Section around a pending query busy, its count waiting); a query that answers not found draws the rest EmptyState saying it no longer exists with Back, never Retry; a failed query draws the failed EmptyState with `sentence` and Retry; no item draws `empty`; then one row per item. In a Group its rows, waiting rows and failed, missing and empty forms stand on the card, the hairline once between rows; a `definition` list (facts from data: DefinitionRows) stands in a Group, and adds no count to a Section's head. */
export function List<T, V extends string | null = string>(
	props: ListProps<T, V>,
) {
	const words = useWords();
	const at = useRoute();
	// The keys of the tree's folded branches; every branch starts open.
	const [folded, setFolded] = useState<readonly string[]>([]);
	// The key of the tree's row that holds its one tab stop.
	const [active, setActive] = useState<string>();
	const base = {
		query: props.query,
		items: props.items,
		loading: props.loading,
		sectionLoading: use(LoadingContext),
		inSection: false,
		hasEmpty: props.empty !== undefined,
	};
	const input = { ...base, inSection: use(SectionContext) };
	const busy = listBusy(input);
	const ground = listGround(useGroupPart());
	const state = listState(input);
	// Items given while the list loads (a row map with a trailing slot, no tree):
	// the rows stand as loaded, their trailing values waiting.
	const known =
		state === "pending" &&
		props.loading === true &&
		props.row?.trailing !== undefined &&
		props.row.children === undefined &&
		(props.items?.length ?? 0) > 0;
	// In a Group the card is the rows' box: they stand in it directly, so its
	// hairline falls once between them.
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
		if (ground === "group" && nav)
			box = (
				<div {...nav} className={GROUP_TREE}>
					{rows}
				</div>
			);
		else if (ground !== "group")
			box = (
				<div
					{...nav}
					aria-busy={busy || undefined}
					className={cn(abut ? LIST_TREE : flat, STACK)}
				>
					{rows}
				</div>
			);
		return (
			<ListedRoute value={at}>
				<ActsRoom value={room}>{box}</ActsRoom>
			</ListedRoute>
		);
	};
	if (state === "pending" && !known) {
		return frame(
			WAITING.map((index) => {
				if (props.row)
					return (
						<RowWait key={index} shape={rowShape(props.row)} index={index} />
					);
				if (props.meter)
					return <MeterWait key={index} {...meterShape(props.meter)} />;
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
	if (state === "missing") return <Missing />;
	if (state === "failed" && props.query !== undefined) {
		return (
			<EmptyStateBase
				tone="failed"
				sentence={props.sentence}
				act={{ label: words.retry, onAct: retryOf(props.query) }}
			/>
		);
	}
	if (state === "empty" && props.empty)
		return <EmptyStateBase tone="rest" {...props.empty} />;
	const items = (props.query ? props.query.data : props.items) ?? [];
	if (props.row) {
		const { row } = props;
		const rowOf = (item: T) => (
			<ListRow
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
		if (children === undefined)
			return frame(
				<TrailingWait value={known}>{items.map(rowOf)}</TrailingWait>,
			);
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
			visible.map((each, at) => (
				<TreeContext
					key={each.key}
					value={{
						depth: each.depth,
						fold: each.branch
							? {
									open: each.open,
									onToggle: () => setFolded((keys) => toggled(keys, each.key)),
								}
							: undefined,
						tabbable: at === stop,
					}}
				>
					{rowOf(each.item)}
				</TreeContext>
			)),
			nav,
		);
	}
	if (props.meter) {
		const { meter } = props;
		return frame(
			items.map((item) => (
				<Meter
					key={meter.key(item)}
					label={meter.label(item)}
					value={meter.value(item)}
					max={meter.max(item)}
					mark={meter.mark?.(item)}
					{...(meter.counts
						? { counts: meter.counts(item) }
						: { meta: meter.meta?.(item) })}
				/>
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
