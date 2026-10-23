import { cn } from "@fcalell/ui-core/cn";
import { type ReactNode, use } from "react";
import { ShellMenu } from "../../lib/frame.ts";
import { DistanceContext } from "../../lib/media.ts";

// The Shell's column holds a place: a row of Panes and the size container they
// read whether it stands them alone by (`place-max-tablet:`); each Pane sets its
// own share. The Shell draws it around the route's Panes, each deeper route's
// Pane a step into what the one before it lists, so a page places none.
const PLACE = "@container/place flex grow min-h-0 min-w-0";
// A place read from across a room is one column that never splits: only its
// last Pane stands.
const ROOM = "[&>[data-page]:has(~[data-page])]:hidden";

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
					className={cn(PLACE, far && ROOM)}
				>
					{props.children}
				</div>
			</ShellMenu>
		</DistanceContext>
	);
}
