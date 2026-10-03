import type { IconName } from "@fcalell/ui-core/descriptors";
import { filled, MONO_ADVANCE } from "@fcalell/ui-core/tokens";
import {
	FILE_COUNTS,
	FILE_PATH,
	fileCount,
	filePathPart,
	ROW_LEADING,
	row,
	skeleton,
	skeletonLane,
	skeletonRow,
} from "@fcalell/ui-core/variants";
import { useContext, useState } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import { useResolveClassNames } from "uniwind";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { GroundContext } from "../../lib/ground";
import { Ink } from "../../lib/ink";
import { isCurrent, navigate, usePathname } from "../../lib/navigate";
import { useWords } from "../../lib/words";
import { Icon } from "../icon";

const ROW = "relative flex-row items-center";
// A list row's wash is square on the phone, where it meets the screen's edge.
const SQUARE = "rounded-none";
// The hit covers the row under its text and takes the press wash.
const HIT = "absolute inset-0 active:bg-wash-press";
const LEADING = "shrink-0 items-center justify-center";
const PATH = "flex-1 flex-row min-w-0";
const PART = "shrink-0";
const COUNTS = "flex-row shrink-0 items-center";
const COUNT = "text-right";
const WAIT = "flex-row items-center";
const WAIT_GLYPH = "shrink-0";
const WAIT_PATH = "flex-1 flex-row min-w-0";
const WAIT_COUNTS = "flex-1 flex-row justify-end min-w-0";
// The path's bar at half the row, the counts' at a third of their lane.
const PATH_BAR = "w-1/2";
const COUNTS_BAR = "w-1/3";
const ELLIPSIS = "…";

export interface FileRowProps extends Closed {
	// The file's path; the directory gives way first when it is too long, the
	// name stays whole as long as it can.
	path: string;
	// Lines added; zero draws nothing.
	added: number;
	// Lines removed; zero draws nothing.
	removed: number;
	// Whether the reviewer has seen the file: a tick when seen, a ring when
	// not; absent, the file glyph leads.
	seen?: boolean;
	// Where the row goes when opened; the row is selected at it.
	href?: string;
	// Opens the file.
	onOpen?: () => void;
	// The row waits: the glyph, the path's bar and the counts' bar stand in
	// for it.
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
// holds: the box's width from its layout over the code role's advance
// (`MONO_ADVANCE` of its size, the face's one advance at every weight).
function Path({ path }: { path: string }) {
	const { fontSize } = useResolveClassNames(FILE_PATH);
	const [room, setRoom] = useState(Number.POSITIVE_INFINITY);
	const advance = typeof fontSize === "number" ? fontSize * MONO_ADVANCE : 0;
	const [dir, name] = cut(path, room);
	return (
		<View
			pointerEvents="none"
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			onLayout={(event) => {
				if (advance > 0)
					setRoom(Math.floor(event.nativeEvent.layout.width / advance));
			}}
			className={PATH}
		>
			{dir ? (
				<RNText
					numberOfLines={1}
					className={cn(FILE_PATH, filePathPart({ part: "directory" }), PART)}
				>
					{dir}
				</RNText>
			) : null}
			<RNText
				numberOfLines={1}
				className={cn(FILE_PATH, filePathPart({ part: "name" }), PART)}
			>
				{name}
			</RNText>
		</View>
	);
}

// A changed file: its seen mark leading, its path in mono (the directory in
// the meta ink, the name at 500), its added and removed counts each in its
// own lane. A row that opens is one hit, current (the selection wash) at its
// `href`, named by the whole path, its counts and its seen state, the cut
// text never read; it washes under the press.
// In a `Group` it runs edge to edge at the card's inset, elsewhere it is the
// list's row, square on the phone.
export function FileRow({
	path,
	added,
	removed,
	seen,
	href,
	onOpen,
	loading,
}: FileRowProps) {
	const words = useWords();
	const ground = useContext(GroundContext);
	const pathname = usePathname();
	if (loading)
		return (
			<View
				accessibilityState={{ busy: true }}
				className={cn(
					skeletonRow({
						kind: ground === "group" ? "one-line-group" : "one-line",
					}),
					WAIT,
				)}
			>
				<View className={cn(ROW_LEADING, LEADING)}>
					<View className={cn(skeleton({ kind: "icon" }), WAIT_GLYPH)} />
				</View>
				<View className={WAIT_PATH}>
					<View className={cn(skeleton({ kind: "line" }), PATH_BAR)} />
				</View>
				<View className={cn(skeletonLane({ role: "meta" }), WAIT_COUNTS)}>
					<View className={cn(skeleton({ kind: "line" }), COUNTS_BAR)} />
				</View>
			</View>
		);
	const seenWord = seen ? words.seen : words.unseen;
	const named = [
		path,
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
