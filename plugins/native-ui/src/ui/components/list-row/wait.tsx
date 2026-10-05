import type { RowShape } from "@fcalell/ui-core/list-state";
import {
	lineBox,
	ROW_ACTS,
	ROW_ENTRY,
	ROW_LEADING,
	ROW_META_LINE,
	ROW_TITLE_LINE,
	row,
	skeleton,
	skeletonLane,
} from "@fcalell/ui-core/variants";
import { type ReactNode, useContext } from "react";
import { Text as RNText, View } from "react-native";
import { cn } from "../../lib/cn";
import { GroundContext } from "../../lib/ground";

// The geometry of the row it stands in for (`./index.tsx`); a strut sets
// each line's height, as the web's `h-lh` does.
const ROW = "relative flex-row items-center";
// A wrapped title's row stands its parts on the title's first line.
const ROW_WHOLE = "relative flex-row items-start";
const FIRST_LINE = "flex-row shrink-0 items-center";
const LINE_WHOLE = "flex-row items-start min-w-0";
const TITLE_LINES = "flex-1 min-w-0";
const SQUARE = "rounded-none";
const LEADING = "shrink-0 items-center justify-center";
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
const STRUT = "​";
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
	return (
		<View className={FIRST_LINE}>
			<RNText className={lineBox({ role: "body" })}>{STRUT}</RNText>
			{props.children}
		</View>
	);
}

// One body line of a title's bar, a strut setting the line's height.
function TitleBar(props: { width: string }) {
	return (
		<View className={cn(ROW_TITLE_LINE, LINE)}>
			<View className={STRUT_BAR}>
				<RNText className={lineBox({ role: "body" })}>{STRUT}</RNText>
				<View className={cn(skeletonLane({ role: "body" }), BAR_ROOM)}>
					<View className={cn(skeleton({ kind: "line" }), props.width)} />
				</View>
			</View>
		</View>
	);
}

// A ListRow waiting, the `index`th of a waiting list: the change mark's
// skeleton in its lane, the leading mark's skeleton by its kind, a bar in the title line (two when the list wraps its titles, its leading, trailing and acts on the first; the trailing's at its end, four figures
// wide) and one in the meta line (the marks' at its end) or, with an entry, a
// field's bar and an act's bar in its place, each at its slot's place, a
// labelled act's bar at the row's end and the more act's room left empty. Outside the package's exports.
export function RowWait(props: { shape: RowShape; index: number }) {
	const ground = useContext(GroundContext);
	const { shape } = props;
	const [title, meta] = BARS[props.index % BARS.length] ?? BARS[0];
	const stacked = shape.meta || shape.entry ? "two" : "one";
	const trailing = shape.trailing ? (
		<First on={shape.wrap}>
			<View
				className={cn(skeleton({ kind: "line" }), TRAILING_BAR, TRAILING)}
			/>
		</First>
	) : null;
	return (
		<View
			className={cn(
				row({
					lines: shape.wrap ? "whole" : stacked,
					ground,
					state: "rest",
				}),
				shape.wrap ? ROW_WHOLE : ROW,
				ground === "list" && SQUARE,
			)}
		>
			{shape.change ? (
				<First on={shape.wrap}>
					<View className={BOX}>
						<View className={skeleton({ kind: "icon" })} />
					</View>
				</First>
			) : null}
			{shape.leading ? (
				<First on={shape.wrap}>
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
							<TitleBar width="w-full" />
							<TitleBar width={title} />
						</View>
						{trailing}
					</View>
				) : (
					<View className={cn(ROW_TITLE_LINE, LINE)}>
						<View className={STRUT_BAR}>
							<RNText className={lineBox({ role: "body" })}>{STRUT}</RNText>
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
							<RNText className={lineBox({ role: "meta" })}>{STRUT}</RNText>
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
				<First on={shape.wrap}>
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
