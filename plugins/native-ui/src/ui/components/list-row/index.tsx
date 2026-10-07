import type {
	Act,
	ChangeKind,
	ChipMark,
	MenuItem,
	Part,
	RowEntry,
	RowLeading,
	RowTrailing,
	StatusMark,
} from "@fcalell/ui-core/descriptors";
import { isCurrent } from "@fcalell/ui-core/route";
import {
	FIELD_ERROR_LINE,
	ROW_ACTS,
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
import { type ReactNode, useContext, useMemo } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import { ageShort } from "../../lib/age";
import { useClock } from "../../lib/clock";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { FieldDisabled, FieldError, InlineField } from "../../lib/field";
import { GroundContext } from "../../lib/ground";
import { Ink } from "../../lib/ink";
import { navigate, usePathname } from "../../lib/navigate";
import { joinParts, META_CUT, partText } from "../../lib/parts";
import { ReasonHostContext, usePressed } from "../../lib/reason";
import type { Route } from "../../lib/route";
import { useTouched } from "../../lib/touched";
import { TrailingWait } from "../../lib/trailing-wait";
import { type RowTree, TreeContext } from "../../lib/tree";
import { useWords } from "../../lib/words";
import { Avatar } from "../avatar";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { Chip } from "../chip";
import { Icon } from "../icon";
import { IconButtonBase } from "../icon-button/base";
import { Input } from "../input";
import { MenuBase } from "../menu/base";
import { Picker } from "../picker";
import { Status } from "../status";
import { ChangeMark } from "../status/change";
import { StatusDot } from "../status/dot";
import { LockMark } from "./lock";
import { WarningMark } from "./marks";

const ROW = "relative flex-row items-center";
// A row with a labelled act stands its acts on a line of their own at the
// row's end, under the text: beside it the text keeps only what the acts
// leave (65 of 288 at 320), too little for its title, its status and the
// glyphs of its meta line. The text already takes no width of its own
// (`flex-1`), so it fills the first line and the acts, a whole line wide, wrap
// under it.
const ROW_UNDER = "flex-wrap";
const ACTS_UNDER = "w-full justify-end";
// A row whose title wraps whole, or that holds an entry, stands its parts on the
// title's first line:
// each in a box one body line tall, centred on the line; a taller part
// overflows it centred.
const ROW_WHOLE = "relative flex-row items-start";
const FIRST_LINE = "flex-row shrink-0 items-center h-line-body";
// A list row's wash is square on the phone, where it meets the screen's edge.
const SQUARE = "rounded-none";
// The hit covers the row under its text, its pick and its acts, and takes the
// press wash; the text lets a press through to it.
const HIT = "absolute inset-0 active:bg-wash-press";
const LEADING = "shrink-0 items-center justify-center";
// A tick takes its hit box, and its own touch.
const TICK = "size-target";
const TEXT = "flex-1 min-w-0";
const LINE = "flex-row items-center min-w-0";
const TITLE = "grow shrink";
const LINE_WHOLE = "flex-row items-start min-w-0";
// A step is one body line's box tall (the step lists' 19 of the references,
// at the type scale's rung).
const STEPS = "min-w-0";
const STEP = "flex-row items-center min-w-0 h-line-body";
const STEP_LABEL = "shrink";
const TRAILING = "shrink-0";
// A trailing value waiting: four figures, a count's or an age's width.
const TRAILING_BAR = "w-figures";
// The meta line is one line that yields in order: the later parts truncate
// first (they take no width of their own), then the chip (shown whole or not at
// all), the warning's label and last the first part, which names the item and
// truncates with an ellipsis; the status and the glyphs keep their width, and
// past them the line clips at the row's edge rather than overprint. The shrink
// weights are the order: a flex line takes the overflow from each item in
// proportion to its weight times its own width, and a part that still fits
// must take none of it, so the weights run 1, 10^7 and 10^14 (the warning's in
// `./marks.tsx`, the chip's slot below), which holds an earlier part's share of
// the overflow to a few thousandths of a pixel. The parts' box grows into the
// room the marks leave.
const META_LINE = "flex-row items-center min-w-0 overflow-hidden";
const META_PARTS = "flex-row grow shrink min-w-0";
const META_FIRST = "shrink min-w-0";
const META = "grow w-0";
const STATUS_MARK = "shrink-0";
// The chip stands in a slot that shows it whole or not at all: a flex line
// always keeps its first item, so a zero-width start item takes that place and
// the chip, wider than the room the slot is left, wraps under the slot's one
// line height and is clipped away.
const CHIP_SLOT =
	"flex-row flex-wrap h-chip min-w-0 shrink-100000000000000 overflow-hidden";
const CHIP_START = "w-0 h-full";
const CHIP_MARK = "shrink-0";
const ACTS = "relative flex-row shrink-0 items-center";
// The entry takes the touch itself: the input filling the room its act leaves.
const ENTRY = "flex-row items-center min-w-0";
const ENTRY_FIELD = "flex-1 min-w-0";
// A tree row's levels and fold lane stand as one box that runs the row's full
// height, over its padding, so a level's rail is unbroken from row to row. A
// press on any of it falls through to the row's hit but the fold act.
const TREE = "flex-row shrink-0 self-stretch";
const FOLD = "shrink-0 items-center justify-center self-center";

export interface ListRowProps<V extends string | null = string> extends Closed {
	// Where the row stands in a change set: its mark at the row's start, ahead
	// of the leading slot. Mark a set's untouched rows `unchanged` so the titles
	// line up.
	change?: ChangeKind;
	// A glyph, a status's mark (its dot, or the spinner while `running`), an
	// avatar, or a tick that chooses the row (disabled while `blocked`, its
	// reason leading the meta line), in one slot at the avatar's size; a tick
	// takes its hit box.
	leading?: RowLeading;
	// What the row names, at body 500; at 400 in the meta ink while `dim`, and
	// wrapped whole at 400 while `wrap`.
	title: Part;
	// The line under the title, its parts joined by a middle dot.
	meta?: readonly Part[];
	// A value at the title line's end (an age, a count, a word), or a pick
	// that applies at once.
	trailing?: RowTrailing<V>;
	// A work state on the meta line; a waiting act is told by its tone.
	status?: StatusMark;
	// What is wrong with the row, on the meta line after the status: a warn
	// glyph and the sentence. The act that clears it is the row's `act`.
	warning?: string;
	// What the row holds, on the meta line after the warning: a lock glyph.
	lock?: string;
	// A data value's chip on the meta line.
	chip?: ChipMark;
	// An input and its act under the title, in the meta line's place: `meta`,
	// `status` and `chip` are not drawn while it stands. Give them in its place
	// once the act settles.
	entry?: RowEntry;
	// The steps of the work the row's act pends on, one line each in the meta
	// line's place (`meta` and the marks are not drawn while they stand): a
	// status dot, or the spinner while `running`, and its label, the running
	// step in the body ink and the others in the meta ink. Give `meta` back
	// once the act settles.
	steps?: readonly StatusMark[];
	// The row stands off a highlighted path: its title in the meta ink at 400,
	// never faded, so it stays legible; still a hit, its leading glyph and
	// marks keeping their hue.
	dim?: boolean;
	// The title is a passage read whole: it wraps to every line, and the
	// leading, trailing and acts stand on its first line.
	wrap?: boolean;
	// One labelled act at the row's end, ahead of the more act: the next step
	// the row names. An act the row waits on keeps its pending press here,
	// never also in `more`.
	act?: Act;
	// The row's acts, in a menu under the more act at its end; an act the row
	// waits on leads it.
	more?: readonly MenuItem[];
	// Where the row goes when opened; the row is current at it.
	href?: Route;
	// The row is the open record: current (the selection wash) whatever its
	// `href`.
	selected?: boolean;
	onOpen?: () => void;
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
		<View pointerEvents="box-none" className={cn(TREE, treeBleed({ lines }))}>
			{levels.map((level) => (
				<View key={level} pointerEvents="none" className={TREE_RAIL} />
			))}
			<First on={top}>
				<View pointerEvents="box-none" className={cn(TREE_LANE, FOLD)}>
					{fold ? (
						<IconButtonBase
							icon={fold.open ? "ChevronDown" : "ChevronRight"}
							fit="bar"
							label={`${fold.open ? words.collapse : words.expand} ${named}`}
							onAct={fold.onToggle}
							expanded={fold.open}
						/>
					) : null}
				</View>
			</First>
		</View>
	);
}

// A part standing on the title's first line while the title wraps whole.
function First(props: { on: boolean; children: ReactNode }) {
	if (!props.on) return props.children;
	return (
		<View pointerEvents="box-none" className={FIRST_LINE}>
			{props.children}
		</View>
	);
}

function Leading({ leading, named }: { leading: RowLeading; named: string }) {
	const words = useWords();
	if ("check" in leading)
		return (
			<FieldDisabled.Provider value={leading.check.blocked !== undefined}>
				<Checkbox
					checked={leading.check.checked}
					onChange={leading.check.onChange}
					label={named}
				/>
			</FieldDisabled.Provider>
		);
	if ("avatar" in leading)
		return <Avatar name={leading.avatar.name} src={leading.avatar.src} />;
	if ("status" in leading)
		return <StatusDot state={leading.status} label={words[leading.status]} />;
	return (
		<Ink.Provider value="ink-meta">
			<Icon name={leading.icon} />
		</Ink.Provider>
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
		blocked !== undefined && (pressed || touched) ? (
			<RNText className={text({ role: "meta" })}>{blocked}</RNText>
		) : null;
	return { host, line };
}

function ActButton(props: {
	act: Act;
	host: ReturnType<typeof useReasonLine>["host"];
}) {
	const { act, host } = props;
	return (
		<ReasonHostContext.Provider value={host}>
			<Button
				act={act.destructive ? "destructive" : "secondary"}
				fit="bar"
				label={act.label}
				onAct={act.onAct}
				loading={act.loading}
				blocked={act.blocked}
			/>
		</ReasonHostContext.Provider>
	);
}

// A trailing age's short words, read off the shared clock: the row draws
// again only when they change.
function Age(props: { moment: string }) {
	return useClock((now) => ageShort(props.moment, now));
}

function trailingWord(trailing: RowTrailing<string | null>): ReactNode {
	if ("age" in trailing) return <Age moment={trailing.age} />;
	if ("count" in trailing) return String(trailing.count);
	if ("value" in trailing) return trailing.value;
	return "";
}

// Inside a tree `List` the row opens with a rail per level and the fold lane
// every row of the tree reserves, a branch's fold act in it (its
// `accessibilityState.expanded` the branch's state).
// The change mark, the leading slot, the title with its trailing value over the meta line (its
// status, warning, lock and chip at the end, the chip yielding first), the entry (its input and act, its error
// under it) or the step list, a trailing pick, then the row's act and the more act. A row that
// opens is one hit under its pick and acts, current (the selection wash) at
// its `href`. In a `Group` it runs edge to edge at the card's inset,
// elsewhere it is the list's row, square on the phone.
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
	const ground = useContext(GroundContext);
	const tree = useContext(TreeContext);
	const waits = useContext(TrailingWait);
	const pathname = usePathname();
	const named = partText(title);
	const current = selected || (href !== undefined && isCurrent(href, pathname));
	const open = href !== undefined ? () => navigate(href) : onOpen;
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
	const quotedWraps = lined && typeof title !== "string";
	// A wrapped title and an entry's input are lines under the title's first, so
	// the parts beside them stand on that first line.
	const top = wrap || entry !== undefined;
	const under = act !== undefined && !top;
	const inline = useMemo(() => ({ label: entry?.label ?? "" }), [entry?.label]);
	const entryReason = useReasonLine(entry?.act.blocked);
	const actReason = useReasonLine(act?.blocked);
	// A blocked tick's reason follows the first part inside the span that yields
	// last, so the part that names the item stays whole ahead of it.
	const [first, ...rest] = meta ?? [];
	const lead: Part[] = first === undefined ? [] : [first];
	if (blocked !== undefined) lead.push(blocked);
	const value =
		trailing && !("pick" in trailing) ? (
			<First on={top}>
				{waits ? (
					<View
						className={cn(skeleton({ kind: "line" }), TRAILING_BAR, TRAILING)}
					/>
				) : (
					<RNText className={cn(ROW_TRAILING, TRAILING)}>
						{trailingWord(trailing)}
					</RNText>
				)}
			</First>
		) : null;
	const titled = (
		<RNText
			numberOfLines={wrap || quotedWraps ? undefined : 1}
			className={cn(rowTitle({ form: rowTitleForm(wrap, dim) }), TITLE)}
		>
			{named}
		</RNText>
	);
	const titleLine = (
		<View
			pointerEvents="none"
			className={cn(ROW_TITLE_LINE, wrap ? LINE_WHOLE : LINE)}
		>
			{titled}
			{value}
		</View>
	);
	return (
		<View
			className={cn(
				row({ lines, ground, state: current ? "selected" : "rest" }),
				top ? ROW_WHOLE : ROW,
				under && ROW_UNDER,
				ground === "list" && SQUARE,
			)}
		>
			{open ? (
				<Pressable
					accessibilityRole={href !== undefined ? "link" : "button"}
					accessibilityLabel={named}
					accessibilityState={{ selected: current }}
					onPress={open}
					className={HIT}
				/>
			) : null}
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
					<View
						pointerEvents={ticks ? "auto" : "none"}
						className={cn(ROW_LEADING, LEADING, ticks && TICK)}
					>
						<Leading leading={leading} named={named} />
					</View>
				</First>
			) : null}
			{!lined ? (
				<View pointerEvents="none" className={TEXT}>
					{titleLine}
					{actReason.line}
				</View>
			) : entry ? (
				<View pointerEvents="box-none" className={cn(ROW_ENTRY, TEXT)}>
					{titleLine}
					<InlineField.Provider value={inline}>
						<FieldError.Provider value={Boolean(entry.error)}>
							<View className={cn(ROW_META_LINE, ENTRY)}>
								<View className={ENTRY_FIELD}>
									<Input
										value={entry.field.value}
										onChange={entry.field.onChange}
										onCommit={entry.field.onCommit}
										placeholder={entry.placeholder}
									/>
								</View>
								<ActButton act={entry.act} host={entryReason.host} />
							</View>
						</FieldError.Provider>
					</InlineField.Provider>
					{entry.error ? (
						<RNText className={FIELD_ERROR_LINE}>{entry.error}</RNText>
					) : null}
					{entryReason.line}
					{actReason.line}
				</View>
			) : listed ? (
				<View pointerEvents="none" className={TEXT}>
					{titleLine}
					<View className={cn(ROW_STEPS, STEPS)}>
						{listed.map((step, at) => (
							<View
								// biome-ignore lint/suspicious/noArrayIndexKey: the steps are fixed-order data that never reorder, so position is the identity
								key={at}
								className={cn(ROW_META_LINE, STEP)}
							>
								<StatusDot state={step.state} />
								<RNText
									numberOfLines={1}
									className={cn(
										rowStep({
											state: step.state === "running" ? "running" : "rest",
										}),
										STEP_LABEL,
									)}
								>
									{step.label}
								</RNText>
							</View>
						))}
					</View>
					{actReason.line}
				</View>
			) : (
				<View pointerEvents="none" className={TEXT}>
					{titleLine}
					<View className={cn(ROW_META_LINE, META_LINE)}>
						{lead.length === 0 ? null : (
							<View className={META_PARTS}>
								<RNText
									numberOfLines={1}
									className={cn(text({ role: "meta" }), META_FIRST)}
								>
									{joinParts(lead, META_CUT)}
								</RNText>
								{rest.length ? (
									<RNText
										numberOfLines={1}
										className={cn(text({ role: "meta" }), META)}
									>
										{`\u00A0· ${joinParts(rest, META_CUT)}`}
									</RNText>
								) : null}
							</View>
						)}
						{status ? (
							<View className={STATUS_MARK}>
								<Status state={status.state} label={status.label} />
							</View>
						) : null}
						{warning !== undefined ? <WarningMark label={warning} /> : null}
						{lock !== undefined ? <LockMark /> : null}
						{chip ? (
							<View className={CHIP_SLOT}>
								<View className={CHIP_START} />
								<View className={CHIP_MARK}>
									<Chip family={chip.family} label={chip.label} />
								</View>
							</View>
						) : null}
					</View>
					{actReason.line}
				</View>
			)}
			{trailing && "pick" in trailing ? (
				<First on={top}>
					<Picker {...trailing.pick} fit="row" />
				</First>
			) : null}
			{act || more?.length ? (
				<First on={top}>
					<View className={cn(ROW_ACTS, ACTS, under && ACTS_UNDER)}>
						{act ? <ActButton act={act} host={actReason.host} /> : null}
						{more?.length ? (
							<MenuBase
								label={`${words.more} ${named}`}
								title={named}
								items={more}
							/>
						) : null}
					</View>
				</First>
			) : null}
		</View>
	);
}
