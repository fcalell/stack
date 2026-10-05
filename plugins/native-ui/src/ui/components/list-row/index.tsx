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
	text,
} from "@fcalell/ui-core/variants";
import { type ReactNode, useContext, useMemo } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { FieldDisabled, FieldError, InlineField } from "../../lib/field";
import { GroundContext } from "../../lib/ground";
import { Ink } from "../../lib/ink";
import { isCurrent, navigate, usePathname } from "../../lib/navigate";
import { joinParts, META_CUT, partText } from "../../lib/parts";
import { ReasonHostContext, usePressed } from "../../lib/reason";
import type { Route } from "../../lib/route";
import { useTouched } from "../../lib/touched";
import { useWords } from "../../lib/words";
import { Avatar } from "../avatar";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { Chip } from "../chip";
import { Icon } from "../icon";
import { Input } from "../input";
import { MenuBase } from "../menu/base";
import { Picker } from "../picker";
import { Status } from "../status";
import { ChangeMark } from "../status/change";
import { StatusDot } from "../status/dot";
import { LockMark, WarningMark } from "./marks";

const ROW = "relative flex-row items-center";
// A row whose title wraps whole stands its parts on the title's first line:
// each in a box one body line tall, a strut setting the line (as the web's
// `h-lh` does).
const ROW_WHOLE = "relative flex-row items-start";
const FIRST_LINE = "flex-row shrink-0 items-center";
const STRUT = "​";
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
// A step is one meta line.
const STEPS = "min-w-0";
const STEP = "flex-row items-center min-w-0";
const STEP_LABEL = "shrink";
const TRAILING = "shrink-0";
// The meta line is one line that yields in order: the later parts truncate
// first, then the chip; the first part (naming the item) and the status keep
// their width, and past them the line clips at the row's edge rather than
// overprint. The parts' box is as wide as the first part at least (the later
// parts take no width of their own) and grows into the room the marks leave.
const META_LINE = "flex-row items-center min-w-0 overflow-hidden";
const META_PARTS = "flex-row grow shrink-0";
const META_FIRST = "shrink-0";
const META = "grow w-0";
const MARKS = "flex-row items-center shrink min-w-0";
const STATUS_MARK = "shrink-0";
const CHIP_MARK = "shrink min-w-0";
const ACTS = "relative flex-row shrink-0 items-center";
// The entry takes the touch itself: the input filling the room its act leaves.
const ENTRY = "flex-row items-center min-w-0";
const ENTRY_FIELD = "flex-1 min-w-0";

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
	// What the row holds, on the meta line after the warning: a lock glyph,
	// its label read aloud.
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
	onOpen?: () => void;
}

// A part standing on the title's first line while the title wraps whole.
function First(props: { on: boolean; children: ReactNode }) {
	if (!props.on) return props.children;
	return (
		<View pointerEvents="box-none" className={FIRST_LINE}>
			<RNText className={lineBox({ role: "body" })}>{STRUT}</RNText>
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

function trailingWord(trailing: RowTrailing<string | null>): string {
	if ("age" in trailing) return trailing.age;
	if ("count" in trailing) return String(trailing.count);
	if ("value" in trailing) return trailing.value;
	return "";
}

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
	onOpen,
}: ListRowProps<V>) {
	const words = useWords();
	const ground = useContext(GroundContext);
	const pathname = usePathname();
	const named = partText(title);
	const current = href !== undefined && isCurrent(href, pathname);
	const open = href !== undefined ? () => navigate(href) : onOpen;
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
				<RNText className={cn(ROW_TRAILING, TRAILING)}>
					{trailingWord(trailing)}
				</RNText>
			</First>
		) : null;
	const titled = (
		<RNText
			numberOfLines={wrap ? undefined : 1}
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
				wrap ? ROW_WHOLE : ROW,
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
			{change ? (
				<First on={wrap}>
					<ChangeMark kind={change} />
				</First>
			) : null}
			{leading ? (
				<First on={wrap}>
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
					<InlineField.Provider value={{ label: entry.label }}>
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
						<RNText
							accessibilityLiveRegion="polite"
							className={ROW_ENTRY_ERROR}
						>
							{entry.error}
						</RNText>
					) : null}
					{entryReason.line}
					{actReason.line}
				</View>
			) : listed ? (
				<View pointerEvents="none" className={TEXT}>
					{titleLine}
					<View className={cn(ROW_STEPS, STEPS)}>
						{listed.map((step) => (
							<View key={step.label} className={cn(ROW_META_LINE, STEP)}>
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
						{first === undefined ? null : (
							<View className={META_PARTS}>
								<RNText
									numberOfLines={1}
									className={cn(text({ role: "meta" }), META_FIRST)}
								>
									{partText(first, META_CUT)}
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
						{marked ? (
							<View className={cn(ROW_MARKS, MARKS)}>
								{status ? (
									<View className={STATUS_MARK}>
										<Status state={status.state} label={status.label} />
									</View>
								) : null}
								{warning !== undefined ? <WarningMark label={warning} /> : null}
								{lock !== undefined ? <LockMark label={lock} /> : null}
								{chip ? (
									<View className={CHIP_MARK}>
										<Chip family={chip.family} label={chip.label} />
									</View>
								) : null}
							</View>
						) : null}
					</View>
					{actReason.line}
				</View>
			)}
			{trailing && "pick" in trailing ? (
				<First on={wrap}>
					<Picker {...trailing.pick} fit="row" />
				</First>
			) : null}
			{act || more?.length ? (
				<First on={wrap}>
					<View className={cn(ROW_ACTS, ACTS)}>
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
