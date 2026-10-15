import type {
	Act,
	RowLeading,
	RowPart,
	RowTrailing,
} from "@fcalell/ui-core/descriptors";
import { paintText } from "@fcalell/ui-core/paint";
import { isCurrent } from "@fcalell/ui-core/route";
import {
	FIELD_ERROR_LINE,
	FIGURES,
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
	TREE_LANE,
	TREE_RAIL,
	text,
	treeBleed,
} from "@fcalell/ui-core/variants";
import { Fragment, type ReactNode, useMemo } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import { ageShort } from "../../lib/age";
import { useClock } from "../../lib/clock";
import { cn } from "../../lib/cn";
import { CodeCut, Runs } from "../../lib/code";
import { FieldDisabled, FieldError } from "../../lib/field";
import { Ink } from "../../lib/ink";
import { navigate, usePathname } from "../../lib/navigate";
import { clipWhen, inertProps, Painted } from "../../lib/paint";
import {
	isCoded,
	leadRuns,
	META_CUT,
	partRuns,
	partText,
} from "../../lib/parts";
import { ReasonHostContext, usePressed } from "../../lib/reason";
import { useTouched } from "../../lib/touched";
import { useWords } from "../../lib/words";
import { AvatarBase } from "../avatar/base";
import { ButtonBase } from "../button/base";
import { CheckboxBase } from "../checkbox/base";
import { ChipBase } from "../chip/base";
import { Icon, IconBase } from "../icon";
import { IconButtonBase } from "../icon-button/base";
import { InputBase } from "../input/base";
import { MenuBase } from "../menu/base";
import { PickerBase } from "../picker/base";
import { ChangeMark } from "../status/change";
import { StatusDot } from "../status/dot";
import type { ListRowProps } from "./index";
import { LockMark } from "./lock";
import { WarningMark } from "./marks";
import { RowStatusMark } from "./status";

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
// The hit covers the row under its text, its pick and its acts, and takes the
// press wash; the text lets a press through to it.
const HIT = "absolute inset-0 active:bg-wash-press";
const LEADING = "shrink-0 items-center justify-center";
// A tick takes its hit box, and its own touch.
const TICK = "size-target";
const TEXT = "flex-1 min-w-0";
const LINE = "flex-row items-center min-w-0";
const TITLE = "grow shrink";
const TITLE_CODE = "flex-row items-center grow shrink min-w-0";
const LINE_WHOLE = "flex-row items-start min-w-0";
// A step is one body line's box tall (the step lists' 19 of the references,
// at the type scale's rung).
const STEPS = "min-w-0";
const STEP = "flex-row items-center min-w-0 h-line-body";
const STEP_LABEL = "shrink";
const TRAILING = "shrink-0";
// The meta line is one line that yields in order: the later parts truncate
// first (they take no width of their own), a model-written one (`Quoted`)
// ahead of the plain ones, then the chip (shown whole or not at all), the
// warning's label and last the first part, which names the item and truncates
// with an ellipsis; the glyphs keep their width, and past them the line clips
// at the row's edge rather than overprint. The status stands in the parts'
// tier: the two share the overflow in proportion to their widths, so a long
// status never takes the line from the subject, nor the subject from the
// status. The shrink
// weights are the order: a flex line takes the overflow from each item in
// proportion to its weight times its own width, and a part that still fits
// must take none of it, so the weights run 1, 10^7 and 10^14 (the warning's in
// `./marks.tsx`, the chip's slot below), which holds an earlier part's share of
// the overflow to a few thousandths of a pixel. The parts' box grows into the
// room the marks leave.
const META_LINE = "flex-row items-center min-w-0 overflow-hidden";
const META_PARTS = "flex-row grow shrink min-w-0";
const META_FIRST = "shrink min-w-0";
const META_FIRST_CODE = "flex-row shrink min-w-0";
const META_LATER = "flex-row grow w-0 overflow-hidden";
const META_RUN = "shrink min-w-0";
const META_QUOTED = "shrink-10000000 min-w-0";
const META_CODE = "flex-row shrink-10000000 min-w-0";
const SEPARATOR = "shrink-0";
// The chip stands in a slot that shows it whole or not at all: a flex line
// always keeps its first item, so a zero-width start item takes that place and
// the chip, wider than the room the slot is left, wraps under the slot's one
// line height and is clipped away.
const CHIP_SLOT =
	"flex-row flex-wrap h-chip min-w-0 shrink-100000000000000 overflow-hidden";
const CHIP_START = "w-0 h-full";
const CHIP_MARK = "shrink-0";
const ACTS = "relative flex-row shrink-0 items-center";
const CHEVRON = "shrink-0 items-center justify-center";
// The more act's square, left blank in a row that has none beside rows that do.
const BLANK = "shrink-0";
// The entry takes the touch itself: the input filling the room its act leaves.
const ENTRY = "flex-row items-center min-w-0";
const ENTRY_FIELD = "flex-1 min-w-0";
// A tree row's levels and fold lane stand as one box that runs the row's full
// height, over its padding, so a level's rail is unbroken from row to row. A
// press on any of it falls through to the row's hit but the fold act.
const TREE = "flex-row shrink-0 self-stretch";
const FOLD = "shrink-0 items-center justify-center self-center";

/** What a `List` hands the rows it draws; no app sets them, so they are outside `ListRowProps`. */
export interface ListRowInternal {
	// The row's place in a tree `List`: its depth (the roots 0) and, for a
	// branch, whether its children are drawn and how to fold them.
	tree?: RowTree;
	// A row of the list has a more act: a row without one keeps its square
	// blank, so every row's trailing value ends at one x.
	room?: boolean;
	// The List's items are not here: every text and figure slot paints at its
	// role, the marks and controls paint, the row takes no touch and builds no
	// hit. The slots are run over the placeholder, so they say which parts the
	// loaded row has.
	painted?: boolean;
	// The row's place among the painted rows, which varies the filler's lengths.
	at?: number;
	// The painted row's List has an `href` or `onOpen` slot: the row draws the
	// chevron the loaded one would, though its slots gave no `href` over the
	// placeholder.
	opens?: boolean;
}

// A row of a tree `List`: its depth (the roots 0) and, for a branch, whether
// its children are drawn and how to fold them.
export interface RowTree {
	depth: number;
	fold: { open: boolean; onToggle: () => void } | undefined;
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

const NOOP = () => {};

function Leading(props: {
	leading: RowLeading;
	named: string;
	painted: boolean;
}) {
	const words = useWords();
	const { leading, named, painted } = props;
	// Painted, the kind is the slot's shape; what the marks name is not here.
	if (painted) {
		if ("check" in leading)
			return <CheckboxBase checked={false} onChange={NOOP} label="" painted />;
		if ("avatar" in leading) return <AvatarBase name="" painted />;
		if ("status" in leading) return <StatusDot state="done" painted />;
		return <IconBase name="File" stroke="line" painted />;
	}
	if ("check" in leading)
		return (
			<FieldDisabled.Provider value={leading.check.blocked !== undefined}>
				<CheckboxBase
					checked={leading.check.checked}
					onChange={leading.check.onChange}
					label={named}
				/>
			</FieldDisabled.Provider>
		);
	if ("avatar" in leading)
		return <AvatarBase name={leading.avatar.name} src={leading.avatar.src} />;
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
	painted: boolean;
	at: number;
}) {
	const { act, host, painted, at } = props;
	if (painted)
		return (
			<ButtonBase
				act="secondary"
				fit="bar"
				label={paintText("word", at)}
				painted
			/>
		);
	return (
		<ReasonHostContext.Provider value={host}>
			<ButtonBase
				act={act.destructive ? "destructive" : "secondary"}
				fit="bar"
				label={act.label}
				onAct={act.onAct}
				failed={act.failed}
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

// How many fillers a painted meta line draws: a part each of the array the
// slot gave, or one for the placeholder itself.
function paintedParts(meta: readonly RowPart[]): number {
	return Array.isArray(meta) ? meta.length : 1;
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

export function ListRowBase<V extends string | null = string>({
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
	tree,
	room = false,
	painted = false,
	at = 0,
	opens: opened = false,
}: ListRowProps<V> & ListRowInternal) {
	const words = useWords();
	const pathname = usePathname();
	// Over the placeholder the title is not a name.
	const named = painted ? "" : partText(title);
	const current =
		!painted && (selected || (href !== undefined && isCurrent(href, pathname)));
	const open = href !== undefined ? () => navigate(href) : onOpen;
	const opens = painted ? opened : open !== undefined;
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
	const blocked = ticks && !painted ? leading.check.blocked : undefined;
	const listed = steps?.length ? steps : undefined;
	const lined = Boolean(
		entry || listed || meta?.length || blocked !== undefined || marked,
	);
	const stacked = lined ? "two" : "one";
	const lines = wrap ? "whole" : stacked;
	// A model-written name (`Quoted`) wraps in a row that has a second line, so
	// its closing quote is never cut away; its row grows by the lines it wraps.
	const quotedWraps =
		!painted && lined && typeof title === "object" && "quoted" in title;
	// A wrapped title and an entry's input are lines under the title's first, so
	// the parts beside them stand on that first line.
	const top = wrap || entry !== undefined;
	const under = act !== undefined && !top;
	const inline = { label: entry?.label ?? "" };
	const entryReason = useReasonLine(painted ? undefined : entry?.act.blocked);
	const actReason = useReasonLine(painted ? undefined : act?.blocked);
	// A blocked tick's reason follows the first part inside the span that yields
	// last, so the part that names the item stays whole ahead of it.
	const [first, ...rest] = meta ?? [];
	const lead: RowPart[] = first === undefined ? [] : [first];
	if (blocked !== undefined) lead.push(blocked);
	// A first part that is one span of code, alone on its line, cuts in its
	// middle; beside a blocked reason it is a run in a sentence.
	const [only] = lead;
	const coded =
		!painted && lead.length === 1 && only && isCoded(only) ? only : undefined;
	// A painted meta line is one filler per part the slot gave, a slot that
	// gave the placeholder whole counting one.
	const painters = painted && meta?.length ? paintedParts(meta) : 0;
	const metaRole = cn(text({ role: "meta" }), FIGURES);
	let value: ReactNode = null;
	if (trailing && !("pick" in trailing))
		value = (
			<First on={top}>
				<RNText className={cn(ROW_TRAILING, TRAILING)}>
					{painted ? <Painted role="figure" at={at} /> : trailingWord(trailing)}
				</RNText>
			</First>
		);
	const titleRole = rowTitle({ form: rowTitleForm(wrap, dim) });
	let shown: ReactNode = named;
	if (painted) shown = <Painted role="title" at={at} />;
	else if (typeof title === "object" && !isCoded(title) && !("quoted" in title))
		shown = <Runs runs={title} />;
	// A title that is one span of code stands in a line of its own, so its stem
	// truncates and its tail keeps the room it needs.
	const titled =
		!painted && isCoded(title) ? (
			<View className={TITLE_CODE}>
				<CodeCut code={title.code} role={titleRole} />
			</View>
		) : (
			<RNText
				numberOfLines={wrap || quotedWraps ? undefined : 1}
				{...clipWhen(painted)}
				className={cn(titleRole, TITLE)}
			>
				{shown}
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
			{...inertProps(painted)}
			className={cn(
				row({ lines, state: current ? "selected" : "rest" }),
				top ? ROW_WHOLE : ROW,
				under && ROW_UNDER,
			)}
		>
			{open && !painted ? (
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
					<ChangeMark kind={change} painted={painted} />
				</First>
			) : null}
			{leading ? (
				<First on={top}>
					<View
						pointerEvents={ticks ? "auto" : "none"}
						className={cn(ROW_LEADING, LEADING, ticks && TICK)}
					>
						<Leading leading={leading} named={named} painted={painted} />
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
					<FieldError.Provider value={!painted && Boolean(entry.error)}>
						<View className={cn(ROW_META_LINE, ENTRY)}>
							<View className={ENTRY_FIELD}>
								<InputBase
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
						<RNText className={FIELD_ERROR_LINE}>{entry.error}</RNText>
					) : null}
					{entryReason.line}
					{actReason.line}
				</View>
			) : listed ? (
				<View pointerEvents="none" className={TEXT}>
					{titleLine}
					<View className={cn(ROW_STEPS, STEPS)}>
						{listed.map((step, index) => (
							<View
								// biome-ignore lint/suspicious/noArrayIndexKey: the steps are fixed-order data that never reorder, so position is the identity
								key={index}
								className={cn(ROW_META_LINE, STEP)}
							>
								<StatusDot
									state={painted ? "done" : step.state}
									painted={painted}
								/>
								<RNText
									numberOfLines={1}
									{...clipWhen(painted)}
									className={cn(
										rowStep({
											state:
												!painted && step.state === "running"
													? "running"
													: "rest",
										}),
										STEP_LABEL,
									)}
								>
									{painted ? (
										<Painted role="phrase" at={at + index} />
									) : (
										step.label
									)}
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
						{painters ? (
							<View className={META_PARTS}>
								<RNText
									numberOfLines={1}
									{...clipWhen(true)}
									className={cn(metaRole, META_FIRST)}
								>
									{Array.from({ length: painters }, (_, index) => (
										// biome-ignore lint/suspicious/noArrayIndexKey: the fillers are fixed-order and never reorder, so position is the identity
										<Fragment key={index}>
											{index > 0 ? " · " : null}
											<Painted role="phrase" at={at + index} />
										</Fragment>
									))}
								</RNText>
							</View>
						) : lead.length === 0 ? null : (
							<View className={META_PARTS}>
								{coded ? (
									<View className={META_FIRST_CODE}>
										<CodeCut code={coded.code} role={metaRole} />
									</View>
								) : (
									<RNText
										numberOfLines={1}
										className={cn(metaRole, META_FIRST)}
									>
										<Runs runs={leadRuns(lead, META_CUT)} />
									</RNText>
								)}
								{rest.length ? (
									<View className={META_LATER}>
										{partRuns(rest, META_CUT).map((run, at) =>
											run.kind === "code" ? (
												<View
													// biome-ignore lint/suspicious/noArrayIndexKey: the runs come from parts that never reorder, so position is the identity
													key={at}
													className={META_CODE}
												>
													<RNText className={cn(metaRole, SEPARATOR)}>
														{" · "}
													</RNText>
													<CodeCut code={run.text} role={metaRole} />
												</View>
											) : (
												<RNText
													// biome-ignore lint/suspicious/noArrayIndexKey: the runs come from parts that never reorder, so position is the identity
													key={at}
													numberOfLines={1}
													className={cn(
														metaRole,
														run.kind === "quoted" ? META_QUOTED : META_RUN,
													)}
												>
													{` · ${run.text}`}
												</RNText>
											),
										)}
									</View>
								) : null}
							</View>
						)}
						{status ? (
							<RowStatusMark status={status} painted={painted} />
						) : null}
						{warning !== undefined ? (
							<WarningMark label={warning} painted={painted} />
						) : null}
						{lock !== undefined ? <LockMark painted={painted} /> : null}
						{chip ? (
							<View className={CHIP_SLOT}>
								<View className={CHIP_START} />
								<View className={CHIP_MARK}>
									<ChipBase
										family={chip.family}
										label={chip.label}
										painted={painted}
									/>
								</View>
							</View>
						) : null}
					</View>
					{actReason.line}
				</View>
			)}
			{trailing && "pick" in trailing ? (
				<First on={top}>
					<PickerBase {...trailing.pick} fit="row" painted={painted} />
				</First>
			) : null}
			{chevron ? (
				<First on={top}>
					<View pointerEvents="none" className={cn(ROW_CHEVRON, CHEVRON)}>
						<Ink.Provider value="ink-meta">
							<Icon name="ChevronRight" />
						</Ink.Provider>
					</View>
				</First>
			) : null}
			{act || more?.length || blank ? (
				<First on={top}>
					<View className={cn(ROW_ACTS, ACTS, under && ACTS_UNDER)}>
						{act ? (
							<ActButton
								act={act}
								host={actReason.host}
								painted={painted}
								at={at}
							/>
						) : null}
						{blank ? <View className={cn(ROW_CHEVRON, BLANK)} /> : null}
						{more?.length ? (
							<MenuBase
								label={`${words.more} ${named}`}
								title={named}
								items={painted ? [] : more}
								painted={painted}
							/>
						) : null}
					</View>
				</First>
			) : null}
		</View>
	);
}
