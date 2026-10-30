import { cn } from "@fcalell/ui-core/cn";
import { type ReactNode, use } from "react";
import { ShellMenu } from "../../lib/frame.ts";
import { DistanceContext } from "../../lib/media.ts";

// The Shell's column holds a place: a row of Panes and the size container they
// read whether it stands them alone by (`place-max-tablet:`). The Place decides
// which of its Panes stand and how they share the row, from each Pane's place
// among its siblings (`:last-of-type`, `:nth-last-of-type`, structure the route
// gave by the order it rendered them), so a Pane reads none of its siblings; it
// says each Pane's act form to its head by two custom properties
// (`--pane-back`, `--pane-close`, a `display` each). The Shell draws it around
// the route's Panes, each deeper route's Pane a step into what the one before it
// lists, so a page places none.
//
// A Pane is `section`, the only one a Place holds (a Sheet leaves focus guards,
// spans, after it), so "of-type" counts Panes. Each Pane but the last holds the
// list width and gives way to its floor (`region-min`); the last takes the rest,
// the list width (520 px) once a Pane stands before it, yielding to the one
// before's floor where the Place has not room for both. A hairline parts each
// from the next. Below `tablet` only the last stands, below `wide` the last two,
// and never more than three, the oldest folding first; a covering Pane hides
// those before it, the one `:has()` the structure rules name. The first Pane
// that stands is the one with no Pane standing before it: its head draws Back,
// every other Pane's draws Close.
const PLACE = "@container/place flex grow min-h-0 min-w-0";
const SHARE =
	"[&>[data-page]:not(:last-of-type)]:w-list [&>[data-page]:not(:last-of-type)]:min-w-region-min [&>[data-page]:not(:last-of-type)]:shrink [&>[data-page]:not(:last-of-type)]:grow-0 [&>[data-page]:not(:last-of-type)]:basis-auto [&>[data-page]:not(:last-of-type)]:border-e [&>[data-page]:not(:last-of-type)]:border-edge place-tablet:[&>[data-page]:last-of-type:not(:first-of-type)]:min-w-[min(var(--container-list),calc(100%-var(--container-region-min)))]";
const FOLD =
	"place-max-tablet:[&>[data-page]:not(:last-of-type)]:hidden place-max-wide:[&>[data-page]:nth-last-of-type(n+3)]:hidden [&>[data-page]:nth-last-of-type(n+4)]:hidden [&>[data-page]:has(~[data-cover])]:hidden";
const ACTS =
	"[&>[data-page]]:[--pane-back:none] [&>[data-page]]:[--pane-close:flex] [&>[data-page]:first-of-type]:[--pane-back:flex] [&>[data-page]:first-of-type]:[--pane-close:none] [&>[data-page]:nth-last-of-type(3)]:[--pane-back:flex] [&>[data-page]:nth-last-of-type(3)]:[--pane-close:none] place-max-wide:[&>[data-page]:nth-last-of-type(2)]:[--pane-back:flex] place-max-wide:[&>[data-page]:nth-last-of-type(2)]:[--pane-close:none] place-max-tablet:[&>[data-page]]:[--pane-back:flex] place-max-tablet:[&>[data-page]]:[--pane-close:none]";
// A place read from across a room is one column that never splits: only its
// last Pane stands, alone.
const ROOM =
	"[&>[data-page]:not(:last-of-type)]:hidden [&>[data-page]]:[--pane-back:flex] [&>[data-page]]:[--pane-close:none]";

// The room set is the one density no query detects, so the page that is read
// from across a room states it: `distance` `room` draws the room set and the
// touch structure, its last Pane alone and no menu act. Only the showcase's TV
// page states it; the Shell draws the place at its own distance.
export function Place(props: { distance?: "room"; children?: ReactNode }) {
	const far = props.distance === "room";
	const menu = use(ShellMenu);
	return (
		<DistanceContext value={far}>
			<ShellMenu value={far ? undefined : menu}>
				<div
					data-density={far ? "room" : undefined}
					className={cn(PLACE, SHARE, FOLD, ACTS, far && ROOM)}
				>
					{props.children}
				</div>
			</ShellMenu>
		</DistanceContext>
	);
}
