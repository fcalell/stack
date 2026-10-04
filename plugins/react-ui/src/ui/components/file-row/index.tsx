import { Button as BaseButton } from "@base-ui/react/button";
import { cn } from "@fcalell/ui-core/cn";
import type { ChipMark, IconName } from "@fcalell/ui-core/descriptors";
import { filled } from "@fcalell/ui-core/tokens";
import {
	FILE_COUNTS,
	FILE_PATH,
	fileCount,
	filePathPart,
	ROW_LEADING,
	row,
} from "@fcalell/ui-core/variants";
import { use, useLayoutEffect, useRef, useState } from "react";
import type { Closed } from "../../lib/closed.ts";
import { GroundContext } from "../../lib/ground.ts";
import { isCurrent, usePathname } from "../../lib/navigate.ts";
import { useWords } from "../../lib/words.tsx";
import { Chip } from "../chip/index.tsx";
import { Icon } from "../icon/index.tsx";
import { FileWait } from "./wait.tsx";

const ROW = "relative flex items-center";
// A list row's wash is square on touch, where it meets the screen's edge.
const SQUARE = "touch:rounded-none";
const PRESS = "hover:bg-wash-hover active:bg-wash-press";
const CHOSEN_PRESS = "hover:bg-wash-selected-hover active:bg-wash-press";
// The hit covers the row and rings inset.
const HIT = "absolute inset-0 focus-visible:-outline-offset-2";
const HIT_LIST = "rounded-row touch:rounded-none";
const LEADING = "flex shrink-0 items-center justify-center text-ink-meta";
const PATH = "flex grow min-w-0";
const PART = "shrink-0";
// The chip keeps its width, capped by its label's measure; the path yields.
const CHIP = "flex shrink-0";
const COUNTS = "flex shrink-0 items-center";
const COUNT = "text-end";
// The row's name where it has no hit: the full path, the chip, the counts and
// the seen state, for the cut path and the glyph are drawn alone.
const SPOKEN = "sr-only";
const ELLIPSIS = "…";

/** A changed file in a review's list. */
export interface FileRowProps extends Closed {
	/** The file's path; the directory gives way first when it is too long, the name stays whole as long as it can. */
	path: string;
	/** Lines added; zero draws nothing. */
	added: number;
	/** Lines removed; zero draws nothing. */
	removed: number;
	/** Whether the reviewer has seen the file: a tick when seen, a ring when not; absent, the file glyph leads. */
	seen?: boolean;
	/** Why the file is listed or what its change is, a data value's chip between the path and the counts. */
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

// The path split before its last slash: the directory, and the name with its
// slash first.
function split(path: string): [string, string] {
	const slash = path.lastIndexOf("/");
	return slash < 0 ? ["", path] : [path.slice(0, slash), path.slice(slash)];
}

// A name cut in its middle to `room` characters, its start and its end
// (the extension) kept.
function middle(name: string, room: number): string {
	if (name.length <= room) return name;
	const kept = Math.max(0, room - 1);
	const head = Math.ceil(kept / 2);
	return `${name.slice(0, head)}${ELLIPSIS}${name.slice(name.length - (kept - head))}`;
}

// The path cut to `room` characters of the mono face: the directory gives
// way first, cut from its end down to its first character; then the name is
// cut in its middle.
function cut(path: string, room: number): [string, string] {
	const [dir, name] = split(path);
	if (dir.length + name.length <= room) return [dir, name];
	if (!dir) return ["", middle(name, room)];
	const left = room - name.length - 1;
	if (left >= 1) return [`${dir.slice(0, left)}${ELLIPSIS}`, name];
	const shortDir = `${dir.slice(0, 1)}${ELLIPSIS}`;
	return [shortDir, middle(name, room - shortDir.length)];
}

// The path in its box, cut to the characters of the mono face the box
// holds, measured on the box's own font (the face keeps one advance at every
// weight).
function Path(props: { path: string }) {
	const box = useRef<HTMLSpanElement>(null);
	const [room, setRoom] = useState(Number.POSITIVE_INFINITY);
	useLayoutEffect(() => {
		const element = box.current;
		const context = document.createElement("canvas").getContext("2d");
		if (!element || !context) return;
		const measure = () => {
			context.font = getComputedStyle(element).font;
			const advance = context.measureText("0").width;
			if (advance > 0) setRoom(Math.floor(element.clientWidth / advance));
		};
		const observer = new ResizeObserver(measure);
		observer.observe(element);
		document.fonts.ready.then(measure);
		return () => observer.disconnect();
	}, []);
	const [dir, name] = cut(props.path, room);
	return (
		<span ref={box} aria-hidden className={cn(FILE_PATH, PATH)}>
			{dir ? (
				<span className={cn(filePathPart({ part: "directory" }), PART)}>
					{dir}
				</span>
			) : null}
			<span className={cn(filePathPart({ part: "name" }), PART)}>{name}</span>
		</span>
	);
}

/** A changed file: its seen mark leading, its path in mono (the directory in the meta ink, the name at 500) cut to the room its chip leaves, its chip, its added and removed counts each in its own lane. A row that opens is one hit, current (the selection wash) at its `href`, named by the whole path, its chip, its counts and its seen state; it washes under the pointer and the press. In a `Group` it runs edge to edge at the card's inset, elsewhere it is an inset rounded wash, square on touch. */
export function FileRow({
	path,
	added,
	removed,
	seen,
	chip,
	href,
	onOpen,
	loading,
}: FileRowProps) {
	const words = useWords();
	const ground = use(GroundContext);
	const pathname = usePathname();
	if (loading) return <FileWait busy chip={chip !== undefined} />;
	const seenWord = seen ? words.seen : words.unseen;
	const named = [
		path,
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
	const hitClass = cn(HIT, ground === "list" && HIT_LIST);
	let hit = null;
	if (href !== undefined)
		hit = (
			// biome-ignore lint/a11y/useAnchorContent: the hit covers the row, named by its path and counts
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
			className={cn(
				row({ lines: "one", ground, state: current ? "selected" : "rest" }),
				ROW,
				ground === "list" && SQUARE,
				hit && (current ? CHOSEN_PRESS : PRESS),
			)}
		>
			{hit ?? <span className={SPOKEN}>{named}</span>}
			<span aria-hidden className={cn(ROW_LEADING, LEADING)}>
				<Icon name={glyph(seen)} />
			</span>
			<Path path={path} />
			{chip ? (
				<span aria-hidden className={CHIP}>
					<Chip family={chip.family} label={chip.label} />
				</span>
			) : null}
			<span aria-hidden className={cn(FILE_COUNTS, COUNTS)}>
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
