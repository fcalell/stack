import { Button as BaseButton } from "@base-ui/react/button";
import { cn } from "@fcalell/ui-core/cn";
import type {
	ChangeKind,
	ChipMark,
	IconName,
} from "@fcalell/ui-core/descriptors";
import { pathCut } from "@fcalell/ui-core/list-state";
import { isCurrent } from "@fcalell/ui-core/route";
import {
	FILE_COUNTS,
	FILE_PATH,
	fileCount,
	filePathPart,
	ROW_LEADING,
	row,
} from "@fcalell/ui-core/variants";
import { use } from "react";
import type { Closed } from "../../lib/closed.ts";
import { GroundContext } from "../../lib/ground.ts";
import { follow, useRoute } from "../../lib/navigate.ts";
import { Chip } from "../chip/index.tsx";
import { Icon } from "../icon/index.tsx";
import { ChangeMark } from "../status/change.tsx";
import { FileWait } from "./wait.tsx";

const ROW = "relative flex items-center";
// A list row's wash is square on touch, where it meets the screen's edge.
const SQUARE = "touch:rounded-none";
const PRESS = "hover:bg-wash-hover active:bg-wash-press";
const CHOSEN_PRESS = "hover:bg-wash-selected-hover active:bg-wash-press";
// The hit covers the row and rings inset.
const HIT = "absolute inset-0 focus-visible:-outline-offset-2";
const HIT_LIST = "rounded-row touch:rounded-none";
// The change mark stands in its own lane at the row's start, ahead of the glyph.
const MARK = "flex shrink-0";
const LEADING = "flex shrink-0 items-center justify-center text-ink-meta";
// The path takes the overflow first (its shrink weight is 10^7 against the
// chip's 1, the weight of a mark's label in ListRow's meta line), down to its floor, a `min-width`
// in `ch` (the path is mono) from its name; it clips what its floor holds.
const PATH = "flex grow shrink-10000000 overflow-hidden";
const DIRECTORY = "min-w-0 truncate";
const NAME = "flex shrink-0 max-w-full min-w-0";
const STEM = "min-w-0 truncate";
const PART = "shrink-0";
// The chip stands at its label's measure cap while the path holds above its
// floor; below it the chip's label truncates.
const CHIP = "flex min-w-0 shrink";
const COUNTS = "flex shrink-0 items-center";
const COUNT = "text-end";

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
	/** The row waits: the glyph, the path's bar, the chip's bar when it has a chip, and the counts' bar stand in for it. */
	loading?: boolean;
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
// gives way first, down to nothing; then the name's stem truncates before its
// kept end, a cut in its middle, down to the name's floor, below which the
// chip's label truncates. The floor is its characters in `ch` rounded up to the
// pixel: `ch` is the advance of "0" and a run of text can advance a 64th of a
// pixel per glyph past it, so an exact floor leaves the name's last character
// short and `text-overflow` cuts it.
function Path(props: { path: string }) {
	const [dir, name] = split(props.path);
	const { stem, tail, floor } = pathCut(name);
	return (
		<span
			className={cn(FILE_PATH, PATH)}
			style={{ minWidth: `round(up, ${floor}ch, 1px)` }}
		>
			{dir ? (
				<span className={cn(filePathPart({ part: "directory" }), DIRECTORY)}>
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

/** A changed file: its seen mark leading, its path in mono (the directory in the meta ink, the name at 500) cut to the room its chip leaves, its chip, its added and removed counts each in its own lane. A row that opens is one hit, current (the selection wash) at its `href`, named by the path; it washes under the pointer and the press. In a `Group` it runs edge to edge at the card's inset, elsewhere it is an inset rounded wash, square on touch. */
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
	const ground = use(GroundContext);
	const at = useRoute();
	if (loading)
		return <FileWait change={change !== undefined} chip={chip !== undefined} />;
	const current = href !== undefined && isCurrent(href, at);
	const hitClass = cn(HIT, ground === "list" && HIT_LIST);
	let hit = null;
	if (href !== undefined)
		hit = (
			// biome-ignore lint/a11y/useAnchorContent: the hit covers the row, named by its path
			<a
				href={href}
				onClick={follow}
				aria-label={path}
				aria-current={current ? "page" : undefined}
				className={hitClass}
			/>
		);
	else if (onOpen)
		hit = (
			<BaseButton aria-label={path} onClick={onOpen} className={hitClass} />
		);
	return (
		<div
			className={cn(
				row({ lines: "one", ground, state: current ? "selected" : "rest" }),
				ROW,
				ground === "list" && SQUARE,
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
				<Icon name={glyph(seen)} />
			</span>
			<Path path={path} />
			{chip ? (
				<span className={CHIP}>
					<Chip family={chip.family} label={chip.label} />
				</span>
			) : null}
			<span className={cn(FILE_COUNTS, COUNTS)}>
				<span className={cn(fileCount({ kind: "added" }), COUNT)}>
					{added > 0 ? `+${added}` : null}
				</span>
				<span className={cn(fileCount({ kind: "removed" }), COUNT)}>
					{removed > 0 ? `−${removed}` : null}
				</span>
			</span>
		</div>
	);
}
