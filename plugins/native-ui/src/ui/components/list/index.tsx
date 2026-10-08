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
	RowTitle,
	RowTrailing,
	StatusMark,
} from "@fcalell/ui-core/descriptors";
import {
	definitionShape,
	fileShape,
	listGround,
	listState,
	meterShape,
	retryOf,
	rowShape,
	toggled,
	treeRows,
} from "@fcalell/ui-core/list-state";
import { LIST, LIST_DIVIDED, LIST_TREE } from "@fcalell/ui-core/variants";
import { type ReactElement, useContext, useState } from "react";
import { View } from "react-native";
import type { Closed } from "../../lib/closed";
import { between, useGroupPart } from "../../lib/group";
import { LoadingContext } from "../../lib/loading";
import type { Route } from "../../lib/route";
import { SectionContext } from "../../lib/section";
import { TrailingWait } from "../../lib/trailing-wait";
import { TreeContext } from "../../lib/tree";
import { useWords } from "../../lib/words";
import { DefinitionRow, type DefinitionValue } from "../definition-row";
import { DefinitionWait } from "../definition-row/wait";
import type { EmptyStateProps } from "../empty-state";
import { EmptyStateBase } from "../empty-state/base";
import { FileRow } from "../file-row";
import { FileWait } from "../file-row/wait";
import { ListRow } from "../list-row";
import { RowWait, WAITING_ROWS } from "../list-row/wait";
import { Meter } from "../meter";
import { MeterWait } from "../meter/wait";
import { Missing } from "../missing";
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
	title: (item: T) => RowTitle;
	// The item's children, which makes the list a tree: they draw one level in
	// under it, and its fold act folds them (open by default, the list holds
	// the state). Every item's `key` is unique across the whole tree.
	children?: (item: T) => readonly T[] | undefined;
	// Where the row stands in a change set, its change mark; a row of the set
	// that is untouched is `unchanged`.
	change?: (item: T) => ChangeKind | undefined;
	// The rows' leading mark, one kind for every row of the list.
	leading?: LeadingSlot<T>;
	meta?: (item: T) => readonly RowPart[] | undefined;
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
	// Whether the row is the open record, washed as selected whatever its
	// `href`.
	selected?: (item: T) => boolean | undefined;
	onOpen?: (item: T) => void;
}

// One function per `FileRow` slot, each called with a loaded item.
export interface FileSlots<T> {
	key: (item: T) => string;
	path: (item: T) => string;
	added: (item: T) => number;
	removed: (item: T) => number;
	seen?: (item: T) => boolean | undefined;
	change?: (item: T) => ChangeKind | undefined;
	chip?: (item: T) => ChipMark | undefined;
	href?: (item: T) => Route | undefined;
	onOpen?: (item: T) => void;
}

interface MeterSlotsBase<T> {
	key: (item: T) => string;
	label: (item: T) => string;
	value: (item: T) => number;
	max: (item: T) => number;
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
		| { counts: (item: T) => readonly CountLink[]; meta?: never }
	);

interface DefinitionSlotsBase<T> {
	key: (item: T) => string;
	label: (item: T) => string;
	value?: (item: T) => DefinitionValue | undefined;
	// Where the fact stands in a change set, its change mark.
	change?: (item: T) => ChangeKind | undefined;
	// Whether every value is copied whole (identifiers): drawn in the code role
	// with a copy act; one value for the list, so the waiting rows hold the
	// act's square.
	copyable?: boolean;
}

// One function per `DefinitionRow` slot, each called with a loaded item; a
// declared `description`, `act`, `href` or `onOpen` is the row's editable form,
// a declared `locked` its locked one, never both.
export type DefinitionSlots<T> = DefinitionSlotsBase<T> &
	(
		| {
				locked?: never;
				description?: (item: T) => string | undefined;
				act?: (item: T) => IconAct | undefined;
				href?: (item: T) => Route | undefined;
				onOpen?: (item: T) => void;
		  }
		| {
				locked: (item: T) => Lock | undefined;
				description?: never;
				act?: never;
				href?: never;
				onOpen?: never;
		  }
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
			// The items are on their way (a compound body's loading form). Given
			// items and a `row` map with a `trailing` slot (no tree), the rows stand
			// as loaded and only their trailing values wait.
			loading?: boolean;
			// Without it an empty list draws nothing.
			empty?: ListEmpty;
			query?: never;
			sentence?: never;
	  };

// The one kind of row a list holds.
type ListKind<T, V extends string | null> =
	| { row: RowSlots<T, V>; file?: never; meter?: never; definition?: never }
	| { file: FileSlots<T>; row?: never; meter?: never; definition?: never }
	| { meter: MeterSlots<T>; row?: never; file?: never; definition?: never }
	| {
			definition: DefinitionSlots<T>;
			row?: never;
			file?: never;
			meter?: never;
	  };

// A collection's rows: from a query or from items, each a ListRow, a
// FileRow, a Meter or a DefinitionRow.
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
// empty forms stand on the card, the hairline once between rows; a
// `definition` list (facts from data: DefinitionRows) stands in a Group, and
// adds no count to a Section's head.
export function List<T, V extends string | null = string>(
	props: ListProps<T, V>,
) {
	const words = useWords();
	// The keys of the tree's folded branches; every branch starts open.
	const [folded, setFolded] = useState<readonly string[]>([]);
	const base = {
		query: props.query,
		items: props.items,
		loading: props.loading,
		sectionLoading: useContext(LoadingContext),
		inSection: false,
		hasEmpty: props.empty !== undefined,
	};
	const input = { ...base, inSection: useContext(SectionContext) };
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
	// In a Group the card is the rows' box: each row after the first draws
	// the group's hairline above it. Two-line rows (a map with a `meta`) abut
	// under the same hairline.
	// A tree's rows abut, so its rails run unbroken.
	const divided =
		props.row?.meta !== undefined && props.row.children === undefined;
	const frame = (rows: readonly ReactElement[], tree = false) => {
		if (ground !== "group" && !divided)
			return <View className={tree ? LIST_TREE : LIST}>{rows}</View>;
		const lines = rows.map((row, index) => (
			<View key={row.key ?? index} className={between(index)}>
				{row}
			</View>
		));
		return ground === "group" ? (
			lines
		) : (
			<View className={LIST_DIVIDED}>{lines}</View>
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
		if (children === undefined)
			return (
				<TrailingWait.Provider value={known}>
					{frame(items.map(rowOf))}
				</TrailingWait.Provider>
			);
		// Each row of the tree reads its depth and fold from its own provider.
		return frame(
			treeRows(items, { key: row.key, children }, folded).map((each) => (
				<TreeContext.Provider
					key={each.key}
					value={{
						depth: each.depth,
						fold: each.branch
							? {
									open: each.open,
									onToggle: () => setFolded((keys) => toggled(keys, each.key)),
								}
							: undefined,
					}}
				>
					{rowOf(each.item)}
				</TreeContext.Provider>
			)),
			true,
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
