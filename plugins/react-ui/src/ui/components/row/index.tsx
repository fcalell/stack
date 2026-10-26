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
import { isStatus, paintedParts, valueCut } from "@fcalell/ui-core/list-state";
import { isCurrent } from "@fcalell/ui-core/route";
import {
	BLOCK_IN,
	CODE_NAME,
	DEFINITION_ABSENT,
	DEFINITION_BOX,
	DEFINITION_LABEL,
	DEFINITION_LINE,
	DEFINITION_NAME,
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
import { useTouch } from "../../lib/media.ts";
import { follow, navigate, useRoute } from "../../lib/navigate.ts";
import { Painted } from "../../lib/paint.tsx";
import {
	DOT,
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
import { BooleanMark, says, WarningMark } from "./marks.tsx";
import { RowStatusMark } from "./status.tsx";

// The row is one box on the sheet's rows: a flex line of its leading, its text
// group and its end group. A row with a label is the two columns of the sheet
// (`DEFINITION_BOX`, a subgrid of `ROWS`): the label in the first and the same
// line in the second, so every label of a Pane stands in one column as wide as
// the widest.
const ROW = "relative flex items-center min-h-row";
// A row whose title wraps whole, that holds an entry, or that has a label stands
// its change mark, tick and tree lane on the first line; its end group stays
// centred on the row (on the value line, for a row with a label). A label
// stands on the first line too, beside a value that wraps or is two lines, so
// it shares the first line's baseline (structure 21) as on a one-line row.
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
// The text group keeps its floor of two fifths of the row (`ROW_TEXT_FLOOR`),
// the end group taking the rest. A row with meta parts and nothing else under
// its title is one line where it is wide enough and two below (the `row`
// container, `ROW_ONE_LINE`: a rule of the row's width, never a measure of its
// content); on touch it is two lines at every width, and a row with a mark, an
// entry or the steps at every width and on every device.
const CONTAINED = "@container/row";
// In the two-line form a name wraps to a second line before it is cut (voice 14).
const TITLE_COMPACT = "line-clamp-2 whitespace-normal break-words";
const TITLE_ADAPTS =
	"row-two-line:line-clamp-2 row-two-line:whitespace-normal row-two-line:break-words";
const TEXT = "flex flex-col grow shrink-10000000 min-w-0";
const TITLE = "truncate";
const TITLE_WHOLE = "min-w-0";
// A title that is one span of code stands in a flex line, so its stem
// truncates and its tail keeps the room it needs; in a row that wraps it stands
// whole, breaking anywhere.
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
const TRAILING = "min-w-0 max-w-full truncate";
const CONTROL = "flex shrink-0";
// The meta parts are one run of text a middle dot apart. In a one-line row
// they follow the title on its line and are cut with an ellipsis at the end of
// it (`META_INLINE`); under a wrapped title (`wrap`) they take up to two lines
// and end in an ellipsis at the end of the second (`META_LINES`): a part wraps
// by its words and its separator goes with the part before it (`metaRuns`), so
// a wrapped line never starts on a dot. In the two-line form they wrap whole
// (`META_FREE`). A lone
// `{ code }` part in a one-line row is one line that cuts in its middle
// (`valueCut`); in the two-line form it wraps whole as the parts do, breaking
// anywhere, so a command is read to its end. A code part stands bare in the
// mono, as a machine name in a row does. A painted line is one line.
const META_LINES = "line-clamp-2 break-words";
const META_FREE = "break-words";
const META_INLINE = "min-w-0 shrink truncate";
const META_ADAPTS = "row-two-line:whitespace-normal row-two-line:break-words";
const META_CODE = "flex min-w-0";
const META_PAINTED = "truncate";
// The meta line of a row with marks: the marks first, in order (the status, the
// warning, the lock, the chip, the boolean marks), a gap apart, then the parts,
// wrapping whole. The middle dot between the marks and the parts ends the
// last mark, bound to it as one item on its last line's baseline, and a word's
// space follows it, so the dot stands one spacing from each side, as between
// two parts; where the parts wrap to a line of their own, the marks' line ends
// on the dot and the parts' line starts on a word, as a wrapped run of parts
// does (`metaRuns`).
const MARKED_LINE = "flex flex-wrap items-center min-w-0";
const MARKED_MARKS = "flex flex-wrap items-center min-w-0";
const MARKED_PARTS = "min-w-0";
const MARKED_LAST = "flex items-baseline-last min-w-0";
const MARKED_SEP = "shrink-0";
// The middle dot that ends the marks ahead of the parts, a space on each side.
const MARKED_DOT = "\u00A0·\u00A0";
const CHIP_MARK = "flex shrink-0";
// A one-line row's text: the title and the meta parts after it on one line. The
// title keeps its whole width up to the group's and is cut only once the meta
// is gone; below the row's one-line width the parts stand under it.
const INLINE = "flex items-center min-w-0";
const INLINE_ADAPTS =
	"row-two-line:flex-col row-two-line:items-stretch row-two-line:gap-0";
const INLINE_TITLE = "shrink-0 max-w-full";
// A step is one body line's box tall (the step lists' 19 of the references,
// at the type scale's rung), its label truncating before its mark does.
const STEPS = "flex flex-col min-w-0";
const STEP = "flex items-center min-w-0 h-line-body";
const STEP_LABEL = "truncate";
const ACTS = "flex shrink-0 items-center pointer-events-auto";
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

/** The one row of a Section's sheet, whatever it holds. Its box is a line of three groups: a leading slot (the change mark, then the leading mark: a glyph, a status dot, an avatar, a type's mark or a tick; a tree's rails), a text group (the title over the meta line, which a row's marks lead: the status's dot and word, a warning, a lock, a chip, a ring or flag, each its glyph and word) and an end group, in one order: the trailing value, a switch, a pick, the act (an icon act), the copy act, the more act, a tree's fold. A row with a `label` stands in the sheet's two columns, the label in the first at the body role in the meta ink (a `code` label in the code role) in a column as wide as the widest label of the Pane, and the line in the second; on touch the line stands under the label. A row without one spans the sheet from its start. One lock mark: the meta glyph and its reason, a link to what holds the fact with an `href`, inert without one. A row that opens (`href` or `onOpen`) draws no chevron: it is one hit, washing under the pointer, current (the bar) when `selected` or at its `href`. A title truncates on one line unless `wrap`, whether the row has a label or not, and the meta stands after it where the row is one line and under it where it is two: on touch, below the row's one-line width (`ROW_ONE_LINE`, a container query, never a measure) and wherever the row has a mark; the end group is centred on the row; an absent word is in the meta ink, a status is its compact pill at the title's start, a copyable code is the mono and, too long for its room, cut in its middle. The painted form is the loaded one with every part in its filler, inert. The row is the frame of the selections it draws (`title`, `meta`): one that failed, with no frame above holding it, makes the failed form (the label stays, the end shows the failure mark and the retry icon, the meta line reads "This didn't load.", and pressing the row retries). Outside the package's exports. */
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
	// A ring that does not hold says no fact, so it draws nothing.
	const facts = booleans?.filter(says) ?? [];
	// The marks lead the meta line; an entry or the steps stand in its place, as
	// the meta line does.
	const marked =
		entry === undefined &&
		!listed &&
		(status !== undefined ||
			warning !== undefined ||
			lock !== undefined ||
			chip !== undefined ||
			facts.length > 0);
	const touch = useTouch();
	// A row is two lines where it holds an entry, the steps or a mark, and on
	// touch where it has meta parts; one with meta parts and nothing else under
	// its title is one line where the row is wide enough, two below
	// (`row-two-line:`). A row with no meta has no second line to take.
	const twoLined =
		entry !== undefined || listed !== undefined || marked || (touch && hasMeta);
	const adapts = !twoLined && !wrap && hasMeta;
	const lines = wrap ? "whole" : twoLined ? "two" : "one";
	const oneLine = lines === "one";
	// The row is the `row` container where its form is the container's to decide:
	// its title wraps to a second line below the row's one-line width.
	const contained = !touch && (adapts || marked);
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
	const column = cn(ROW_TEXT, TEXT, pick === undefined && ROW_TEXT_FLOOR);
	const inline = { label: entry?.label ?? "" };
	const entryReason = useReasonLine(painted ? undefined : entry?.act.blocked);
	// The pressed reason of the act, which its button and its line both read:
	// the row holds it, neither knows the other.
	const [stood, stand] = useState<string>();
	const actLine =
		act === undefined || painted ? null : <ActLine act={act} stood={stood} />;
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
		!painted && parts.length === 1 && only && isCode(only) ? only : undefined;
	// A painted meta line is one filler per part the slot gave, a slot that
	// gave the placeholder whole counting one.
	const painters = waitsMeta ? (meta?.length ? paintedParts(meta) : 0) : 0;
	const trailed = trailing ? (
		<span className={cn(ROW_TRAILING, TRAILING)}>
			{painted ? <Painted role="figure" at={at} /> : trailingWord(trailing)}
		</span>
	) : null;
	// The marks, each whole, in their order at the meta line's start.
	const markList: [key: string, mark: ReactNode][] = [];
	if (marked) {
		if (status)
			markList.push([
				"status",
				<RowStatusMark key="status" status={status} painted={painted} />,
			]);
		if (warning !== undefined)
			markList.push([
				"warning",
				<WarningMark key="warning" label={warning} wraps painted={painted} />,
			]);
		if (lock !== undefined)
			markList.push([
				"lock",
				<LockMark
					key="lock"
					reason={lock}
					href={lockHref}
					labelled
					painted={painted}
				/>,
			]);
		if (chip)
			markList.push([
				"chip",
				<span key="chip" className={CHIP_MARK}>
					<ChipBase family={chip.family} label={chip.label} compact whole />
				</span>,
			]);
		for (const mark of facts)
			markList.push([
				`fact-${mark.label}`,
				<BooleanMark key={`fact-${mark.label}`} mark={mark} />,
			]);
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
				: cn(TITLE, touch && TITLE_COMPACT, contained && TITLE_ADAPTS),
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
					<StatusBase tone={plain.status} label={plain.label} compact />
				</span>
			);
		} else if (plain !== undefined && isCode(plain)) {
			titleLine = whole ? (
				<span
					className={cn(rowTitle({ form: rowTitleForm(dim) }), TITLE_WHOLE)}
				>
					<code className={cn(CODE_NAME, CODE_WHOLE)}>{plain.code}</code>
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
						plain
					) : (
						<RunText
							runs={runsOf(plain as Run | Runs)}
							whole={whole}
							fit="name"
						/>
					)}
				</span>
			);
		}
	}
	// The meta parts, drawn once: after the title on its line in a one-line row,
	// under it in a wrapped one; after the marks, past the dot that ends them.
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
					{index > 0 ? DOT : null}
					<Painted role="phrase" at={at + index} />
				</Fragment>
			))}
		</span>
	) : parts.length === 0 ? null : (
		<span
			className={cn(
				text({ role: "meta" }),
				FIGURES,
				coded && oneLine
					? META_CODE
					: marked
						? cn(META_FREE, MARKED_PARTS)
						: oneLine
							? cn(META_INLINE, adapts && META_ADAPTS)
							: touch
								? META_FREE
								: META_LINES,
			)}
		>
			{coded ? (
				oneLine ? (
					<CodeCut code={coded.code} />
				) : (
					<code className={cn(CODE_NAME, CODE_WHOLE)}>{coded.code}</code>
				)
			) : (
				<RunText runs={metaRuns(parts, META_CUT)} fit="name" />
			)}
		</span>
	);
	// A row with marks stands them and its parts in one line under the title,
	// the marks ended by the meta line's middle dot, which stays on the marks'
	// line where the parts wrap to one of their own.
	const lastMark = markList.length - 1;
	const metaLine = marked ? (
		<span className={MARKED_LINE}>
			<span className={cn(ROW_META_LINE, MARKED_MARKS)}>
				{markList.map(([key, mark], at) =>
					at === lastMark && metaNode !== null ? (
						<span key={key} className={MARKED_LAST}>
							{mark}
							<span
								aria-hidden
								className={cn(text({ role: "meta" }), MARKED_SEP)}
							>
								{MARKED_DOT}
							</span>
						</span>
					) : (
						mark
					),
				)}
			</span>
			{metaNode}
		</span>
	) : (
		metaNode
	);
	// The control of a fact: its switch, in the end group, or the failure mark
	// and the retry in the failed form.
	const control = ended ? (
		<span className={cn("flex items-center", ROW_END, POINTED)}>
			<FailedMark />
			{failed ? <RetryMark busy={busy} /> : null}
		</span>
	) : toggle ? (
		<span className={cn(CONTROL, POINTED)}>
			<HeldSwitch {...toggle} label={painted ? "" : named} painted={inert} />
		</span>
	) : null;
	const copyAct = ended ? null : waitsTitle && isCopy(shape) ? (
		<IconButtonBase icon="Copy" label="" painted />
	) : copied === undefined ? null : (
		<CopyAct label={labelText ?? copied} value={copied} />
	);
	const acted = act !== undefined || moreActs;
	const acting = acted || copyAct !== null;
	const folding = tree ? treeFold(tree, named, words) : null;
	const hasEnd =
		folding !== null ||
		trailed !== null ||
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
		titleLine === null && metaLine === null ? null : entry ? (
			<Field.Root
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
			<span className={column}>
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
			<span className={column}>
				{oneLine && titleLine !== null && metaNode !== null ? (
					<span className={cn(ROW_INLINE, INLINE, adapts && INLINE_ADAPTS)}>
						{titleLine}
						{metaNode}
					</span>
				) : (
					<>
						{titleLine}
						{metaLine}
					</>
				)}
				{actLine}
			</span>
		);
	const body = (
		<>
			{tree ? <TreeLead tree={tree} lines={lines} adapts={adapts} /> : null}
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
				<span className={cn(ROW_END, END, END_SELF, END_LINE)}>
					{trailed}
					{control}
					{pick ? (
						<span className={cn("flex min-w-0", POINTED)}>
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
							{more !== undefined && hasMore(more) ? (
								painted ? (
									<MenuBase
										label={`${words.more} ${named}`}
										title={named}
										items={[]}
										painted
									/>
								) : (
									<RowMore more={more} named={named} tabIndex={rove} />
								)
							) : null}
						</span>
					) : null}
					{folding ? (
						<span className={cn("flex", POINTED)}>{folding}</span>
					) : null}
				</span>
			) : null}
		</>
	);
	return (
		<div
			{...treeItem}
			inert={inert || undefined}
			className={cn(
				row({ state: current ? "selected" : "rest" }),
				labelled
					? cn(DEFINITION_BOX, ROW_LABELLED, (twoLined || top) && "items-start")
					: cn(top ? ROW_WHOLE : ROW, contained && CONTAINED),
				fades && BLOCK_IN,
				current && ROW_CURRENT_BAR,
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
						className={cn(
							DEFINITION_LINE,
							LINE,
							top ? "items-start" : "items-center",
							contained && CONTAINED,
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
