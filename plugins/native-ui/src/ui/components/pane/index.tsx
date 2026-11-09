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
	PAGE_BODY_TOAST_ROOM,
	PAGE_HEAD_ROOM,
} from "@fcalell/ui-core/variants";
import { type ReactNode, useContext, useRef } from "react";
import { View } from "react-native";
import type { IconAct, MenuEntry, Offered } from "../../lib/act";
import { useDrawn } from "../../lib/arrive";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import type { Empty } from "../../lib/empty";
import {
	BackRoute,
	DistanceContext,
	FootReturn,
	PlaceName,
	useFootRegion,
} from "../../lib/frame";
import { Lifted, Scroll } from "../../lib/hosts";
import { blockIn, FadingView } from "../../lib/motion";
import { useParentRoute } from "../../lib/navigate";
import { FrameBody, hasBody, useFrame } from "../../lib/read";
import { useToasts } from "../../lib/toast";
import { ItemHeaderBase, type ItemHeaderParts } from "../item-header/base";
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

export type { RecordFact } from "@fcalell/ui-core/descriptors";

/** A record's head in its Pane: the parts of the head under the bar. Where the record lives is the place's name, which the bar holds in place of the record's, so `overline` never repeats it. */
export type RecordHead = ItemHeaderParts;

/** What kind of Pane it is, which its props say: the place's own, titled by the place's name (the tab's label), or a record's, titled by the record's name and pushed after the place's. */
type PaneKindProps =
	| {
			/** The place's Pane takes the place's name as its title, so it gives none. */
			title?: never;
			record?: undefined;
	  }
	| {
			/** The record's name, given as a selection of the record's read: it paints while the record loads. It stands whole, wrapping, as the screen's header in the head at the body's top. */
			title: Datum<Run>;
			/** The record's head: the bar holds the place's name, after a Back act to the page above, and the body opens with the title as the screen's header between the overline and the facts. */
			record: RecordHead;
	  };

interface PaneBase<P extends ProcedureCall> extends Closed {
	/** The kind of record the Pane shows (a short lowercase noun: "project"). Its `read` answering not found fills the page with "Couldn't find this project." and the way back to the page above; without one the sentence is "Couldn't find this." */
	noun?: string;
	/** The sentence the Pane's page says when its read answers not found, in place of the one `noun` words ("No report for that month."); `noun` still names the kind in the bar. A sentence, ending in a full stop. */
	missing?: string;
	/** Icon acts after the title, ordered by weight: the primary act first, which stands at its icon while the rest stand in the bar's more menu, before its own items, at every width; a create act is one of them, and on a record's Pane the record's acts. An act is live whatever the `read` does. One given as a selection paints, inert, while its own read waits or stands still, and stands blocked, the failed sentence its name, once that read failed or is missing. An act's `label` and `blocked` may be selections on their own, which paint it the same way. While the Pane's own `read` failed or is missing the bar draws no action and no more menu. */
	acts?: readonly Offered<IconAct | IconLinkAct>[];
	/** The acts past the acts, in a menu under the more act, named "More", whose sheet is titled by the Pane's title (a record's name), "More" while it waits; the more act paints and stands blocked as an action does. */
	more?: Offered<readonly MenuEntry[]>;
	/** What docks at the Pane's foot over the keyboard, the body scrolling past it: the route gives it, so the Pane decides it from its props. A `Table`'s selection bar is an `ActionBar` with `chosen`, given as the foot only while a row is ticked (the Pane reserves the foot's room, border and inset included, for whatever it is given); a `Thread`'s composer a `Composer`. */
	foot?: ReactNode;
	/** A task over the foot: while it is `open` the sheet docks there in the foot's place, the body scrolling above it, and closing hands focus back to the foot's input. */
	sheet?: SheetProps<P>;
	/** The Pane's sections, a sections gap apart; none stand while the `read` is empty and the Pane declares an `empty`; without one the sections draw their own. */
	children?: ReactNode;
}

/** A page of a `Place`: on the phone one screen. `empty` belongs to the `read` it answers for, so a Pane given one without the other does not type-check. */
export type PaneProps<P extends ProcedureCall = ProcedureCall> = PaneBase<P> &
	PaneKindProps &
	(
		| {
				read?: undefined;
				empty?: never;
		  }
		| {
				/** What the Pane's page holds, read once for the frame: while it waits the loaded tree paints, its failure and a missing record fill the page in place of the body, and an empty selection draws `empty`, which only a Pane that declares one replaces its body with. It holds the reads of `read` that no enclosing frame holds: those draw their failure and say they are busy; the rest only wait and empty. */
				read: Selection<unknown>;
				/** What the page says when the `read` is empty: this stands in place of the body, centred in what the body leaves. */
				empty?: Empty;
		  }
	);

/** A page of a Place, on the phone one screen, of two kinds: the place's own, titled by the place's name, and a record's, pushed after it and titled by the record's name. A bar (on a record's Pane a Back act to the page above and the place's name, on the place's the shell's switcher and its title; one line, truncating, never under two fifths of the bar; then the first action at its icon and the more menu, which holds the other acts before its own items, at every width), a body that scrolls, its children a sections gap apart, and a `foot` that docks under the body over the keyboard, a `sheet` in its place while it is open, and the `empty` of its `read` standing in place of the children. On a record's Pane the acts and more are the record's acts; its `record` puts the name, whole and wrapping as the screen's header, between the overline and the facts of a head at the body's top, and a `read` that answers not found fills the page with the missing form in place of the head, its sentence worded by `noun` and its way back the page above, while an empty one keeps the head over its empty form. The toasts stand over the body, above the foot. */
export function Pane<P extends ProcedureCall = ProcedureCall>({
	title: name,
	record,
	noun,
	missing,
	acts,
	more,
	foot,
	sheet,
	read,
	empty,
	children,
}: PaneProps<P>) {
	const held = useFrame(read);
	// A Pane that declares no `empty` leaves an empty read to its Sections, which
	// draw their own; only a Pane's own `empty` replaces its body.
	const frame =
		held.form === "empty" && empty === undefined
			? { ...held, form: "ready" as const }
			: held;
	// A Pane in a room Place stands its head off the top on the table.
	const far = useContext(DistanceContext);
	// The place's Pane is titled by the place's name; a record's bar holds it.
	const place = useContext(PlaceName);
	const title = name ?? place ?? "";
	// Only a record's Pane has a way back in its bar; a missing read of the
	// place's Pane leads to the page above.
	const toward = useParentRoute();
	// A foot that comes once the Pane is drawn is a block that fades in as it
	// mounts; the docked sheet taking the foot's place fades in as its own.
	const drawn = useDrawn();
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
	// A toast stands over the body's end where no foot docks: the body gives it room.
	const toasted = useToasts().length > 0;
	// A record's head opens the body, in the frame's body: a failed or missing
	// read draws its form and not the head. An empty read is a record with
	// nothing in it: its head stands, and the empty form under it.
	const head = record ? (
		<ItemHeaderBase
			name={title}
			overline={record.overline}
			facts={record.facts}
			image={record.image}
		/>
	) : null;
	const content = record ? (
		<>
			{head}
			{children}
		</>
	) : (
		children
	);
	return (
		<BackRoute.Provider value={toward}>
			<View
				accessibilityState={{ busy: frame.holds && frame.form === "waiting" }}
				className={cn(PANE, far && PAGE_HEAD_ROOM)}
			>
				<PaneHead
					title={record ? (place ?? "") : title}
					heading={!record}
					back={record ? toward : undefined}
					acts={acts}
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
									!footed && toasted && PAGE_BODY_TOAST_ROOM,
									BODY_CONTENT,
								)}
							>
								{frame.form === "empty" ? head : null}
								<FrameBody
									frame={frame}
									fit="page"
									empty={empty}
									noun={noun}
									missing={missing}
								>
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
		</BackRoute.Provider>
	);
}
