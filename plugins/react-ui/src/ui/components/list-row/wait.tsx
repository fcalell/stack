import { cn } from "@fcalell/ui-core/cn";
import type { RowShape } from "@fcalell/ui-core/list-state";
import {
	lineBox,
	ROW_ACTS,
	ROW_LEADING,
	ROW_META_LINE,
	ROW_TITLE_LINE,
	row,
	skeleton,
	skeletonLane,
} from "@fcalell/ui-core/variants";
import { use } from "react";
import { GroundContext } from "../../lib/ground.ts";

// The geometry of the row it stands in for (`./index.tsx`), each line's box
// at its line's height.
const ROW = "relative flex items-center";
const SQUARE = "touch:rounded-none";
const LEADING = "flex shrink-0 items-center justify-center";
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
const LEADING_WAIT = { avatar: "avatar", icon: "icon", status: "dot" } as const;
const TRAILING = "shrink-0";
// A trailing value is an age or a count: four figures at most.
const TRAILING_BAR = "w-figures";
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

/** A ListRow waiting, the `index`th of a waiting list: the leading mark's skeleton by its kind, a bar in the title line (the trailing's at its end, four figures wide) and one in the meta line, each at its slot's place, and the more act's room left empty. Outside the package's exports. */
export function RowWait(props: { shape: RowShape; index: number }) {
	const ground = use(GroundContext);
	const { shape } = props;
	const [title, meta] = BARS[props.index % BARS.length] ?? BARS[0];
	return (
		<div
			aria-hidden
			className={cn(
				row({ lines: shape.meta ? "two" : "one", ground, state: "rest" }),
				ROW,
				ground === "list" && SQUARE,
			)}
		>
			{shape.leading ? (
				<span className={cn(ROW_LEADING, LEADING)}>
					<span className={skeleton({ kind: LEADING_WAIT[shape.leading] })} />
				</span>
			) : null}
			<span className={TEXT}>
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
					{shape.trailing ? (
						<span
							className={cn(skeleton({ kind: "line" }), TRAILING_BAR, TRAILING)}
						/>
					) : null}
				</span>
				{shape.meta ? (
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
					</span>
				) : null}
			</span>
			{shape.more ? (
				<span className={cn(ROW_ACTS, ACTS)}>
					<span className={MORE} />
				</span>
			) : null}
		</div>
	);
}
