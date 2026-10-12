import { cn } from "@fcalell/ui-core/cn";
import type { ReactNode } from "react";
import type { Closed } from "../../lib/closed.ts";
import { DistanceContext } from "../../lib/media.ts";

// A place is a row of Panes and the size container they read whether it
// stands them alone by (`place-max-tablet:`); each Pane sets its own share.
const PLACE = "@container/place flex grow min-h-0 min-w-0";
// A place read from across a room is one column that never splits: only its
// last Pane stands.
const ROOM = "*:not-last:hidden";

/** Where the page is read from: a screen across a room draws the room set, which no query detects, so the page states it. */
type PlaceDistance =
	| { distance?: undefined }
	| {
			/** The page is read from across a room: the room set and the touch structure, in one column that never splits. */
			distance: "room";
	  };

/** A page in the shell. */
export type PlaceProps = Closed &
	PlaceDistance & {
		/** The page's Panes, in order: each deeper one a step into what the one before it lists. */
		children?: ReactNode;
	};

/** A page in the shell: its Panes in a row, each but the last at the list width giving way to its floor, the last taking the rest, a hairline between them. It draws no bar of its own: each Pane carries its own. Below `tablet` of its width only the last Pane stands. With `distance` `room` it draws the room set and the touch structure, its last Pane alone. */
export function Place({ distance, children }: PlaceProps) {
	const far = distance === "room";
	return (
		<DistanceContext value={far}>
			<div
				data-density={far ? "room" : undefined}
				className={cn(PLACE, far && ROOM)}
			>
				{children}
			</div>
		</DistanceContext>
	);
}
