import type {
	ChangeKind,
	ChipMark,
	IconName,
} from "@fcalell/ui-core/descriptors";
import { DIRECTORY_LEAD, pathCut } from "@fcalell/ui-core/list-state";
import { painting } from "@fcalell/ui-core/paint";
import { isCurrent } from "@fcalell/ui-core/route";

import {
	FILE_COUNTS,
	FILE_PATH,
	fileCount,
	filePathPart,
	ROW_LEADING,
	row,
} from "@fcalell/ui-core/variants";
import { memo } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { Ink } from "../../lib/ink";
import { navigate, usePathname, useWarm } from "../../lib/navigate";
import { clipWhen, inertProps, Painted } from "../../lib/paint";
import type { Route } from "../../lib/route";
import { sameBy } from "../../lib/same-by";
import { useCSSVariable } from "../../lib/theme";

import { ChipBase } from "../chip/base";
import { IconBase } from "../icon";
import type { FileSlots } from "../list/index";
import { ChangeMark } from "../status/change";

const ROW = "relative flex-row items-center";
// The hit covers the row under its text and takes the press wash.
const HIT = "absolute inset-0 active:bg-wash-press";
// The change mark stands in its own lane at the row's start, ahead of the glyph.
const MARK = "shrink-0";
const LEADING = "shrink-0 items-center justify-center";
// The path takes the overflow first (its shrink weight is 10^7 against the
// chip's 1, the weight of a mark's label in ListRow's meta line), down to its floor, a `minWidth`
// from its name; it clips what its floor holds.
const PATH = "grow shrink-10000000 flex-row overflow-hidden";
const DIRECTORY = "shrink min-w-0";
const NAME = "shrink-0 max-w-full";
// The chip stands at its label's measure cap while the path holds above its
// floor; below it the chip's label truncates.
const CHIP = "shrink min-w-0";
const COUNTS = "flex-row shrink-0 items-center";
const COUNT = "shrink-0 text-right";

export interface FileRowProps extends Closed {
	/** The file's path (a path: the directory gives way first when it is too long, then the name's middle down to its floor, then the chip's label). */
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
}

// What a `List` hands the row it draws while its items are not here; no app
// sets them, so they are outside `FileRowProps`.
export interface FileRowInternal {
	// The file is not here: the glyph, the path, the chip when it has one and
	// the counts paint, the row takes no touch and builds no hit.
	painted?: boolean;
	// The row's place among the painted rows, which varies the filler's lengths.
	at?: number;
}

function glyph(seen: boolean | undefined): IconName {
	if (seen === undefined) return "File";
	return seen ? "CircleCheck" : "Circle";
}

// The path split after its last slash: the directory with its slash last, and
// the name. The slash goes with the directory, so a directory that has given
// way takes its separator with it and the name draws none.
function split(path: string): [string, string] {
	const slash = path.lastIndexOf("/") + 1;
	return [path.slice(0, slash), path.slice(slash)];
}

// The path fits by layout: the name takes its width up to the whole box and
// the directory the room it leaves, ellipsized at its end, so the directory
// gives way first, down to nothing; then the name is cut in its middle, its
// end (the extension) kept, down to its floor, which holds one character of a
// directory so what gives way draws its ellipsis, below which the chip's label
// truncates. Yoga has no `ch`: the floor is its characters at a quarter of
// `figures`, four code figures.
function Path({ path }: { path: string }) {
	const [dir, name] = split(path);
	const figures = useCSSVariable("--spacing-figures");
	const advance = Number.parseFloat(String(figures ?? 0)) / 4;
	return (
		<View
			pointerEvents="none"
			className={PATH}
			style={{
				minWidth: (pathCut(name).floor + (dir ? DIRECTORY_LEAD : 0)) * advance,
			}}
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
// the cut text never read; it washes under the press.
// Square at the card's inset.
export function FileRow(file: FileRowProps) {
	return <FileRowBase {...file} />;
}

// Every file row: the public `FileRow`, or the one a `List` paints. Outside
// the package's exports.
export function FileRowBase({
	path,
	added,
	removed,
	seen,
	change,
	chip,
	href,
	onOpen,
	painted = false,
	at = 0,
}: FileRowProps & FileRowInternal) {
	const pathname = usePathname();
	const warm = useWarm();
	const current = !painted && href !== undefined && isCurrent(href, pathname);
	const open = href !== undefined ? () => navigate(href) : onOpen;
	return (
		<View
			{...inertProps(painted)}
			className={cn(
				row({ lines: "one", state: current ? "selected" : "rest" }),
				ROW,
			)}
		>
			{open && !painted ? (
				<Pressable
					accessibilityRole={href !== undefined ? "link" : "button"}
					accessibilityLabel={path}
					accessibilityState={{ selected: current }}
					onPressIn={href !== undefined ? () => warm(href) : undefined}
					onPress={open}
					className={HIT}
				/>
			) : null}
			{change ? (
				<View pointerEvents="none" className={MARK}>
					<ChangeMark kind={change} painted={painted} />
				</View>
			) : null}
			<View pointerEvents="none" className={cn(ROW_LEADING, LEADING)}>
				<Ink.Provider value="ink-meta">
					<IconBase name={glyph(seen)} stroke="line" painted={painted} />
				</Ink.Provider>
			</View>
			{painted ? (
				<View pointerEvents="none" className={PATH}>
					<RNText
						numberOfLines={1}
						{...clipWhen(true)}
						className={cn(FILE_PATH, filePathPart({ part: "name" }), NAME)}
					>
						<Painted role="phrase" at={at} />
					</RNText>
				</View>
			) : (
				<Path path={path} />
			)}
			{chip ? (
				<View pointerEvents="none" className={CHIP}>
					<ChipBase family={chip.family} label={chip.label} painted={painted} />
				</View>
			) : null}
			<View pointerEvents="none" className={cn(FILE_COUNTS, COUNTS)}>
				<RNText
					className={cn(FILE_COUNTS, fileCount({ kind: "added" }), COUNT)}
				>
					{painted ? (
						<Painted role="figure" at={at} />
					) : added > 0 ? (
						`+${added}`
					) : null}
				</RNText>
				<RNText
					className={cn(FILE_COUNTS, fileCount({ kind: "removed" }), COUNT)}
				>
					{painted ? (
						<Painted role="figure" at={at + 1} />
					) : removed > 0 ? (
						`−${removed}`
					) : null}
				</RNText>
			</View>
		</View>
	);
}

// One file row of a `List` from its item: it runs the slots itself and opens
// the item itself, so a refetch that changes one item renders that row alone.
function FileItemBase<T>(props: {
	item: T;
	/** A painted row's place, which varies its fillers; a loaded row takes none. */
	index?: number;
	file: FileSlots<T>;
	painted: boolean;
}) {
	const { item, index, file, painted } = props;
	const slot = <R,>(fn: (one: T) => R): R =>
		painted ? (painting(fn, item) as R) : fn(item);
	return (
		<FileRowBase
			path={slot(file.path)}
			added={slot(file.added)}
			removed={slot(file.removed)}
			seen={file.seen && slot(file.seen)}
			change={file.change && slot(file.change)}
			chip={file.chip && slot(file.chip)}
			href={file.href && slot(file.href)}
			onOpen={file.onOpen ? () => file.onOpen?.(item) : undefined}
			painted={painted}
			at={index}
		/>
	);
}

export const FileItem = memo(
	FileItemBase,
	sameBy("item"),
) as typeof FileItemBase;
