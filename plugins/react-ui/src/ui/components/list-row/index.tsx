import { Button as BaseButton } from "@base-ui/react/button";
import { Field } from "@base-ui/react/field";
import { cn } from "@fcalell/ui-core/cn";
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
import {
	lineBox,
	ROW_ACTS,
	ROW_ENTRY,
	ROW_ENTRY_ERROR,
	ROW_LEADING,
	ROW_MARKS,
	ROW_META_LINE,
	ROW_STEPS,
	ROW_TITLE_LINE,
	ROW_TRAILING,
	row,
	rowStep,
	rowTitle,
	rowTitleForm,
	TREE_LANE,
	TREE_RAIL,
	text,
} from "@fcalell/ui-core/variants";
import { type KeyboardEvent, type ReactNode, use, useId, useMemo } from "react";
import type { Closed } from "../../lib/closed.ts";
import { InlineField } from "../../lib/field.ts";
import { GroundContext } from "../../lib/ground.ts";
import { isCurrent, useRoute } from "../../lib/navigate.ts";
import { joinParts, META_CUT, partText } from "../../lib/parts.ts";
import { ReasonHostContext, usePressed } from "../../lib/reason.ts";
import { useTouched } from "../../lib/touched.ts";
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
import { Status } from "../status/index.tsx";
import { LockMark, WarningMark } from "./marks.tsx";

const ROW = "relative flex items-center";
// A row whose title wraps whole stands its parts on the title's first line.
const ROW_WHOLE = "relative flex items-start";
// The box one body line tall a part stands in, centred on the first line.
const FIRST_LINE = "flex shrink-0 items-center h-lh";
// A list row's wash is square on touch, where it meets the screen's edge.
const SQUARE = "touch:rounded-none";
// A row that opens washes under the pointer and the press; the chosen one a
// step darker under the pointer.
const PRESS = "hover:bg-wash-hover active:bg-wash-press";
const CHOSEN_PRESS = "hover:bg-wash-selected-hover active:bg-wash-press";
// The hit covers the row, under its pick and its acts, and rings inset.
const HIT = "absolute inset-0 focus-visible:-outline-offset-2";
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
const LINE_WHOLE = "flex items-start min-w-0";
const TRAILING = "shrink-0";
// The meta line is one line that yields in order: the later parts truncate
// first, then the chip; the first part (naming the item) and the status keep
// their width, and past them the line clips at the row's edge rather than
// overprint. The parts' box is as wide as the first part at least (the later
// parts take no width of their own) and grows into the room the marks leave.
const META_LINE = "flex items-center min-w-0 overflow-hidden";
const META_PARTS = "flex grow shrink-0";
const META_FIRST = "shrink-0";
const META = "truncate grow w-0";
const MARKS = "flex items-center min-w-0";
// A step is one meta line; its label truncates before its mark does.
const STEPS = "flex flex-col min-w-0";
const STEP = "flex items-center min-w-0 h-lh";
const STEP_LABEL = "truncate";
const STATUS_MARK = "flex shrink-0";
// The chip yields first, then the lock's label; the warning's keeps.
const CHIP_MARK = "flex min-w-0 shrink-4";
const ACTS = "relative flex shrink-0 items-center";
// The entry stands above the hit: the input and its act, the field filling
// the room the act leaves.
const ENTRY = "relative flex items-center min-w-0";
const ENTRY_FIELD = "grow min-w-0";
// A tree row's levels and fold lane stand as one box that runs the row's full
// height, over its padding, so a level's rail is unbroken from row to row.
const TREE = "flex shrink-0 self-stretch";
const FOLD = "flex shrink-0 items-center justify-center self-center";
const BLEED = { one: "", two: "-my-rows", whole: "-my-pair" } as const;

/** One thing in a list or a group. */
export interface ListRowProps<V extends string | null = string> extends Closed {
	/** Where the row stands in a change set: its mark at the row's start, ahead of the leading slot. Mark a set's untouched rows `unchanged` so the titles line up. */
	change?: ChangeKind;
	/** A glyph, a status's mark (its dot, or the spinner while `running`), an avatar, or a tick that chooses the row (disabled while `blocked`, its reason leading the meta line), in one slot at the avatar's size; a tick takes its hit box. */
	leading?: RowLeading;
	/** What the row names, at body 500; at 400 in the meta ink while `dim`, and wrapped whole at 400 while `wrap`. */
	title: Part;
	/** The line under the title, its parts joined by a middle dot. */
	meta?: readonly Part[];
	/** A value at the title line's end (an age, a count, a word), or a pick that applies at once. */
	trailing?: RowTrailing<V>;
	/** A work state on the meta line; a waiting act is told by its tone. */
	status?: StatusMark;
	/** What is wrong with the row, on the meta line after the status: a warn glyph and the sentence. The act that clears it is the row's `act`. */
	warning?: string;
	/** What the row holds, on the meta line after the warning: a lock glyph and its label, shown from `tablet` and read aloud always. */
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
	/** Opens what the row names. */
	onOpen?: () => void;
}

// A tree row in a list is a treeitem of the list's tree, at its depth, open or
// closed when it is a branch; Arrow Left folds a branch and Arrow Right opens
// it, but not while the key is typing in the row's entry. The focus stands on
// the row's hit and fold act inside it.
function treeitemProps(tree: RowTree) {
	const { depth, fold } = tree;
	return {
		role: "treeitem",
		"aria-level": depth + 1,
		"aria-expanded": fold?.open,
		onKeyDown: (event: KeyboardEvent) => {
			if (fold === undefined || event.target instanceof HTMLInputElement)
				return;
			const hide = event.key === "ArrowLeft" && fold.open;
			const show = event.key === "ArrowRight" && !fold.open;
			if (!hide && !show) return;
			event.preventDefault();
			fold.onToggle();
		},
	};
}

// A part standing on the title's first line while the title wraps whole.
function First(props: { on: boolean; children: ReactNode }) {
	if (!props.on) return props.children;
	return (
		<span className={cn(lineBox({ role: "body" }), FIRST_LINE)}>
			{props.children}
		</span>
	);
}

// A tree row's rails and fold lane: a rail per level, then the lane every row
// of the tree reserves, a branch's fold act standing in it.
function TreeLead(props: {
	tree: RowTree;
	lines: keyof typeof BLEED;
	wrap: boolean;
	named: string;
}) {
	const words = useWords();
	const { tree, lines, wrap, named } = props;
	const { depth, fold } = tree;
	const levels = Array.from({ length: depth }, (_, level) => level);
	return (
		<span className={cn(TREE, BLEED[lines])}>
			{levels.map((level) => (
				<span key={level} className={TREE_RAIL} />
			))}
			<First on={wrap}>
				<span className={cn(TREE_LANE, FOLD)}>
					{fold ? (
						<IconButtonBase
							icon={fold.open ? "ChevronDown" : "ChevronRight"}
							fit="bar"
							label={`${fold.open ? words.collapse : words.expand} ${named}`}
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
	const id = useId();
	const { touched } = useTouched();
	const [pressed, press] = usePressed(blocked);
	const host = useMemo(
		() => (blocked === undefined ? undefined : { id, press }),
		[blocked, id, press],
	);
	const line =
		blocked === undefined ? null : (
			<Reason id={id} shown={pressed || touched}>
				{blocked}
			</Reason>
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

function trailingWord(trailing: RowTrailing<string | null>): string {
	if ("age" in trailing) return trailing.age;
	if ("count" in trailing) return String(trailing.count);
	if ("value" in trailing) return trailing.value;
	return "";
}

/** Inside a tree `List` the row opens with a rail per level and the fold lane every row of the tree reserves, a branch's fold act in it; Arrow Left and Right fold and open it. Then the change mark, the leading slot, the title with its trailing value over the meta line (its status, warning, lock and chip at the end, yielding from the chip), the entry (its input and act, its error under it) or the step list, a trailing pick, then the row's act and the more act. A row that opens is one hit under its pick and acts, current (the selection wash) at its `href`; it washes under the pointer and the press. In a `Group` it runs edge to edge at the card's inset, elsewhere it is an inset rounded wash, square on touch. */
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
	onOpen,
}: ListRowProps<V>) {
	const words = useWords();
	const ground = use(GroundContext);
	const tree = use(TreeContext);
	const at = useRoute();
	const named = partText(title);
	const current = href !== undefined && isCurrent(href, at);
	const opens = href !== undefined || onOpen !== undefined;
	const marked =
		status !== undefined ||
		warning !== undefined ||
		lock !== undefined ||
		chip !== undefined;
	const ticks = leading !== undefined && "check" in leading;
	const blocked = ticks ? leading.check.blocked : undefined;
	const parts = blocked === undefined ? meta : [blocked, ...(meta ?? [])];
	const listed = steps?.length ? steps : undefined;
	const lined = Boolean(entry || listed || parts?.length || marked);
	const stacked = lined ? "two" : "one";
	const lines = wrap ? "whole" : stacked;
	const entryReason = useReasonLine(entry?.act.blocked);
	const actReason = useReasonLine(act?.blocked);
	const [first, ...rest] = parts ?? [];
	const value =
		trailing && !("pick" in trailing) ? (
			<First on={wrap}>
				<span className={cn(ROW_TRAILING, TRAILING)}>
					{trailingWord(trailing)}
				</span>
			</First>
		) : null;
	const titled = (
		<span
			className={cn(
				rowTitle({ form: rowTitleForm(wrap, dim) }),
				wrap ? TITLE_WHOLE : TITLE,
			)}
		>
			{named}
		</span>
	);
	const titleLine = (
		<span className={cn(ROW_TITLE_LINE, wrap ? LINE_WHOLE : LINE)}>
			{titled}
			{value}
		</span>
	);
	const hitClass = cn(HIT, ground === "list" && HIT_LIST);
	let hit = null;
	if (href !== undefined)
		hit = (
			// biome-ignore lint/a11y/useAnchorContent: the hit covers the row, named by its title
			<a
				href={href}
				aria-label={named}
				aria-current={current ? "page" : undefined}
				className={hitClass}
			/>
		);
	else if (onOpen)
		hit = (
			<BaseButton aria-label={named} onClick={onOpen} className={hitClass} />
		);
	return (
		<div
			{...(tree && ground === "list" ? treeitemProps(tree) : {})}
			className={cn(
				row({ lines, ground, state: current ? "selected" : "rest" }),
				wrap ? ROW_WHOLE : ROW,
				ground === "list" && SQUARE,
				opens && (current ? CHOSEN_PRESS : PRESS),
			)}
		>
			{hit}
			{tree ? (
				<TreeLead tree={tree} lines={lines} wrap={wrap} named={named} />
			) : null}
			{change ? (
				<First on={wrap}>
					<ChangeMark kind={change} />
				</First>
			) : null}
			{leading ? (
				<First on={wrap}>
					<span className={cn(ROW_LEADING, LEADING, ticks && TICK)}>
						<Leading leading={leading} named={named} />
					</span>
				</First>
			) : null}
			{!lined ? (
				<span className={TEXT}>
					{titleLine}
					{actReason.line}
				</span>
			) : entry ? (
				<Field.Root
					invalid={Boolean(entry.error)}
					className={cn(ROW_ENTRY, TEXT)}
				>
					{titleLine}
					<InlineField value={{ label: entry.label }}>
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
						<Field.Error match className={ROW_ENTRY_ERROR}>
							{entry.error}
						</Field.Error>
					) : null}
					{entryReason.line}
					{actReason.line}
				</Field.Root>
			) : listed ? (
				<span className={TEXT}>
					{titleLine}
					<span className={cn(ROW_STEPS, STEPS)}>
						{listed.map((step) => (
							<span
								key={step.label}
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
				<span className={TEXT}>
					{titleLine}
					<span className={cn(ROW_META_LINE, META_LINE)}>
						{first === undefined ? null : (
							<span className={META_PARTS}>
								<span className={cn(text({ role: "meta" }), META_FIRST)}>
									{partText(first, META_CUT)}
								</span>
								{rest.length ? (
									<span className={cn(text({ role: "meta" }), META)}>
										{` · ${joinParts(rest, META_CUT)}`}
									</span>
								) : null}
							</span>
						)}
						{marked ? (
							<span className={cn(ROW_MARKS, MARKS)}>
								{status ? (
									<span className={STATUS_MARK}>
										<Status state={status.state} label={status.label} />
									</span>
								) : null}
								{warning !== undefined ? <WarningMark label={warning} /> : null}
								{lock !== undefined ? <LockMark label={lock} /> : null}
								{chip ? (
									<span className={CHIP_MARK}>
										<Chip family={chip.family} label={chip.label} />
									</span>
								) : null}
							</span>
						) : null}
					</span>
					{actReason.line}
				</span>
			)}
			{trailing && "pick" in trailing ? (
				<First on={wrap}>
					<Picker {...trailing.pick} fit="row" />
				</First>
			) : null}
			{act || more?.length ? (
				<First on={wrap}>
					<span className={cn(ROW_ACTS, ACTS)}>
						{act ? <ActButton act={act} host={actReason.host} /> : null}
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
