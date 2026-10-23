import { Button as BaseButton } from "@base-ui/react/button";
import { cn } from "@fcalell/ui-core/cn";
import type { FileItem, IconName } from "@fcalell/ui-core/descriptors";
import { DIRECTORY_LEAD, pathCut } from "@fcalell/ui-core/list-state";
import { isCurrent } from "@fcalell/ui-core/route";
import {
	FILE_COUNT_YIELD,
	FILE_COUNTS,
	FILE_PATH,
	fileCount,
	filePathPart,
	ROW_LEADING,
	row,
} from "@fcalell/ui-core/variants";
import { memo } from "react";
import { follow, useRoute } from "../../lib/navigate.ts";
import { Painted } from "../../lib/paint.tsx";
import { sameBy } from "../../lib/same-by.ts";
import { Roll, Swap } from "../../lib/swap.tsx";
import { ChipBase } from "../chip/base.tsx";
import { IconBase } from "../icon/index.tsx";
import { ChangeMark } from "../status/change.tsx";

const ROW = "relative flex items-center";
const PRESS = "hover:bg-wash-hover active:bg-wash-press";
const CHOSEN_PRESS = "hover:bg-wash-selected-hover active:bg-wash-press";
// The hit covers the row and rings inset.
const HIT = "absolute inset-0 focus-visible:-outline-offset-2";
// The change mark stands in its own lane at the row's start, ahead of the glyph.
const MARK = "flex shrink-0";
const LEADING = "flex shrink-0 items-center justify-center text-ink-meta";
// The path takes the overflow first (its shrink weight is 10^7, then the
// counts' lanes 10^5 (`FILE_COUNT_YIELD`), against the chip's 1, the weight of a mark's label in a list row's meta line), down to its floor, a `min-width`
// in `ch` (the path is mono) from its name; it clips what its floor holds.
const PATH = "flex grow shrink-10000000 overflow-hidden";
const DIRECTORY = "shrink-10000 truncate";
const NAME = "flex min-w-0 shrink";
const STEM = "min-w-0 truncate";
const PART = "shrink-0";
// The chip stands at its label's measure cap while the path holds above its
// floor; below it the chip's label truncates.
const CHIP = "flex min-w-0 shrink";
// The counts' block carries their type and stands aside: each lane is an item of the row.
const COUNTS = "contents";
// The lane of figures keeps them whole where the page breaks a word anywhere.
const COUNT = "text-end wrap-normal";

/** What a Section hands the row it draws while its items are not here; no app sets them. */
export interface FileRowInternal {
	/** The file is not here: the glyph, the path and the counts paint, never the chip, the row is inert and builds no hit. */
	painted?: boolean;
	/** The row's place among the painted rows, which varies the filler's lengths. */
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

// The path fits by layout: the directory takes the room the name leaves,
// ellipsized at its end, so it gives way first, down to its first character and an ellipsis;
// then the name's stem truncates before its
// kept end, a cut in its middle, down to the name's floor, below which the
// chip's label truncates. A directory keeps two characters beside the name's
// floor (its own `min-width`, in the path's): its first and the ellipsis after
// it ("d…"), so what gives way says it is cut. The floor is its characters in `ch` rounded up to the
// pixel: `ch` is the advance of "0" and a run of text can advance a 64th of a
// pixel per glyph past it, so an exact floor leaves the name's last character
// short and `text-overflow` cuts it.
function Path(props: { path: string }) {
	const [dir, name] = split(props.path);
	const { stem, tail, floor } = pathCut(name);
	// Each part's floor rounds up on its own, so their sum is the path's floor.
	const lead = `round(up, ${DIRECTORY_LEAD}ch, 1px)`;
	const room = `round(up, ${floor}ch, 1px)`;
	return (
		<span
			className={cn(FILE_PATH, PATH)}
			style={{ minWidth: dir ? `calc(${room} + ${lead})` : room }}
		>
			{dir ? (
				<span
					className={cn(filePathPart({ part: "directory" }), DIRECTORY)}
					style={{ minWidth: lead }}
				>
					{dir}
				</span>
			) : null}
			<span className={cn(filePathPart({ part: "name" }), NAME)}>
				<span className={STEM}>{stem}</span>
				<span className={PART}>{tail}</span>
			</span>
		</span>
	);
}

/** A changed file: its seen mark leading, its path in mono (the directory in the meta ink, the name at 500) cut to the room its chip leaves, its chip, its added and removed counts each in its own lane. A row that opens is one hit, current (the selection wash) at its `href`, named by the path; it washes under the pointer and the press. At the card's inset and the row radius. */
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
	const route = useRoute();
	const current = !painted && href !== undefined && isCurrent(href, route);
	let hit = null;
	if (!painted && href !== undefined)
		hit = (
			// biome-ignore lint/a11y/useAnchorContent: the hit covers the row, named by its path
			<a
				href={href}
				onClick={follow}
				aria-label={path}
				aria-current={current ? "page" : undefined}
				className={HIT}
			/>
		);
	else if (!painted && onOpen)
		hit = <BaseButton aria-label={path} onClick={onOpen} className={HIT} />;
	return (
		<div
			inert={painted || undefined}
			className={cn(
				row({ state: current ? "selected" : "rest" }),
				ROW,
				hit && (current ? CHOSEN_PRESS : PRESS),
			)}
		>
			{hit}
			{change ? (
				<span className={MARK}>
					<ChangeMark kind={change} />
				</span>
			) : null}
			<span className={cn(ROW_LEADING, LEADING)}>
				{painted ? (
					<IconBase name={glyph(seen)} stroke="line" painted />
				) : (
					// The seen mark changing while shown is a mark change.
					<Swap id={glyph(seen)} scale>
						<IconBase name={glyph(seen)} stroke="line" />
					</Swap>
				)}
			</span>
			{painted ? (
				<span className={cn(FILE_PATH, PATH)}>
					<span className={cn(filePathPart({ part: "name" }), STEM)}>
						<Painted role="phrase" at={at} />
					</span>
				</span>
			) : (
				<Path path={path} />
			)}
			{chip ? (
				<span className={CHIP}>
					<ChipBase family={chip.family} label={chip.label} compact />
				</span>
			) : null}
			<span className={cn(FILE_COUNTS, COUNTS)}>
				<span
					className={cn(fileCount({ kind: "added" }), FILE_COUNT_YIELD, COUNT)}
				>
					{painted ? (
						<Painted role="figure" at={at} />
					) : added > 0 ? (
						<Roll text={`+${added}`} of={added} />
					) : null}
				</span>
				<span
					className={cn(
						fileCount({ kind: "removed" }),
						FILE_COUNT_YIELD,
						COUNT,
					)}
				>
					{painted ? (
						<Painted role="figure" at={at + 1} />
					) : removed > 0 ? (
						<Roll text={`−${removed}`} of={removed} />
					) : null}
				</span>
			</span>
		</div>
	);
}

/** One file row of a Section from its item: a refetch that changes one item renders that row alone. */
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
