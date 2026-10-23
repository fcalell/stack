import type { FileItem, IconName } from "@fcalell/ui-core/descriptors";
import { DIRECTORY_LEAD, pathCut } from "@fcalell/ui-core/list-state";
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
import { cn } from "../../lib/cn";
import { Ink } from "../../lib/ink";
import { open as follow, usePathname, useWarm } from "../../lib/navigate";
import { clipWhen, inertProps, Painted, PaintText } from "../../lib/paint";
import { sameBy } from "../../lib/same-by";
import { Roll, Swap } from "../../lib/swap";
import { useCSSVariable } from "../../lib/theme";

import { ChipBase } from "../chip/base";
import { IconBase } from "../icon";
import { ChangeMark } from "../status/change";

const ROW = "relative flex-row items-center";
// The hit covers the row under its text and takes the press wash.
const HIT = "absolute inset-0 active:bg-wash-press";
// The change mark stands in its own lane at the row's start, ahead of the glyph.
const MARK = "shrink-0";
const LEADING = "shrink-0 items-center justify-center";
// The path takes the overflow first (its shrink weight is 10^7 against the
// chip's 1, the weight of a mark's label in a list row's meta line), down to its floor, a `minWidth`
// from its name; it clips what its floor holds.
const PATH = "grow shrink-10000000 flex-row overflow-hidden";
const DIRECTORY = "shrink min-w-0";
const NAME = "shrink-0 max-w-full";
// The chip stands at its label's measure cap while the path holds above its
// floor; below it the chip's label truncates.
const CHIP = "shrink min-w-0";
const COUNTS = "flex-row shrink-0 items-center";
const COUNT = "shrink-0 text-right";

// What a Section hands the row it draws while its items are not here; no app
// sets them.
export interface FileRowInternal {
	// The file is not here: the glyph, the path and the counts paint, never the
	// chip; the row takes no touch and builds no hit.
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
// At the card's inset and the row radius.
export function FileRowBase({
	path,
	added,
	removed,
	seen,
	change: kind,
	chip: given,
	href,
	onOpen,
	painted = false,
	at = 0,
}: Omit<FileItem, "key"> & FileRowInternal) {
	// A chip says why a file is listed: whether a row has one is the item's own
	// data, which the painted form cannot know, so it is never painted.
	const chip = painted ? undefined : given;
	// Nor is its change mark painted: whether a file has one is the item's data.
	const change = painted ? undefined : kind;
	const pathname = usePathname();
	const warm = useWarm();
	const current = !painted && href !== undefined && isCurrent(href, pathname);
	const open = href !== undefined ? () => follow(href) : onOpen;
	return (
		<View
			{...inertProps(painted)}
			className={cn(row({ state: current ? "selected" : "rest" }), ROW)}
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
					<ChangeMark kind={change} />
				</View>
			) : null}
			<View pointerEvents="none" className={cn(ROW_LEADING, LEADING)}>
				<Ink.Provider value="ink-meta">
					{painted ? (
						<IconBase name={glyph(seen)} stroke="line" painted />
					) : (
						// The seen mark changing while shown is a mark change.
						<Swap id={glyph(seen)} scale>
							<IconBase name={glyph(seen)} stroke="line" />
						</Swap>
					)}
				</Ink.Provider>
			</View>
			{painted ? (
				<View pointerEvents="none" className={PATH}>
					<PaintText
						fills="phrase"
						painted
						numberOfLines={1}
						{...clipWhen(true)}
						className={cn(FILE_PATH, filePathPart({ part: "name" }), NAME)}
					>
						<Painted role="phrase" at={at} />
					</PaintText>
				</View>
			) : (
				<Path path={path} />
			)}
			{chip ? (
				<View pointerEvents="none" className={CHIP}>
					<ChipBase family={chip.family} label={chip.label} />
				</View>
			) : null}
			<View pointerEvents="none" className={cn(FILE_COUNTS, COUNTS)}>
				{!painted && added > 0 ? (
					<Roll
						text={`+${added}`}
						of={added}
						className={cn(FILE_COUNTS, fileCount({ kind: "added" }), COUNT)}
					/>
				) : (
					<PaintText
						fills="figure"
						painted={painted}
						className={cn(FILE_COUNTS, fileCount({ kind: "added" }), COUNT)}
					>
						{painted ? <Painted role="figure" at={at} /> : null}
					</PaintText>
				)}
				{!painted && removed > 0 ? (
					<Roll
						text={`−${removed}`}
						of={removed}
						className={cn(FILE_COUNTS, fileCount({ kind: "removed" }), COUNT)}
					/>
				) : (
					<PaintText
						fills="figure"
						painted={painted}
						className={cn(FILE_COUNTS, fileCount({ kind: "removed" }), COUNT)}
					>
						{painted ? <Painted role="figure" at={at + 1} /> : null}
					</PaintText>
				)}
			</View>
		</View>
	);
}

// One file row of a Section from its item: a refetch that changes one item
// renders that row alone.
function FileRowItemBase(props: {
	item: FileItem;
	/** A painted row's place, which varies its fillers; a loaded row takes none. */
	index?: number;
	painted: boolean;
}) {
	const { key: _key, ...file } = props.item;
	return <FileRowBase {...file} painted={props.painted} at={props.index} />;
}

export const FileRowItem = memo(FileRowItemBase, sameBy("item"));
