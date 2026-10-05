import { cn } from "@fcalell/ui-core/cn";
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
import { type ReactNode, use } from "react";
import { GroundContext } from "../../lib/ground.ts";

// The geometry of the row it stands in for (`./index.tsx`), each line's box
// at its line's height.
const ROW = "relative flex items-center";
// A wrapped title's row stands its parts on the title's first line.
const ROW_WHOLE = "relative flex items-start";
const FIRST_LINE = "flex shrink-0 items-center h-lh";
const LINE_WHOLE = "flex items-start min-w-0";
const TITLE_LINES = "flex flex-col grow min-w-0";
const SQUARE = "touch:rounded-none";
const LEADING = "flex shrink-0 items-center justify-center";
// The change mark's lane, one icon wide.
const BOX = "flex shrink-0 items-center justify-center";
const TEXT = "flex flex-col grow min-w-0";
const LINE = "flex items-center min-w-0";
const LINE_HEIGHT = "h-lh";
// A chip on the meta line stands taller than the line's text.
const CHIP_LINE = "min-h-chip";
const TITLE = "flex grow min-w-0";
// A bar runs in its line's short-label lane, at a share of a typical title or
// meta line rather than of the row.
const BAR_ROOM = "flex grow";
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
const MARKS_ROOM = "flex grow justify-end ms-auto min-w-0";
const MARKS_BAR = "w-1/2";
// The entry's line: a field's bar filling the room, its act's bar at the end.
const ENTRY = "flex items-center min-w-0";
const ENTRY_FIELD = "grow min-w-0";
// A labelled act waits as a bar a short label wide.
const ACT_BAR = "w-measure-short shrink-0";
// The more act's room, empty: the act waits with nothing to act on.
const ACTS = "relative flex shrink-0 items-center";
const MORE = "size-control-compact";
// Each waiting row's title and meta bars, at the lengths of the lines they
// stand in for.
const BARS = [
	["w-1/2", "w-1/3"],
	["w-2/3", "w-1/4"],
	["w-3/4", "w-1/3"],
	["w-1/2", "w-1/4"],
] as const;

/** How many rows a waiting list draws. Outside the package's exports. */
export const WAITING_ROWS = BARS.length;

// A part on the title's first line while the title wraps.
function First(props: { on: boolean; children: ReactNode }) {
	if (!props.on) return props.children;
	return (
		<span className={cn(lineBox({ role: "body" }), FIRST_LINE)}>
			{props.children}
		</span>
	);
}

// One body line of a title's bar, at the line's height.
function TitleBar(props: { width: string }) {
	return (
		<span className={cn(lineBox({ role: "body" }), LINE, LINE_HEIGHT)}>
			<span className={cn(skeletonLane({ role: "body" }), BAR_ROOM)}>
				<span className={cn(skeleton({ kind: "line" }), props.width)} />
			</span>
		</span>
	);
}

/** A ListRow waiting, the `index`th of a waiting list: the change mark's skeleton in its lane, the leading mark's skeleton by its kind, a bar in the title line (two when the list wraps its titles, its leading, trailing and acts on the first; the trailing's at its end, four figures wide) and one in the meta line (the marks' at its end) or, with an entry, a field's bar and an act's bar in its place, each at its slot's place, a labelled act's bar at the row's end and the more act's room left empty. Outside the package's exports. */
export function RowWait(props: { shape: RowShape; index: number }) {
	const ground = use(GroundContext);
	const { shape } = props;
	const [title, meta] = BARS[props.index % BARS.length] ?? BARS[0];
	const stacked = shape.meta || shape.entry ? "two" : "one";
	const trailing = shape.trailing ? (
		<First on={shape.wrap}>
			<span
				className={cn(skeleton({ kind: "line" }), TRAILING_BAR, TRAILING)}
			/>
		</First>
	) : null;
	return (
		<div
			aria-hidden
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
					<span className={BOX}>
						<span className={skeleton({ kind: "icon" })} />
					</span>
				</First>
			) : null}
			{shape.leading ? (
				<First on={shape.wrap}>
					<span
						className={cn(
							ROW_LEADING,
							LEADING,
							shape.leading === "check" && TICK,
						)}
					>
						<span className={skeleton({ kind: LEADING_WAIT[shape.leading] })} />
					</span>
				</First>
			) : null}
			<span className={cn(TEXT, shape.entry && ROW_ENTRY)}>
				{shape.wrap ? (
					<span className={cn(ROW_TITLE_LINE, LINE_WHOLE)}>
						<span className={TITLE_LINES}>
							<TitleBar width="w-full" />
							<TitleBar width={title} />
						</span>
						{trailing}
					</span>
				) : (
					<span
						className={cn(
							ROW_TITLE_LINE,
							lineBox({ role: "body" }),
							LINE,
							LINE_HEIGHT,
						)}
					>
						<span className={TITLE}>
							<span className={cn(skeletonLane({ role: "body" }), BAR_ROOM)}>
								<span className={cn(skeleton({ kind: "line" }), title)} />
							</span>
						</span>
						{trailing}
					</span>
				)}
				{shape.entry ? (
					<span className={cn(ROW_META_LINE, ENTRY)}>
						<span className={cn(skeleton({ kind: "bar" }), ENTRY_FIELD)} />
						<span className={cn(skeleton({ kind: "bar" }), ACT_BAR)} />
					</span>
				) : shape.meta ? (
					<span
						className={cn(
							ROW_META_LINE,
							lineBox({ role: "meta" }),
							LINE,
							shape.chip ? CHIP_LINE : LINE_HEIGHT,
						)}
					>
						<span className={cn(skeletonLane({ role: "meta" }), BAR_ROOM)}>
							<span className={cn(skeleton({ kind: "line" }), meta)} />
						</span>
						{shape.marks ? (
							<span className={cn(skeletonLane({ role: "meta" }), MARKS_ROOM)}>
								<span className={cn(skeleton({ kind: "line" }), MARKS_BAR)} />
							</span>
						) : null}
					</span>
				) : null}
			</span>
			{shape.act || shape.more ? (
				<First on={shape.wrap}>
					<span className={cn(ROW_ACTS, ACTS)}>
						{shape.act ? (
							<span className={cn(skeleton({ kind: "bar" }), ACT_BAR)} />
						) : null}
						{shape.more ? <span className={MORE} /> : null}
					</span>
				</First>
			) : null}
		</div>
	);
}
