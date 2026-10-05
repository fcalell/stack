import type {
	Act,
	ChipMark,
	MenuItem,
	Part,
	RowEntry,
	RowLeading,
	RowTrailing,
	StatusMark,
} from "@fcalell/ui-core/descriptors";
import {
	ROW_ACTS,
	ROW_ENTRY,
	ROW_ENTRY_ERROR,
	ROW_LEADING,
	ROW_MARKS,
	ROW_META_LINE,
	ROW_TITLE_LINE,
	ROW_TRAILING,
	row,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { useContext, useMemo } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { FieldError, InlineField } from "../../lib/field";
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
import { Chip } from "../chip";
import { Icon } from "../icon";
import { Input } from "../input";
import { MenuBase } from "../menu/base";
import { Picker } from "../picker";
import { Status } from "../status";
import { StatusDot } from "../status/dot";
import { LockMark, WarningMark } from "./marks";

const ROW = "relative flex-row items-center";
// A list row's wash is square on the phone, where it meets the screen's edge.
const SQUARE = "rounded-none";
// The hit covers the row under its text, its pick and its acts, and takes the
// press wash; the text lets a press through to it.
const HIT = "absolute inset-0 active:bg-wash-press";
const LEADING = "shrink-0 items-center justify-center";
const TEXT = "flex-1 min-w-0";
const LINE = "flex-row items-center min-w-0";
const TITLE = "grow shrink";
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
	// A glyph, a status's mark (its dot, or the spinner while `running`) or an
	// avatar, in one slot at the avatar's size.
	leading?: RowLeading;
	// What the row names, at body 500.
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

function Leading({ leading }: { leading: RowLeading }) {
	const words = useWords();
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

// The leading slot, the title with its trailing value over the meta line (its
// status, warning, lock and chip at the end, the chip yielding first) or the entry (its input and act, its error
// under it), a trailing pick, then the row's act and the more act. A row that
// opens is one hit under its pick and acts, current (the selection wash) at
// its `href`. In a `Group` it runs edge to edge at the card's inset,
// elsewhere it is the list's row, square on the phone.
export function ListRow<V extends string | null = string>({
	leading,
	title,
	meta,
	trailing,
	status,
	warning,
	lock,
	chip,
	entry,
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
	const lines = entry || meta?.length || marked ? "two" : "one";
	const entryReason = useReasonLine(entry?.act.blocked);
	const actReason = useReasonLine(act?.blocked);
	const [first, ...rest] = meta ?? [];
	const value =
		trailing && !("pick" in trailing) ? (
			<RNText className={cn(ROW_TRAILING, TRAILING)}>
				{trailingWord(trailing)}
			</RNText>
		) : null;
	const titled = (
		<RNText
			numberOfLines={1}
			className={cn(
				text({ role: "body" }),
				textStrong({ role: "body" }),
				TITLE,
			)}
		>
			{named}
		</RNText>
	);
	return (
		<View
			className={cn(
				row({ lines, ground, state: current ? "selected" : "rest" }),
				ROW,
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
			{leading ? (
				<View pointerEvents="none" className={cn(ROW_LEADING, LEADING)}>
					<Leading leading={leading} />
				</View>
			) : null}
			{lines === "one" ? (
				<View pointerEvents="none" className={TEXT}>
					<View className={cn(ROW_TITLE_LINE, LINE)}>
						{titled}
						{value}
					</View>
					{actReason.line}
				</View>
			) : entry ? (
				<View pointerEvents="box-none" className={cn(ROW_ENTRY, TEXT)}>
					<View pointerEvents="none" className={cn(ROW_TITLE_LINE, LINE)}>
						{titled}
						{value}
					</View>
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
			) : (
				<View pointerEvents="none" className={TEXT}>
					<View className={cn(ROW_TITLE_LINE, LINE)}>
						{titled}
						{value}
					</View>
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
				<Picker {...trailing.pick} fit="row" />
			) : null}
			{act || more?.length ? (
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
			) : null}
		</View>
	);
}
