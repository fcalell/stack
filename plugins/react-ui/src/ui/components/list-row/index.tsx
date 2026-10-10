import { Button as BaseButton } from "@base-ui/react/button";
import { Field } from "@base-ui/react/field";
import { cn } from "@fcalell/ui-core/cn";
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
import { isCurrent } from "@fcalell/ui-core/route";
import {
	FIELD_ERROR_LINE,
	ROW_ACTS,
	ROW_CHEVRON,
	ROW_ENTRY,
	ROW_LEADING,
	ROW_META_LINE,
	ROW_STEPS,
	ROW_TITLE_LINE,
	ROW_TRAILING,
	type RowLines,
	row,
	rowStep,
	rowTitle,
	rowTitleForm,
	skeleton,
	TREE_LANE,
	TREE_RAIL,
	text,
	treeBleed,
} from "@fcalell/ui-core/variants";
import {
	type KeyboardEvent,
	type ReactNode,
	use,
	useMemo,
	useState,
} from "react";
import { ActsRoom } from "../../lib/acts-room.ts";
import { ageShort } from "../../lib/age.ts";
import { useClock } from "../../lib/clock.ts";
import type { Closed } from "../../lib/closed.ts";
import { CodeCut, Runs } from "../../lib/code.tsx";
import { InlineField } from "../../lib/field.ts";
import { GroundContext } from "../../lib/ground.ts";
import { follow, navigate, useRoute } from "../../lib/navigate.ts";
import {
	isCoded,
	leadRuns,
	META_CUT,
	partRuns,
	partText,
} from "../../lib/parts.ts";
import { ReasonHostContext, usePressed } from "../../lib/reason.ts";
import { useTouched } from "../../lib/touched.ts";
import { TrailingWait } from "../../lib/trailing-wait.ts";
import { type RowTree, TreeContext } from "../../lib/tree.ts";
import { useWords } from "../../lib/words.tsx";
import { Avatar } from "../avatar/index.tsx";
import { Button } from "../button/index.tsx";
import { Reason } from "../button/reason.tsx";
import { Checkbox } from "../checkbox/index.tsx";
import { Chip } from "../chip/index.tsx";
import { Icon } from "../icon/index.tsx";
import { IconButtonBase } from "../icon-button/base.tsx";
import { Input } from "../input/index.tsx";
import { MenuBase } from "../menu/base.tsx";
import { Picker } from "../picker/index.tsx";
import { ChangeMark } from "../status/change.tsx";
import { StatusDot } from "../status/dot.tsx";
import { LockMark } from "./lock.tsx";
import { WarningMark } from "./marks.tsx";
import { RowStatusMark } from "./status.tsx";

const ROW = "relative flex items-center";
// Below `tablet` a row with a labelled act stands its acts on a line of their
// own at the row's end, under the text: beside it the text keeps only what the
// acts leave (65 of 288 at 320), too little for its title, its status and the
// glyphs of its meta line. The text then takes no width of its own, so it
// fills the first line and the acts, a whole line wide, wrap under it.
const ROW_UNDER = "page-max-tablet:flex-wrap";
const TEXT_UNDER = "page-max-tablet:basis-0";
const ACTS_UNDER = "page-max-tablet:basis-full page-max-tablet:justify-end";
// A row whose title wraps whole, or that holds an entry, stands its parts on
// the title's first line.
const ROW_WHOLE = "relative flex items-start";
// The box one body line tall a part stands in, centred on the first line; a
// taller part overflows it centred.
const FIRST_LINE = "flex shrink-0 items-center h-line-body";
// A list row's wash is square on touch, where it meets the screen's edge.
const SQUARE = "touch:rounded-none";
// A row that opens washes under the pointer and the press; the chosen one a
// step darker under the pointer.
const PRESS = "hover:bg-wash-hover active:bg-wash-press";
const CHOSEN_PRESS = "hover:bg-wash-selected-hover active:bg-wash-press";
// The hit covers the row, under its pick and its acts, and rings inset.
const HIT = "absolute inset-0 focus-visible:-outline-offset-2";
// A tree's row is its own focus stop, ringed inset like the hit it replaces.
const TREE_ITEM = "focus-visible:-outline-offset-2";
const HIT_LIST = "rounded-row touch:rounded-none";
const LEADING = "flex shrink-0 items-center justify-center";
// A tick takes its hit box and stands above the row's hit, so a press on it
// ticks and never opens.
const TICK = "relative size-target";
const GLYPH = "flex text-ink-meta";
const TEXT = "flex flex-col grow min-w-0";
const LINE = "flex items-center min-w-0";
const TITLE = "truncate grow";
const TITLE_WHOLE = "grow min-w-0 wrap-break-word";
// A title that is one span of code stands in a flex line, so its stem
// truncates and its tail keeps the room it needs.
const TITLE_CODE = "flex items-center grow min-w-0";
const LINE_WHOLE = "flex items-start min-w-0";
const TRAILING = "shrink-0";
// A trailing value waiting: four figures, a count's or an age's width.
const TRAILING_BAR = "w-figures";
// A one-line title and its value stand on a line that wraps: the title's basis
// is half the line, so the value, wider than what that leaves, wraps under the
// line's one height and is clipped away; with room, the title grows to fill
// what the value leaves.
const VALUE_LINE = "flex-wrap h-line-body overflow-hidden";
const TITLE_BEFORE_VALUE = "basis-1/2";
// The meta line is one line that yields in order: the later parts truncate
// first (they take no width of their own), a model-written one (`Quoted`)
// ahead of the plain ones, then the chip (shown whole or not at all), the
// lock's label, the warning's label and last the first part, which names the
// item and truncates with an ellipsis; the glyphs keep their width, and past
// them the line clips at the row's edge rather than overprint. The status
// stands in the first part's tier: the two share the overflow in proportion to
// their widths, so a long status never takes the line from the subject, nor
// the subject from the status. The shrink weights are the order: a flex line takes the
// overflow from each item in proportion to its weight times its own width, and
// `truncate` draws its ellipsis on any overflow, however small, so a part that
// still fits must take none of it: the weights run 1, 10^7, 10^14 and 10^20
// (`./marks.tsx`, `./lock.tsx` and the chip's slot below; Tailwind reads no
// bare number from 10^21), which holds an earlier part's share of the overflow
// to a few thousandths of a pixel, against the layout's 1/64 px. The parts'
// box grows into the room the marks leave.
const META_LINE = "flex items-center min-w-0 overflow-hidden";
const META_PARTS = "flex grow shrink min-w-0";
const META_FIRST = "min-w-0 truncate";
const META_FIRST_CODE = "flex min-w-0";
// The later parts take no width of their own and truncate into the room the
// marks leave, but show at least `figures` of it or none: they stand in a slot
// that wraps its text under its one line, clipped away, when the room is less,
// so a bare separator and an ellipsis never draw. The text's basis is the
// `figures` that decides the wrap, and it can shrink to nothing, so a text
// wrapped away has a box no wider than the slot.
const LATER = "flex flex-wrap grow w-0 min-w-0 h-lh overflow-hidden";
const LATER_START = "w-0 h-full";
const LATER_TEXT = "flex grow basis-figures min-w-0 overflow-hidden";
const LATER_RUN = "min-w-0 truncate";
const LATER_QUOTED = "min-w-0 truncate shrink-10000000";
const LATER_CODE = "flex min-w-0 shrink-10000000";
const SEPARATOR = "shrink-0";
// A step is one body line's box tall (the step lists' 19 of the references,
// at the type scale's rung), its label truncating before its mark does.
const STEPS = "flex flex-col min-w-0";
const STEP = "flex items-center min-w-0 h-line-body";
const STEP_LABEL = "truncate";
// The chip stands in a slot that shows it whole or not at all: a flex line
// always keeps its first item, so a zero-width start item takes that place and
// the chip, wider than the room the slot is left, wraps under the slot's one
// line height and is clipped away.
const CHIP_SLOT =
	"flex flex-wrap h-chip min-w-0 shrink-100000000000000000000 overflow-hidden";
const CHIP_START = "w-0 h-full";
const CHIP_MARK = "flex shrink-0";
const ACTS = "relative flex shrink-0 items-center";
// The chevron draws in the ink of the slot (currentColor), as a definition
// row's does.
// The more act's square, left blank in a row that has none beside rows that do.
const BLANK = "shrink-0";
const CHEVRON = "flex shrink-0 items-center justify-center text-ink-meta";
// The entry stands above the hit: the input and its act, the field filling
// the room the act leaves.
const ENTRY = "relative flex items-center min-w-0";
const ENTRY_FIELD = "grow min-w-0";
// A tree row's levels and fold lane stand as one box that runs the row's full
// height, over its padding, so a level's rail is unbroken from row to row.
const TREE = "flex shrink-0 self-stretch";
const FOLD = "flex shrink-0 items-center justify-center self-center";

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

// A part standing on the title's first line while the title wraps whole.
function First(props: { on: boolean; children: ReactNode }) {
	if (!props.on) return props.children;
	return <span className={FIRST_LINE}>{props.children}</span>;
}

// A tree row's rails and fold lane: a rail per level, then the lane every row
// of the tree reserves, a branch's fold act standing in it.
function TreeLead(props: {
	tree: RowTree;
	lines: RowLines;
	top: boolean;
	named: string;
}) {
	const words = useWords();
	const { tree, lines, top, named } = props;
	const { depth, fold } = tree;
	const levels = Array.from({ length: depth }, (_, level) => level);
	return (
		<span className={cn(TREE, treeBleed({ lines }))}>
			{levels.map((level) => (
				<span key={level} className={TREE_RAIL} />
			))}
			<First on={top}>
				<span className={cn(TREE_LANE, FOLD)}>
					{fold ? (
						<IconButtonBase
							icon={fold.open ? "ChevronDown" : "ChevronRight"}
							fit="bar"
							label={`${fold.open ? words.collapse : words.expand} ${named}`}
							aria-expanded={fold.open}
							tabIndex={-1}
							onClick={fold.onToggle}
						/>
					) : null}
				</span>
			</First>
		</span>
	);
}

function Leading(props: { leading: RowLeading; named: string }) {
	const words = useWords();
	const { leading } = props;
	if ("check" in leading)
		return (
			<Field.Root disabled={leading.check.blocked !== undefined}>
				<Checkbox
					checked={leading.check.checked}
					onChange={leading.check.onChange}
					label={props.named}
				/>
			</Field.Root>
		);
	if ("avatar" in leading)
		return <Avatar name={leading.avatar.name} src={leading.avatar.src} />;
	if ("status" in leading)
		return <StatusDot state={leading.status} label={words[leading.status]} />;
	return (
		<span className={GLYPH}>
			<Icon name={leading.icon} />
		</span>
	);
}

// A blocked act's reason draws on the row's own line, so the act keeps its
// place; the act is handed the host.
function useReasonLine(blocked: string | undefined) {
	const { touched } = useTouched();
	const [pressed, press] = usePressed(blocked);
	const host = useMemo(
		() => (blocked === undefined ? undefined : { press }),
		[blocked, press],
	);
	const line =
		blocked === undefined ? null : (
			<Reason shown={pressed || touched}>{blocked}</Reason>
		);
	return { host, line };
}

function ActButton(props: {
	act: Act;
	host: ReturnType<typeof useReasonLine>["host"];
}) {
	const { act, host } = props;
	return (
		<ReasonHostContext value={host}>
			<Button
				act={act.destructive ? "destructive" : "secondary"}
				fit="bar"
				label={act.label}
				onAct={act.onAct}
				loading={act.loading}
				blocked={act.blocked}
			/>
		</ReasonHostContext>
	);
}

// A trailing age's short words, read off the shared clock: the row draws
// again only when they change.
function Age(props: { moment: string }) {
	return useClock((now) => ageShort(props.moment, now));
}

function trailingWord(trailing: RowTrailing<string | null>): ReactNode {
	if ("age" in trailing)
		return (
			<>
				<Age moment={trailing.age} />
				{trailing.beside === undefined ? null : ` · ${trailing.beside}`}
			</>
		);
	if ("count" in trailing) return String(trailing.count);
	if ("value" in trailing) return trailing.value;
	return "";
}

/** Inside a tree `List` the row is a `treeitem` (its level, and `aria-expanded` on a branch) and the tree's focus stop (Enter opens it), and opens with a rail per level and the fold lane every row of the tree reserves, a branch's fold act in it for the pointer. Then the change mark, the leading slot, the title with its trailing value over the meta line (its status, warning, lock and chip at the end, yielding from the chip), the entry (its input and act, its error under it) or the step list, a trailing pick, then the row's act and the more act. A row that opens ends in a chevron after its trailing value, unless its end holds an act, the more act, a pick or a tree's fold. A row that opens is one hit under its pick and acts, current (the selection wash) at its `href`; it washes under the pointer and the press. In a `Group` it runs edge to edge at the card's inset, elsewhere it is an inset rounded wash, square on touch. */
export function ListRow<V extends string | null = string>({
	change,
	leading,
	title,
	meta,
	trailing,
	status,
	warning,
	lock,
	chip,
	entry,
	steps,
	dim = false,
	wrap = false,
	act,
	more,
	href,
	selected = false,
	onOpen,
}: ListRowProps<V>) {
	const words = useWords();
	const ground = use(GroundContext);
	const tree = use(TreeContext);
	const waits = use(TrailingWait);
	const room = use(ActsRoom);
	const at = useRoute();
	const named = partText(title);
	const current = selected || (href !== undefined && isCurrent(href, at));
	const opens = href !== undefined || onOpen !== undefined;
	// A row that opens ends in a chevron unless its end already holds an act, a
	// pick or a tree's fold.
	const chevron =
		opens &&
		act === undefined &&
		!more?.length &&
		!(trailing && "pick" in trailing) &&
		!tree?.fold;
	// A row of a list where another has a more act, with no more act and no
	// chevron of its own, keeps that act's square blank.
	const blank = room && !more?.length && !chevron;
	const marked =
		status !== undefined ||
		warning !== undefined ||
		lock !== undefined ||
		chip !== undefined;
	const ticks = leading !== undefined && "check" in leading;
	const blocked = ticks ? leading.check.blocked : undefined;
	const listed = steps?.length ? steps : undefined;
	const lined = Boolean(
		entry || listed || meta?.length || blocked !== undefined || marked,
	);
	const stacked = lined ? "two" : "one";
	const lines = wrap ? "whole" : stacked;
	// A model-written name (`Quoted`) wraps in a row that has a second line, so
	// its closing quote is never cut away; its row grows by the lines it wraps.
	const quotedWraps = lined && typeof title === "object" && "quoted" in title;
	// A wrapped title and an entry's input are lines under the title's first, so
	// the parts beside them stand on that first line.
	const top = wrap || entry !== undefined;
	const under = act !== undefined && !top;
	const column = cn(TEXT, under && TEXT_UNDER);
	const [metaLine, setMetaLine] = useState<HTMLSpanElement | null>(null);
	const inline = useMemo(() => ({ label: entry?.label ?? "" }), [entry?.label]);
	const entryReason = useReasonLine(entry?.act.blocked);
	const actReason = useReasonLine(act?.blocked);
	// A blocked tick's reason follows the first part inside the span that yields
	// last, so the part that names the item stays whole ahead of it.
	const [first, ...rest] = meta ?? [];
	const lead: RowPart[] = first === undefined ? [] : [first];
	if (blocked !== undefined) lead.push(blocked);
	// A first part that is one span of code, alone on its line, cuts in its
	// middle; beside a blocked reason it is a run in a sentence.
	const [only] = lead;
	const coded = lead.length === 1 && only && isCoded(only) ? only : undefined;
	// A waiting row (its List was given the items while it loads) draws the bar
	// in the value's place; the app's slot is not read for it.
	let value: ReactNode = null;
	if (waits)
		value = (
			<First on={top}>
				<span
					aria-hidden
					className={cn(skeleton({ kind: "line" }), TRAILING_BAR, TRAILING)}
				/>
			</First>
		);
	else if (trailing && !("pick" in trailing))
		value = (
			<First on={top}>
				<span className={cn(ROW_TRAILING, TRAILING)}>
					{trailingWord(trailing)}
				</span>
			</First>
		);
	// A value beside a one-line title is whole or gone: the title holds half its
	// line before the value takes a place on it.
	const titles = value !== null && !top && !quotedWraps;
	let shown: ReactNode = named;
	let titleBox = wrap || quotedWraps ? TITLE_WHOLE : TITLE;
	if (isCoded(title)) {
		shown = <CodeCut code={title.code} />;
		titleBox = TITLE_CODE;
	} else if (typeof title === "object" && !("quoted" in title)) {
		shown = <Runs runs={title} />;
	}
	const titled = (
		<span
			className={cn(
				rowTitle({ form: rowTitleForm(wrap, dim) }),
				titleBox,
				titles && TITLE_BEFORE_VALUE,
			)}
		>
			{shown}
		</span>
	);
	const titleLine = (
		<span
			className={cn(
				ROW_TITLE_LINE,
				wrap ? LINE_WHOLE : LINE,
				titles && VALUE_LINE,
			)}
		>
			{titled}
			{value}
		</span>
	);
	const hitClass = cn(HIT, ground === "list" && HIT_LIST);
	// In a tree the row is the focus stop and the hit is the pointer's alone.
	const pointed = tree ? { tabIndex: -1 } : {};
	let hit = null;
	if (href !== undefined)
		hit = (
			<a
				data-hit=""
				href={href}
				onClick={follow}
				aria-label={named}
				aria-current={!tree && current ? "page" : undefined}
				className={hitClass}
				{...pointed}
			/>
		);
	else if (onOpen)
		hit = (
			<BaseButton
				data-hit=""
				aria-label={named}
				onClick={onOpen}
				aria-current={!tree && current ? "true" : undefined}
				className={hitClass}
				{...pointed}
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
	const item = tree
		? {
				role: "treeitem",
				tabIndex: tree.tabbable ? 0 : -1,
				"aria-level": tree.depth + 1,
				"aria-expanded": tree.fold?.open,
				"aria-current": current ? ("page" as const) : undefined,
				onKeyDown: opens ? openOnEnter : undefined,
			}
		: {};
	return (
		<div
			{...item}
			className={cn(
				row({ lines, ground, state: current ? "selected" : "rest" }),
				top ? ROW_WHOLE : ROW,
				under && ROW_UNDER,
				ground === "list" && SQUARE,
				opens && (current ? CHOSEN_PRESS : PRESS),
				tree && TREE_ITEM,
			)}
		>
			{hit}
			{tree ? (
				<TreeLead tree={tree} lines={lines} top={top} named={named} />
			) : null}
			{change ? (
				<First on={top}>
					<ChangeMark kind={change} />
				</First>
			) : null}
			{leading ? (
				<First on={top}>
					<span className={cn(ROW_LEADING, LEADING, ticks && TICK)}>
						<Leading leading={leading} named={named} />
					</span>
				</First>
			) : null}
			{!lined ? (
				<span className={column}>
					{titleLine}
					{actReason.line}
				</span>
			) : entry ? (
				<Field.Root
					invalid={Boolean(entry.error)}
					className={cn(ROW_ENTRY, TEXT)}
				>
					{titleLine}
					<InlineField value={inline}>
						<span className={cn(ROW_META_LINE, ENTRY)}>
							<span className={ENTRY_FIELD}>
								<Input
									value={entry.field.value}
									onChange={entry.field.onChange}
									onCommit={entry.field.onCommit}
									placeholder={entry.placeholder}
								/>
							</span>
							<ActButton act={entry.act} host={entryReason.host} />
						</span>
					</InlineField>
					{entry.error ? (
						<Field.Error match className={FIELD_ERROR_LINE}>
							{entry.error}
						</Field.Error>
					) : null}
					{entryReason.line}
					{actReason.line}
				</Field.Root>
			) : listed ? (
				<span className={column}>
					{titleLine}
					<span className={cn(ROW_STEPS, STEPS)}>
						{listed.map((step, at) => (
							<span
								// biome-ignore lint/suspicious/noArrayIndexKey: the steps are fixed-order data that never reorder, so position is the identity
								key={at}
								className={cn(
									rowStep({
										state: step.state === "running" ? "running" : "rest",
									}),
									STEP,
								)}
							>
								<StatusDot state={step.state} />
								<span className={STEP_LABEL}>{step.label}</span>
							</span>
						))}
					</span>
					{actReason.line}
				</span>
			) : (
				<span className={column}>
					{titleLine}
					<span ref={setMetaLine} className={cn(ROW_META_LINE, META_LINE)}>
						{lead.length === 0 ? null : (
							<span className={META_PARTS}>
								<span
									className={cn(
										text({ role: "meta" }),
										coded ? META_FIRST_CODE : META_FIRST,
									)}
								>
									{coded ? (
										<CodeCut code={coded.code} />
									) : (
										<Runs runs={leadRuns(lead, META_CUT)} />
									)}
								</span>
								{rest.length ? (
									<span className={cn(text({ role: "meta" }), LATER)}>
										<span aria-hidden className={LATER_START} />
										<span className={LATER_TEXT}>
											{partRuns(rest, META_CUT).map((run, at) =>
												run.kind === "code" ? (
													<span
														// biome-ignore lint/suspicious/noArrayIndexKey: the runs come from parts that never reorder, so position is the identity
														key={at}
														className={LATER_CODE}
													>
														<span className={SEPARATOR}>{" · "}</span>
														<CodeCut code={run.text} />
													</span>
												) : (
													<span
														// biome-ignore lint/suspicious/noArrayIndexKey: the runs come from parts that never reorder, so position is the identity
														key={at}
														className={
															run.kind === "quoted" ? LATER_QUOTED : LATER_RUN
														}
													>
														{` · ${run.text}`}
													</span>
												),
											)}
										</span>
									</span>
								) : null}
							</span>
						)}
						{status ? <RowStatusMark status={status} line={metaLine} /> : null}
						{warning !== undefined ? <WarningMark label={warning} /> : null}
						{lock !== undefined ? <LockMark reason={lock} labelled /> : null}
						{chip ? (
							<span className={CHIP_SLOT}>
								<span aria-hidden className={CHIP_START} />
								<span className={CHIP_MARK}>
									<Chip family={chip.family} label={chip.label} />
								</span>
							</span>
						) : null}
					</span>
					{actReason.line}
				</span>
			)}
			{!waits && trailing && "pick" in trailing ? (
				<First on={top}>
					<Picker {...trailing.pick} fit="row" />
				</First>
			) : null}
			{chevron ? (
				<First on={top}>
					<span className={cn(ROW_CHEVRON, CHEVRON)}>
						<Icon name="ChevronRight" />
					</span>
				</First>
			) : null}
			{act || more?.length || blank ? (
				<First on={top}>
					<span className={cn(ROW_ACTS, ACTS, under && ACTS_UNDER)}>
						{act ? <ActButton act={act} host={actReason.host} /> : null}
						{blank ? (
							<span aria-hidden className={cn(ROW_CHEVRON, BLANK)} />
						) : null}
						{more?.length ? (
							<MenuBase
								label={`${words.more} ${named}`}
								title={named}
								items={more}
							/>
						) : null}
					</span>
				</First>
			) : null}
		</div>
	);
}
