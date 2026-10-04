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
	listState,
	listWaits,
	retryOf,
	rowShape,
} from "@fcalell/ui-core/list-state";
import { LIST } from "@fcalell/ui-core/variants";
import { type ReactNode, useContext } from "react";
import { View } from "react-native";
import type { Closed } from "../../lib/closed";
import { LoadingContext } from "../../lib/loading";
import {
	useSectionCount,
	useSectionRows,
	useSectionWait,
} from "../../lib/section";
import { useWords } from "../../lib/words";
import type { EmptyStateProps } from "../empty-state";
import { EmptyStateBase } from "../empty-state/base";
import { FileRow } from "../file-row";
import { FileWait } from "../file-row/wait";
import { ListRow } from "../list-row";
import { RowWait, WAITING_ROWS } from "../list-row/wait";
import type { QueryLike } from "../query-boundary";

const WAITING = Array.from({ length: WAITING_ROWS }, (_, index) => index);

// A list's leading slot: one key naming the kind every row leads with, its
// value from the item.
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

// One function per `ListRow` slot, each called with a loaded item; the
// slots given are the shape the waiting rows draw.
export interface RowSlots<T, V extends string | null = string> {
	// The item's React key, unique in the list.
	key: (item: T) => string;
	title: (item: T) => Part;
	// The rows' leading mark, one kind for every row of the list.
	leading?: LeadingSlot<T>;
	meta?: (item: T) => readonly Part[] | undefined;
	trailing?: (item: T) => RowTrailing<V> | undefined;
	status?: (item: T) => StatusMark | undefined;
	chip?: (item: T) => ChipMark | undefined;
	more?: (item: T) => readonly MenuItem[] | undefined;
	href?: (item: T) => string | undefined;
	onOpen?: (item: T) => void;
}

// One function per `FileRow` slot, each called with a loaded item.
export interface FileSlots<T> {
	key: (item: T) => string;
	path: (item: T) => string;
	added: (item: T) => number;
	removed: (item: T) => number;
	seen?: (item: T) => boolean | undefined;
	href?: (item: T) => string | undefined;
	onOpen?: (item: T) => void;
}

// What an empty list draws: an EmptyState's mark, title, sentence and the
// act that fills the list.
export type ListEmpty = Pick<
	EmptyStateProps,
	"icon" | "title" | "sentence" | "act"
>;

// Where a list's items come from.
type ListSource<T> =
	| {
			query: QueryLike<readonly T[]>;
			// What failed to load, over the retry act.
			sentence: string;
			empty: ListEmpty;
			items?: never;
			loading?: never;
	  }
	| {
			items: readonly T[];
			// The items are on their way (a compound body's loading form).
			loading?: boolean;
			// Without it an empty list draws nothing.
			empty?: ListEmpty;
			query?: never;
			sentence?: never;
	  };

// The one kind of row a list holds.
type ListKind<T, V extends string | null> =
	| { row: RowSlots<T, V>; file?: never }
	| { file: FileSlots<T>; row?: never };

// A collection's rows: from a query or from items, each a ListRow or a
// FileRow.
export type ListProps<T = unknown, V extends string | null = string> = Closed &
	ListSource<T> &
	ListKind<T, V>;

// Rows on the ground at the rows rhythm, with no box and no hairlines: a
// feed. It draws its collection's four states: while its query is pending,
// `loading` is set or a loading Section around it waits, waiting rows stand
// in the slots its map declares (a Section around a pending query busy, its
// count waiting); a failed query draws the failed EmptyState with
// `sentence` and Retry; no item draws `empty`; then one row per item.
export function List<T, V extends string | null = string>(
	props: ListProps<T, V>,
) {
	const words = useWords();
	const base = {
		query: props.query,
		items: props.items,
		loading: props.loading,
		sectionLoading: useContext(LoadingContext),
		inSection: false,
		hasEmpty: props.empty !== undefined,
	};
	const input = { ...base, inSection: useSectionWait(listWaits(base)) };
	useSectionCount(listCount(input));
	useSectionRows();
	const state = listState(input);
	const frame = (rows: ReactNode) => (
		<View accessibilityState={{ busy: listBusy(input) }} className={LIST}>
			{rows}
		</View>
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
