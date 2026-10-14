import { Button as BaseButton } from "@base-ui/react/button";
import { cn } from "@fcalell/ui-core/cn";
import type {
	ChangeKind,
	ChipMark,
	IconName,
} from "@fcalell/ui-core/descriptors";
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
import type { Closed } from "../../lib/closed.ts";
import { follow, useRoute } from "../../lib/navigate.ts";
import { Painted } from "../../lib/paint.tsx";
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
// counts' lanes 10^5 (`FILE_COUNT_YIELD`), against the chip's 1, the weight of a mark's label in ListRow's meta line), down to its floor, a `min-width`
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

/** A changed file in a review's list. */
export interface FileRowProps extends Closed {
	/** The file's path (a path: the directory gives way first when it is too long, then the name's middle down to its floor, then the chip's label). */
	path: string;
	/** Lines added; zero draws nothing. */
	added: number;
	/** Lines removed; zero draws nothing. */
	removed: number;
	/** Whether the reviewer has seen the file: a tick when seen, a ring when not; absent, the file glyph leads. */
	seen?: boolean;
	/** Where the file stands in a change set: the change mark at the row's start, ahead of the glyph. */
	change?: ChangeKind;
	/** Why the file is listed, a data value's chip between the path and the counts. */
	chip?: ChipMark;
	/** Where the row goes when opened; the row is selected at it. */
	href?: string;
	/** Opens the file. */
	onOpen?: () => void;
}

/** What a `List` hands the row it draws while its items are not here; no app sets them, so they are outside `FileRowProps`. */
export interface FileRowInternal {
	/** The file is not here: the glyph, the path, the chip when it has one and the counts paint, the row is inert and builds no hit. */
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

/** A changed file: its seen mark leading, its path in mono (the directory in the meta ink, the name at 500) cut to the room its chip leaves, its chip, its added and removed counts each in its own lane. A row that opens is one hit, current (the selection wash) at its `href`, named by the path; it washes under the pointer and the press. Square at the card's inset. */
export function FileRow(file: FileRowProps) {
	return <FileRowBase {...file} />;
}

/** Every file row: the public `FileRow`, or the one a `List` paints. Outside the package's exports. */
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
				row({ lines: "one", state: current ? "selected" : "rest" }),
				ROW,
				hit && (current ? CHOSEN_PRESS : PRESS),
			)}
		>
			{hit}
			{change ? (
				<span className={MARK}>
					<ChangeMark kind={change} painted={painted} />
				</span>
			) : null}
			<span className={cn(ROW_LEADING, LEADING)}>
				<IconBase name={glyph(seen)} stroke="line" painted={painted} />
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
					<ChipBase family={chip.family} label={chip.label} painted={painted} />
				</span>
			) : null}
			<span className={cn(FILE_COUNTS, COUNTS)}>
				<span
					className={cn(fileCount({ kind: "added" }), FILE_COUNT_YIELD, COUNT)}
				>
					{painted ? (
						<Painted role="figure" at={at} />
					) : added > 0 ? (
						`+${added}`
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
						`−${removed}`
					) : null}
				</span>
			</span>
		</div>
	);
}
