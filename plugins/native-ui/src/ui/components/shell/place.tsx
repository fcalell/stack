import { type ReactNode, useContext } from "react";
import { DistanceContext, ShellSwitcher, ShellTabs } from "../../lib/frame";
import { FadingView, placeIn } from "../../lib/motion";
import { RoomScope } from "../../lib/room";

const PLACE = "flex-1";

// The Shell's content holds a place: the route's screen with the Shell's tab
// bar under it. On the phone a route draws one Pane, a deeper one pushed in the
// router's stack, so the place reads no child and draws no bar of its own: the
// Pane carries it. `distance` `room` draws the room set and the touch structure,
// the one density no query detects, so the page read from across a room states
// it; the Shell draws the place at its own distance.
export function Place(props: { distance?: "room"; children?: ReactNode }) {
	const far = props.distance === "room";
	const tabs = useContext(ShellTabs);
	const switcher = useContext(ShellSwitcher);
	// The room set has no place to switch from: its Pane gets no trigger.
	const page = (
		<DistanceContext.Provider value={far}>
			<ShellSwitcher.Provider value={far ? undefined : switcher}>
				<FadingView entering={placeIn()} className={PLACE}>
					{props.children}
					{tabs}
				</FadingView>
			</ShellSwitcher.Provider>
		</DistanceContext.Provider>
	);
	return far ? <RoomScope>{page}</RoomScope> : page;
}
