import type {
	ChangeKind,
	ChipMark,
	IconName,
} from "@fcalell/ui-core/descriptors";
import { pathCut } from "@fcalell/ui-core/list-state";
import { filled } from "@fcalell/ui-core/tokens";
import {
	FILE_COUNTS,
	FILE_PATH,
	fileCount,
	filePathPart,
	ROW_LEADING,
	row,
} from "@fcalell/ui-core/variants";
import { useContext } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { GroundContext } from "../../lib/ground";
import { Ink } from "../../lib/ink";
import { isCurrent, navigate, usePathname } from "../../lib/navigate";
import type { Route } from "../../lib/route";
import { useCSSVariable } from "../../lib/theme";
import { useWords } from "../../lib/words";
import { Chip } from "../chip";
import { Icon } from "../icon";
import { ChangeMark } from "../status/change";
import { FileWait } from "./wait";

const ROW = "relative flex-row items-center";
// A list row's wash is square on the phone, where it meets the screen's edge.
const SQUARE = "rounded-none";
// The hit covers the row under its text and takes the press wash.
const HIT = "absolute inset-0 active:bg-wash-press";
// The change mark stands in its own lane at the row's start, ahead of the glyph.
const MARK = "shrink-0";
const LEADING = "shrink-0 items-center justify-center";
// The path takes the overflow first (its shrink weight is 10^7 against the
// chip's 1, as ListRow's meta line sets out), down to its floor, a `minWidth`
// from its name; it clips what its floor holds.
const PATH = "grow shrink-10000000 flex-row overflow-hidden";
const DIRECTORY = "shrink min-w-0";
const NAME = "shrink-0 max-w-full";
// The chip stands at its label's measure cap while the path holds above its
// floor; below it the chip's label truncates.
const CHIP = "shrink min-w-0";
const COUNTS = "flex-row shrink-0 items-center";
const COUNT = "text-right";

export interface FileRowProps extends Closed {
	// The file's path; the directory gives way first when it is too long, then
	// the name's middle down to its floor, then the chip's label.
	path: string;
	// Lines added; zero draws nothing.
	added: number;
	// Lines removed; zero draws nothing.
	removed: number;
	// Whether the reviewer has seen the file: a tick when seen, a ring when
	// not; absent, the file glyph leads.
	seen?: boolean;
	// Where the file stands in a change set: the change mark at the row's start,
	// ahead of the glyph.
	change?: ChangeKind;
	// Why the file is listed, a data value's chip between the path and the
	// counts.
	chip?: ChipMark;
	// Where the row goes when opened; the row is selected at it.
	href?: Route;
	// Opens the file.
	onOpen?: () => void;
	// The row waits: the glyph, the path's bar, the chip's bar when it has a
	// chip, and the counts' bar stand in for it.
	loading?: boolean;
}

function glyph(seen: boolean | undefined): IconName {
	if (seen === undefined) return "File";
	return seen ? "CircleCheck" : "Circle";
}

// The path split before its last slash: the directory, and the name with its
// slash first.
function split(path: string): [string, string] {
	const slash = path.lastIndexOf("/");
	return slash < 0 ? ["", path] : [path.slice(0, slash), path.slice(slash)];
}

// The path fits by layout: the name takes its width up to the whole box and
// the directory the room it leaves, ellipsized at its end, so the directory
// gives way first, down to nothing; then the name is cut in its middle, its
// end (the extension) kept, down to its floor, below which the chip's label
// truncates. Yoga has no `ch`: the floor is its characters at a quarter of
// `figures`, four code figures.
function Path({ path }: { path: string }) {
	const [dir, name] = split(path);
	const figures = useCSSVariable("--spacing-figures");
	const advance = Number.parseFloat(String(figures ?? 0)) / 4;
	return (
		<View
			pointerEvents="none"
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			className={PATH}
			style={{ minWidth: pathCut(name).floor * advance }}
		>
			{dir ? (
				<RNText
					numberOfLines={1}
					ellipsizeMode="tail"
					className={cn(
						FILE_PATH,
						filePathPart({ part: "directory" }),
						DIRECTORY,
					)}
				>
					{dir}
				</RNText>
			) : null}
			<RNText
				numberOfLines={1}
				ellipsizeMode="middle"
				className={cn(FILE_PATH, filePathPart({ part: "name" }), NAME)}
			>
				{name}
			</RNText>
		</View>
	);
}

// A changed file: its seen mark leading, its path in mono (the directory in
// the meta ink, the name at 500) cut to the room its chip leaves, its chip,
// its added and removed counts each in its own lane. A row that opens is one
// hit, current (the selection wash) at its `href`, named by the whole path,
// its chip, its counts and its seen state, the cut text never read; it washes
// under the press.
// In a `Group` it runs edge to edge at the card's inset, elsewhere it is the
// list's row, square on the phone.
export function FileRow({
	path,
	added,
	removed,
	seen,
	change,
	chip,
	href,
	onOpen,
	loading,
}: FileRowProps) {
	const words = useWords();
	const ground = useContext(GroundContext);
	const pathname = usePathname();
	if (loading)
		return (
			<FileWait busy change={change !== undefined} chip={chip !== undefined} />
		);
	const seenWord = seen ? words.seen : words.unseen;
	const named = [
		path,
		change ? words[change] : undefined,
		chip?.label,
		added > 0 ? filled(words.linesAdded, { count: String(added) }) : undefined,
		removed > 0
			? filled(words.linesRemoved, { count: String(removed) })
			: undefined,
		seen === undefined ? undefined : seenWord,
	]
		.filter(Boolean)
		.join(", ");
	const current = href !== undefined && isCurrent(href, pathname);
	const open = href !== undefined ? () => navigate(href) : onOpen;
	return (
		<View
			accessible={!open}
			accessibilityLabel={open ? undefined : named}
			className={cn(
				row({ lines: "one", ground, state: current ? "selected" : "rest" }),
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
			{change ? (
				<View
					pointerEvents="none"
					accessibilityElementsHidden
					importantForAccessibility="no-hide-descendants"
					className={MARK}
				>
					<ChangeMark kind={change} />
				</View>
			) : null}
			<View
				pointerEvents="none"
				accessibilityElementsHidden
				importantForAccessibility="no-hide-descendants"
				className={cn(ROW_LEADING, LEADING)}
			>
				<Ink.Provider value="ink-meta">
					<Icon name={glyph(seen)} />
				</Ink.Provider>
			</View>
			<Path path={path} />
			{chip ? (
				<View
					pointerEvents="none"
					accessibilityElementsHidden
					importantForAccessibility="no-hide-descendants"
					className={CHIP}
				>
					<Chip family={chip.family} label={chip.label} />
				</View>
			) : null}
			<View
				pointerEvents="none"
				accessibilityElementsHidden
				importantForAccessibility="no-hide-descendants"
				className={cn(FILE_COUNTS, COUNTS)}
			>
				<RNText
					className={cn(FILE_COUNTS, fileCount({ kind: "added" }), COUNT)}
				>
					{added > 0 ? `+${added}` : null}
				</RNText>
				<RNText
					className={cn(FILE_COUNTS, fileCount({ kind: "removed" }), COUNT)}
				>
					{removed > 0 ? `−${removed}` : null}
				</RNText>
			</View>
		</View>
	);
}
