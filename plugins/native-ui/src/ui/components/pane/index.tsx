import { NO_HOLDS } from "@fcalell/plugin-api/read";
import {
	type Datum,
	FrameHolds,
	type Selection,
} from "@fcalell/plugin-api/tanstack-query";
import type { IconAct, MenuItem, Part } from "@fcalell/ui-core/descriptors";
import {
	FOOT_DOCKED,
	PAGE_BODY,
	PAGE_BODY_OVER_FOOT,
} from "@fcalell/ui-core/variants";
import { type ReactNode, useRef } from "react";
import { View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import type { Empty } from "../../lib/empty";
import { BackRoute, FootReturn, useFootRegion } from "../../lib/frame";
import { Lifted, Scroll } from "../../lib/hosts";
import { FrameBody, hasBody, useFrame } from "../../lib/read";
import type { Route } from "../../lib/route";
import type { SheetProps } from "../sheet";
import { SheetDocked } from "../sheet/docked";
import { ToastRoom } from "../toast/room";
import { PaneHead } from "./head";

const PANE = "flex-1";
// The body scrolls under the fixed bar, and the foot docks under it.
const BODY = "flex-1";
const BODY_WRAP = "relative flex-1";
// The body's content fills the scroll, so an empty state alone centres in it
// and a Thread in it takes the free height.
const BODY_CONTENT = "grow";
// The foot stays under the body, which scrolls past it, and centres the
// selection bar's column.
const DOCKED = "shrink-0 items-center";

interface PaneBase extends Closed {
	/** The page's title, its one header (a short phrase; wraps). On a record's Pane it is the record's name, given as a selection of the record's read: it paints while the record loads. */
	title: Datum<Part>;
	/** The route the Pane returns to: a Back act leads its bar. None leaves the shell's switcher there. */
	back?: Route;
	/** Icon acts after the title, in order; a create act is one of them, and on a record's Pane the record's acts. An act is live whatever the `read` does. One given as a selection paints, inert, while its own read waits or stands still, and stands blocked, the failed sentence its name, once that read failed or is missing. */
	actions?: readonly Datum<IconAct>[];
	/** The acts past the actions, in a menu under the more act; the more act paints and stands blocked as an action does. */
	more?: Datum<readonly MenuItem[]>;
	/** The field (a `MessageInput`) or the selection bar (an `ActionBar` with `chosen`) docked at the Pane's foot over the keyboard, the body scrolling past it. */
	foot?: ReactNode;
	/** A task over the foot: while it is `open` the sheet docks there in the foot's place, the body scrolling above it, and closing hands focus back to the foot's input. */
	sheet?: SheetProps;
	/** Accepted for the web's sake; on the phone every Pane is a screen of the router's stack, so it changes nothing. */
	cover?: boolean;
	/** Accepted for the web's sake; the phone's body is one column at the screen's width, so it changes nothing. */
	wide?: boolean;
	/** The Pane's sections, a sections gap apart; none stand while the `read` is empty. */
	children?: ReactNode;
}

/** A page of a `Place`: on the phone one screen. `empty` belongs to the `read` it answers for, so a Pane given one without the other does not type-check. */
export type PaneProps = PaneBase &
	(
		| {
				read?: undefined;
				empty?: never;
		  }
		| {
				/** What the Pane's page holds, read once for the frame: while it waits the loaded tree paints, its failure and a missing record fill the page in place of the body, and an empty selection draws `empty`. It holds the reads of `read` that no enclosing frame holds: those draw their failure and say they are busy; the rest only wait and empty. */
				read: Selection<unknown>;
				/** What the page says when the `read` is empty: this stands in place of the body, centred in what the body leaves. */
				empty?: Empty;
		  }
	);

/** A page of a Place, on the phone one screen: a bar (the back act where `back` is set, else the shell's switcher; the title, one line, truncating, never under two fifths of the bar; then the actions and more, the actions that do not fit folding into the more menu, the last first, and returning when there is room), a body that scrolls, its children a sections gap apart, and a `foot` that docks under the body over the keyboard, a `sheet` in its place while it is open, and the `empty` of its `read` standing in place of the children. On a record's Pane the title is the record's name, the actions and more its acts, and the record's place and facts stand in an `ItemHeader` at the body's top. The toasts stand over the body, above the foot. `cover` and `wide` are the web's: on the phone a Pane is always the whole screen and its column the screen's width, so both change nothing. */
export function Pane({
	title,
	back,
	actions,
	more,
	foot,
	sheet,
	read,
	empty,
	children,
}: PaneProps) {
	const frame = useFrame(read);
	// The claim a docked sheet leaves the foot for the input that returns.
	const claim = useRef(false);
	const region = useFootRegion(false);
	// The foot and the docked sheet stand whatever the page's read does: they
	// draw nothing of it.
	const docked = sheet?.open ? (
		<SheetDocked {...sheet} region={region.value} />
	) : (
		foot
	);
	const footed = docked != null;
	return (
		<BackRoute.Provider value={back}>
			<View
				accessibilityState={{ busy: frame.holds && frame.form === "waiting" }}
				className={PANE}
			>
				<PaneHead
					title={title}
					back={back}
					actions={actions}
					more={more}
					frame={frame}
				/>
				<Lifted
					behavior="padding"
					automaticOffset
					enabled={footed}
					onLayout={region.onLayout}
					className={BODY}
				>
					<View className={BODY_WRAP}>
						{hasBody(frame, children) ? (
							<Scroll
								className={BODY}
								contentContainerClassName={cn(
									PAGE_BODY,
									footed && PAGE_BODY_OVER_FOOT,
									BODY_CONTENT,
								)}
							>
								<FrameBody frame={frame} fit="page" empty={empty}>
									{children}
								</FrameBody>
							</Scroll>
						) : null}
						<ToastRoom />
					</View>
					{docked ? (
						<View className={cn(FOOT_DOCKED, DOCKED)}>
							<FrameHolds holds={NO_HOLDS}>
								<FootReturn.Provider value={claim}>
									{docked}
								</FootReturn.Provider>
							</FrameHolds>
						</View>
					) : null}
				</Lifted>
			</View>
		</BackRoute.Provider>
	);
}
