import type {
	Act,
	ChangeKind,
	ChipMark,
	MenuItem,
	RowEntry,
	RowLeading,
	RowPart,
	RowStatus,
	RowTitle,
	RowTrailing,
	StatusMark,
} from "@fcalell/ui-core/descriptors";
import type { Closed } from "../../lib/closed.ts";
import { ListRowBase } from "./base.tsx";

/** One thing in a list or a group. */
export interface ListRowProps<V extends string | null = string> extends Closed {
	/** Where the row stands in a change set: its mark at the row's start, ahead of the leading slot. Mark a set's untouched rows `unchanged` so the titles line up. */
	change?: ChangeKind;
	/** A glyph, a status's mark (its dot, or the spinner while `running`), an avatar, or a tick that chooses the row (disabled while `blocked`, its reason leading the meta line), in one slot at the avatar's size; a tick takes its hit box. */
	leading?: RowLeading;
	/** What the row names (a short phrase; truncates at its end, wraps whole while `wrap`), at body 500; at 400 in the meta ink while `dim`, and at 400 while `wrap`. Runs of words and `{ code }` draw the code in the inline code style; a title that is one `{ code }` cuts in its middle, keeping its start and its end. */
	title: RowTitle;
	/** The line under the title, its parts (each a short phrase) joined by a middle dot on one line, the later parts truncating first; a `{ code }` part cuts in its middle, keeping its start and its end. */
	meta?: readonly RowPart[];
	/** A value at the title line's end (an age, a count, a word: shown whole or gone), or a pick that applies at once. */
	trailing?: RowTrailing<V>;
	/** A work state on the meta line; a waiting act is told by its tone. `{ loading: true }` while the read that answers it has not: a bar at the status's place and height, so the row keeps its height when it answers. A `short` form draws in place of the `label` while the long one would be cut. */
	status?: RowStatus;
	/** What is wrong with the row, on the meta line after the status: a warn glyph and its label (a short phrase; truncates). The act that clears it is the row's `act`. */
	warning?: string;
	/** What the row holds, on the meta line after the warning: a lock glyph and its label, shown from `tablet` (a short phrase; truncates). */
	lock?: string;
	/** A data value's chip on the meta line. */
	chip?: ChipMark;
	/** An input and its act under the title, in the meta line's place: `meta`, `status` and `chip` are not drawn while it stands. Give them in its place once the act settles. */
	entry?: RowEntry;
	/** The steps of the work the row's act pends on, one line each in the meta line's place (`meta` and the marks are not drawn while they stand): a status dot, or the spinner while `running`, and its label, the running step in the body ink and the others in the meta ink. Give `meta` back once the act settles. */
	steps?: readonly StatusMark[];
	/** The row stands off a highlighted path: its title in the meta ink at 400, never faded, so it stays legible; still a hit and focusable, its leading glyph and marks keeping their hue. */
	dim?: boolean;
	/** The title is a passage read whole: it wraps to every line, and the leading, trailing and acts stand on its first line. */
	wrap?: boolean;
	/** One labelled act at the row's end, ahead of the more act: the next step the row names. An act the row waits on keeps its pending press here, never also in `more`. */
	act?: Act;
	/** The row's acts, in a menu under the more act at its end; an act the row waits on leads it. */
	more?: readonly MenuItem[];
	/** Where the row goes when opened; the row is current at it. */
	href?: string;
	/** The row is the open record: current (the selection wash) whatever its `href`. */
	selected?: boolean;
	/** Opens what the row names. */
	onOpen?: () => void;
}

/** Inside a tree `List` the row is a `treeitem` (its level, and `aria-expanded` on a branch) and the tree's focus stop (Enter opens it), and opens with a rail per level and the fold lane every row of the tree reserves, a branch's fold act in it for the pointer. Then the change mark, the leading slot, the title with its trailing value over the meta line (its status, warning, lock and chip at the end, yielding from the chip), the entry (its input and act, its error under it) or the step list, a trailing pick, then the row's act and the more act. A row that opens ends in a chevron after its trailing value, unless its end holds an act, the more act, a pick or a tree's fold. A row that opens is one hit under its pick and acts, current (the selection wash) at its `href`; it washes under the pointer and the press. Square at the card's inset, in a `Group` or a `List` alike. */
export function ListRow<V extends string | null = string>(
	row: ListRowProps<V>,
) {
	return <ListRowBase {...row} />;
}
