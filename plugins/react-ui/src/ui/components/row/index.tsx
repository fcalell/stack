import { Button as BaseButton } from "@base-ui/react/button";
import { Field } from "@base-ui/react/field";
import {
	isSelection,
	paints,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import type {
	RowTitle,
	RowTrailing,
	Run,
	Runs,
} from "@fcalell/ui-core/descriptors";
import type { MarkKind } from "@fcalell/ui-core/fold";
import { isStatus, paintedParts, valueCut } from "@fcalell/ui-core/list-state";
import { isCurrent } from "@fcalell/ui-core/route";
import {
	BLOCK_IN,
	CURRENT_BAR,
	CURRENT_ROOM,
	DEFINITION_ABSENT,
	DEFINITION_BOX,
	DEFINITION_LABEL,
	DEFINITION_LINE,
	DEFINITION_NAME,
	FIELD_ERROR_LINE,
	FIGURES,
	LINE_IN,
	ROW_ACTS,
	ROW_END,
	ROW_ENTRY,
	ROW_INLINE,
	ROW_LEADING,
	ROW_LEADING_STATUS,
	ROW_MARKS,
	ROW_META_LINE,
	ROW_STEPS,
	ROW_TEXT,
	ROW_TEXT_FLOOR,
	ROW_TRAILING,
	row,
	rowStep,
	rowTitle,
	rowTitleForm,
	text,
} from "@fcalell/ui-core/variants";
import {
	Fragment,
	type KeyboardEvent,
	memo,
	type ReactNode,
	useState,
} from "react";
import { ageShort } from "../../lib/age.ts";
import { useClock } from "../../lib/clock.ts";
import { CodeCut, RunText } from "../../lib/code.tsx";
import { ACT_FOLDED, ACT_SLOT, useMarksFold } from "../../lib/fold.ts";
import { useTouch } from "../../lib/media.ts";
import { follow, navigate, useRoute } from "../../lib/navigate.ts";
import { Painted } from "../../lib/paint.tsx";
import {
	filled,
	isCode,
	META_CUT,
	META_TAIL,
	metaRuns,
	runsOf,
} from "../../lib/parts.ts";
import {
	endedSentence,
	FailedMark,
	RetryMark,
	useRow,
} from "../../lib/read.tsx";
import { sameBy } from "../../lib/same-by.ts";
import { useWords } from "../../lib/words.tsx";
import { IconButtonBase } from "../button/glyph.tsx";
import { ChipBase } from "../chip/base.tsx";
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
import { CopyAct, IdValue, isAbsent, isCopy, titleWords } from "./fact.tsx";
import {
	First,
	Leading,
	type RowTree,
	TreeLead,
	treeFold,
} from "./leading.tsx";
import { LockMark } from "./lock.tsx";
import { BooleanMark, MarkSlot, WarningMark } from "./marks.tsx";
import { RowStatusMark } from "./status.tsx";

// The row is one box on the sheet's rows: a flex line of its leading, its text
// group and its end group. A row with a label is the two columns of the sheet
// (`DEFINITION_BOX`, a subgrid of `ROWS`): the label in the first and the same
// line in the second, so every label of a Pane stands in one column as wide as
// the widest.
const ROW = "relative flex items-center min-h-row";
// A row whose title wraps whole, that holds an entry, or that has a label stands
// its change mark, tick and tree lane on the first line; its end group stays
// centred on the row (on the value line, for a row with a label).
const ROW_WHOLE = "relative flex items-start min-h-row";
const ROW_LABELLED = "relative";
// The line of a row with a label, in the second column.
const LINE = "flex items-center min-w-0";
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
const LEADING = "flex shrink-0 items-center justify-center";
// A tick takes its hit box and stands above the row's hit, so a press on it
// ticks and never opens.
const TICK = "relative size-target";
// The text group keeps its floor in the compact form too (touch, or a row too
// narrow to stand one line with its meta: `rowStandsOneLine`): the end group
// takes the rest, so a status whose word does not fit there stands as its dot
// alone, a warning's label truncates to its glyph and a lock keeps its glyph,
// never a name broken by the letter. A first mark that cannot yield (a chip, a
// type's word, or a boolean mark) stands whole, and the text group yields to it
// instead: the name truncates, or wraps, before the chip is cut.
const COMPACT_YIELDS = "basis-auto shrink-10000000";
const MARKED_END = "shrink-0";
// In the compact form a name wraps to a second line before it is cut (voice 14).
const TITLE_COMPACT = "line-clamp-2 whitespace-normal break-words";
const TEXT = "flex flex-col grow shrink-10000000 min-w-0";
const TITLE = "truncate";
const TITLE_WHOLE = "min-w-0";
// A title that is one span of code stands in a flex line, so its stem
// truncates and its tail keeps the room it needs.
const TITLE_CODE = "flex items-center min-w-0 overflow-hidden";
// The end group is a line after the text group's floor (`ROW_TEXT_FLOOR`, the
// Pane head's two fifths of the row): the end group takes what is left; its
// value is cut with an ellipsis to it, its marks stand whole or fold away, the
// acts stand whole. It is centred on the row, whatever
// its lines; a control taller than its line overflows it centred.
// The group lets a press through to the row's hit; what in it takes the pointer
// (the controls, the acts, the fold) says so.
const END = "relative flex items-center min-w-0 ms-auto pointer-events-none";
const POINTED = "pointer-events-auto";
const END_SELF = "self-center";
// An end group of icons and marks overflows the row's line centred, so the row
// keeps its height; a pick or a labelled act has a box of its own that the row
// grows to hold, its corners clear of the row's.
const END_LINE = "h-line-body";
// The marks are passive, so they let a press through to the row's hit (the
// folded ones are positioned, which would paint them over it).
// The group is transparent to layout: its slots stand in the end group's own
// line, ordered by `order`: the trailing value, then the marks (warning, lock,
// chip, the boolean marks), then the status, the state pill, then the
// controls and acts. The fold still reads the marks in their own order, the
// status first.
const MARKS = "pointer-events-none contents";
const VALUE = "order-1";
const MARKS_FIRST = "order-2";
const LAST = "order-3";
const AFTER = "order-4";
const CHIP_MARK = "flex shrink-0";
const TRAILING = "min-w-0 max-w-full truncate";
const CONTROL = "flex shrink-0";
// The meta parts are one run of text a middle dot apart. In a one-line row
// they follow the title on its line and are cut with an ellipsis at the end of
// it (`META_INLINE`); under a wrapped title (`wrap`) they take up to two lines
// and end in an ellipsis at the end of the second (`META_LINES`): a part wraps
// by its words and holds its separator (`metaRuns`), so a wrapped line never
// starts on a dot; a compact row's trailing value is the last part on it, its
// dot held to the word before and to the value (`META_TAIL`). In the compact
// form they wrap whole (`META_FREE`). The marks (status, warning, lock, chip) are
// not on it: they stand in the end group. A lone `{ code }` part is one line
// that cuts in its middle; a painted line is one line.
const META_LINES = "line-clamp-2 break-words";
const META_FREE = "break-words";
const META_INLINE = "min-w-0 shrink truncate";
const META_CODE = "flex min-w-0";
const META_PAINTED = "truncate";
// A one-line row's text: the title and the meta parts after it on one line. The
// title keeps its whole width up to the group's and is cut only once the meta
// is gone.
const INLINE = "flex items-center min-w-0";
const INLINE_TITLE = "shrink-0 max-w-full";
// A step is one body line's box tall (the step lists' 19 of the references,
// at the type scale's rung), its label truncating before its mark does.
const STEPS = "flex flex-col min-w-0";
const STEP = "flex items-center min-w-0 h-line-body";
const STEP_LABEL = "truncate";
const ACTS =
	"relative flex shrink-0 items-center min-w-0 max-w-full pointer-events-auto";
// The entry stands above the hit: the input and its act, the field filling
// the room the act leaves.
const ENTRY = "relative flex items-center min-w-0";
const ENTRY_FIELD = "grow min-w-0";
// A status value stands at the value's start, its dot and word whole, centred
// on the first line's box.
const VALUE_STATUS = "flex items-center h-line-body";

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

/** The one row of a Section's sheet, whatever it holds. Its box is a line of three groups: a leading slot (the change mark, then the leading mark: a glyph, a status dot, an avatar, a type's mark or a tick; a tree's rails), a text group (the title over the meta line) and an end group, in one order: the trailing value, the marks (warning, lock, chip, ring or flag), the status, a switch, a pick, the act (an icon act, or a labelled act, which folds into the more menu where it does not fit beside the text group's floor), the copy act, the more act, a tree's fold. A row with a `label` stands in the sheet's two columns, the label in the first at the body role in the meta ink (a `code` label in the code role) in a column as wide as the widest label of the Pane, and the line in the second; on touch the line stands under the label. A row without one spans the sheet from its start. One lock mark: the meta glyph named by its reason, the reason beside it from `tablet`, a link to what holds the fact with an `href`, inert without one. A row that opens (`href` or `onOpen`) draws no chevron: it is one hit, washing under the pointer, current (the bar) when `selected` or at its `href`. A title truncates on one line unless `wrap`, whether the row has a label or not, and the meta stands after it when it fits and under it when the row is compact or narrow; the end group is centred on the row; an absent word is faint, a status is its compact pill at the title's start, a copyable code is the mono and, too long for its room, cut in its middle. A status whose word does not fit beside the text group's floor stands as its dot alone, its word the dot's accessible name and, under the pointer, its tooltip. The painted form is the loaded one with every part in its filler, inert. The row is the frame of the selections it draws (`title`, `meta`): one that failed, with no frame above holding it, makes the failed form (the label stays, the end shows the failure mark and the retry icon, the meta line reads "This didn't load.", and pressing the row retries). Outside the package's exports. */
export function RowBase<V extends string | null = string>(props: RowProps<V>) {
	const {
		change: kind,
		label,
		leading,
		title,
		meta: offered,
		trailing,
		status,
		warning,
		lock: lockGiven,
		chip: given,
		marks: offeredMarks,
		entry,
		steps,
		dim = false,
		wrap = false,
		switch: toggle,
		pick,
		act,
		more,
		href,
		selected = false,
		onOpen,
		tree,
		painted = false,
		at = 0,
		arrived = false,
	} = props;
	const labelled = label !== undefined;
	const labelText = typeof label === "object" ? label.code : label;
	const words = useWords();
	const route = useRoute();
	// The row is a block among its list's: named for the page's block move, and
	// fading in if it arrived on its own (held from the first render, so the
	// fade is not cut short by a later one).
	const [fades] = useState(arrived);
	// The row is the frame of the reads it draws that no frame above holds: one
	// that ended is the row's failed form, in place of its title, meta and end;
	// a read an enclosing frame holds is that frame's to say.
	const [read, said] = useSelections([title, offered]);
	const { ended, busy, retry } = useRow([title, offered]);
	const failed = ended === "failed";
	// Painted by the Section, or by a datum of its own that waits: either way the
	// row draws its loaded tree, each part the datum reaches in its filler, and
	// takes no press.
	const waitsTitle = !ended && (painted || paints(read));
	const waitsMeta = !ended && (painted || paints(said));
	const inert = waitsTitle || waitsMeta;
	// A placeholder is a function proxy that no type test passes: the title is
	// read only once painted is ruled out.
	const plain =
		painted || read.painted ? undefined : (read.value as RowTitle | undefined);
	// Over the placeholder the title is not a name.
	const named = painted
		? ""
		: (labelText ?? (plain === undefined ? "" : titleWords(plain)));
	const current =
		!inert && (selected || (href !== undefined && isCurrent(href, route)));
	const opens =
		!inert && !ended && (href !== undefined || onOpen !== undefined);
	const live = failed || opens;
	const moreActs = hasMore(more);
	const ticks = leading !== undefined && "check" in leading;
	const blocked = ticks && !painted ? leading.check.blocked : undefined;
	const listed = steps?.length ? steps : undefined;
	// A change mark, a chip and the boolean marks are the item's data, which the
	// painted form cannot know: never painted (the loaded rows that have none
	// would land narrower).
	const chip = painted ? undefined : given;
	const booleans = painted ? undefined : offeredMarks;
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
	// A loaded part with no text draws nothing, so no separator dangles after the
	// part before it; a painted row keeps one filler per part the slot gave. The
	// failed sentence takes the meta line's place.
	let meta: Runs | undefined;
	if (ended) meta = [endedSentence(words, ended)];
	else if (offered === undefined) meta = undefined;
	else if (isSelection(offered))
		meta = waitsMeta ? [""] : (said.value as Runs | undefined)?.filter(filled);
	else
		meta =
			painted || !Array.isArray(offered) ? offered : offered.filter(filled);
	const hasTitle = title !== undefined && !ended;
	const hasMeta = (meta?.length ?? 0) > 0;
	// The marks stand in the end group; an entry or the steps stand in their
	// place, as the meta line did.
	const marked =
		entry === undefined &&
		!listed &&
		(status !== undefined ||
			warning !== undefined ||
			lock !== undefined ||
			chip !== undefined ||
			(booleans?.length ?? 0) > 0);
	// A pick is a control that cannot truncate, so beside one the text group has
	// no floor and gives way to it. A labelled act cannot either, so beside the
	// floor it folds into the row's more menu.
	const floored = pick === undefined;
	const slots: MarkKind[] = [];
	if (status !== undefined) slots.push("status");
	if (warning !== undefined) slots.push("warning");
	if (lock !== undefined) slots.push("lock");
	if (chip !== undefined) slots.push("chip");
	for (const _ of booleans ?? []) slots.push("mark");
	// The marks that do not fit whole beside the text group's floor fold away,
	// the last first, the first standing last. Beside a pick the text has no
	// floor of its own, but the pick is the end's one thing that must be seen
	// and cannot truncate, so every mark folds before the title is left no room.
	const fold = useMarksFold(
		marked ? slots : [],
		act === undefined ? undefined : { more: moreActs },
		floored ? 1 : 0,
	);
	const touch = useTouch();
	// The row is its own container: it stands the width of the list it is in, so
	// its measured width (`fold.narrow`) says whether the compact form is the one
	// that fits, whatever the device. A row with no meta has no second line to take.
	const compact = touch || (fold.narrow && hasMeta);
	// A row is one line unless it holds an entry or the steps (two) or wraps its
	// title whole; in the compact form a row with meta parts is two lines, the
	// parts under the title, since beside it they would be cut to nothing.
	const twoLined =
		entry !== undefined || listed !== undefined || (compact && hasMeta);
	// In the compact form a row with meta parts carries its value (an age, a
	// count) at the end of the meta line, so the end group keeps the marks and
	// the state pill, whose words never truncate.
	const inMeta = compact && trailing !== undefined && hasMeta;
	const lines = wrap ? "whole" : twoLined ? "two" : "one";
	const oneLine = lines === "one";
	// A wrapped title and an entry's input are lines under the first, so the
	// change mark, tick and tree lane beside them stand on that first line; the
	// end group stands on the row's centre whatever the lines.
	const top = wrap || entry !== undefined;
	// A model-written name (a `{ quoted }` run) wraps in a row that has a second line, so
	// its closing quote is never cut away; its row grows by the lines it wraps.
	const quotedWraps =
		!painted &&
		twoLined &&
		typeof plain === "object" &&
		!Array.isArray(plain) &&
		"quoted" in plain;
	const keepsWhole =
		compact && marked && (slots[0] === "chip" || slots[0] === "mark");
	const column = cn(
		ROW_TEXT,
		TEXT,
		floored && ROW_TEXT_FLOOR,
		floored && keepsWhole && COMPACT_YIELDS,
	);
	const folded = act !== undefined && !fold.stands;
	const slot = (
		kind: MarkKind,
		mark: ReactNode,
		place = slots.indexOf(kind),
	) =>
		marked ? (
			<MarkSlot
				key={`${kind}${place}`}
				at={place}
				shown={fold.shown}
				order={kind === "status" ? LAST : MARKS_FIRST}
				whole={kind === "chip"}
			>
				{mark}
			</MarkSlot>
		) : (
			mark
		);
	const inline = { label: entry?.label ?? "" };
	const entryReason = useReasonLine(painted ? undefined : entry?.act.blocked);
	// The pressed reason of the act, which its button and its line both read:
	// the row holds it, neither knows the other.
	const [stood, stand] = useState<string>();
	const actLine =
		act === undefined || painted || folded ? null : (
			<ActLine act={act} stood={stood} />
		);
	// A blocked tick's reason follows the first part, ahead of the later ones.
	const [first, ...rest] = meta ?? [];
	const parts: Run[] = [];
	if (first !== undefined) parts.push(first);
	if (blocked !== undefined) parts.push(blocked);
	parts.push(...rest);
	// A part that is one span of code, alone on its line, cuts in its middle;
	// beside other parts it is a run in the text.
	const [only] = parts;
	const coded =
		!painted && !inMeta && parts.length === 1 && only && isCode(only)
			? only
			: undefined;
	// A painted meta line is one filler per part the slot gave, a slot that
	// gave the placeholder whole counting one.
	const painters = waitsMeta ? (meta?.length ? paintedParts(meta) : 0) : 0;
	let trailed: ReactNode = null;
	if (trailing && !inMeta)
		trailed = (
			<span className={cn(ROW_TRAILING, TRAILING, VALUE)}>
				{painted ? <Painted role="figure" at={at} /> : trailingWord(trailing)}
			</span>
		);
	const marks = marked ? (
		<span ref={fold.group} className={cn(ROW_MARKS, MARKS)}>
			{status
				? slot(
						"status",
						<RowStatusMark
							status={status}
							bare={fold.bare}
							word={fold.word}
							painted={painted}
						/>,
					)
				: null}
			{warning !== undefined
				? slot("warning", <WarningMark label={warning} painted={painted} />)
				: null}
			{lock !== undefined
				? slot(
						"lock",
						<LockMark
							reason={lock}
							href={lockHref}
							labelled
							painted={painted}
						/>,
					)
				: null}
			{chip
				? slot(
						"chip",
						<span className={CHIP_MARK}>
							<ChipBase family={chip.family} label={chip.label} compact whole />
						</span>,
					)
				: null}
			{booleans?.map((mark, index) =>
				slot(
					"mark",
					<BooleanMark mark={mark} />,
					slots.indexOf("mark") + index,
				),
			)}
		</span>
	) : null;
	// The title, in the form its data takes: words (they wrap in a row with a
	// label, truncate in one without), a status's pill, an identifier in the
	// mono or the absent word.
	let titleLine: ReactNode = null;
	if (hasTitle) {
		const whole = wrap || quotedWraps;
		const box = cn(
			rowTitle({ form: rowTitleForm(dim) }),
			whole ? TITLE_WHOLE : cn(TITLE, compact && TITLE_COMPACT),
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
			const { stem, tail } = valueCut(plain.code);
			titleLine = <IdValue stem={stem} tail={tail} />;
		} else if (isAbsent(plain)) {
			titleLine = (
				<span className={cn(box, DEFINITION_ABSENT)}>{plain.absent}</span>
			);
		} else if (isStatus(plain)) {
			titleLine = (
				<span className={VALUE_STATUS}>
					<StatusBase tone={plain.status} label={plain.label} compact />
				</span>
			);
		} else if (plain !== undefined && isCode(plain)) {
			titleLine = (
				<span
					className={cn(
						rowTitle({ form: rowTitleForm(dim) }),
						TITLE_CODE,
						oneLine && hasMeta && INLINE_TITLE,
					)}
				>
					<CodeCut code={plain.code} fit="name" />
				</span>
			);
		} else if (plain !== undefined) {
			titleLine = (
				<span className={box}>
					{typeof plain === "string" ? (
						plain
					) : (
						<RunText runs={runsOf(plain as Run | Runs)} />
					)}
				</span>
			);
		}
	}
	// The meta parts, drawn once: after the title on its line in a one-line row,
	// under it in a wrapped one.
	const metaNode = painters ? (
		<span
			className={cn(
				text({ role: "meta" }),
				FIGURES,
				META_PAINTED,
				oneLine && "min-w-0",
			)}
		>
			{Array.from({ length: painters }, (_, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: the fillers are fixed-order and never reorder, so position is the identity
				<Fragment key={index}>
					{index > 0 ? " · " : null}
					<Painted role="phrase" at={at + index} />
				</Fragment>
			))}
			{inMeta ? (
				<>
					{" · "}
					<Painted role="figure" at={at} />
				</>
			) : null}
		</span>
	) : parts.length === 0 ? null : (
		<span
			className={cn(
				text({ role: "meta" }),
				FIGURES,
				coded
					? META_CODE
					: oneLine
						? META_INLINE
						: compact
							? META_FREE
							: META_LINES,
			)}
		>
			{coded ? (
				<CodeCut code={coded.code} />
			) : (
				<RunText runs={metaRuns(parts, META_CUT)} />
			)}
			{inMeta && trailing ? (
				<>
					{META_TAIL}
					{trailingWord(trailing)}
				</>
			) : null}
		</span>
	);
	// The control of a fact: its switch, in the end group, or the failure mark
	// and the retry in the failed form.
	const control = ended ? (
		<span
			data-whole=""
			className={cn("flex items-center", ROW_END, POINTED, AFTER)}
		>
			<FailedMark />
			{failed ? <RetryMark busy={busy} /> : null}
		</span>
	) : toggle ? (
		<span data-whole="" className={cn(CONTROL, POINTED, AFTER)}>
			<HeldSwitch {...toggle} label={painted ? "" : named} painted={inert} />
		</span>
	) : null;
	const copyAct = ended ? null : waitsTitle && isCopy(shape) ? (
		<IconButtonBase icon="Copy" label="" painted />
	) : copied === undefined ? null : (
		<CopyAct label={labelText ?? copied} value={copied} />
	);
	const acted = act !== undefined || moreActs;
	const grows =
		pick !== undefined ||
		(act !== undefined && (isSelection(act) || act.icon === undefined));
	const acting = acted || copyAct !== null;
	const folding = tree ? treeFold(tree, named, words) : null;
	const hasEnd =
		folding !== null ||
		trailed !== null ||
		marks !== null ||
		control !== null ||
		pick !== undefined ||
		acting;
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
	const textGroup =
		titleLine === null && metaNode === null ? null : entry ? (
			<Field.Root
				ref={(node) => {
					fold.text.current = node;
				}}
				invalid={!painted && Boolean(entry.error)}
				className={cn(ROW_ENTRY, column)}
			>
				{titleLine}
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
					</span>
					<ActButton
						act={entry.act}
						host={entryReason.host}
						painted={painted}
						at={at}
					/>
				</span>
				{entry.error && !painted ? (
					<Field.Error
						key={entry.error}
						match
						className={cn(FIELD_ERROR_LINE, LINE_IN)}
					>
						{entry.error}
					</Field.Error>
				) : null}
				{entryReason.line}
				{actLine}
			</Field.Root>
		) : listed ? (
			<span ref={fold.text} className={column}>
				{titleLine}
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
		) : (
			<span ref={fold.text} className={column}>
				{oneLine && titleLine !== null && metaNode !== null ? (
					<span className={cn(ROW_INLINE, INLINE)}>
						{titleLine}
						{metaNode}
					</span>
				) : (
					<>
						{titleLine}
						{metaNode}
					</>
				)}
				{actLine}
			</span>
		);
	const body = (
		<>
			{tree ? <TreeLead tree={tree} lines={lines} /> : null}
			{change ? (
				<First on={top}>
					<ChangeMark kind={change} />
				</First>
			) : null}
			{leading ? (
				<First on={top}>
					<span
						className={cn(
							"status" in leading ? ROW_LEADING_STATUS : ROW_LEADING,
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
			{textGroup}
			{hasEnd ? (
				<span
					ref={fold.end}
					className={cn(
						ROW_END,
						END,
						END_SELF,
						!grows && END_LINE,
						keepsWhole && MARKED_END,
					)}
				>
					{trailed}
					{marks}
					{control}
					{pick ? (
						<span className={cn("flex min-w-0", POINTED, AFTER)}>
							<HeldPicker {...pick} fit="row" painted={inert} tabIndex={rove} />
						</span>
					) : null}
					{acting ? (
						<span ref={fold.acts} className={cn(ROW_ACTS, ACTS, AFTER)}>
							{act ? (
								<span
									ref={fold.slot}
									inert={folded || undefined}
									className={folded ? ACT_FOLDED : ACT_SLOT}
								>
									{painted ? (
										<PaintedAct at={at} />
									) : (
										<RowAct act={act} stand={stand} at={at} tabIndex={rove} />
									)}
								</span>
							) : null}
							{copyAct}
							{folded || (more !== undefined && hasMore(more)) ? (
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
										folded={folded ? act : undefined}
										named={named}
										tabIndex={rove}
									/>
								)
							) : null}
						</span>
					) : null}
					{folding ? (
						<span className={cn("flex", POINTED, AFTER)}>{folding}</span>
					) : null}
				</span>
			) : null}
		</>
	);
	return (
		<div
			{...treeItem}
			ref={labelled ? undefined : fold.row}
			inert={inert || undefined}
			className={cn(
				row({ state: current ? "selected" : "rest" }),
				labelled
					? cn(DEFINITION_BOX, ROW_LABELLED, twoLined && "items-start")
					: top
						? ROW_WHOLE
						: ROW,
				fades && BLOCK_IN,
				current ? CURRENT_BAR : CURRENT_ROOM,
				live && (current ? CHOSEN_PRESS : PRESS),
				tree && TREE_ITEM,
			)}
		>
			{hit}
			{labelled ? (
				<>
					<span className={DEFINITION_LABEL}>
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
						ref={fold.row}
						className={cn(
							DEFINITION_LINE,
							LINE,
							top ? "items-start" : "items-center",
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
	size?: number;
	place?: number;
	open?: boolean;
	tabbable?: boolean;
	fold?: (key: string) => void;
	/** The row arrived on its own after the Section was drawn. */
	arrived?: boolean;
}

function RowItemBase({
	item,
	id,
	index,
	painted,
	depth,
	size = 1,
	place = 1,
	open,
	tabbable = false,
	fold,
	arrived,
}: RowItemProps) {
	const tree: RowTree | undefined =
		depth === undefined
			? undefined
			: {
					depth,
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
		/>
	);
}

/** One row of a Section from its item: a refetch that changes one item renders that row alone. */
export const RowItem = memo(RowItemBase, sameBy("item", "arrived"));
