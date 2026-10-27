import {
	isSelection,
	paints,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import type {
	RowTitle,
	RowTrailing,
	Run,
	Runs,
} from "@fcalell/ui-core/descriptors";
import { isStatus, paintedParts, valueCut } from "@fcalell/ui-core/list-state";
import { isCurrent } from "@fcalell/ui-core/route";
import {
	CODE_NAME,
	DEFINITION_ABSENT,
	DEFINITION_LINE,
	FIELD_ERROR_LINE,
	FIGURES,
	ROW_ACTS,
	ROW_END,
	ROW_ENTRY,
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
	STATUS,
	text,
} from "@fcalell/ui-core/variants";
import { Fragment, memo, type ReactNode, useState } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import { ageShort } from "../../lib/age";
import { useClock } from "../../lib/clock";
import { cn } from "../../lib/cn";
import { CodeCut, RunText } from "../../lib/code";
import { FieldError } from "../../lib/field";
import { blockIn, FadingText, FadingView, lineIn } from "../../lib/motion";
import { open as follow, usePathname, useWarm } from "../../lib/navigate";
import { clipWhen, inertProps, Painted, PaintText } from "../../lib/paint";
import {
	filled,
	flowRuns,
	isCode,
	META_CUT,
	META_TAIL,
	metaParts,
	PARTS_LINE,
	PartItem,
	PartItems,
	runsOf,
	usePartsGap,
} from "../../lib/parts";
import { endedSentence, FailedMark, RetryMark, useRow } from "../../lib/read";
import { sameBy } from "../../lib/same-by";
import { useWords } from "../../lib/words";
import { IconButtonBase } from "../button/glyph";
import { ChipBase } from "../chip/base";
import { HeldInput } from "../input/base";
import { MenuBase } from "../menu/base";
import { HeldPicker } from "../picker/base";
import type { RowItem as RowItemData } from "../section";
import { StatusBase } from "../status/base";
import { ChangeMark } from "../status/change";
import { StatusDot } from "../status/dot";
import { HeldSwitch } from "../switch/base";
import {
	ActButton,
	ActLine,
	hasMore,
	PaintedAct,
	RowAct,
	RowMore,
	useReasonLine,
} from "./acts";
import { CopyAct, IdValue, isAbsent, isCopy, titleWords } from "./fact";
import { First, Leading, type RowTree, TreeFold, TreeLead } from "./leading";
import { LockMark } from "./lock";
import { BooleanMark, says, WarningMark } from "./marks";
import { RowStatusDot, RowStatusWord } from "./status";

// The row is one box: a flex line of its leading, its text group and its end
// group. A row with a label is a column on the phone: the label, then that
// same line at the row's whole width (a label column leaves an email or a
// domain no room).
const ROW = "relative flex-row items-center";
// A row whose title wraps whole, or that holds an entry, stands its change
// mark, tick and tree rails on the first line (each in a box one body line
// tall, centred on the line); its end group stays centred on the row.
const ROW_WHOLE = "relative flex-row items-start";
const ROW_LABELLED = "relative min-w-0";
// The line of a row with a label, under the label.
const LINE = "flex-row min-w-0";
// The hit covers the row under its text, its pick and its acts, and takes the
// press wash; the text lets a press through to it.
const HIT = "absolute inset-0 active:bg-wash-press";
const LEADING = "shrink-0 items-center justify-center";
// A tick takes its hit box, and its own touch.
const TICK = "size-target";
// The text group: the title over the meta line, a column that takes the room
// the end group leaves.
const TEXT = "flex-1 min-w-0";
const TITLE = "shrink";
// A title that is one span of code stands in a line of its own, so its stem
// truncates and its tail keeps the room it needs.
const TITLE_CODE = "flex-row items-center shrink min-w-0 overflow-hidden";
// With `wrap` the code stands whole, wrapping and breaking anywhere.
const CODE_WHOLE = "shrink min-w-0";
// A status title stands at the title's start, its dot and word whole.
const TITLE_STATUS = "flex-row items-center";
// The label wraps to the room its line leaves, in the meta ink: it names, and
// the value under it stands in the body ink.
const LABEL = "shrink min-w-0 text-ink-meta";
// The end group is a line centred on the row, whichever lines the text group
// holds: the value in it truncates to what the row leaves, the controls and the
// acts stand whole. A press on a row that opens goes through the group to the
// hit under it, so the group takes none itself but for what is a target of its
// own.
const END = "flex-row items-center self-center shrink min-w-0";
// A control stands whole at the row's end.
const CONTROL = "shrink-0 flex-row";
const TRAILING = "shrink min-w-0";
// A step is one body line's box tall (the step lists' 19 of the references,
// at the type scale's rung).
const STEPS = "min-w-0";
const STEP = "flex-row items-center min-w-0 h-line-body";
const STEP_LABEL = "shrink";
// The meta parts are one text a middle dot apart, which takes up to two lines
// and ends in an ellipsis at the end of the second: the dot is bound to the
// words beside it (`flowRuns`), so the text breaks only between a part's words
// and a line that breaks between two parts shows no dot at either end, and a
// part that does not fit is cut where the line ends. A lone
// `{ code }` part wraps as the parts do, so a command is read to its second
// line's end, and a code part stands bare in the mono, as a machine name in a
// row does; a painted line is one line.
// The meta line of a row with marks: the marks first, in order (the status, the
// warning, the lock, the chip, the boolean marks), a gap apart, as one item,
// then each part an item of the same line that wraps whole, led by its dot
// (`PartItems`): a part stands beside the marks where the line holds it, and
// the dot of a part that starts a line is clipped away at the line's start.
// A lock that links takes the press, so the line lets it through (`box-none`)
// and the rest of the line holds none. A status leads the line from a lane of
// its own (`RowStatusDot`), its word the line's first mark, so a line the marks
// or parts wrap to starts under the word, never under the dot: a hanging
// start, the dot a status's gap before the line (`STATUS`), as it stands
// before its word in a `Status`.
const MARKED_LINE = "items-center";
const MARKED_HANG = "flex-row items-start min-w-0";
// Beside the lane the line takes the room left, so it wraps inside it.
const MARKED_HUNG = "flex-1";
const MARKED_MARKS = "flex-row flex-wrap items-center min-w-0";
const CHIP_MARK = "flex-row shrink min-w-0";
const ACTS = "flex-row shrink-0 items-center";
// The entry takes the touch itself: the input filling the room its act leaves.
const ENTRY = "flex-row items-center min-w-0";
const ENTRY_FIELD = "flex-1 min-w-0";

/** What a Section hands the rows it draws; no app sets them, so they are outside the items. */
export interface RowInternal {
	/** The row's place in a tree Section: its depth (the roots 0) and, for a branch, whether its children are drawn and how to fold them. */
	tree?: RowTree;
	/** The Section's items are not here: every part paints at its role, the row takes no touch and builds no hit. */
	painted?: boolean;
	/** The row's place among the painted rows, which varies the filler's lengths. */
	at?: number;
	/** The row came to a Section already drawn, on its own: it fades in as it mounts. */
	arrived?: boolean;
}

/** The fields a row takes: a row item's, its reads widened to a `Datum`. */
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

/** The one row of a Section's sheet, whatever it holds. Its box is a line of three groups: a leading slot (the change mark, then the leading mark: a glyph, a status dot, an avatar, a type's mark or a tick; a tree's rails), a text group (the title over the meta line, which a row's marks lead: the status's dot and word, a warning, a lock, a chip, a ring or flag, each its glyph and word, then the meta parts, the line wrapping whole) and an end group, in one order: the trailing value (cut to the room the rest leave), a switch, a pick, the act (an icon act, its label the accessible name; the row's other acts are its `more`), the copy act, the more act, a tree's fold. The phone is always compact: the meta stands under the title, and a row with a mark is two lines, and a row with a `label` stands the label (the body role in the meta ink, the code role for a `{ code }` label) over that line; a row with a label and nothing else in its text group draws the label as its text, on the line its end group shares. One lock mark: the meta glyph and its reason, a link to what holds the fact with an `href`, inert without one. A row that opens (`href` or `onOpen`) draws no chevron: it is one hit, washing under the press, current when `selected` or at its `href`. A title truncates on one line unless `wrap` (a code title cuts in its middle); the end group is centred on the row; an absent word is in the meta ink, a status title is a dot and its word at the title's start, a copyable code is the mono and a copy act. The painted form is the loaded one with every part in its filler, inert; a title or meta that is a selection paints in its place until its read lands. The row is the frame of the selections it draws (`title`, `meta`): one that failed, with no frame above holding it, makes the failed form (the label stays, the end shows the failure mark and the retry icon, the meta line reads "This didn't load.", and pressing the row retries). Outside the package's exports. */
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
	const pathname = usePathname();
	const warm = useWarm();
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
		!inert && (selected || (href !== undefined && isCurrent(href, pathname)));
	const opens =
		!inert && !ended && (href !== undefined || onOpen !== undefined);
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
	// A row is two lines where it holds a mark, an entry or the steps, and where
	// it has meta parts: the phone is always compact.
	const lined = Boolean(
		entry || listed || hasMeta || blocked !== undefined || marked,
	);
	// A pick is a control that cannot truncate, so beside one the text group has
	// no floor and gives way to it.
	const floored = pick === undefined;
	// A lock that links takes the press, so the text group lets it through and
	// the rest of its lines hold none.
	const linked = marked && lockHref !== undefined && !painted;
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
	const painters = waitsMeta && meta?.length ? paintedParts(meta) : 0;
	const metaRole = cn(text({ role: "meta" }), FIGURES);
	const partsGap = usePartsGap();
	const trailed =
		trailing !== undefined ? (
			<PaintText
				fills="figure"
				painted={painted}
				numberOfLines={1}
				pointerEvents="none"
				{...clipWhen(painted)}
				className={cn(ROW_TRAILING, TRAILING)}
			>
				{painted ? <Painted role="figure" at={at} /> : trailingWord(trailing)}
			</PaintText>
		) : null;
	// The marks, each whole, in their order at the meta line's start.
	const marks = marked ? (
		<>
			{status ? (
				<RowStatusWord
					status={status}
					chip={chip !== undefined}
					painted={painted}
				/>
			) : null}
			{warning !== undefined ? (
				<WarningMark label={warning} painted={painted} />
			) : null}
			{lock !== undefined ? (
				<LockMark reason={lock} href={lockHref} labelled painted={painted} />
			) : null}
			{chip ? (
				<View pointerEvents="none" className={CHIP_MARK}>
					<ChipBase family={chip.family} label={chip.label} compact />
				</View>
			) : null}
			{facts.map((mark) => (
				<BooleanMark key={mark.label} mark={mark} />
			))}
		</>
	) : null;
	// A linked lock leaves the press to itself: every other part of the text
	// group holds none.
	const passive = (node: ReactNode) =>
		linked && node !== null ? <View pointerEvents="none">{node}</View> : node;
	// The title, in the form its data takes: words (they wrap in a row with a
	// label, truncate in one without), a status, an identifier in the mono or
	// the absent word.
	const titleRole = rowTitle({ form: rowTitleForm(dim) });
	// A model-written name (a `{ quoted }` run) wraps in a row that has a second line, so
	// its closing quote is never cut away; its row grows by the lines it wraps.
	const quotedWraps =
		!painted &&
		lined &&
		typeof plain === "object" &&
		!Array.isArray(plain) &&
		"quoted" in plain;
	const whole = wrap || quotedWraps;
	const box = cn(titleRole, FIGURES, TITLE);
	let titleLine: ReactNode = null;
	if (hasTitle) {
		if (waitsTitle) {
			if (isStatus(shape))
				titleLine = (
					<View className={TITLE_STATUS}>
						<StatusBase painted />
					</View>
				);
			// The id's one position, in this form and the loaded one, so the slot
			// that waited is the slot that arrived.
			else if (isCopy(shape)) titleLine = <IdValue painted at={at} />;
			else
				titleLine = (
					<PaintText
						painted
						numberOfLines={whole ? undefined : 1}
						{...clipWhen(true)}
						className={box}
					>
						<Painted role="title" at={at} />
					</PaintText>
				);
		} else if (isCopy(plain)) {
			const { stem, tail } = valueCut(plain.code);
			titleLine = whole ? (
				<IdValue stem={plain.code} value={plain.code} whole />
			) : (
				<IdValue stem={stem} tail={tail} value={plain.code} />
			);
		} else if (isAbsent(plain)) {
			titleLine = (
				<RNText
					numberOfLines={whole ? undefined : 1}
					className={cn(box, DEFINITION_ABSENT)}
				>
					{plain.absent}
				</RNText>
			);
		} else if (isStatus(plain)) {
			titleLine = (
				<View className={TITLE_STATUS}>
					<StatusBase tone={plain.status} label={plain.label} />
				</View>
			);
		} else if (plain !== undefined && isCode(plain)) {
			titleLine = (
				<View className={TITLE_CODE}>
					{whole ? (
						<RNText className={cn(titleRole, CODE_NAME, CODE_WHOLE)}>
							{plain.code}
						</RNText>
					) : (
						<CodeCut code={plain.code} role={titleRole} />
					)}
				</View>
			);
		} else if (plain !== undefined) {
			titleLine = (
				<RNText numberOfLines={whole ? undefined : 1} className={box}>
					{typeof plain === "string" ||
					(!Array.isArray(plain) && "quoted" in plain) ? (
						titleWords(plain)
					) : (
						<RunText runs={runsOf(plain as Run | Runs)} fit="name" />
					)}
				</RNText>
			);
		}
	}
	// The meta parts, drawn once, under the title: one text, or after the
	// marks, each part an item of the marks' line. A painted line is the
	// fillers on one line.
	const metaNode = painters ? (
		<PaintText
			fills="phrase"
			painted
			numberOfLines={1}
			{...clipWhen(true)}
			className={metaRole}
		>
			{Array.from({ length: painters }, (_, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: the fillers are fixed-order and never reorder, so position is the identity
				<Fragment key={index}>
					{index > 0 ? META_TAIL : null}
					<Painted role="phrase" at={at + index} />
				</Fragment>
			))}
		</PaintText>
	) : parts.length === 0 || marked ? null : coded ? (
		<RNText numberOfLines={2} className={cn(metaRole, CODE_NAME)}>
			{coded.code}
		</RNText>
	) : (
		<RNText numberOfLines={2} className={metaRole}>
			<RunText runs={flowRuns(metaParts(parts, META_CUT))} fit="name" />
		</RNText>
	);
	// A row with marks stands them and its parts in one line under the title:
	// the marks one item, each part one more, led by its dot, which a part that
	// starts a line leaves clipped away (`PARTS_LINE`).
	const markedLine = marked ? (
		<View
			pointerEvents={linked ? "box-none" : "none"}
			style={{ columnGap: partsGap }}
			className={cn(PARTS_LINE, MARKED_LINE, status && MARKED_HUNG)}
		>
			<View
				pointerEvents={linked ? "box-none" : "none"}
				className={cn(ROW_META_LINE, MARKED_MARKS)}
			>
				{marks}
			</View>
			{painters ? (
				<PartItem gap={partsGap} led className={metaRole}>
					{metaNode}
				</PartItem>
			) : parts.length === 0 ? null : (
				<PartItems
					parts={coded ? [[coded]] : metaParts(parts, META_CUT)}
					gap={partsGap}
					led
					className={metaRole}
				/>
			)}
		</View>
	) : null;
	const metaLine =
		marked && status ? (
			<View
				pointerEvents={linked ? "box-none" : "none"}
				className={cn(STATUS, MARKED_HANG)}
			>
				<RowStatusDot
					status={status}
					chip={chip !== undefined}
					painted={painted}
				/>
				{markedLine}
			</View>
		) : marked ? (
			markedLine
		) : (
			metaNode
		);
	const column = cn(ROW_TEXT, TEXT, floored && ROW_TEXT_FLOOR);
	const textual = titleLine !== null || metaLine !== null || lined;
	const labelNode = labelled ? (
		<PaintText
			fills="name"
			painted={painted}
			{...clipWhen(painted)}
			className={cn(
				text({ role: typeof label === "object" ? "code" : "body" }),
				LABEL,
			)}
		>
			{painted ? <Painted role="name" at={at} /> : labelText}
		</PaintText>
	) : null;
	// Without a title, a meta line or an entry, a row with a label draws the
	// label as its text, on the line the end group shares; otherwise the label
	// stands over the line.
	const aside = labelled && !textual;
	const above = labelled && !aside;
	let textGroup: ReactNode = null;
	if (aside)
		textGroup = (
			<View pointerEvents="none" className={column}>
				{labelNode}
			</View>
		);
	else if (textual && entry)
		textGroup = (
			<View pointerEvents="box-none" className={cn(ROW_ENTRY, column)}>
				{titleLine}
				<FieldError.Provider value={!painted && Boolean(entry.error)}>
					<View className={cn(ROW_META_LINE, ENTRY)}>
						<View className={ENTRY_FIELD}>
							<HeldInput
								inline={inline}
								value={entry.field.value}
								onChange={entry.field.onChange}
								onCommit={entry.field.onCommit}
								placeholder={entry.placeholder}
								painted={painted}
							/>
						</View>
						<ActButton
							act={entry.act}
							host={entryReason.host}
							painted={painted}
							at={at}
						/>
					</View>
				</FieldError.Provider>
				{entry.error && !painted ? (
					<FadingText
						key={entry.error}
						entering={lineIn()}
						className={FIELD_ERROR_LINE}
					>
						{entry.error}
					</FadingText>
				) : null}
				{entryReason.line}
				{actLine}
			</View>
		);
	else if (textual && listed)
		textGroup = (
			<View pointerEvents="none" className={column}>
				{titleLine}
				<View className={cn(ROW_STEPS, STEPS)}>
					{listed.map((step, index) => (
						<View
							// biome-ignore lint/suspicious/noArrayIndexKey: the steps are fixed-order data that never reorder, so position is the identity
							key={index}
							className={cn(ROW_META_LINE, STEP)}
						>
							<StatusDot
								tone={painted ? "done" : step.tone}
								painted={painted}
							/>
							<PaintText
								fills="phrase"
								painted={painted}
								numberOfLines={1}
								{...clipWhen(painted)}
								className={cn(
									rowStep({
										state:
											!painted && step.tone === "running" ? "running" : "rest",
									}),
									STEP_LABEL,
								)}
							>
								{painted ? (
									<Painted role="phrase" at={at + index} />
								) : (
									step.label
								)}
							</PaintText>
						</View>
					))}
				</View>
				{actLine}
			</View>
		);
	else if (textual)
		textGroup = (
			<View pointerEvents={linked ? "box-none" : "none"} className={column}>
				{passive(titleLine)}
				{metaLine}
				{passive(actLine)}
			</View>
		);
	// A wrapped title and an entry's input are lines under the title's first, so
	// the parts beside them stand on that first line.
	const top = wrap || entry !== undefined;
	// The control of a fact: its switch, in the end group, or the failure mark
	// and the retry in the failed form.
	const control = ended ? (
		<View className={cn(ROW_END, CONTROL)}>
			<FailedMark />
			{failed ? <RetryMark busy={busy} /> : null}
		</View>
	) : toggle ? (
		<View className={CONTROL}>
			<HeldSwitch {...toggle} label={painted ? "" : named} painted={inert} />
		</View>
	) : null;
	const copyAct = ended ? null : waitsTitle && isCopy(shape) ? (
		<IconButtonBase icon="Copy" label="" painted />
	) : copied === undefined ? null : (
		<CopyAct label={labelText ?? copied} value={copied} />
	);
	const acting = act !== undefined || moreActs || copyAct !== null;
	const hasEnd =
		trailed !== null ||
		control !== null ||
		pick !== undefined ||
		acting ||
		tree?.fold !== undefined;
	let hit: ReactNode = null;
	if (failed)
		hit = (
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={`${words.retry} ${named}`}
				onPress={() => {
					if (!busy) void retry();
				}}
				className={HIT}
			/>
		);
	else if (opens)
		hit = (
			<Pressable
				accessibilityRole={href !== undefined ? "link" : "button"}
				accessibilityLabel={named}
				accessibilityState={{ selected: current }}
				onPressIn={href !== undefined ? () => warm(href) : undefined}
				onPress={href !== undefined ? () => follow(href) : onOpen}
				className={HIT}
			/>
		);
	const body = (
		<>
			{tree ? <TreeLead tree={tree} /> : null}
			{change ? (
				<First on={top}>
					<ChangeMark kind={change} />
				</First>
			) : null}
			{leading ? (
				<First on={top}>
					<View
						pointerEvents={ticks ? "auto" : "none"}
						className={cn(
							"status" in leading ? ROW_LEADING_STATUS : ROW_LEADING,
							LEADING,
							ticks && TICK,
						)}
					>
						<Leading leading={leading} named={named} painted={painted} />
					</View>
				</First>
			) : null}
			{textGroup}
			{hasEnd ? (
				<View pointerEvents="box-none" className={cn(ROW_END, END)}>
					{trailed}
					{control}
					{pick ? <HeldPicker {...pick} fit="row" painted={inert} /> : null}
					{acting ? (
						<View className={cn(ROW_ACTS, ACTS)}>
							{act ? (
								painted ? (
									<PaintedAct at={at} icon />
								) : (
									<RowAct act={act} stand={stand} at={at} />
								)
							) : null}
							{copyAct}
							{moreActs ? (
								painted ? (
									<MenuBase
										label={`${words.more} ${named}`}
										title={named}
										items={[]}
										painted
									/>
								) : (
									<RowMore more={more} named={named} />
								)
							) : null}
						</View>
					) : null}
					{tree ? <TreeFold tree={tree} named={named} /> : null}
				</View>
			) : null}
		</>
	);
	return (
		<FadingView
			{...inertProps(inert)}
			// A row that came on its own once the list was drawn fades in as it mounts
			// (`entering` is read there, so the first render's value is held).
			entering={arrived ? blockIn() : undefined}
			className={cn(
				row({ state: current ? "selected" : "rest" }),
				above ? ROW_LABELLED : top ? ROW_WHOLE : ROW,
			)}
		>
			{hit}
			{above ? (
				<>
					<View pointerEvents="none">{labelNode}</View>
					<View
						pointerEvents="box-none"
						className={cn(
							DEFINITION_LINE,
							LINE,
							top ? "items-start" : "items-center",
						)}
					>
						{body}
					</View>
				</>
			) : (
				body
			)}
		</FadingView>
	);
}

/** What a Section hands the RowItem it draws; no app sets it. */
export interface RowItemProps {
	item: RowItemData;
	/** The item's key, which the tree's fold hears. */
	id: string;
	/** A painted row's place among the rows, which varies its fillers; a loaded row takes none, its place moving when a row lands above it. */
	index?: number;
	painted: boolean;
	/** In a tree: the row's depth and its fold (`open` on a branch alone, and `fold` hears the item's key). Flat so the memo compares them. */
	depth?: number;
	open?: boolean;
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
	open,
	fold,
	arrived,
}: RowItemProps) {
	const tree: RowTree | undefined =
		depth === undefined
			? undefined
			: {
					depth,
					fold:
						open === undefined
							? undefined
							: { open, onToggle: () => fold?.(id) },
				};
	const { key: _key, children: _children, group: _group, ...rest } = item;
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
