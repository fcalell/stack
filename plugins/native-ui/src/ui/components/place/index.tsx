import { type ReactNode, useContext } from "react";
import { View } from "react-native";
import type { Closed } from "../../lib/closed";
import { DistanceContext, ShellSwitcher, ShellTabs } from "../../lib/frame";
import { RoomScope } from "../../lib/room";

const PLACE = "flex-1";

/** Where the page is read from: a screen across a room draws the room set, which no query detects, so the page states it. */
type PlaceDistance =
	| { distance?: undefined }
	| {
			/** The page is read from across a room: the room set and the touch structure. */
			distance: "room";
	  };

/** A page in the shell. */
export type PlaceProps = Closed &
	PlaceDistance & {
		/** The page's Pane. */
		children?: ReactNode;
	};

/** A page in the shell: the container of its Pane, with the Shell's tab bar under it. On the phone a route draws one Pane, a deeper one pushed in the router's stack, so the Place reads no child and draws no bar of its own: the Pane carries it. With `distance` `room` it draws the room set and the touch structure. */
export function Place({ distance, children }: PlaceProps) {
	const far = distance === "room";
	const tabs = useContext(ShellTabs);
	const switcher = useContext(ShellSwitcher);
	// The room set has no place to switch from: its Pane gets no trigger.
	const page = (
		<DistanceContext.Provider value={far}>
			<ShellSwitcher.Provider value={far ? undefined : switcher}>
				<View className={PLACE}>
					{children}
					{tabs}
				</View>
			</ShellSwitcher.Provider>
		</DistanceContext.Provider>
	);
	return far ? <RoomScope>{page}</RoomScope> : page;
}
