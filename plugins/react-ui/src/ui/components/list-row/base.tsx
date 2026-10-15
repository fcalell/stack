import { Button as BaseButton } from "@base-ui/react/button";
import { Field } from "@base-ui/react/field";
import { cn } from "@fcalell/ui-core/cn";
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
import { Fragment, type KeyboardEvent, type ReactNode, useMemo } from "react";
import { ageShort } from "../../lib/age.ts";
import { useClock } from "../../lib/clock.ts";
import { CodeCut, Runs } from "../../lib/code.tsx";
import { follow, navigate, useRoute } from "../../lib/navigate.ts";
import { Painted } from "../../lib/paint.tsx";
import {
	isCoded,
	leadRuns,
	META_CUT,
	partRuns,
	partText,
} from "../../lib/parts.ts";
import { ReasonHostContext, usePressed } from "../../lib/reason.ts";
import { useTouched } from "../../lib/touched.ts";
import { useWords } from "../../lib/words.tsx";
import { AvatarBase } from "../avatar/base.tsx";
import { ButtonBase } from "../button/base.tsx";
import { Reason } from "../button/reason.tsx";
import { CheckboxBase } from "../checkbox/base.tsx";
import { ChipBase } from "../chip/base.tsx";
import { Icon, IconBase } from "../icon/index.tsx";
import { IconButtonBase } from "../icon-button/base.tsx";
import { InputBase } from "../input/base.tsx";
import { MenuBase } from "../menu/base.tsx";
import { PickerBase } from "../picker/base.tsx";
import { ChangeMark } from "../status/change.tsx";
import { StatusDot } from "../status/dot.tsx";
import type { ListRowProps } from "./index.tsx";
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
const GLYPH = "flex text-ink-meta";
const TEXT = "flex flex-col grow shrink-10000000 min-w-0";
const LINE = "flex items-center min-w-0";
const TITLE = "truncate grow";
const TITLE_WHOLE = "grow min-w-0";
// A title that is one span of code stands in a flex line, so its stem
// truncates and its tail keeps the room it needs.
const TITLE_CODE = "flex items-center grow min-w-0";
const LINE_WHOLE = "flex items-start min-w-0";
const TRAILING = "shrink-0";
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
// stays whole before all of them (`./status.tsx`): it takes no share of the
// overflow, and is held to the line less the first part's floor, so only a
// status wider than that is cut. The shrink weights are the order: a flex line takes the
// overflow from each item in proportion to its weight times its own width, and
// `truncate` draws its ellipsis on any overflow, however small, so a part that
// still fits must take none of it: the weights run 1, 10^7, 10^14 and 10^20
// (`./marks.tsx`, `./lock.tsx` and the chip's slot below; Tailwind reads no
// bare number from 10^21), which holds an earlier part's share of the overflow
// to a few thousandths of a pixel, against the layout's 1/64 px. The parts'
// box grows into the room the marks leave, so the status stands at the line's
// end; the room a dropped part leaves falls before it.
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
const ACTS = "relative flex items-center min-w-0 max-w-full";
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

/** What a `List` hands the rows it draws; no app sets them, so they are outside `ListRowProps`. */
export interface ListRowInternal {
	/** The row's place in a tree `List`: its depth (the roots 0), for a branch whether its children are drawn and how to fold them, and whether it is the tree's one tab stop. */
	tree?: RowTree;
	/** A row of the list has a more act: a row without one keeps its square blank, so every row's trailing value ends at one x. */
	room?: boolean;
	/** The List's items are not here: every text and figure slot paints at its role, the marks and controls paint, the row is inert and builds no hit. The slots are run over the placeholder, so they say which parts the loaded row has. */
	painted?: boolean;
	/** The row's place among the painted rows, which varies the filler's lengths. */
	at?: number;
	/** The painted row's List has an `href` or `onOpen` slot: the row draws the chevron the loaded one would, though its slots gave no `href` over the placeholder. */
	opens?: boolean;
}

// A row of a tree `List`: its depth (the roots 0), for a branch whether its
// children are drawn and how to fold them, and whether it is the tree's one
// tab stop.
export interface RowTree {
	depth: number;
	fold: { open: boolean; onToggle: () => void } | undefined;
	tabbable: boolean;
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

const NOOP = () => {};

function Leading(props: {
	leading: RowLeading;
	named: string;
	painted: boolean;
}) {
	const words = useWords();
	const { leading, painted } = props;
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
			<Field.Root disabled={leading.check.blocked !== undefined}>
				<CheckboxBase
					checked={leading.check.checked}
					onChange={leading.check.onChange}
					label={props.named}
				/>
			</Field.Root>
		);
	if ("avatar" in leading)
		return <AvatarBase name={leading.avatar.name} src={leading.avatar.src} />;
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
		<ReasonHostContext value={host}>
			<ButtonBase
				act={act.destructive ? "destructive" : "secondary"}
				fit="bar"
				label={act.label}
				onAct={act.onAct}
				failed={act.failed}
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
	const route = useRoute();
	// Over the placeholder the title is not a name.
	const named = painted ? "" : partText(title);
	const current =
		!painted && (selected || (href !== undefined && isCurrent(href, route)));
	const opens = painted ? opened : href !== undefined || onOpen !== undefined;
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
	const column = cn(TEXT, under && TEXT_UNDER);
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
	let value: ReactNode = null;
	if (trailing && !("pick" in trailing))
		value = (
			<First on={top}>
				<span className={cn(ROW_TRAILING, TRAILING)}>
					{painted ? <Painted role="figure" at={at} /> : trailingWord(trailing)}
				</span>
			</First>
		);
	// A value beside a one-line title is whole or gone: the title holds half its
	// line before the value takes a place on it.
	const titles = value !== null && !top && !quotedWraps;
	let shown: ReactNode = named;
	let titleBox = wrap || quotedWraps ? TITLE_WHOLE : TITLE;
	if (painted) {
		shown = <Painted role="title" at={at} />;
		titleBox = TITLE;
	} else if (isCoded(title)) {
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
	// In a tree the row is the focus stop and the hit is the pointer's alone.
	const pointed = tree ? { tabIndex: -1 } : {};
	let hit = null;
	if (!painted && href !== undefined)
		hit = (
			<a
				data-hit=""
				href={href}
				onClick={follow}
				aria-label={named}
				aria-current={!tree && current ? "page" : undefined}
				className={HIT}
				{...pointed}
			/>
		);
	else if (!painted && onOpen)
		hit = (
			<BaseButton
				data-hit=""
				aria-label={named}
				onClick={onOpen}
				aria-current={!tree && current ? "true" : undefined}
				className={HIT}
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
			inert={painted || undefined}
			className={cn(
				row({ lines, state: current ? "selected" : "rest" }),
				top ? ROW_WHOLE : ROW,
				under && ROW_UNDER,
				opens && !painted && (current ? CHOSEN_PRESS : PRESS),
				tree && TREE_ITEM,
			)}
		>
			{hit}
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
					<span className={cn(ROW_LEADING, LEADING, ticks && TICK)}>
						<Leading leading={leading} named={named} painted={painted} />
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
					invalid={!painted && Boolean(entry.error)}
					className={cn(ROW_ENTRY, TEXT)}
				>
					{titleLine}
					<span className={cn(ROW_META_LINE, ENTRY)}>
						<span className={ENTRY_FIELD}>
							<InputBase
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
						{listed.map((step, index) => (
							<span
								// biome-ignore lint/suspicious/noArrayIndexKey: the steps are fixed-order data that never reorder, so position is the identity
								key={index}
								className={cn(
									rowStep({
										state:
											!painted && step.state === "running" ? "running" : "rest",
									}),
									STEP,
								)}
							>
								<StatusDot
									state={painted ? "done" : step.state}
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
					{actReason.line}
				</span>
			) : (
				<span className={column}>
					{titleLine}
					<span className={cn(ROW_META_LINE, META_LINE)}>
						{painters ? (
							<span className={META_PARTS}>
								<span
									className={cn(text({ role: "meta" }), FIGURES, META_FIRST)}
								>
									{Array.from({ length: painters }, (_, index) => (
										// biome-ignore lint/suspicious/noArrayIndexKey: the fillers are fixed-order and never reorder, so position is the identity
										<Fragment key={index}>
											{index > 0 ? " · " : null}
											<Painted role="phrase" at={at + index} />
										</Fragment>
									))}
								</span>
							</span>
						) : lead.length === 0 ? null : (
							<span className={META_PARTS}>
								<span
									className={cn(
										text({ role: "meta" }),
										FIGURES,
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
									<span className={cn(text({ role: "meta" }), FIGURES, LATER)}>
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
						{status ? (
							<RowStatusMark
								status={status}
								beside={painters > 0 || lead.length > 0}
								painted={painted}
							/>
						) : null}
						{warning !== undefined ? (
							<WarningMark label={warning} painted={painted} />
						) : null}
						{lock !== undefined ? (
							<LockMark reason={lock} labelled painted={painted} />
						) : null}
						{chip ? (
							<span className={CHIP_SLOT}>
								<span aria-hidden className={CHIP_START} />
								<span className={CHIP_MARK}>
									<ChipBase
										family={chip.family}
										label={chip.label}
										painted={painted}
									/>
								</span>
							</span>
						) : null}
					</span>
					{actReason.line}
				</span>
			)}
			{trailing && "pick" in trailing ? (
				<First on={top}>
					<PickerBase {...trailing.pick} fit="row" painted={painted} />
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
						{act ? (
							<ActButton
								act={act}
								host={actReason.host}
								painted={painted}
								at={at}
							/>
						) : null}
						{blank ? (
							<span aria-hidden className={cn(ROW_CHEVRON, BLANK)} />
						) : null}
						{more?.length ? (
							<MenuBase
								label={`${words.more} ${named}`}
								title={named}
								items={painted ? [] : more}
								painted={painted}
							/>
						) : null}
					</span>
				</First>
			) : null}
		</div>
	);
}
