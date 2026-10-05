import type {
	Act,
	ChangeKind,
	ChipMark,
	CountLink,
	MenuItem,
	MeterMark,
	Part,
	RowEntry,
	RowLeading,
	RowTrailing,
	StatusMark,
} from "@fcalell/ui-core/descriptors";
import {
	fileShape,
	listBusy,
	listGround,
	listState,
	meterShape,
	retryOf,
	rowShape,
} from "@fcalell/ui-core/list-state";
import { LIST } from "@fcalell/ui-core/variants";
import { type ReactElement, useContext } from "react";
import { View } from "react-native";
import type { Closed } from "../../lib/closed";
import { between, useGroupList } from "../../lib/group";
import { LoadingContext } from "../../lib/loading";
import type { Route } from "../../lib/route";
import { SectionContext } from "../../lib/section";
import { useWords } from "../../lib/words";
import type { EmptyStateProps } from "../empty-state";
import { EmptyStateBase } from "../empty-state/base";
import { Missing } from "../empty-state/missing";
import { FileRow } from "../file-row";
import { FileWait } from "../file-row/wait";
import { ListRow } from "../list-row";
import { RowWait, WAITING_ROWS } from "../list-row/wait";
import { Meter } from "../meter";
import { MeterWait } from "../meter/wait";
import type { QueryLike } from "../query-boundary";

const WAITING = Array.from({ length: WAITING_ROWS }, (_, index) => index);

// A list's leading slot: one key naming the kind every row leads with, its
// value from the item.
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

// One function per `ListRow` slot, each called with a loaded item; the
// slots given are the shape the waiting rows draw.
export interface RowSlots<T, V extends string | null = string> {
	// The item's React key, unique in the list.
	key: (item: T) => string;
	title: (item: T) => Part;
	// Where the row stands in a change set, its change mark; a row of the set
	// that is untouched is `unchanged`.
	change?: (item: T) => ChangeKind | undefined;
	// The rows' leading mark, one kind for every row of the list.
	leading?: LeadingSlot<T>;
	meta?: (item: T) => readonly Part[] | undefined;
	trailing?: (item: T) => RowTrailing<V> | undefined;
	status?: (item: T) => StatusMark | undefined;
	// What is wrong with the row, a warning mark.
	warning?: (item: T) => string | undefined;
	// What the row holds, a lock mark.
	lock?: (item: T) => string | undefined;
	chip?: (item: T) => ChipMark | undefined;
	// The row's input and its act, in the meta line's place; the waiting rows
	// draw it in place of the meta line.
	entry?: (item: T) => RowEntry | undefined;
	// The steps of the work the row's act pends on, in the meta line's place;
	// the waiting rows draw the meta line.
	steps?: (item: T) => readonly StatusMark[] | undefined;
	// Whether the row stands off a highlighted path.
	dim?: (item: T) => boolean | undefined;
	// Whether every row's title wraps whole (a list of notes); one value for
	// the list, so the waiting rows draw it.
	wrap?: boolean;
	// The row's labelled act at its end.
	act?: (item: T) => Act | undefined;
	more?: (item: T) => readonly MenuItem[] | undefined;
	href?: (item: T) => Route | undefined;
	onOpen?: (item: T) => void;
}

// One function per `FileRow` slot, each called with a loaded item.
export interface FileSlots<T> {
	key: (item: T) => string;
	path: (item: T) => string;
	added: (item: T) => number;
	removed: (item: T) => number;
	seen?: (item: T) => boolean | undefined;
	chip?: (item: T) => ChipMark | undefined;
	href?: (item: T) => Route | undefined;
	onOpen?: (item: T) => void;
}

interface MeterSlotsBase<T> {
	key: (item: T) => string;
	label: (item: T) => string;
	value: (item: T) => number;
	max: (item: T) => number;
	unit?: (item: T) => string | undefined;
	// The tick across the bar: the meter's near point.
	mark?: (item: T) => MeterMark | undefined;
}

// One function per `Meter` slot, each called with a loaded item; a declared
// `meta` or `counts` is the line the waiting meters draw, never both.
// `counts` is the line under the bar as links: counts that lead to their
// lists.
export type MeterSlots<T> = MeterSlotsBase<T> &
	(
		| { meta?: (item: T) => string | undefined; counts?: never }
		| { counts: (item: T) => CountLink[]; meta?: never }
	);

// What an empty list draws: an EmptyState's mark, title, sentence and the
// act that fills the list.
export type ListEmpty = Pick<
	EmptyStateProps,
	"icon" | "title" | "sentence" | "act"
>;

// Where a list's items come from.
export type ListSource<T> =
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
	| { row: RowSlots<T, V>; file?: never; meter?: never }
	| { file: FileSlots<T>; row?: never; meter?: never }
	| { meter: MeterSlots<T>; row?: never; file?: never };

// A collection's rows: from a query or from items, each a ListRow, a
// FileRow or a Meter.
export type ListProps<T = unknown, V extends string | null = string> = Closed &
	ListSource<T> &
	ListKind<T, V>;

// Rows on the ground at the rows rhythm, with no box and no hairlines: a
// feed. It draws its collection's four states: while its query is pending,
// `loading` is set or a loading Section around it waits, waiting rows stand
// in the slots its map declares (a Section around a pending query busy, its
// count waiting); a query that answers not found draws the rest EmptyState
// saying it no longer exists with Back, never Retry; a failed query draws the
// failed EmptyState with `sentence` and Retry; no item draws `empty`; then
// one row per item. In a Group its rows, waiting rows and failed, missing and
// empty forms stand on the card, the hairline once between rows.
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
	const input = { ...base, inSection: useContext(SectionContext) };
	const busy = listBusy(input);
	const ground = listGround(useGroupList(busy));
	const state = listState(input);
	// In a Group the card is the rows' box: each row after the first draws
	// the group's hairline above it.
	const frame = (rows: readonly ReactElement[]) =>
		ground === "group" ? (
			rows.map((row, index) => (
				<View key={row.key ?? index} className={between(index)}>
					{row}
				</View>
			))
		) : (
			<View accessibilityState={{ busy }} className={LIST}>
				{rows}
			</View>
		);
	if (state === "pending") {
		return frame(
			WAITING.map((index) => {
				if (props.row)
					return (
						<RowWait key={index} shape={rowShape(props.row)} index={index} />
					);
				if (props.meter)
					return (
						<MeterWait key={index} busy={false} {...meterShape(props.meter)} />
					);
				return <FileWait key={index} busy={false} {...fileShape(props.file)} />;
			}),
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
		return frame(
			items.map((item) => (
				<ListRow
					key={row.key(item)}
					change={row.change?.(item)}
					leading={row.leading && leadingOf(row.leading, item)}
					title={row.title(item)}
					meta={row.meta?.(item)}
					trailing={row.trailing?.(item)}
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
					onOpen={row.onOpen ? () => row.onOpen?.(item) : undefined}
				/>
			)),
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
					unit={meter.unit?.(item)}
					mark={meter.mark?.(item)}
					{...(meter.counts
						? { counts: meter.counts(item) }
						: { meta: meter.meta?.(item) })}
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
				chip={file.chip?.(item)}
				href={file.href?.(item)}
				onOpen={file.onOpen ? () => file.onOpen?.(item) : undefined}
			/>
		)),
	);
}
