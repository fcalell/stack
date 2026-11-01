import { paints, useSelections } from "@fcalell/plugin-api/tanstack-query";
import type {
	RowTitle,
	RowTrailing,
	Run,
	Runs,
} from "@fcalell/ui-core/descriptors";
import { isStatus, valueCut } from "@fcalell/ui-core/list-state";
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
	ROW_TITLE_LINE,
	ROW_TRAILING,
	row,
	rowStep,
	rowTitle,
	rowTitleForm,
	text,
} from "@fcalell/ui-core/variants";
import { memo, type ReactNode, useState } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import { ageShort } from "../../lib/age";
import { useClock } from "../../lib/clock";
import { cn } from "../../lib/cn";
import { CodeCut, RunText } from "../../lib/code";
import { badgesOf, isCode, loneCode, META_TAIL, runsOf } from "../../lib/facts";
import { FieldError } from "../../lib/field";
import { blockIn, FadingText, FadingView, lineIn } from "../../lib/motion";
import { open as follow, usePathname, useWarm } from "../../lib/navigate";
import { clipWhen, inertProps, Painted, PaintText } from "../../lib/paint";
import { endedSentence, FailedMark, RetryMark, useRow } from "../../lib/read";
import { sameBy } from "../../lib/same-by";
import { useWords } from "../../lib/words";
import { IconButtonBase } from "../button/glyph";
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
import { BadgeLine, RowValue } from "./badges";
import { CopyAct, IdValue, isAbsent, isCopy, titleWords } from "./fact";
import {
	First,
	Leading,
	RailWash,
	type RowTree,
	TreeFold,
	TreeLead,
} from "./leading";
import { EndMark } from "./marks";

// No facts: one list, so a row without any reads the same selections each render.
const NO_FACTS: readonly unknown[] = [];

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
// A described value beside a control: the line wraps its end group under the
// text, at its end, a gap below it, where the text would fall under its floor.
const LINE_WRAPS = "flex-wrap gap-y-gap";
const TEXT_READS = "basis-measure-short";
const END_WRAPS = "ms-auto";
// The hit covers the row under its text, its pick and its acts, and takes the
// press wash; the text lets a press through to it.
const HIT = "absolute inset-0 active:bg-wash-press";
// A tree's child washes from its rail (`RailWash`), the indent before it its
// parent's ground: its selected wash a layer under its parts, and its press
// wash a layer in its hit, which still covers the row.
const CHILD_HIT = "absolute inset-0";
const CHILD_SELECTED = "bg-wash-selected rounded-row";
const CHILD_PRESSED = "bg-wash-press";
const LEADING = "shrink-0 items-center justify-center";
// A tick takes its hit box, and its own touch.
const TICK = "size-target";
// The text group: the title over the facts line, a column that takes the room
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
// A row of two lines stands its end group on the title's line, at its end,
// and its facts line the row's whole width under both (voice 14): the title's
// line is its own flex line, the end group on its first line box. A control
// taller than the line overflows it centred, into the row's gap.
const HEAD = "flex-row items-start min-w-0";
const END_HEAD = "flex-row items-center self-start shrink min-w-0 h-line-body";
// A control (a switch, a pick: its value is one word and a chevron) stands
// whole at the row's end.
const CONTROL = "shrink-0 flex-row";
// A trailing value truncates to the room it has; an age and a count are a few
// characters and stand whole.
const TRAILING = "shrink min-w-0";
const TRAILING_WHOLE = "shrink-0";
// A step is one body line's box tall (the step lists' 19 of the references,
// at the type scale's rung).
const STEPS = "min-w-0";
const STEP = "flex-row items-center min-w-0 h-line-body";
const STEP_LABEL = "shrink";
// The facts line under the title is badges (`BadgeLine`): each fact one box that
// never breaks inside, whole badges wrapping to the next line a badge's gap
// apart, a badge wider than the line cut inside itself. A lone `{ code }` fact
// is no badge but the row's value in the mono (`RowValue`), a failed row's
// sentence is text. A linked lock takes the press itself, so the line lets it
// through (`box-none`) and the rest of the line holds none.
const ACTS = "flex-row shrink-0 items-center";
// The entry takes the touch itself: the input filling the room its act leaves.
// The act's label is never cut and the input never squeezed under its reading
// floor (the short measure): where both do not fit side by side the act stands
// under the input at its own width, at the line's end, a gap below it, as a
// described value's end group does. The field's refusal stands in the field's
// own cell, under the input, so where the act wraps it stands between the two
// and never under the act it does not name.
const ENTRY = "flex-row flex-wrap items-start min-w-0 gap-y-gap";
const ENTRY_FIELD = "grow shrink min-w-0 gap-gap basis-measure-short";
const ENTRY_ACT = "shrink-0 max-w-full ms-auto";

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

/** The one row of a Section's sheet, whatever it holds. Its box is a line of three groups: a leading slot (the change mark, then the leading mark: a glyph, a status dot, an avatar, a type's mark or a tick; a tree's rails), a text group (the title over the facts line) and an end group, in one order: the marks whose words are not drawn (`words: false`: a glyph named by its label), the trailing value (cut to the room the rest leave), a switch, a pick, the act (an icon act, its label the accessible name; the row's other acts are its `more`), the copy act, the more act, a tree's fold. The phone is always compact: the facts stand under the title, and a row with a fact is two lines, and a row with a `label` stands the label (the body role in the meta ink, the code role for a `{ code }` label) over that line; a row with a label and nothing else in its text group draws the label as its text, on the line its end group shares. The facts line is badges (`BadgeLine`), one per fact in the order given and none a separator: a status (its tone mark and its word), a warning (its glyph and phrase), a chip (its family's dot, none for neutral, and its value), a ring or flag (its glyph and `label`) and each words fact (a `{ code }` run in the mono), a tick's blocked reason first and the row's one lock (the meta glyph and its reason, a link to what holds the fact with an `href`, inert without one) right after the status. A badge never breaks inside: whole badges wrap to the next line, one wider than the line is cut with an ellipsis inside its box, and each is read as its words (a status as its word). A linked lock is a press target of its own inside the row's hit, reaching the touch target by a hit slop. A lone `{ code }` fact is the row's value, the mono cut by the line and no badge; a failed row's sentence is text. A row that opens (`href` or `onOpen`) draws no chevron: it is one hit, washing under the press, current when `selected`, or at its `href` unless `selected` is `false`. A title truncates on one line unless `wrap` (a code title cuts in its middle); the end group is centred on the row; an absent word is in the meta ink, a status title is a dot and its word at the title's start, a copyable code is the mono and a copy act. The painted form is the loaded one with every part in its filler, inert, each badge its box with its words' filler; a title or facts that is a selection paints in its place until its read lands. The row is the frame of the selections it draws (`title`, `facts`): one that failed, with no frame above holding it, makes the failed form (the label stays, the end shows the failure mark and the retry icon, the facts line reads "This didn't load.", and pressing the row retries). Outside the package's exports. */
export function RowBase<V extends string | null = string>(props: RowProps<V>) {
	const {
		change: kind,
		label,
		leading,
		title,
		facts: offered,
		trailing,
		lock: lockGiven,
		entry,
		steps,
		dim = false,
		wrap = false,
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
	} = props;
	const labelled = label !== undefined;
	const labelText = typeof label === "object" ? label.code : label;
	const words = useWords();
	const pathname = usePathname();
	const warm = useWarm();
	// The row is the frame of the reads it draws that no frame above holds: one
	// that ended is the row's failed form, in place of its title, facts and end;
	// a read an enclosing frame holds is that frame's to say.
	// The facts are a list, a read of its own or of each fact: one that waits
	// paints a filler in its place.
	const [read, said] = useSelections([title, offered]);
	const given: readonly unknown[] =
		!said.painted && Array.isArray(said.value) ? said.value : NO_FACTS;
	const each = useSelections(given);
	const { ended, busy, retry } = useRow([title, offered, ...given]);
	const failed = ended === "failed";
	// Painted by the Section, or by a datum of its own that waits: either way the
	// row draws its loaded tree, each part the datum reaches in its filler, and
	// takes no press.
	const waitsTitle = !ended && (painted || paints(read));
	const waitsFacts =
		!ended && (painted || paints(said) || each.some((fact) => paints(fact)));
	const inert = waitsTitle || waitsFacts;
	// A placeholder is a function proxy that no type test passes: the title is
	// read only once painted is ruled out.
	const plain =
		painted || read.painted ? undefined : (read.value as RowTitle | undefined);
	// Over the placeholder the title is not a name.
	const named = painted
		? ""
		: (labelText ?? (plain === undefined ? "" : titleWords(plain)));
	const current =
		!inert && (selected ?? (href !== undefined && isCurrent(href, pathname)));
	const opens =
		!inert && !ended && (href !== undefined || onOpen !== undefined);
	// A tree's child: its washes start at its rail.
	const depth = tree?.depth ?? 0;
	const child = depth > 0;
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
	// The facts, each one badge in the order given (`badgesOf`, the one reading of
	// them). A list read that waits is one filler, a fact whose read ended draws
	// nothing and one that waits is a filler in its place. A loaded fact with no
	// text draws nothing; a painted row keeps one filler per fact the slot gave.
	// The row's lock follows the status and a tick's blocked reason leads. A
	// chip and the boolean marks are the item's data, which the painted form
	// cannot know: never painted (the loaded rows that have none would land
	// narrower). A failed row's facts line is its sentence, text and no badge.
	const drawn = said.painted
		? paints(said)
			? [""]
			: []
		: each
				.filter((fact) => !fact.painted || paints(fact))
				.map((fact) => fact.value);
	const { badges, quiet: endFacts } = ended
		? badgesOf({ facts: [], word: (tone) => words[tone] })
		: badgesOf({
				facts: drawn,
				word: (tone) => words[tone],
				lock,
				href: lockHref,
				blocked,
				fillers: waitsFacts,
				painted,
			});
	const sentence = ended ? endedSentence(words, ended) : undefined;
	const lone = loneCode(badges);
	const hasMeta = sentence !== undefined || badges.length > 0;
	const hasTitle = title !== undefined && !ended;
	// A mark whose words are not drawn (`words: false`) stands in the end group,
	// a glyph named by its label, so it is no badge of the facts line: a row with
	// only such marks has no second line for them. An entry or the steps stand in
	// the facts' place. A row is two lines where it holds a badge, an entry or
	// the steps: the phone is always compact.
	const lined = Boolean(entry || listed || hasMeta);
	// A described value beside a control (a pick, a switch) never falls under
	// the short measure, so its description never breaks to a word a line:
	// where the text at that floor and the control do not fit side by side, the
	// end group stands under the text at the line's end. Every other text group
	// keeps the row's floor of two fifths, a pick's value truncating beside it.
	const described =
		sentence !== undefined || badges.some((badge) => badge.kind === "words");
	const reads =
		labelled && described && (pick !== undefined || toggle !== undefined);
	// An end group made of a control (a pick, a switch), which never cuts, takes
	// the text group's floor: the title truncates rather than the control's
	// value be cut.
	const controlled = !labelled && (pick !== undefined || toggle !== undefined);
	// A lock that links takes the press, so the text group lets it through and
	// the rest of its lines hold none.
	const linked = badges.some((badge) => badge.href !== undefined);
	const inline = { label: entry?.label ?? "" };
	const entryReason = useReasonLine(painted ? undefined : entry?.act.blocked);
	// The pressed reason of the act, which its button and its line both read:
	// the row holds it, neither knows the other.
	const [stood, stand] = useState<string>();
	const actLine =
		act === undefined || painted ? null : <ActLine act={act} stood={stood} />;
	const metaRole = cn(text({ role: "meta" }), FIGURES);
	const trailed =
		trailing !== undefined ? (
			<PaintText
				fills="figure"
				painted={painted}
				numberOfLines={1}
				pointerEvents="none"
				{...clipWhen(painted)}
				className={cn(
					ROW_TRAILING,
					TRAILING,
					!("value" in trailing) && TRAILING_WHOLE,
				)}
			>
				{painted ? <Painted role="figure" at={at} /> : trailingWord(trailing)}
			</PaintText>
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
					<StatusBase tone={plain.tone} label={plain.label} />
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
	// The facts line under the title: a lone `{ code }` is the row's value in the
	// mono, a failed row's sentence is text, every other fact a badge
	// (`BadgeLine`, which takes no press but a linked lock's).
	const metaLine =
		lone !== undefined ? (
			<RowValue badges={badges} />
		) : sentence !== undefined ? (
			<RNText numberOfLines={2} className={metaRole}>
				<RunText runs={runsOf(sentence)} fit="name" />
			</RNText>
		) : badges.length > 0 ? (
			<BadgeLine badges={badges} onOpen={follow} />
		) : null;
	// The control of a fact: its switch, in the end group, or the failure mark
	// and the retry in the failed form.
	const control = ended ? (
		<View className={cn(ROW_END, CONTROL)}>
			<FailedMark />
			{failed ? <RetryMark busy={busy} /> : null}
		</View>
	) : toggle ? (
		<View className={CONTROL}>
			<HeldSwitch
				{...toggle}
				label={painted ? "" : named}
				painted={inert}
				disabled={lock !== undefined}
			/>
		</View>
	) : null;
	const copyAct = ended ? null : waitsTitle && isCopy(shape) ? (
		<IconButtonBase icon="Copy" label="" painted />
	) : copied === undefined ? null : (
		<CopyAct label={labelText ?? copied} value={copied} />
	);
	const acting = act !== undefined || moreActs || copyAct !== null;
	const hasEnd =
		endFacts.length > 0 ||
		trailed !== null ||
		control !== null ||
		pick !== undefined ||
		acting ||
		tree?.fold !== undefined;
	// On the phone a row of two lines stands its end group on the title's line
	// and runs its facts line the row's whole width under both (voice 14), its
	// leading on the title's line with them; an entry, the steps and a label
	// keep the end group centred on the row.
	const headed =
		lined &&
		!labelled &&
		entry === undefined &&
		listed === undefined &&
		hasEnd &&
		titleLine !== null;
	const endGroup = hasEnd ? (
		<View
			pointerEvents="box-none"
			className={cn(ROW_END, headed ? END_HEAD : END, reads && END_WRAPS)}
		>
			{endFacts.map((mark) => (
				<EndMark key={mark.label} mark={mark} />
			))}
			{trailed}
			{control}
			{pick ? (
				<View pointerEvents="box-none" className={CONTROL}>
					<HeldPicker {...pick} fit="row" painted={inert} />
				</View>
			) : null}
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
	) : null;
	const column = cn(
		ROW_TEXT,
		TEXT,
		reads ? TEXT_READS : !controlled && ROW_TEXT_FLOOR,
	);
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
	// Without a title, a facts line or an entry, a row with a label draws the
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
							{entry.error && !painted ? (
								<FadingText
									key={entry.error}
									entering={lineIn()}
									className={FIELD_ERROR_LINE}
								>
									{entry.error}
								</FadingText>
							) : null}
						</View>
						<View className={ENTRY_ACT}>
							<ActButton
								act={entry.act}
								host={entryReason.host}
								painted={painted}
								at={at}
							/>
						</View>
					</View>
				</FieldError.Provider>
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
	else if (headed)
		textGroup = (
			<View pointerEvents="box-none" className={column}>
				<View pointerEvents="box-none" className={cn(ROW_TITLE_LINE, HEAD)}>
					<View
						pointerEvents="none"
						className={cn(ROW_TEXT, TEXT, !controlled && ROW_TEXT_FLOOR)}
					>
						{titleLine}
					</View>
					{endGroup}
				</View>
				{linked || metaLine === null ? (
					metaLine
				) : (
					<View pointerEvents="none">{metaLine}</View>
				)}
				{actLine === null ? null : <View pointerEvents="none">{actLine}</View>}
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
	// A status dot is the title's bullet: on a row of more than one line it
	// stands on the title's first line, never between the title and the facts
	// on the row's centre.
	const dotFirst = !top && lined && leading !== undefined && "tone" in leading;
	const pressWash = child
		? ({ pressed }: { pressed: boolean }) =>
				pressed ? <RailWash depth={depth} wash={CHILD_PRESSED} /> : null
		: undefined;
	let hit: ReactNode = null;
	if (failed)
		hit = (
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={`${words.retry} ${named}`}
				onPress={() => {
					if (!busy) void retry();
				}}
				className={child ? CHILD_HIT : HIT}
			>
				{pressWash}
			</Pressable>
		);
	else if (opens)
		hit = (
			<Pressable
				accessibilityRole={href !== undefined ? "link" : "button"}
				accessibilityLabel={named}
				accessibilityState={{ selected: current }}
				onPressIn={href !== undefined ? () => warm(href) : undefined}
				onPress={href !== undefined ? () => follow(href) : onOpen}
				className={child ? CHILD_HIT : HIT}
			>
				{pressWash}
			</Pressable>
		);
	const body = (
		<>
			{tree ? <TreeLead tree={tree} /> : null}
			{change ? (
				<First on={top || headed} top={headed && !top}>
					<ChangeMark kind={change} />
				</First>
			) : null}
			{leading ? (
				<First
					on={top || dotFirst || headed}
					top={(dotFirst || headed) && !top}
				>
					<View
						pointerEvents={ticks ? "auto" : "none"}
						className={cn(
							"tone" in leading ? ROW_LEADING_STATUS : ROW_LEADING,
							LEADING,
							ticks && TICK,
						)}
					>
						<Leading leading={leading} named={named} painted={painted} />
					</View>
				</First>
			) : null}
			{textGroup}
			{headed ? null : endGroup}
		</>
	);
	return (
		<FadingView
			{...inertProps(inert)}
			// A row that came on its own once the list was drawn fades in as it mounts
			// (`entering` is read there, so the first render's value is held).
			entering={arrived ? blockIn() : undefined}
			className={cn(
				row({ state: current && !child ? "selected" : "rest" }),
				above ? ROW_LABELLED : top ? ROW_WHOLE : ROW,
			)}
		>
			{child && current ? (
				<RailWash depth={depth} wash={CHILD_SELECTED} />
			) : null}
			{hit}
			{above ? (
				<>
					<View pointerEvents="none">{labelNode}</View>
					<View
						pointerEvents="box-none"
						className={cn(
							DEFINITION_LINE,
							LINE,
							reads && LINE_WRAPS,
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
