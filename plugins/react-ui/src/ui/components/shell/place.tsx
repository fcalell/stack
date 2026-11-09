import { cn } from "@fcalell/ui-core/cn";
import { type ReactNode, use, useMemo, useState } from "react";
import { type PaneKind, PlaceFrame, ShellMenu } from "../../lib/frame.ts";
import { DistanceContext } from "../../lib/media.ts";

// The Shell's column holds a place: a row of two Panes at most, the place's
// own and a record's after it, and the size container they read whether they
// stand side by side by (`place-max-tablet:`). The Place decides how they share
// the row from each Pane's place among its siblings (`:first-of-type`,
// `:last-of-type`, structure the route gave by the order it rendered them), so
// a Pane reads none of its siblings; it says a record's head which acts stand by
// custom properties (`--pane-back`, `--pane-close`, `--pane-expand`, a `display`
// each). The Shell draws it around the route's Panes, so a page places none.
//
// A Pane is `section`, the only one a Place holds (a Sheet leaves focus guards,
// spans, after it), so "of-type" counts Panes. The Pane before the last holds
// the `list` width and gives way to its floor (`region-min`); the last takes
// the rest, never under `list` where the Place has room for both, yielding to
// the one before's floor where it has not. A hairline parts them. Both widths
// count characters of the body font (`ch`), so they follow the `size` knob.
// Below `tablet` only the last stands. An expanded record's Pane
// (`data-expanded`, its Expand act) hides the Pane before it, the one `:has()`
// the structure rules name, and takes the whole Place; both stay mounted, so
// the list's scroll and typed text survive.
const PLACE = "@container/place flex grow min-h-0 min-w-0";
const SHARE =
	"[&>[data-page]:not(:last-of-type)]:w-list [&>[data-page]:not(:last-of-type)]:min-w-region-min [&>[data-page]:not(:last-of-type)]:shrink [&>[data-page]:not(:last-of-type)]:grow-0 [&>[data-page]:not(:last-of-type)]:basis-auto [&>[data-page]:not(:last-of-type)]:border-e [&>[data-page]:not(:last-of-type)]:border-edge place-tablet:[&>[data-page]:last-of-type:not(:first-of-type)]:min-w-[min(var(--container-list),calc(100%-var(--container-region-min)))]";
const FOLD =
	"place-max-tablet:[&>[data-page]:not(:last-of-type)]:hidden [&>[data-page]:has(~[data-expanded])]:hidden";
// Only a record's head draws these acts (the place's Pane has none: the
// sidebar moves between places): Close and Expand where the place's Pane can
// stand beside it, Back alone below `tablet`, and no Expand where nothing
// stands before it to fold.
const ACTS =
	"[&>[data-page]]:[--pane-back:none] [&>[data-page]]:[--pane-close:flex] [&>[data-page]]:[--pane-expand:none] [&>[data-page]:not(:first-of-type)]:[--pane-expand:flex] place-max-tablet:[&>[data-page]]:[--pane-back:flex] place-max-tablet:[&>[data-page]]:[--pane-close:none] place-max-tablet:[&>[data-page]:not(:first-of-type)]:[--pane-expand:none]";
// A place read from across a room is one column that never splits: only its
// last Pane stands, alone, and its head draws the room's acts itself.
const ROOM = "[&>[data-page]:not(:last-of-type)]:hidden";

// The page's one `h1` is the Place's: the name of where you are, drawn apart
// from sight, so every Pane's title is the same `h2` whatever Panes stand
// beside it and the Place reads nothing of them. The Shell gives it the
// current place's name; a Place standing without a Shell (a room page) is
// given one by `title`, or draws none when a Gate in it is the page's `h1`.
const NAME = "sr-only";

// The room set is the one density no query detects, so a room Place states it
// (`Place distance="room"`): it draws the room set and the touch structure,
// its last Pane alone and no menu act; the Shell draws the place at its own distance.
export function Place(props: {
	distance?: "room";
	/** The page's `h1`, the name of where you are, drawn apart from sight; the place's Pane takes it as its title and a record's Pane draws it before the record's name. The Shell gives it the current place's name, so a route inside a Shell writes none; a room page standing without a Shell writes it once. */
	title?: string;
	children?: ReactNode;
}) {
	const far = props.distance === "room";
	const menu = use(ShellMenu);
	const [stand] = useState(standing);
	const frame = useMemo(
		() => ({ name: props.title, stand }),
		[props.title, stand],
	);
	return (
		<DistanceContext value={far}>
			<ShellMenu value={far ? undefined : menu}>
				<PlaceFrame value={frame}>
					<div
						data-density={far ? "room" : undefined}
						className={cn(PLACE, SHARE, FOLD, ACTS, far && ROOM)}
					>
						{props.title ? <h1 className={NAME}>{props.title}</h1> : null}
						{props.children}
					</div>
				</PlaceFrame>
			</ShellMenu>
		</DistanceContext>
	);
}

// The count of each kind of Pane standing in a Place, which holds it to one of
// each: a record linked from a record opens in its own place, never as a third
// Pane, and a place's tabs are one Pane's, never a second.
function standing(): (kind: PaneKind) => () => void {
	const count: Record<PaneKind, number> = { place: 0, record: 0 };
	return (kind) => {
		if (count[kind] === 1)
			throw new Error(
				kind === "record"
					? "Place: a second record's Pane; a record linked from a record opens in its own place"
					: "Place: a second place's Pane; a place's tabs stand in its one Pane",
			);
		count[kind] += 1;
		return () => {
			count[kind] -= 1;
		};
	};
}
