import type {
	ChipMark,
	MenuItem,
	Part,
	RowLeading,
	RowTrailing,
	StatusMark,
} from "@fcalell/ui-core/descriptors";
import {
	ROW_ACTS,
	ROW_LEADING,
	ROW_MARKS,
	ROW_META_LINE,
	ROW_TITLE_LINE,
	ROW_TRAILING,
	row,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { useContext } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { GroundContext } from "../../lib/ground";
import { Ink } from "../../lib/ink";
import { isCurrent, navigate, usePathname } from "../../lib/navigate";
import { joinParts, META_CUT, partText } from "../../lib/parts";
import { useWords } from "../../lib/words";
import { Avatar } from "../avatar";
import { Chip } from "../chip";
import { Icon } from "../icon";
import { Menu } from "../menu";
import { Picker } from "../picker";
import { Status } from "../status";
import { StatusDot } from "../status/dot";

const ROW = "relative flex-row items-center";
// A list row's wash is square on the phone, where it meets the screen's edge.
const SQUARE = "rounded-none";
// The hit covers the row under its text, its pick and its acts, and takes the
// press wash; the text lets a press through to it.
const HIT = "absolute inset-0 active:bg-wash-press";
const LEADING = "shrink-0 items-center justify-center";
const TEXT = "flex-1 min-w-0";
const LINE = "flex-row items-center min-w-0";
const ONE_LINE = "flex-1 flex-row items-center min-w-0";
const TITLE = "grow shrink";
const TRAILING = "shrink-0";
const META_LINE = "flex-row flex-wrap items-center min-w-0";
// The meta keeps its room: a mark that cannot sit beside it wraps under it.
const META = "grow shrink";
const MARKS = "flex-row shrink-0 items-center";
const ACTS = "relative flex-row shrink-0 items-center";

export interface ListRowProps<V extends string | null = string> extends Closed {
	// A glyph, a status's dot or an avatar, in one slot at the avatar's size.
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
	// A data value's chip on the meta line.
	chip?: ChipMark;
	// The row's acts, in a menu under the more act at its end; an act the row
	// waits on leads it.
	more?: readonly MenuItem[];
	// Where the row goes when opened; the row is current at it.
	href?: string;
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

function trailingWord(trailing: RowTrailing<string | null>): string {
	if ("age" in trailing) return trailing.age;
	if ("count" in trailing) return String(trailing.count);
	if ("value" in trailing) return trailing.value;
	return "";
}

// The leading slot, the title with its trailing value over the meta line (its
// status and chip at the end), a trailing pick, then the more act. A row that
// opens is one hit under its pick and acts, current (the selection wash) at
// its `href`. In a `Group` it runs edge to edge at the card's inset,
// elsewhere it is the list's row, square on the phone.
export function ListRow<V extends string | null = string>({
	leading,
	title,
	meta,
	trailing,
	status,
	chip,
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
	const marked = status !== undefined || chip !== undefined;
	const lines = meta?.length || marked ? "two" : "one";
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
				<View pointerEvents="none" className={cn(ROW_TITLE_LINE, ONE_LINE)}>
					{titled}
					{value}
				</View>
			) : (
				<View pointerEvents="none" className={TEXT}>
					<View className={cn(ROW_TITLE_LINE, LINE)}>
						{titled}
						{value}
					</View>
					<View className={cn(ROW_META_LINE, META_LINE)}>
						{meta?.length ? (
							<RNText
								numberOfLines={1}
								className={cn(text({ role: "meta" }), META)}
							>
								{joinParts(meta, META_CUT)}
							</RNText>
						) : null}
						{marked ? (
							<View className={cn(ROW_MARKS, MARKS)}>
								{status ? (
									<Status state={status.state} label={status.label} />
								) : null}
								{chip ? <Chip family={chip.family} label={chip.label} /> : null}
							</View>
						) : null}
					</View>
				</View>
			)}
			{trailing && "pick" in trailing ? (
				<Picker {...trailing.pick} fit="row" />
			) : null}
			{more?.length ? (
				<View className={cn(ROW_ACTS, ACTS)}>
					<Menu label={`${words.more} ${named}`} items={more} />
				</View>
			) : null}
		</View>
	);
}
