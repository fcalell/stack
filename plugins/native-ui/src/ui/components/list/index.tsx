import { type Datum, pagesOf } from "@fcalell/plugin-api/tanstack-query";
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
import type { Closed } from "../../lib/closed";
import { FrameBody, FrameLine, useCollection } from "../../lib/read";
import type { Route } from "../../lib/route";
import type { DefinitionValue } from "../definition-row";
import { ListBase } from "./base";

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

// One function per `ListRow` slot, each called with an item; the
// slots given are the shape the painted rows draw.
export interface RowSlots<T, V extends string | null = string> {
	// The item's React key, unique in the list.
	key: (item: T) => string;
	/** The row's title (a short phrase; truncates at its end, wraps whole while `wrap`). */
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
	/** The row's meta line (each part a short phrase; one line, the later parts truncating first). */
	meta?: (item: T) => readonly RowPart[] | undefined;
	trailing?: (item: T) => RowTrailing<V> | undefined;
	status?: (item: T) => StatusMark | undefined;
	/** What is wrong with the row, a warning mark (a short phrase; truncates). */
	warning?: (item: T) => string | undefined;
	/** What the row holds, a lock mark (a short phrase; truncates). */
	lock?: (item: T) => string | undefined;
	chip?: (item: T) => ChipMark | undefined;
	// The row's input and its act, in the meta line's place; the painted rows
	// draw it in place of the meta line.
	entry?: (item: T) => RowEntry | undefined;
	// The steps of the work the row's act pends on, in the meta line's place;
	// the painted rows draw the meta line.
	steps?: (item: T) => readonly StatusMark[] | undefined;
	// Whether the row stands off a highlighted path.
	dim?: (item: T) => boolean | undefined;
	// Whether every row's title wraps whole (a list of notes); one value for
	// the list, so the painted rows draw it.
	wrap?: boolean;
	// The row's labelled act at its end. A selection paints the act's box until
	// its read lands and stands blocked with the failed sentence once that read
	// failed or is missing; the row and the list never wait on it.
	act?: (item: T) => Datum<Act | undefined>;
	more?: (item: T) => Datum<readonly MenuItem[] | undefined>;
	href?: (item: T) => Route | undefined;
	// Whether the row is the open record, washed as selected whatever its
	// `href`.
	selected?: (item: T) => boolean | undefined;
	onOpen?: (item: T) => void;
}

// One function per `FileRow` slot, each called with an item.
export interface FileSlots<T> {
	key: (item: T) => string;
	/** The file's path (a path: the directory gives way first, then the name's middle). */
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
	/** What is measured (a short phrase; truncates). */
	label: (item: T) => string;
	value: (item: T) => number;
	max: (item: T) => number;
	// The tick across the bar: the meter's near point.
	mark?: (item: T) => MeterMark | undefined;
}

// One function per `Meter` slot, each called with an item; a declared
// `meta` or `counts` is the line the painted meters draw, never both.
// `counts` is the line under the bar as links: counts that lead to their
// lists.
export type MeterSlots<T> = MeterSlotsBase<T> &
	(
		| { meta?: (item: T) => string | undefined; counts?: never }
		| { counts: (item: T) => readonly CountLink[]; meta?: never }
	);

interface DefinitionSlotsBase<T> {
	key: (item: T) => string;
	/** What the fact is (a short phrase; wraps to the room its value leaves). */
	label: (item: T) => string;
	/** The fact: a string (a word or a short phrase; truncates at its end, an identifier of one word over eight characters cuts in its middle), a status, or a control that changes it in place. */
	value?: (item: T) => DefinitionValue | undefined;
	// Where the fact stands in a change set, its change mark.
	change?: (item: T) => ChangeKind | undefined;
	// Whether every value is copied whole (identifiers): drawn in the code role
	// with a copy act; one value for the list, so the painted rows hold the
	// act's square.
	copyable?: boolean;
}

// One function per `DefinitionRow` slot, each called with an item; a
// declared `description`, `act`, `href` or `onOpen` is the row's editable form,
// a declared `locked` its locked one, never both.
export type DefinitionSlots<T> = DefinitionSlotsBase<T> &
	(
		| {
				locked?: never;
				/** Under the label and the value (a sentence; wraps). */
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

// The one kind of row a list holds.
export type ListKind<T, V extends string | null> =
	| { row: RowSlots<T, V>; file?: never; meter?: never; definition?: never }
	| { file: FileSlots<T>; row?: never; meter?: never; definition?: never }
	| { meter: MeterSlots<T>; row?: never; file?: never; definition?: never }
	| {
			definition: DefinitionSlots<T>;
			row?: never;
			file?: never;
			meter?: never;
	  };

// A collection's rows: from items, each a ListRow, a FileRow, a Meter or a
// DefinitionRow.
export type ListProps<T = unknown, V extends string | null = string> = Closed &
	ListKind<T, V> & {
		/** The items the rows draw: constants, or a selection, which paints `PAINT_ROWS` rows until its read lands. A selection is the list's own frame: it holds its read and draws the failed, missing and empty forms in its own box whatever stands above it. */
		items: Datum<readonly T[]>;
	};

// Rows on the ground at the rows rhythm, with no box and no hairlines: a
// feed. It draws one row per item. While the `items` selection's read waits,
// `PAINT_ROWS` rows stand in the slots its map declares (the slots are run
// over the placeholder), each painted, inert and with no link; a tree draws
// flat then. The list is a frame of its items: it draws the failed form with
// Retry, the missing form saying it no longer exists, and the empty form, each
// in its box with the generic sentence, and the stale and paused line above
// its rows while it holds its read. A frame above that holds the same read is
// unmounted with it when it fails and draws the failure alone. A standalone list bleeds the card's inset, so its
// rows' text meets the title over it; in a Group's `list` it stands on the
// card, the hairline once between rows. A `definition` list (facts from data:
// DefinitionRows) stands in a Group, and carries no count of its own.
export function List<T, V extends string | null = string>(
	list: ListProps<T, V>,
) {
	const { drawn, frame } = useCollection(list.items);
	return (
		<FrameBody frame={frame} fit="frame">
			<FrameLine frame={frame} />
			<ListBase {...list} drawn={drawn} more={pagesOf(list.items)} />
		</FrameBody>
	);
}
