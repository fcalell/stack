import { type RowShape, waitingDepth } from "@fcalell/ui-core/list-state";
import {
	ROW_ACTS,
	ROW_ENTRY,
	ROW_LEADING,
	ROW_META_LINE,
	ROW_TITLE_LINE,
	row,
	skeleton,
	skeletonLane,
	TREE_LANE,
	TREE_RAIL,
	treeBleed,
} from "@fcalell/ui-core/variants";
import { type ReactNode, useContext } from "react";
import { View } from "react-native";
import { cn } from "../../lib/cn";
import { GroundContext } from "../../lib/ground";
import { Strut } from "../../lib/strut";

// The geometry of the row it stands in for (`./index.tsx`); a strut sets
// each line's height.
const ROW = "relative flex-row items-center";
// A wrapped title's row stands its parts on the title's first line.
const ROW_WHOLE = "relative flex-row items-start";
const FIRST_LINE = "flex-row shrink-0 items-center h-line-body";
const LINE_WHOLE = "flex-row items-start min-w-0";
const TITLE_LINES = "flex-1 min-w-0";
const SQUARE = "rounded-none";
const LEADING = "shrink-0 items-center justify-center";
// A tree's levels and fold lane, as one box that runs the row's full height
// (`./index.tsx`); the lane is empty, no row waiting has a branch.
const TREE = "flex-row shrink-0 self-stretch";
const FOLD = "shrink-0";
// The change mark's lane, one icon wide.
const BOX = "shrink-0 items-center justify-center";
const TEXT = "flex-1 min-w-0";
const LINE = "flex-row items-center min-w-0";
// A line's strut and its bar in one box, so the line's gap never stands
// between them and the bar starts where the text it stands in for starts.
const STRUT_BAR = "flex-row items-center grow min-w-0";
// A bar runs in its line's short-label lane, at a share of a typical title or
// meta line rather than of the row.
const BAR_ROOM = "flex-row grow";
// A leading kind's skeleton: the mark it stands in for, at that mark's size.
const LEADING_WAIT = {
	avatar: "avatar",
	icon: "icon",
	status: "dot",
	check: "check",
} as const;
// A tick's slot is its hit box, as the loaded row's.
const TICK = "size-target";
const TRAILING = "shrink-0";
// A trailing value is an age or a count: four figures at most.
const TRAILING_BAR = "w-figures";
// The marks (a status, a warning, a lock, a chip) end the meta line: their bar at the end of
// their own short-label lane, half its width.
const MARKS_ROOM = "flex-row grow justify-end min-w-0";
const MARKS_BAR = "w-1/2";
// A chip on the meta line stands taller than the line's text.
const CHIP_LINE = "min-h-chip";
// The entry's line: a field's bar filling the room, its act's bar at the end.
const ENTRY = "flex-row items-center min-w-0";
const ENTRY_FIELD = "flex-1 min-w-0";
// A labelled act waits as a bar a short label wide.
const ACT_BAR = "w-measure-short shrink-0";
// The more act's room, empty: the act waits with nothing to act on.
const ACTS = "relative flex-row shrink-0 items-center";
const MORE = "size-control-compact";
// Each waiting row's title and meta bars, at the lengths of the lines they
// stand in for.
const BARS = [
	["w-1/2", "w-1/3"],
	["w-2/3", "w-1/4"],
	["w-3/4", "w-1/3"],
	["w-1/2", "w-1/4"],
] as const;

// How many rows a waiting list draws.
export const WAITING_ROWS = BARS.length;

// A part on the title's first line while the title wraps.
function First(props: { on: boolean; children: ReactNode }) {
	if (!props.on) return props.children;
	return <View className={FIRST_LINE}>{props.children}</View>;
}

// One body line of a title's bar, a strut setting the line's height.
function TitleBar(props: { width: string }) {
	return (
		<View className={cn(ROW_TITLE_LINE, LINE)}>
			<View className={STRUT_BAR}>
				<Strut role="body" />
				<View className={cn(skeletonLane({ role: "body" }), BAR_ROOM)}>
					<View className={cn(skeleton({ kind: "line" }), props.width)} />
				</View>
			</View>
		</View>
	);
}

// A ListRow waiting, the `index`th of a waiting list: a tree's rails (the depths `waitingDepth` gives) and fold lane, empty, the change mark's
// skeleton in its lane, the leading mark's skeleton by its kind, a bar in the title line (the one-line form when the list wraps its titles, its leading, trailing and acts on it; the trailing's at its end, four figures
// wide) and one in the meta line (the marks' at its end) or, with an entry, a
// field's bar and an act's bar in its place, each at its slot's place, a
// labelled act's bar at the row's end and the more act's room left empty. Outside the package's exports.
export function RowWait(props: { shape: RowShape; index: number }) {
	const ground = useContext(GroundContext);
	const { shape } = props;
	const [title, meta] = BARS[props.index % BARS.length] ?? BARS[0];
	const stacked = shape.meta || shape.entry ? "two" : "one";
	const lines = shape.wrap ? "whole" : stacked;
	// A wrapped title and an entry's input are lines under the title's first, so
	// the parts beside them stand on that first line.
	const top = shape.wrap || shape.entry;
	const levels = Array.from(
		{ length: waitingDepth(props.index) },
		(_, level) => level,
	);
	const trailing = shape.trailing ? (
		<First on={top}>
			<View
				className={cn(skeleton({ kind: "line" }), TRAILING_BAR, TRAILING)}
			/>
		</First>
	) : null;
	return (
		<View
			className={cn(
				row({
					lines,
					ground,
					state: "rest",
				}),
				top ? ROW_WHOLE : ROW,
				ground === "list" && SQUARE,
			)}
		>
			{shape.tree ? (
				<View className={cn(TREE, treeBleed({ lines }))}>
					{levels.map((level) => (
						<View key={level} className={TREE_RAIL} />
					))}
					<First on={top}>
						<View className={cn(TREE_LANE, FOLD)} />
					</First>
				</View>
			) : null}
			{shape.change ? (
				<First on={top}>
					<View className={BOX}>
						<View className={skeleton({ kind: "icon" })} />
					</View>
				</First>
			) : null}
			{shape.leading ? (
				<First on={top}>
					<View
						className={cn(
							ROW_LEADING,
							LEADING,
							shape.leading === "check" && TICK,
						)}
					>
						<View className={skeleton({ kind: LEADING_WAIT[shape.leading] })} />
					</View>
				</First>
			) : null}
			<View className={cn(TEXT, shape.entry && ROW_ENTRY)}>
				{shape.wrap ? (
					<View className={cn(ROW_TITLE_LINE, LINE_WHOLE)}>
						<View className={TITLE_LINES}>
							<TitleBar width={title} />
						</View>
						{trailing}
					</View>
				) : (
					<View className={cn(ROW_TITLE_LINE, LINE)}>
						<View className={STRUT_BAR}>
							<Strut role="body" />
							<View className={cn(skeletonLane({ role: "body" }), BAR_ROOM)}>
								<View className={cn(skeleton({ kind: "line" }), title)} />
							</View>
						</View>
						{trailing}
					</View>
				)}
				{shape.entry ? (
					<View className={cn(ROW_META_LINE, ENTRY)}>
						<View className={cn(skeleton({ kind: "bar" }), ENTRY_FIELD)} />
						<View className={cn(skeleton({ kind: "bar" }), ACT_BAR)} />
					</View>
				) : shape.meta ? (
					<View className={cn(ROW_META_LINE, LINE, shape.chip && CHIP_LINE)}>
						<View className={STRUT_BAR}>
							<Strut role="meta" />
							<View className={cn(skeletonLane({ role: "meta" }), BAR_ROOM)}>
								<View className={cn(skeleton({ kind: "line" }), meta)} />
							</View>
						</View>
						{shape.marks ? (
							<View className={cn(skeletonLane({ role: "meta" }), MARKS_ROOM)}>
								<View className={cn(skeleton({ kind: "line" }), MARKS_BAR)} />
							</View>
						) : null}
					</View>
				) : null}
			</View>
			{shape.act || shape.more ? (
				<First on={top}>
					<View className={cn(ROW_ACTS, ACTS)}>
						{shape.act ? (
							<View className={cn(skeleton({ kind: "bar" }), ACT_BAR)} />
						) : null}
						{shape.more ? <View className={MORE} /> : null}
					</View>
				</First>
			) : null}
		</View>
	);
}
