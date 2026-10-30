import { NO_HOLDS } from "@fcalell/plugin-api/read";
import {
	type Datum,
	FrameHolds,
	type Selection,
} from "@fcalell/plugin-api/tanstack-query";
import type { ProcedureCall } from "@fcalell/plugin-api/types";
import type { IconLinkAct, Run } from "@fcalell/ui-core/descriptors";
import {
	FOOT_DOCKED,
	PAGE_BODY,
	PAGE_BODY_OVER_FOOT,
	PAGE_HEAD_ROOM,
} from "@fcalell/ui-core/variants";
import { type ReactNode, useContext, useRef, useState } from "react";
import { View } from "react-native";
import type { IconAct, MenuEntry } from "../../lib/act";
import { useDrawn } from "../../lib/arrive";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import type { Empty } from "../../lib/empty";
import {
	BackRoute,
	DistanceContext,
	FootBar,
	FootReturn,
	useFootRegion,
} from "../../lib/frame";
import { Lifted, Scroll } from "../../lib/hosts";
import { blockIn, FadingView } from "../../lib/motion";
import { useParentRoute } from "../../lib/navigate";
import { FrameBody, hasBody, useFrame } from "../../lib/read";
import type { Route } from "../../lib/route";
import {
	type Fact,
	ItemHeaderBase,
	type ItemHeaderParts,
} from "../item-header/base";
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

export type { Fact };

/** A record's head in its Pane: where the record lives, which the bar holds, and the parts of the head under it. */
export interface RecordHead extends ItemHeaderParts {
	/** Where the record lives, drawn in the bar in place of the name (a short phrase such as "Agents" or "Work · Code"; one line, truncating, never under two fifths of the bar). A selection paints in its place, and the bar's acts stand, until its read lands. */
	within: Datum<Run>;
}

interface PaneBase<P extends ProcedureCall> extends Closed {
	/** The page's title, its one header (a short phrase; in the bar one line, truncating). On a record's Pane it is the record's name, given as a selection of the record's read: it paints while the record loads. With a `record` it stands whole, wrapping, in the head at the body's top. */
	title: Datum<Run>;
	/** A record's head: the bar holds `record.within` in place of the title, and the body opens with the title as the screen's header between the overline and the facts. A Pane given one always draws its name; one without keeps the title in the bar. */
	record?: RecordHead;
	/** The kind of record the Pane shows (a short lowercase noun: "project"). Its `read` answering not found fills the page with "Couldn't find this project." and the way back, the Pane's `back`; without one the sentence is "Couldn't find this." */
	noun?: string;
	/** The route the Pane returns to: a Back act leads its bar, and the way back a missing read says. Absent, it is the parent route the router gives (the nearest path above this one that expo-router serves a screen at), and the shell's switcher stands there where it cannot give one; `false` leaves the switcher. */
	back?: Route | false;
	/** Icon acts after the title, ordered by weight: the primary act first, which stands at its icon while the rest stand in the bar's more menu, before its own items, at every width; a create act is one of them, and on a record's Pane the record's acts. An act is live whatever the `read` does. One given as a selection paints, inert, while its own read waits or stands still, and stands blocked, the failed sentence its name, once that read failed or is missing. While the Pane's own `read` failed or is missing the bar draws no action and no more menu. */
	actions?: readonly Datum<IconAct | IconLinkAct>[];
	/** The acts past the actions, in a menu under the more act, named "More", whose sheet is titled by the Pane's title (a record's name), "More" while it waits; the more act paints and stands blocked as an action does. */
	more?: Datum<readonly MenuEntry[]>;
	/** The field (a `Thread`'s composer) docked at the Pane's foot over the keyboard, the body scrolling past it. A `Table` with `select` in the Pane draws its selection bar here itself. */
	foot?: ReactNode;
	/** A task over the foot: while it is `open` the sheet docks there in the foot's place, the body scrolling above it, and closing hands focus back to the foot's input. */
	sheet?: SheetProps<P>;
	/** Accepted for the web's sake; on the phone every Pane is a screen of the router's stack, so it changes nothing. */
	cover?: boolean;
	/** Accepted for the web's sake; the phone's body is one column at the screen's width, so it changes nothing. */
	wide?: boolean;
	/** The Pane's sections, a sections gap apart; none stand while the `read` is empty. */
	children?: ReactNode;
}

/** A page of a `Place`: on the phone one screen. `empty` belongs to the `read` it answers for, so a Pane given one without the other does not type-check. */
export type PaneProps<P extends ProcedureCall = ProcedureCall> = PaneBase<P> &
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

/** A page of a Place, on the phone one screen: a bar (the back act where `back` is set, else the shell's switcher; the title, one line, truncating, never under two fifths of the bar; then the first action at its icon and the more menu, which holds the other actions before its own items, at every width), a body that scrolls, its children a sections gap apart, and a `foot` that docks under the body over the keyboard, a `sheet` in its place while it is open, and the `empty` of its `read` standing in place of the children. On a record's Pane the title is the record's name and the actions and more its acts; its `record` puts the record's place in the bar and the name, whole and wrapping as the screen's header, between the overline and the facts of a head at the body's top, and a `read` that answers not found fills the page with the missing form in place of the head, its sentence worded by `noun` and its way back the `back`. The toasts stand over the body, above the foot. `cover` and `wide` are the web's: on the phone a Pane is always the whole screen and its column the screen's width, so both change nothing. */
export function Pane<P extends ProcedureCall = ProcedureCall>({
	title,
	record,
	noun,
	back,
	actions,
	more,
	foot,
	sheet,
	read,
	empty,
	children,
}: PaneProps<P>) {
	const frame = useFrame(read);
	// A Pane in a room Place stands its head off the top on the table.
	const far = useContext(DistanceContext);
	const parent = useParentRoute();
	const toward = back === false ? undefined : (back ?? parent);
	// A foot that comes once the Pane is drawn is a block that fades in as it
	// mounts; the docked sheet taking the foot's place fades in as its own.
	const drawn = useDrawn();
	// The claim a docked sheet leaves the foot for the input that returns.
	const claim = useRef(false);
	const region = useFootRegion(false);
	// The bar a Table in the body hands up for the foot.
	const [lifted, lift] = useState<ReactNode>(null);
	// The foot and the docked sheet stand whatever the page's read does: they
	// draw nothing of it.
	const docked = sheet?.open ? (
		<SheetDocked {...sheet} region={region.value} />
	) : (
		(foot ?? lifted)
	);
	const footed = docked != null;
	// A record's head opens the body, in the frame's body: a failed or missing
	// read draws its form and not the head.
	const content = record ? (
		<>
			<ItemHeaderBase
				name={title}
				overline={record.overline}
				facts={record.facts}
			/>
			{children}
		</>
	) : (
		children
	);
	return (
		<BackRoute.Provider value={toward}>
			<FootBar.Provider value={lift}>
				<View
					accessibilityState={{ busy: frame.holds && frame.form === "waiting" }}
					className={cn(PANE, far && PAGE_HEAD_ROOM)}
				>
					<PaneHead
						title={record ? record.within : title}
						heading={!record}
						back={toward}
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
							{hasBody(frame, content) ? (
								<Scroll
									className={BODY}
									contentContainerClassName={cn(
										PAGE_BODY,
										footed && PAGE_BODY_OVER_FOOT,
										BODY_CONTENT,
									)}
								>
									<FrameBody frame={frame} fit="page" empty={empty} noun={noun}>
										{content}
									</FrameBody>
								</Scroll>
							) : null}
							<ToastRoom />
						</View>
						{docked ? (
							<FadingView
								entering={drawn ? blockIn() : undefined}
								className={cn(FOOT_DOCKED, DOCKED)}
							>
								<FrameHolds holds={NO_HOLDS}>
									<FootReturn.Provider value={claim}>
										{docked}
									</FootReturn.Provider>
								</FrameHolds>
							</FadingView>
						) : null}
					</Lifted>
				</View>
			</FootBar.Provider>
		</BackRoute.Provider>
	);
}
