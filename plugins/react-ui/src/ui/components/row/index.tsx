import { Button as BaseButton } from "@base-ui/react/button";
import { Field } from "@base-ui/react/field";
import { paints, useSelections } from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import type {
	RowTitle,
	RowTrailing,
	Run,
	Runs,
} from "@fcalell/ui-core/descriptors";
import { stepOf } from "@fcalell/ui-core/drag";
import {
	isChipFact,
	isMarkFact,
	isStatus,
	isStatusFact,
	isWarningFact,
	splitFacts,
	valueCut,
} from "@fcalell/ui-core/list-state";
import { isCurrent } from "@fcalell/ui-core/route";
import { filled, isCode, META_TAIL, runsOf } from "@fcalell/ui-core/runs";
import {
	BLOCK_IN,
	CODE_NAME,
	DEFINITION_ABSENT,
	DEFINITION_BOX,
	DEFINITION_LABEL,
	DEFINITION_LINE,
	DEFINITION_NAME,
	DROP_ON,
	FIELD_ERROR_LINE,
	FIGURES,
	LINE_IN,
	ROW_ACTS,
	ROW_CURRENT_BAR,
	ROW_END,
	ROW_ENTRY,
	ROW_INLINE,
	ROW_LEADING,
	ROW_LEADING_STATUS,
	ROW_META_LINE,
	ROW_STEPS,
	ROW_TEXT_FLOOR,
	ROW_TITLE_LINE,
	ROW_TRAILING,
	row,
	rowStep,
	rowTitle,
	rowTitleForm,
	STATUS,
	text,
	YIELDS_FIRST,
} from "@fcalell/ui-core/variants";
import {
	type CSSProperties,
	type KeyboardEvent,
	memo,
	type PointerEvent,
	type ReactNode,
	use,
	useState,
} from "react";
import { ageShort } from "../../lib/age.ts";
import { useClock } from "../../lib/clock.ts";
import { CodeCut, CodeWhole, RunText, Soft } from "../../lib/code.tsx";
import { press, useDrop, useOffers } from "../../lib/drag.ts";
import { DistanceContext, useTouch } from "../../lib/media.ts";
import { follow, navigate, useRoute } from "../../lib/navigate.ts";
import { Painted } from "../../lib/paint.tsx";
import {
	endedSentence,
	FailedMark,
	RetryMark,
	useRow,
} from "../../lib/read.tsx";
import {
	type Edge,
	type Movable,
	movesOf,
	stepKey,
} from "../../lib/reorder.ts";
import { sameBy } from "../../lib/same-by.ts";
import { useWords } from "../../lib/words.tsx";
import { IconButtonBase } from "../button/glyph.tsx";
import { HeldInput } from "../input/base.tsx";
import { MenuBase } from "../menu/base.tsx";
import { HeldPicker } from "../picker/base.tsx";
import type { RowItem as RowItemData } from "../section/index.tsx";
import { StatusBase } from "../status/base.tsx";
import { ChangeMark } from "../status/change.tsx";
import { StatusDot } from "../status/dot.tsx";
import { HeldSwitch } from "../switch/base.tsx";
import {
	ActButton,
	ActLine,
	hasMore,
	PaintedAct,
	RowAct,
	RowMore,
	useReasonLine,
} from "./acts.tsx";
import {
	BadgesLine,
	FactBadge,
	LockBadge,
	PaintedBadge,
	WordsBadge,
} from "./badges.tsx";
import { CopyAct, IdValue, isAbsent, isCopy, titleWords } from "./fact.tsx";
import {
	First,
	Leading,
	type RowTree,
	TreeLead,
	treeFold,
} from "./leading.tsx";
import { EndMark, says, wordless } from "./marks.tsx";
import { RowProgress } from "./progress.tsx";
import { RowStatusDot, RowStatusWord, StatusValue } from "./status.tsx";

// The row is one box on the sheet's rows: a flex line of its leading, its text
// group and its end group. A row with a label is the two columns of the sheet
// (`DEFINITION_BOX`, a subgrid of `ROWS`): the label in the first and the same
// line in the second, so every label of a Pane stands in one column as wide as
// the widest.
const ROW = "relative flex items-center min-h-row";
// A definition row stands its value under its label on touch (`touch:`) and in a
// Pane too narrow for a label and a value side by side at the short measure
// (`definitions-stacked:`, `definitionsOneRow`; voice 11). Each twin below is
// the `definitions-stacked:` form of a `touch:` class of the definition row
// family in ui-core's variants, as `TEXT_ADAPTS` is `TEXT_WORDS`'s; the form
// field uses them too.
export const STACKED_BOX =
	"definitions-stacked:flex definitions-stacked:flex-col definitions-stacked:items-stretch";
export const STACKED_OPTIONAL_NAME = "definitions-stacked:pt-0";
export const STACKED_NAME_AREA = "definitions-stacked:mt-0";
export const STACKED_SPLIT =
	"definitions-stacked:flex-col definitions-stacked:items-stretch";
export const STACKED_SPLIT_VALUE = "definitions-stacked:w-auto";
export const STACKED_SPLIT_FREE = "definitions-stacked:max-w-full";
export const STACKED_ALONE_ROW =
	"[.rows-host>&]:definitions-stacked:flex [.rows-host>&]:definitions-stacked:flex-col [.rows-host>&]:definitions-stacked:items-stretch";
export const STACKED_ALONE_ROW_AREA =
	"[.rows-host>&]:definitions-stacked:items-stretch";
export const STACKED_ALONE_LINE_AREA =
	"[.rows-host>*>&]:definitions-stacked:mt-0";
export const STACKED_ALONE_UNDER =
	"[.rows-host>*>&]:definitions-stacked:col-start-1";
// A row whose title wraps whole, that holds an entry, or that has a label stands
// its change mark, tick and tree lane on the first line; its end group stays
// centred on the row. A label stands on the value's first line too, whatever
// the value's lines (facts that wrap beside a switch included), so it shares
// that line's baseline (structure 21) as on a one-line row; on touch the label
// stands over the line.
const ROW_WHOLE = "relative flex items-start min-h-row";
const ROW_LABELLED = "relative";
// The line of a row with a label, in the second column.
const LINE = "flex items-center min-w-0";
// Without a title, a facts line or an entry, a row with a label stands the
// label and the end group on one line on touch too, as a titled row does: a
// switch or an act is an end-group part on the first line (voice 9 and 14),
// never a value under its label. The label wraps in the room the end group
// leaves it. A form's toggle field stands the same way.
export const ASIDE =
	"touch:flex-row touch:items-center definitions-stacked:flex-row definitions-stacked:items-center";
// The label keeps its longest word whole (the end group yields before it: a
// pick truncates its value), wrapping between words in what the end leaves.
export const ASIDE_LABEL = "min-w-min shrink-3";
export const ASIDE_LINE = "touch:grow definitions-stacked:grow";
// A described value beside a control (a pick, a switch) never falls under a
// reading floor (the short measure, or the line's whole width where it is
// narrower), so its description never breaks to a word a line: where the text
// at that floor and the control do not fit side by side, the end group stands
// under the text, at the line's end, a gap below it. A value with no
// description is one line that truncates, and acts stay on the value's line
// (voice 14), each keeping the row's floor of two fifths beside its end.
const LINE_WRAPS = "flex-wrap gap-y-gap";
const TEXT_READS = "basis-[min(100%,var(--container-measure-short))]";
// Started at the top, the line still runs the row's height, so its end group
// stands on the row's centre; a value of one line shorter than the body line
// (a code, the facts) stands centred on the label's line, as it stood on the row.
const LINE_FIRST = "items-start self-stretch";
const TEXT_FIRST = "min-h-line-body justify-center";
// The label wraps inside its column, never inside a word: the body's
// `overflow-wrap: anywhere` would make a letter its floor, so it sets
// `wrap-normal`.
const LABEL = "wrap-normal text-start";
/** The value line of a form field: the change mark, the control and the end group, centred on the line. Outside the package's exports. */
export const VALUE_LINE = "flex items-center min-w-0";
/** The end group of a form field: on the first line's box at the line's end; a control taller than the line overflows it centred. Outside the package's exports. */
export const END_GROUP = "flex shrink-0 items-center ms-auto h-line-body";
// A row that opens washes under the pointer and the press; the chosen one a
// step darker under the pointer.
const PRESS = "hover:bg-wash-hover active:bg-wash-press";
const CHOSEN_PRESS = "hover:bg-wash-selected-hover active:bg-wash-press";
// The hit covers the row, under its pick and its acts, and rings inset.
const HIT = "absolute inset-0 focus-visible:-outline-offset-2";
// A tree's row is its own focus stop, ringed inset like the hit it replaces.
const TREE_ITEM = "focus-visible:-outline-offset-2";
// A tree's child washes from its own rail, where the hairline above it starts
// (`TREE_DIVIDER`'s arithmetic on the row's own depth, `--tree-depth`): the indent
// before the rail is its parent's ground, so a bar and a wash there would mark
// the parent. The wash, and the current bar with it, is a layer under the
// row's parts from the rail's inner side to the row's end, taking no room; the
// rail stays whole beside the bar, which keeps its width. It eases as the row
// would (`ANSWER`'s transition, inherited).
const TREE_WASH =
	"isolate before:absolute before:inset-y-0 before:end-0 before:start-[calc(var(--spacing-pad)+var(--tree-depth)*var(--spacing-stack))] before:-z-1 before:rounded-[inherit] before:[transition:inherit]";
// `ROW`'s selected wash and `ROW_CURRENT_BAR` on the layer.
const TREE_CURRENT =
	"before:bg-wash-selected before:shadow-[inset_calc(3*var(--spacing-hairline))_0_0_var(--color-accent)] before:rounded-s-none";
const TREE_PRESS = "hover:before:bg-wash-hover active:before:bg-wash-press";
const TREE_CHOSEN_PRESS =
	"hover:before:bg-wash-selected-hover active:before:bg-wash-press";
const LEADING = "flex shrink-0 items-center justify-center";
// A tick takes its hit box and stands above the row's hit, so a press on it
// ticks and never opens.
const TICK = "relative size-target";
// The text group keeps its floor of two fifths of the row (`ROW_TEXT_FLOOR`),
// the end group taking the rest; beside an end group that holds a control (a
// pick, a switch), which never cuts, the floor gives way to it, so the title
// wraps to its second line rather than the control's value be cut. A row with fact words and nothing else under
// its title is one line where it is wide enough and two below (the `row`
// container, `rowOneLine`: a rule of the row's width, never a measure of its
// content); on touch it is two lines at every width, and a row with a mark, an
// entry or the steps at every width and on every device.
const CONTAINED = "@container/row";
// In the two-line form a name wraps before it is cut (voice 14), to the third
// line: a name that is a sentence ("Stopped: the deploy failed its health check"),
// beside an end group of a glyph and an age at 320, is two lines and a word,
// and a cut that takes the word it is about loses more than the line it saves.
//
// A title that wraps keeps its longest word whole in every form: its text
// group is as wide as its minimum content (`break-words` makes the word, not a
// letter, the minimum), held to the row by `max-w-full`, and never shrinks; it
// grows into spare room. So the end group, which truncates, gives way first,
// and a word wider than the row is the last resort: held to the row, it breaks
// at the row's edge, never past it.
// The three lines are `ROW_TITLE_LINES` (ui-core's fold), the phone's `numberOfLines`.
const TITLE_COMPACT = "line-clamp-3 whitespace-normal break-words";
const TITLE_ADAPTS =
	"row-two-line:line-clamp-3 row-two-line:whitespace-normal row-two-line:break-words";
const TEXT_WORDS = "basis-auto w-min max-w-full shrink-0";
const TEXT_ADAPTS =
	"row-two-line:basis-auto row-two-line:w-min row-two-line:max-w-full row-two-line:shrink-0";
// The facts line takes the text group's width and adds nothing to its minimum, so
// the title's longest word sets it, never a badge.
const BADGES_APART = "[contain:inline-size]";
const BADGES_APART_ADAPTS = "row-two-line:[contain:inline-size]";
// The text group (structure 21) is one list per form, `textGroup`, and no list
// holds a class another class in it overrides. It is a column that grows and
// may be cut (`min-w-0`); the lists differ in what it yields to and how far.
// Its weight is read off ui-core's scale of who gives way (`YIELDS_FIRST`
// above the default 1): a group with no floor to keep gives way first, so the
// end group keeps its room; a group with a floor (`ROW_TEXT_FLOOR`) stands
// at it and gives way at the default weight, since its end group is the one
// that truncates; a group whose words stay whole never shrinks.
const TEXT_LINES = "flex flex-col grow min-w-0";
// `ROW_TEXT_FLOOR`'s basis at the default weight, since the floor's own
// `shrink-0` would stand against the end group's yielding.
const TEXT_AT_FLOOR = "basis-2/5 shrink";
const TEXT_LISTS = {
	plain: `${TEXT_LINES} ${TEXT_AT_FLOOR}`,
	reads: `${TEXT_LINES} ${TEXT_READS} ${YIELDS_FIRST}`,
	controlled: `${TEXT_LINES} ${YIELDS_FIRST}`,
	whole: `${TEXT_LINES} ${TEXT_WORDS}`,
};
// The text group in the form its row has: `plain` at the floor, `reads` (a
// label over a described value beside a control) at the reading floor,
// `controlled` (a control's row) at none, `whole` (touch, words whole) shrinking
// never, and `adapts` the container's form that holds the words whole below the
// row's one-line width.
function textGroup(form: keyof typeof TEXT_LISTS, adapts: boolean): string {
	return adapts ? `${TEXT_LISTS[form]} ${TEXT_ADAPTS}` : TEXT_LISTS[form];
}
const TITLE = "truncate";
const TITLE_WHOLE = "min-w-0";
// A title that is one span of code stands in a flex line, so its stem
// truncates and its tail keeps the room it needs; in a row that wraps it stands
// whole, breaking at its path or URL separators first (`CodeWhole`), then
// anywhere.
const TITLE_CODE = "flex items-center min-w-0 overflow-hidden";
const CODE_WHOLE = "wrap-anywhere";
// The end group is a line after the text group's floor: its value is cut with
// an ellipsis to the room its controls and acts leave, which stand whole. It is
// centred on the row, whatever its lines; a control taller than its line
// overflows it centred.
// The group lets a press through to the row's hit; what in it takes the pointer
// (the controls, the acts, the fold) says so.
const END = "relative flex items-center min-w-0 ms-auto pointer-events-none";
const POINTED = "pointer-events-auto";
const END_SELF = "self-center";
// An end group overflows the row's line centred, so the row keeps its height
// whatever it holds: an icon act's, a switch's and a pick's box stand over the
// row's inset, as tall as the row at most (the control height is the row's), so
// a row with a pick stands at the rows' one height (voice 9: "its first-line
// box and the gap above and below it (32 px desktop, 44 touch), never a set
// height").
const END_LINE = "h-line-body";
// The end group's controls stand whole: the group never shrinks below them, and
// the text group gives way past its floor (`ROW_TEXT_FLOOR` is where it stops
// while the end group is smaller), its facts and then its title truncating
// first. The trailing value, the one part of the group that may be long, is cut
// at the short measure. A pick yields instead (`PICK`), and so does a room
// row's status (`STATE_WORD` truncates), so a group that holds one shrinks.
const END_WHOLE = "shrink-0";
// On touch a two-line row's end group stands on the title's line, at its end,
// and the facts line runs the row's whole width under both (voice 14): the
// title's line is its own flex line, the end group on its first line box. A
// control taller than the line overflows it centred, into the row's gap.
const HEAD = "flex flex-wrap items-start min-w-0";
const HEAD_END = "self-start";
// The title's group in that line keeps its floor as its basis, so the end group
// stands under it when the two do not fit side by side, never squeezing the
// title. A title that wraps keeps its longest word whole (`min-w-min`, over the
// body's `overflow-wrap: anywhere`, which would make a letter its floor), capped
// at the line, where a word wider than the row breaks as the last resort.
const HEAD_TEXT = "flex flex-col grow max-w-full";
const HEAD_ROOMY = "min-w-0";
const HEAD_WORDS = "min-w-min";
// A trailing value is cut with an ellipsis at the short measure; an age and a
// count are a few characters and stand whole.
const TRAILING = "min-w-0 max-w-measure-short truncate";
const TRAILING_WHOLE = "shrink-0";
// A control (a switch, a pick: its value is one word and a chevron) stands
// whole.
const CONTROL = "flex shrink-0";
// A pick yields to the room its row leaves: its trigger truncates the value,
// its chevron standing whole, so a pick never runs past the row.
const PICK = "flex min-w-0";
// The facts are a line of badges (`BadgesLine`): whole badges, none breaking
// inside, a gap apart with no separator, a long one cut with an ellipsis
// inside its badge. In a one-line row they follow the title on its line and
// stand on one line, the last cut where the line is out of room
// (`BADGES_INLINE`); below the row's one-line width they stand under the title
// and wrap whole (`row-two-line:`, `INLINE_ADAPTS`), as they do in a two-line
// row and under a wrapped title (`wrap`). A lone `{ code }` fact in a row is no
// badge: it is the row's value, one line cut in its middle (`valueCut`), and in
// the two-line form it wraps whole, breaking anywhere, so a command is read to
// its end. A painted line is the fillers, one badge each.
const META_CODE = "flex min-w-0";
const META_FREE = "break-words";
const BADGES_INLINE = "min-w-0 shrink";
// A one-line row's text: the title and the facts after it on one line. The
// title keeps its whole width up to the group's and is cut only once the facts
// are gone; below the row's one-line width the badges stand under it.
const INLINE = "flex items-center min-w-0";
const INLINE_ADAPTS =
	"row-two-line:flex-col row-two-line:items-stretch row-two-line:gap-0";
const INLINE_TITLE = "shrink-0 max-w-full";
// The line under the title and the badges is text that wraps whole; a badge's
// gap stands between it and the badges above.
const LINE_TEXT = "min-w-0 break-words";
const LINE_BELOW = "mt-badge";
// A step is one body line's box tall (the step lists' 19 of the references,
// at the type scale's rung), its label truncating before its mark does.
const STEPS = "flex flex-col min-w-0";
const STEP = "flex items-center min-w-0 h-line-body";
const STEP_LABEL = "truncate";
const ACTS = "flex shrink-0 items-center pointer-events-auto";
// The entry stands above the hit: the input and its act, the field filling
// the room the act leaves. The act's label is never cut: the field keeps a
// reading floor (the short measure, or the line's width where it is
// narrower), and where it and the whole act do not fit side by side the act
// stands under the field at its own width, at the line's end, a gap below it,
// as a described value's end group does. The field's refusal stands in the
// field's own cell, under the input, so where the act wraps it stands between
// the two and never under the act it does not name; the input and the act
// start on one line, the refusal under the input beside the act's room.
const ENTRY = "relative flex flex-wrap items-start min-w-0 gap-y-gap";
const ENTRY_FIELD =
	"flex flex-col grow min-w-0 gap-gap basis-[min(100%,var(--container-measure-short))]";
const ENTRY_ACT = "flex shrink-0 max-w-full ms-auto";
// In a room a row whose only mark is a status draws one line, as a row with
// fact words and no mark does at the desktop's width: the title, the facts after
// it, and the status after the facts, a dot and its word at the end group's
// start before the age. The board holds twice the rows. The status takes its
// natural width, whatever the word, and the facts take the room they leave (the
// text group grows into it, and the facts are the part cut, last: its box
// shrinks, the title's does not). The word ends in an ellipsis only where the
// room is under what the one-line form needs (`rowOneLine`, the facts
// standing under the title below it, as any row's does): a window narrower
// than a room is.
// The status word is the end group's part that yields first: the age, a figure,
// keeps its room beside it.
const STATE = "flex items-center min-w-0 shrink-100";
const STATE_WORD = "min-w-0 truncate";
// A status value stands at the value's start, its dot and word whole, centred
// on the first line's box. It is no target: a press on it reaches the row's
// hit, as one on the end group does (`END`), so a pill in the title never
// swallows the row's open target.
const VALUE_STATUS = "flex items-center h-line-body pointer-events-none";

// No facts: one list, so a row without any reads the same selections each render.
const NO_FACTS: readonly unknown[] = [];

const noDrag = (event: { preventDefault: () => void }) =>
	event.preventDefault();

/** What a Section hands the rows it draws; no app sets them, so they are outside the items. */
export interface RowInternal {
	/** The row's place in a tree `List`: its depth (the roots 0), for a branch whether its children are drawn and how to fold them, and whether it is the tree's one tab stop. */
	tree?: RowTree;
	/** The Section's items are not here: every part paints at its role, the row is inert and builds no hit. */
	painted?: boolean;
	/** The row's place among the painted rows, which varies the filler's lengths. */
	at?: number;
	/** The row came to a Section already drawn, on its own: it fades in as it mounts, and holds the fade for the life of the instance. */
	arrived?: boolean;
	/** The row's key in its sheet, which a move and a drop name it by. */
	id?: string;
	/** The sheet reorders: the order the row reads and moves by. */
	movable?: Movable;
	/** Where the row stands in a movable sheet (first, last or alone), which decides the moves its menu offers. */
	edge?: Edge;
}

/** The fields a row takes: a list item's or a fact's, its reads widened to a `Datum`. */
export type RowProps<V extends string | null = string> = Omit<
	RowItemData<V>,
	"key" | "children" | "group"
> &
	RowInternal;

// A trailing age's short words, read off the shared clock: the row draws
// again only when they change.
function Age(props: { moment: string }) {
	return useClock((now) => ageShort(props.moment, now));
}

function trailingWord(trailing: RowTrailing): ReactNode {
	if ("age" in trailing)
		return (
			<>
				<Age moment={trailing.age} />
				{trailing.beside === undefined
					? null
					: `${META_TAIL}${trailing.beside}`}
			</>
		);
	if ("count" in trailing) return String(trailing.count);
	return trailing.value;
}

/** The one row of a Section's sheet, whatever it holds. Its box is a line of three groups: a leading slot (the change mark, then the leading mark: a glyph, a status dot, an avatar, a type's mark or a tick; a tree's rails), a text group (the title over the facts line) and an end group, in one order: the marks whose words are not drawn (`words: false`: a glyph named by its label, with a tooltip), the trailing value, a switch, a pick, the act (an icon act), the copy act, the more act, a tree's fold. The facts line is a line of badges (`BadgesLine`, voice 19), each fact one badge in the order given, none breaking inside, none separated from the next by a dot, whole badges wrapping to the next line: the status its tone's mark and word, the row's lock (the lock glyph and its reason, a link to what holds the fact with an `href`, inert without one) right after it, a warning the warn glyph and phrase, a chip its family's dot and value, a ring (outlined, its centre filled) or a flag its glyph and label, words and a code in the mono their text; a blocked tick's reason is the first badge, plain. A badge too long for the line is cut inside its box with an ellipsis. A sentence is not a fact: the row's `line` is text under the title and the badges, in the meta ink at the meta role, wrapping whole at every width (runs, a code run moving whole to the next line), a badge's gap below the badges above it, so a row with a line is at least two lines (the line under the title where the badges follow it on its line); empty it draws nothing, painted it is one sentence's filler. A row with a mark is two lines at every width; a row with fact words alone is one line where it is wide enough and two below (the `row` container, `rowOneLine`: a rule of the row's width, never a measure of its content), and on touch two at every width. In a one-line row the badges follow the title on its line on one line, the last one cut where the line is out of room; under the title, and under a wrapped title (`wrap`), they wrap whole. A lone `{ code }` fact is no badge: it is the row's value, the mono cut in its middle and, in the two-line form, whole. A room place's row whose only mark is a status keeps it in the end group's start after the facts, a dot and its word, one line. A row with a `label` stands in the sheet's two columns, the label in the first at the body role in the meta ink (a `code` label in the code role) in a column as wide as the widest label of the Pane, and the line in the second; on touch the line stands under the label. A row without one spans the sheet from its start. A row that opens (`href` or `onOpen`) draws no chevron: it is one hit, washing under the pointer, current (the bar) when `selected`, or at its `href` unless `selected` is `false`; a linked badge (the lock) stands above the hit and takes the pointer, the rest of the line none. A title truncates on one line unless `wrap`, whether the row has a label or not; the end group is centred on the row; an absent word is in the meta ink, a status title is its tone's mark and word at the title's start, plain (no pill: colour stays on the glyph), a copyable code is the mono and, too long for its room, cut in its middle. The painted form is the loaded one with every part in its filler, a badge's filler at the loaded badge's size, inert. The row is the frame of the selections it draws (`title`, `facts`, `line`): one that failed, with no frame above holding it, makes the failed form (the label stays, the end shows the failure mark and the retry icon, the facts line reads "This didn't load." as text, and pressing the row retries). Outside the package's exports. */
export function RowBase<V extends string | null = string>(props: RowProps<V>) {
	const {
		change: kind,
		label,
		leading,
		title,
		facts: offered,
		line,
		trailing,
		lock: lockGiven,
		entry,
		steps,
		progress,
		dim = false,
		wrap: wraps = false,
		switch: toggle,
		pick,
		act,
		more,
		href,
		selected,
		onOpen,
		tree,
		painted = false,
		at = 0,
		arrived = false,
		drag,
		drop,
		id,
		movable,
		edge,
	} = props;
	const labelled = label !== undefined;
	const labelText = typeof label === "object" ? label.code : label;
	const words = useWords();
	const route = useRoute();
	// A row that is dragged, reordered or dropped on: the press that moves
	// drags it, the drop under the pointer washes, and what a drag does by
	// pointer is also in its more menu (the drops that accept it, the moves).
	const { mark: dropMark, over } = useDrop(painted ? undefined : drop, href);
	const dragged = painted ? undefined : drag;
	const offers = useOffers(
		dragged?.kind,
		() => dragged as NonNullable<typeof dragged>,
	);
	const moves =
		movable && id !== undefined && !painted
			? movesOf(words, movable, id, edge)
			: [];
	const extra = [...offers, ...moves];
	const draggable =
		!painted && (dragged !== undefined || movable !== undefined);
	// The row is a block among its list's: named for the page's block move, and
	// fading in if it arrived on its own (held from the first render, so the
	// fade is not cut short by a later one).
	const [fades] = useState(arrived);
	// The row is the frame of the reads it draws that no frame above holds: one
	// that ended is the row's failed form, in place of its title, facts and end;
	// a read an enclosing frame holds is that frame's to say.
	// The facts are a list, a read of its own or of each fact: one that waits
	// paints a filler in its place.
	const [read, said, lineRead] = useSelections([title, offered, line]);
	const given: readonly unknown[] =
		!said.painted && Array.isArray(said.value) ? said.value : NO_FACTS;
	const each = useSelections(given);
	const { ended, busy, retry } = useRow([title, offered, line, ...given]);
	const failed = ended === "failed";
	// Painted by the Section, or by a datum of its own that waits: either way the
	// row draws its loaded tree, each part the datum reaches in its filler, and
	// takes no press.
	const waitsTitle = !ended && (painted || paints(read));
	const waitsFacts =
		!ended && (painted || paints(said) || each.some((fact) => paints(fact)));
	// The line is a sentence under the title: given and waiting it paints one
	// sentence's filler, loaded it is text, and empty it draws nothing.
	const waitsLine =
		!ended && line !== undefined && (painted || paints(lineRead));
	const inert = waitsTitle || waitsFacts || waitsLine;
	const toldLine =
		ended || painted || lineRead.painted
			? undefined
			: (lineRead.value as Run | Runs | undefined);
	const hasLine =
		waitsLine || (toldLine !== undefined && runsOf(toldLine).some(filled));
	// A placeholder is a function proxy that no type test passes: the title is
	// read only once painted is ruled out.
	const plain =
		painted || read.painted ? undefined : (read.value as RowTitle | undefined);
	// Over the placeholder the title is not a name.
	const named = painted
		? ""
		: (labelText ?? (plain === undefined ? "" : titleWords(plain)));
	const current =
		!inert && (selected ?? (href !== undefined && isCurrent(href, route)));
	const opens =
		!inert && !ended && (href !== undefined || onOpen !== undefined);
	const live = failed || opens;
	// A tree's child: its wash starts at its rail (`TREE_WASH`).
	const child = tree !== undefined && tree.depth > 0;
	const moreActs = hasMore(more);
	const ticks = leading !== undefined && "check" in leading;
	const blocked = ticks && !painted ? leading.check.blocked : undefined;
	const listed = steps?.length ? steps : undefined;
	const change = painted ? undefined : kind;
	// The lock: a reason, a link with its `href`.
	const lock = ended
		? undefined
		: typeof lockGiven === "object"
			? lockGiven.reason
			: lockGiven;
	const lockHref =
		ended || typeof lockGiven !== "object" ? undefined : lockGiven.href;
	// The copy act copies the code a title names.
	const copied = isCopy(plain) ? plain.code : undefined;
	const shape = (waitsTitle && title !== undefined ? read.value : plain) as
		| RowTitle
		| undefined;
	// A fact's copyable code is read to its end, as a definition is: the value
	// stands whole on as many lines as it takes, at a path's or URL's
	// separators first, never cut in its middle (the copy act has the whole).
	const wrap = wraps || (label !== undefined && isCopy(shape));
	// The facts by kind (`splitFacts`, the one reading of them). A list read that
	// waits is one filler, a fact whose read ended draws nothing and one that
	// waits is a filler in its place. A loaded part with no text draws nothing,
	// so no separator dangles after the part before it; a painted row keeps one
	// filler per part the slot gave. The failed sentence takes the words' place.
	const drawn = said.painted
		? paints(said)
			? [""]
			: []
		: each
				.filter((fact) => !fact.painted || paints(fact))
				.map((fact) => fact.value);
	const split = splitFacts(drawn);
	const { status, warnings } = split;
	// A chip and the boolean marks are the item's data, which the painted form
	// cannot know: never painted (the loaded rows that have none would land
	// narrower).
	const chips = painted ? [] : split.chips;
	let told: Run[];
	if (ended) told = [endedSentence(words, ended)];
	else if (waitsFacts) told = split.words;
	else told = split.words.filter(filled);
	const hasTitle = title !== undefined && !ended;
	const hasMeta = told.length > 0;
	// A ring that does not hold says no fact, so it draws nothing. A mark whose
	// words are not drawn (`words: false`) stands in the end group, a glyph
	// named by its label, so it is no mark of the facts line: a row with only
	// such marks has no second line for them.
	const booleans = painted ? [] : split.marks.filter(says);
	const endFacts = booleans.filter(wordless);
	const metaFacts = booleans.filter((mark) => !wordless(mark));
	// The marks lead the facts line; an entry or the steps stand in its place, as
	// the facts' words do.
	const marking =
		entry === undefined &&
		!listed &&
		(status !== undefined ||
			warnings.length > 0 ||
			lock !== undefined ||
			chips.length > 0 ||
			metaFacts.length > 0);
	// A room Place's row whose only mark is a status stands it in the end
	// group after the facts, one line (`STATE`): the title's own line is the
	// row's, wherever the row has the width the desktop's one-line form needs.
	const far = use(DistanceContext);
	const stated =
		far &&
		marking &&
		!ended &&
		status !== undefined &&
		warnings.length === 0 &&
		lock === undefined &&
		chips.length === 0 &&
		metaFacts.length === 0 &&
		!wrap &&
		!labelled;
	const marked = marking && !stated;
	// A room row with no mark that takes a line (only wordless marks, which
	// stand in the end group, or none) is as a status-only one: its form is the
	// row's width to decide, one line where it is wide enough.
	const quiet =
		far &&
		!marking &&
		entry === undefined &&
		listed === undefined &&
		!wrap &&
		!labelled;
	const roomy = stated || quiet;
	const touch = useTouch();
	// A row is two lines where it holds an entry, the steps or a mark, and on
	// touch where it has fact words; one with fact words and nothing else under
	// its title is one line where the row is wide enough, two below
	// (`row-two-line:`). A row with no facts has no second line to take.
	const twoLined =
		entry !== undefined ||
		listed !== undefined ||
		marked ||
		(touch && (hasMeta || hasLine) && !roomy);
	const adapts = !twoLined && !wrap && hasMeta;
	const lines = wrap ? "whole" : twoLined ? "two" : "one";
	const oneLine = lines === "one";
	// The row is the `row` container where its form is the container's to decide:
	// its title wraps to a second line below the row's one-line width.
	const contained = (!touch || roomy) && (adapts || marked);
	// A wrapped title and an entry's input are lines under the first, so the
	// change mark, tick and tree lane beside them stand on that first line; the
	// end group stands on the row's centre whatever the lines.
	const top = wrap || entry !== undefined;
	// Beside a label a value that may take more than a line (facts, which
	// wraps or stands under the title, or a second line) starts at the top, its
	// parts on its first line beside the label, as a wrapped title's do
	// (`ROW_WHOLE`); a title alone is one line and stays centred.
	const onFirst =
		top || (labelled && !touch && (hasMeta || hasLine || twoLined));
	// A status dot is the title's bullet: on a row of more than one line it
	// stands on the title's first line, never between the title and the facts
	// on the row's centre.
	const dotFirst =
		(!oneLine || hasLine) &&
		!onFirst &&
		leading !== undefined &&
		"tone" in leading;
	// A model-written name (a `{ quoted }` run) wraps in a row that has a second line, so
	// its closing quote is never cut away; its row grows by the lines it wraps.
	const quotedWraps =
		!painted &&
		twoLined &&
		typeof plain === "object" &&
		!Array.isArray(plain) &&
		"quoted" in plain;
	const reads =
		labelled && hasMeta && (pick !== undefined || toggle !== undefined);
	// An end group made of a control gives the text group's floor way (a
	// described value beside one keeps its reading floor, `reads`).
	const controlled = !labelled && (pick !== undefined || toggle !== undefined);
	const wordsWhole = !wrap && !quotedWraps;
	const form =
		wordsWhole && touch && !roomy
			? "whole"
			: reads
				? "reads"
				: controlled
					? "controlled"
					: "plain";
	const column = cn(
		textGroup(form, wordsWhole && contained),
		onFirst && !top && TEXT_FIRST,
	);
	const inline = { label: entry?.label ?? "" };
	const entryReason = useReasonLine(painted ? undefined : entry?.act.blocked);
	// The pressed reason of the act, which its button and its line both read:
	// the row holds it, neither knows the other.
	const [stood, stand] = useState<string>();
	const actLine =
		act === undefined || painted ? null : <ActLine act={act} stood={stood} />;
	// A blocked tick's reason is the first badge, plain.
	const parts: Run[] = blocked !== undefined ? [blocked, ...told] : told;
	// A fact that is one span of code, alone, is the row's value and cuts in its
	// middle; beside other facts it is a badge in the mono.
	const [only] = parts;
	const coded =
		!painted && parts.length === 1 && only && isCode(only) ? only : undefined;
	const trailed = trailing ? (
		<span
			className={cn(
				ROW_TRAILING,
				TRAILING,
				!("value" in trailing) && TRAILING_WHOLE,
			)}
		>
			{painted ? <Painted role="figure" at={at} /> : trailingWord(trailing)}
		</span>
	) : null;
	// The badges, in the order the facts are given: a blocked tick's reason first,
	// the status, the lock right after it (first where there is no status), then
	// each fact its kind draws (`FactBadge`). A status that stands in the end
	// group (a room row's) is no badge. A fact that waits, or a row that is
	// painted, draws the filler of what the kind keeps painted: every word one
	// filler badge, whether the slot gave words or the placeholder whole.
	const lockBadge =
		lock === undefined ? null : (
			<LockBadge key="lock" reason={lock} href={lockHref} painted={painted} />
		);
	const badges: ReactNode[] = [];
	if (!ended) {
		if (blocked !== undefined)
			badges.push(<WordsBadge key="blocked" fact={blocked} />);
		let locked = lockBadge === null;
		const lockAfterStatus = status !== undefined && !stated;
		if (!locked && !lockAfterStatus) {
			badges.push(lockBadge);
			locked = true;
		}
		// The first status leads the badges and the lock follows it; each further
		// status is a badge of its own, its tone mark before its word, where it
		// stands in the list.
		let led = false;
		drawn.forEach((fact, index) => {
			if (fact === undefined || fact === null || fact === false) return;
			const key = `fact-${index}`;
			if (isStatusFact(fact)) {
				if (led) {
					badges.push(<FactBadge key={key} fact={fact} painted={painted} />);
					return;
				}
				led = true;
				if (stated) return;
				badges.push(<FactBadge key={key} fact={fact} painted={painted} />);
				if (!locked) badges.push(lockBadge);
				locked = true;
			} else if (isWarningFact(fact) || isChipFact(fact) || isMarkFact(fact)) {
				badges.push(<FactBadge key={key} fact={fact} painted={painted} />);
			} else if (waitsFacts) badges.push(<PaintedBadge key={key} />);
			else if (filled(fact as Run))
				badges.push(<FactBadge key={key} fact={fact} />);
		});
	}
	// The title, in the form its data takes: words (they wrap in a row with a
	// label, truncate in one without), a status's pill, an identifier in the
	// mono or the absent word.
	let titleLine: ReactNode = null;
	if (hasTitle) {
		const whole = wrap || quotedWraps;
		const box = cn(
			rowTitle({ form: rowTitleForm(dim) }),
			whole
				? TITLE_WHOLE
				: cn(
						TITLE,
						touch && !roomy && TITLE_COMPACT,
						contained && TITLE_ADAPTS,
					),
			FIGURES,
			oneLine && hasMeta && INLINE_TITLE,
		);
		if (waitsTitle) {
			if (isStatus(shape))
				titleLine = (
					<span className={VALUE_STATUS}>
						<StatusBase painted />
					</span>
				);
			// The id's one position, in this form and the loaded one, so the slot
			// that waited is the slot that arrived.
			else if (isCopy(shape)) titleLine = <IdValue painted at={at} />;
			else
				titleLine = (
					<span className={box}>
						<Painted role="title" at={at} />
					</span>
				);
		} else if (isCopy(plain)) {
			if (whole) titleLine = <IdValue stem={plain.code} whole />;
			else {
				const { stem, tail } = valueCut(plain.code);
				titleLine = <IdValue stem={stem} tail={tail} />;
			}
		} else if (isAbsent(plain)) {
			titleLine = (
				<span className={cn(box, DEFINITION_ABSENT)}>{plain.absent}</span>
			);
		} else if (isStatus(plain)) {
			titleLine = (
				<span className={VALUE_STATUS}>
					<StatusValue status={plain} />
				</span>
			);
		} else if (plain !== undefined && isCode(plain)) {
			titleLine = whole ? (
				<span
					className={cn(rowTitle({ form: rowTitleForm(dim) }), TITLE_WHOLE)}
				>
					<code className={cn(CODE_NAME, CODE_WHOLE)}>
						<CodeWhole code={plain.code} />
					</code>
				</span>
			) : (
				<span
					className={cn(
						rowTitle({ form: rowTitleForm(dim) }),
						TITLE_CODE,
						oneLine && hasMeta && INLINE_TITLE,
					)}
				>
					<CodeCut code={plain.code} />
				</span>
			);
		} else if (plain !== undefined) {
			titleLine = (
				<span className={box}>
					{typeof plain === "string" ? (
						<Soft text={plain} />
					) : (
						<RunText
							runs={runsOf(plain as Run | Runs)}
							whole={whole}
							wraps={whole}
							fit="name"
						/>
					)}
				</span>
			);
		}
	}
	// The facts line, drawn once: after the title on its line in a one-line row,
	// under it in a wrapped or two-line one. A lone code is the row's value, one
	// line cut in its middle, or whole where the row is two lines; the failed
	// form's sentence is text.
	const partRole = cn(text({ role: "meta" }), FIGURES);
	const metaNode: ReactNode =
		ended && told[0] !== undefined ? (
			<span
				className={cn(
					partRole,
					oneLine ? "min-w-0 shrink truncate" : META_FREE,
				)}
			>
				<RunText runs={runsOf(told[0])} whole wraps={!oneLine} fit="name" />
			</span>
		) : coded && !marked ? (
			<span className={cn(partRole, oneLine ? META_CODE : META_FREE)}>
				{oneLine ? (
					<CodeCut code={coded.code} />
				) : (
					<code className={cn(CODE_NAME, CODE_WHOLE)}>
						<CodeWhole code={coded.code} />
					</code>
				)}
			</span>
		) : badges.length > 0 ? (
			<BadgesLine
				wrap={!oneLine}
				adapts={adapts}
				className={cn(
					oneLine && BADGES_INLINE,
					wordsWhole && touch && !roomy && BADGES_APART,
					wordsWhole && contained && BADGES_APART_ADAPTS,
				)}
			>
				{badges}
			</BadgesLine>
		) : null;
	// The line, drawn once, under the title and the badges: the meta ink at the
	// meta role, wrapping whole at every width (a sentence is text, never a
	// badge), a badge's gap below the badges that stand above it. Painted it is
	// one sentence's filler.
	const lineNode: ReactNode = hasLine ? (
		<span
			className={cn(
				partRole,
				LINE_TEXT,
				metaNode !== null && !entry && !listed && LINE_BELOW,
			)}
		>
			{waitsLine || toldLine === undefined ? (
				<Painted role="sentence" at={at} />
			) : (
				<RunText runs={runsOf(toldLine)} whole wraps fit="name" />
			)}
		</span>
	) : null;
	// A room row's status, the end group's first item.
	const state =
		stated && status !== undefined ? (
			<span className={cn(STATUS, STATE)}>
				<RowStatusDot status={status} painted={painted} />
				<span className={cn(text({ role: "meta" }), STATE_WORD)}>
					<RowStatusWord status={status} painted={painted} />
				</span>
			</span>
		) : null;
	// The control of a fact: its switch, in the end group, or the failure mark
	// and the retry in the failed form.
	const control = ended ? (
		<span className={cn("flex items-center", ROW_END, POINTED)}>
			<FailedMark />
			{failed ? <RetryMark busy={busy} /> : null}
		</span>
	) : toggle ? (
		<span className={cn(CONTROL, POINTED)}>
			<HeldSwitch
				{...toggle}
				label={painted ? "" : named}
				painted={inert}
				disabled={lock !== undefined}
			/>
		</span>
	) : null;
	const copyAct = ended ? null : waitsTitle && isCopy(shape) ? (
		<IconButtonBase icon="Copy" label="" painted />
	) : copied === undefined ? null : (
		<CopyAct label={labelText ?? copied} value={copied} />
	);
	const acted = act !== undefined || moreActs || extra.length > 0;
	const acting = acted || copyAct !== null;
	const folding = tree ? treeFold(tree, named, words) : null;
	const hasEnd =
		folding !== null ||
		state !== null ||
		endFacts.length > 0 ||
		trailed !== null ||
		control !== null ||
		pick !== undefined ||
		acting;
	// On touch a row of two lines stands its end group on the title's line and
	// runs its facts line the row's whole width under both (voice 14), its
	// leading on the title's line with them; an entry, the steps and a label
	// keep the end group centred on the row.
	const headed =
		touch &&
		twoLined &&
		!labelled &&
		entry === undefined &&
		listed === undefined &&
		hasEnd &&
		titleLine !== null;
	// In a tree the row is the focus stop and the hit is the pointer's alone; the
	// row's own controls (its tick, pick, act and more menu) stand in the tab
	// order only on the row that holds the stop, so the tree is one stop and the
	// controls of the row at it, never one stop per row.
	const pointed = tree ? -1 : undefined;
	const rove = tree && !tree.tabbable ? (-1 as const) : undefined;
	let hit = null;
	if (failed)
		hit = (
			<BaseButton
				data-hit=""
				aria-label={`${words.retry} ${named}`}
				onClick={() => {
					if (!busy) void retry();
				}}
				className={HIT}
			/>
		);
	else if (opens && href !== undefined)
		hit = (
			// biome-ignore lint/a11y/useAnchorContent: the hit covers the row, named by its title
			<a
				data-hit=""
				href={href}
				onClick={follow}
				aria-label={named}
				aria-current={!tree && current ? "page" : undefined}
				tabIndex={pointed}
				className={HIT}
			/>
		);
	else if (opens && onOpen)
		hit = (
			<BaseButton
				data-hit=""
				aria-label={named}
				onClick={onOpen}
				aria-current={!tree && current ? "true" : undefined}
				tabIndex={pointed}
				className={HIT}
			/>
		);
	// Enter on a tree's row opens what the hit does.
	const openOnEnter = (event: KeyboardEvent<HTMLElement>) => {
		if (event.key !== "Enter" || event.target !== event.currentTarget) return;
		if (href !== undefined) navigate(href);
		else onOpen?.();
	};
	// The press that moves drags the row; Alt with an arrow moves it where it
	// stands, from any control in it (the keyboard's way to the pointer's reorder).
	const onPress = draggable
		? (event: PointerEvent<HTMLElement>) =>
				press(event, () => ({
					drag: dragged,
					label: named,
					reorder: movable && id !== undefined ? { id, ...movable } : undefined,
				}))
		: undefined;
	const onMoveKey = (event: KeyboardEvent<HTMLElement>) => {
		const step = stepKey(event);
		if (!step || !movable || id === undefined) return;
		const target = event.target as HTMLElement;
		if (target.closest("input, textarea, select, [contenteditable]")) return;
		event.preventDefault();
		const to = stepOf(movable.ids(), id, step);
		if (!to) return;
		movable.move(id, to);
		// The row moves in the document and the control loses the focus; it takes
		// it back once the move has rendered.
		queueMicrotask(() => target.focus());
	};
	// A tree's row is a `treeitem` (the WAI-ARIA tree pattern) with its level
	// and, on a branch, whether it is open; the tree holds one tab stop, so the
	// rest are focusable by script.
	const treeItem = tree
		? {
				role: "treeitem",
				tabIndex: tree.tabbable ? 0 : -1,
				"aria-level": tree.depth + 1,
				"aria-setsize": tree.size,
				"aria-posinset": tree.place,
				"aria-expanded": tree.fold?.open,
				"data-key": tree.key,
				"aria-current": current ? ("page" as const) : undefined,
				onKeyDown: opens ? openOnEnter : undefined,
			}
		: {};
	// The end group: centred on the row, or on the title's line in a touch row
	// of two lines (`headed`).
	const endGroup = hasEnd ? (
		<span
			className={cn(
				ROW_END,
				END,
				headed ? HEAD_END : END_SELF,
				END_LINE,
				pick === undefined && state === null && END_WHOLE,
			)}
		>
			{state}
			{endFacts.map((mark) => (
				<EndMark key={mark.label} mark={mark} />
			))}
			{trailed}
			{control}
			{pick ? (
				<span className={cn(PICK, POINTED)}>
					<HeldPicker {...pick} fit="row" painted={inert} tabIndex={rove} />
				</span>
			) : null}
			{acting ? (
				<span className={cn(ROW_ACTS, ACTS)}>
					{act ? (
						painted ? (
							<PaintedAct at={at} icon />
						) : (
							<RowAct act={act} stand={stand} at={at} />
						)
					) : null}
					{copyAct}
					{(more !== undefined && hasMore(more)) || extra.length > 0 ? (
						painted ? (
							<MenuBase
								label={`${words.more} ${named}`}
								title={named}
								items={[]}
								painted
							/>
						) : (
							<RowMore
								more={more}
								extra={extra}
								named={named}
								tabIndex={rove}
							/>
						)
					) : null}
				</span>
			) : null}
			{folding ? <span className={cn("flex", POINTED)}>{folding}</span> : null}
		</span>
	) : null;
	const textNode =
		titleLine === null &&
		metaNode === null &&
		lineNode === null ? null : entry ? (
			<Field.Root
				invalid={!painted && Boolean(entry.error)}
				className={cn(ROW_ENTRY, column)}
			>
				{titleLine}
				{lineNode}
				<span className={cn(ROW_META_LINE, ENTRY)}>
					<span className={ENTRY_FIELD}>
						<HeldInput
							inline={inline}
							value={entry.field.value}
							onChange={entry.field.onChange}
							onCommit={entry.field.onCommit}
							placeholder={entry.placeholder}
							painted={painted}
						/>
						{entry.error && !painted ? (
							<Field.Error
								key={entry.error}
								match
								className={cn(FIELD_ERROR_LINE, LINE_IN)}
							>
								{entry.error}
							</Field.Error>
						) : null}
					</span>
					<span className={ENTRY_ACT}>
						<ActButton
							act={entry.act}
							host={entryReason.host}
							painted={painted}
							at={at}
						/>
					</span>
				</span>
				{entryReason.line}
				{actLine}
			</Field.Root>
		) : listed ? (
			<span className={column}>
				{titleLine}
				{lineNode}
				<span className={cn(ROW_STEPS, STEPS)}>
					{listed.map((step, index) => (
						<span
							key={step.label}
							className={cn(
								rowStep({
									state:
										!painted && step.tone === "running" ? "running" : "rest",
								}),
								STEP,
							)}
						>
							<StatusDot
								tone={painted ? "done" : step.tone}
								painted={painted}
							/>
							<span className={STEP_LABEL}>
								{painted ? (
									<Painted role="phrase" at={at + index} />
								) : (
									step.label
								)}
							</span>
						</span>
					))}
				</span>
				{actLine}
			</span>
		) : headed ? (
			<span className={column}>
				<span className={cn(ROW_TITLE_LINE, HEAD)}>
					<span
						className={cn(
							HEAD_TEXT,
							ROW_TEXT_FLOOR,
							roomy ? HEAD_ROOMY : HEAD_WORDS,
						)}
					>
						{titleLine}
					</span>
					{endGroup}
				</span>
				{metaNode}
				{lineNode}
				{actLine}
			</span>
		) : (
			<span className={column}>
				{oneLine && titleLine !== null && metaNode !== null ? (
					<span className={cn(ROW_INLINE, INLINE, adapts && INLINE_ADAPTS)}>
						{titleLine}
						{metaNode}
					</span>
				) : (
					<>
						{titleLine}
						{metaNode}
					</>
				)}
				{lineNode}
				{actLine}
			</span>
		);
	const aside = labelled && textNode === null;
	const body = (
		<>
			{tree ? <TreeLead tree={tree} /> : null}
			{change ? (
				<First on={onFirst || headed} top={headed && !top}>
					<ChangeMark kind={change} />
				</First>
			) : null}
			{leading ? (
				<First
					on={onFirst || dotFirst || headed}
					top={(dotFirst || headed) && !top}
				>
					<span
						className={cn(
							"tone" in leading ? ROW_LEADING_STATUS : ROW_LEADING,
							LEADING,
							ticks && TICK,
						)}
					>
						<Leading
							leading={leading}
							named={named}
							painted={painted}
							tabIndex={rove}
						/>
					</span>
				</First>
			) : null}
			{textNode}
			{headed ? null : endGroup}
		</>
	);
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: the press that moves is a pointer's way to what the row's hit and its menu do by keyboard (Alt with an arrow on the hit, Move up in the menu)
		<div
			{...treeItem}
			{...dropMark}
			{...(movable && id !== undefined ? { "data-row": id } : {})}
			onPointerDown={onPress}
			// The row's link is not dragged by the browser: the press drags the row.
			onDragStart={draggable ? noDrag : undefined}
			{...(movable ? { onKeyDown: onMoveKey } : {})}
			style={rails(tree)}
			inert={inert || undefined}
			className={cn(
				row({ state: current && !child ? "selected" : "rest" }),
				labelled
					? cn(
							DEFINITION_BOX,
							STACKED_BOX,
							ROW_LABELLED,
							(twoLined || onFirst) && "items-start",
							aside && ASIDE,
						)
					: cn(top ? ROW_WHOLE : ROW, contained && CONTAINED),
				fades && BLOCK_IN,
				child
					? cn(
							TREE_WASH,
							current && TREE_CURRENT,
							live && (current ? TREE_CHOSEN_PRESS : TREE_PRESS),
						)
					: cn(
							current && ROW_CURRENT_BAR,
							live && (current ? CHOSEN_PRESS : PRESS),
						),
				tree && TREE_ITEM,
				draggable && "touch:select-none",
				over && DROP_ON,
			)}
		>
			{hit}
			{progress && !painted ? <RowProgress {...progress} name={named} /> : null}
			{labelled ? (
				<>
					<span className={cn(DEFINITION_LABEL, aside && ASIDE_LABEL)}>
						<span
							className={cn(
								text({ role: typeof label === "object" ? "code" : "body" }),
								DEFINITION_NAME,
								LABEL,
							)}
						>
							{painted ? <Painted role="name" at={at} /> : labelText}
						</span>
					</span>
					<div
						className={cn(
							DEFINITION_LINE,
							LINE,
							reads && LINE_WRAPS,
							onFirst ? LINE_FIRST : "items-center",
							contained && CONTAINED,
							aside && ASIDE_LINE,
						)}
					>
						{body}
					</div>
				</>
			) : (
				body
			)}
		</div>
	);
}

// A tree row hands its tree the depth its hairline starts at (`TREE_DIVIDER`):
// the rail of the row under it, a root under it leaving the hairline whole;
// and a child its own depth, where its wash starts (`TREE_WASH`).
function rails(tree: RowTree | undefined): CSSProperties | undefined {
	if (!tree) return undefined;
	return {
		...(tree.under > 0 && { "--rule-depth": tree.under }),
		...(tree.depth > 0 && { "--tree-depth": tree.depth }),
	} as CSSProperties;
}

/** What a Section hands the RowItem it draws; no app sets it. */
export interface RowItemProps {
	item: RowItemData;
	/** The item's key, which a tree's keys find the row by. */
	/** A painted row's place among the rows, which varies its fillers; a loaded row takes none, its place moving when a row lands above it. */
	id: string;
	index?: number;
	painted: boolean;
	/** In a tree: the row's depth, its fold (`open` on a branch alone, and `fold` hears the item's key) and whether it holds the tab stop. Flat so the memo compares them. */
	depth?: number;
	/** In a tree: the depth of the row under it, 0 for none. */
	under?: number;
	size?: number;
	place?: number;
	open?: boolean;
	tabbable?: boolean;
	fold?: (key: string) => void;
	/** The row arrived on its own after the Section was drawn. */
	arrived?: boolean;
	/** The sheet reorders: the order its rows read and move by, and where this row stands in it. */
	movable?: Movable;
	edge?: Edge;
}

function RowItemBase({
	item,
	id,
	index,
	painted,
	depth,
	under = 0,
	size = 1,
	place = 1,
	open,
	tabbable = false,
	fold,
	arrived,
	movable,
	edge,
}: RowItemProps) {
	const tree: RowTree | undefined =
		depth === undefined
			? undefined
			: {
					depth,
					under,
					size,
					place,
					key: id,
					fold:
						open === undefined
							? undefined
							: { open, onToggle: () => fold?.(id) },
					tabbable,
				};
	const { key: _key, ...rest } = item;
	return (
		<RowBase
			{...rest}
			tree={tree}
			painted={painted}
			arrived={arrived}
			at={index}
			id={id}
			movable={movable}
			edge={edge}
		/>
	);
}

/** One row of a Section from its item: a refetch that changes one item renders that row alone. */
export const RowItem = memo(RowItemBase, sameBy("item", "arrived"));
