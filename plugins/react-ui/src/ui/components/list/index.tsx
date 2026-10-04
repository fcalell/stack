import { cn } from "@fcalell/ui-core/cn";
import type {
	ChipMark,
	MenuItem,
	Part,
	RowLeading,
	RowTrailing,
	StatusMark,
} from "@fcalell/ui-core/descriptors";
import {
	listBusy,
	listCount,
	listGround,
	listState,
	listWaits,
	retryOf,
	rowShape,
} from "@fcalell/ui-core/list-state";
import { LIST } from "@fcalell/ui-core/variants";
import { type ReactNode, use } from "react";
import type { Closed } from "../../lib/closed.ts";
import { useGroupList } from "../../lib/group.ts";
import { LoadingContext } from "../../lib/loading.ts";
import {
	useSectionCount,
	useSectionRows,
	useSectionWait,
} from "../../lib/section.ts";
import { useWords } from "../../lib/words.tsx";
import { EmptyStateBase } from "../empty-state/base.tsx";
import type { EmptyStateProps } from "../empty-state/index.tsx";
import { FileRow } from "../file-row/index.tsx";
import { FileWait } from "../file-row/wait.tsx";
import { ListRow } from "../list-row/index.tsx";
import { RowWait, WAITING_ROWS } from "../list-row/wait.tsx";
import type { QueryLike } from "../query-boundary/index.tsx";

const STACK = "flex flex-col";
const WAITING = Array.from({ length: WAITING_ROWS }, (_, index) => index);

/** A list's leading slot: one key naming the kind every row leads with, its value from the item. */
export type LeadingSlot<T> =
	| {
			avatar: (item: T) => Extract<RowLeading, { avatar: unknown }>["avatar"];
			icon?: never;
			status?: never;
	  }
	| {
			icon: (item: T) => Extract<RowLeading, { icon: unknown }>["icon"];
			avatar?: never;
			status?: never;
	  }
	| {
			status: (item: T) => Extract<RowLeading, { status: unknown }>["status"];
			avatar?: never;
			icon?: never;
	  };

// The item's leading mark, of the kind the slot names.
function leadingOf<T>(slot: LeadingSlot<T>, item: T): RowLeading {
	if (slot.avatar !== undefined) return { avatar: slot.avatar(item) };
	if (slot.icon !== undefined) return { icon: slot.icon(item) };
	return { status: slot.status(item) };
}

/** One function per `ListRow` slot, each called with a loaded item; the slots given are the shape the waiting rows draw. */
export interface RowSlots<T, V extends string | null = string> {
	/** The item's React key, unique in the list. */
	key: (item: T) => string;
	/** The row's title. */
	title: (item: T) => Part;
	/** The rows' leading mark, one kind for every row of the list. */
	leading?: LeadingSlot<T>;
	/** The row's meta line. */
	meta?: (item: T) => readonly Part[] | undefined;
	/** The row's trailing value or pick. */
	trailing?: (item: T) => RowTrailing<V> | undefined;
	/** The row's status mark. */
	status?: (item: T) => StatusMark | undefined;
	/** The row's chip mark. */
	chip?: (item: T) => ChipMark | undefined;
	/** The row's acts. */
	more?: (item: T) => readonly MenuItem[] | undefined;
	/** Where the row goes. */
	href?: (item: T) => string | undefined;
	/** Opens the item. */
	onOpen?: (item: T) => void;
}

/** One function per `FileRow` slot, each called with a loaded item. */
export interface FileSlots<T> {
	/** The item's React key, unique in the list. */
	key: (item: T) => string;
	/** The file's path. */
	path: (item: T) => string;
	/** Lines added. */
	added: (item: T) => number;
	/** Lines removed. */
	removed: (item: T) => number;
	/** Whether the reviewer has seen the file. */
	seen?: (item: T) => boolean | undefined;
	/** Where the row goes. */
	href?: (item: T) => string | undefined;
	/** Opens the file. */
	onOpen?: (item: T) => void;
}

/** What an empty list draws: an EmptyState's mark, title, sentence and the act that fills the list. */
export type ListEmpty = Pick<
	EmptyStateProps,
	"icon" | "title" | "sentence" | "act"
>;

/** Where a list's items come from. */
type ListSource<T> =
	| {
			/** The query whose items the rows draw. */
			query: QueryLike<readonly T[]>;
			/** What failed to load, over the retry act. */
			sentence: string;
			/** What the list draws when the query answers with no item. */
			empty: ListEmpty;
			items?: never;
			loading?: never;
	  }
	| {
			/** The items the rows draw. */
			items: readonly T[];
			/** The items are on their way (a compound body's loading form): the rows wait. */
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
	  }
	| {
			/** The `FileRow` slots. */
			file: FileSlots<T>;
			row?: never;
	  };

/** A collection's rows: from a query or from items, each a ListRow or a FileRow. */
export type ListProps<T = unknown, V extends string | null = string> = Closed &
	ListSource<T> &
	ListKind<T, V>;

/** Rows on the ground at the rows rhythm, with no box and no hairlines: a feed. It draws its collection's four states: while its query is pending, `loading` is set or a loading Section around it waits, waiting rows stand in the slots its map declares (a Section around a pending query busy, its count waiting); a failed query draws the failed EmptyState with `sentence` and Retry; no item draws `empty`; then one row per item. In a Group its rows, waiting rows and failed and empty forms stand on the card, the hairline once between rows. */
export function List<T, V extends string | null = string>(
	props: ListProps<T, V>,
) {
	const words = useWords();
	const base = {
		query: props.query,
		items: props.items,
		loading: props.loading,
		sectionLoading: use(LoadingContext),
		inSection: false,
		hasEmpty: props.empty !== undefined,
	};
	const input = { ...base, inSection: useSectionWait(listWaits(base)) };
	useSectionCount(listCount(input));
	useSectionRows();
	const busy = listBusy(input);
	const ground = listGround(useGroupList(busy));
	const state = listState(input);
	// In a Group the card is the rows' box: they stand in it directly, so its
	// hairline falls once between them.
	const frame = (rows: ReactNode) =>
		ground === "group" ? (
			rows
		) : (
			<div aria-busy={busy || undefined} className={cn(LIST, STACK)}>
				{rows}
			</div>
		);
	if (state === "pending") {
		const shape = props.row ? rowShape(props.row) : undefined;
		return frame(
			WAITING.map((index) =>
				shape ? (
					<RowWait key={index} shape={shape} index={index} />
				) : (
					<FileWait key={index} busy={false} />
				),
			),
		);
	}
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
		return frame(
			items.map((item) => (
				<ListRow
					key={row.key(item)}
					leading={row.leading && leadingOf(row.leading, item)}
					title={row.title(item)}
					meta={row.meta?.(item)}
					trailing={row.trailing?.(item)}
					status={row.status?.(item)}
					chip={row.chip?.(item)}
					more={row.more?.(item)}
					href={row.href?.(item)}
					onOpen={row.onOpen ? () => row.onOpen?.(item) : undefined}
				/>
			)),
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
				href={file.href?.(item)}
				onOpen={file.onOpen ? () => file.onOpen?.(item) : undefined}
			/>
		)),
	);
}
