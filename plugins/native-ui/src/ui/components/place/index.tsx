import type {
	Act,
	IconAct,
	MenuItem,
	Switcher,
} from "@fcalell/ui-core/descriptors";
import {
	FLOATING_ACT,
	FLOATING_ACT_FOOT,
	FLOATING_ACT_LIFT,
	FLOATING_ACT_ROOM,
	FOOT_DOCKED,
	PAGE_BODY,
	PAGE_BODY_OVER_FOOT,
	PAGE_HEAD,
	PAGE_HEAD_ROOM,
	PAGE_TITLE,
	PAGE_TOP_BAR,
	PAGE_TOP_BAR_TOUCH,
	text,
} from "@fcalell/ui-core/variants";
import { type ReactNode, useContext, useRef } from "react";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import {
	ActRoom,
	DetailsOpen,
	FootPlace,
	FootRegion,
	FootReturn,
	PageTitle,
	PlaceRoute,
	RecordShown,
	ShellSwitcher,
	ShellTabs,
	ThreadRoom,
	useFootRegion,
} from "../../lib/frame";
import { Lifted, Scroll } from "../../lib/hosts";
import { navigate } from "../../lib/navigate";
import { RoomScope } from "../../lib/room";
import { useWords } from "../../lib/words";
import { Button } from "../button";
import { IconButton } from "../icon-button";
import { Menu } from "../menu";
import { Picker } from "../picker";
import { SwitcherPick } from "../shell/switcher";
import { useSplitHead } from "../split";
import { holdsThread } from "../thread";
import { ToastRoom } from "../toast/room";

const PLACE = "flex-1";
const TOP_BAR = "flex-row items-center";
const SPACER = "flex-1";
const TITLE = "min-w-0 grow";
// With a context the title and its pick stand on one line a pair apart.
const TITLE_LINE = "flex-row flex-wrap items-center gap-pair";
const TITLE_FIT = "min-w-0 max-w-full";
// Where the line is short the pick yields first: it drops under the title,
// whole, so the title keeps its words.
const CONTEXT = "shrink-0 flex-row";
// The body scrolls under the fixed head; a bleeding body leaves scrolling
// to its child, which keeps the act's room.
const BODY = "flex-1";
const BODY_WRAP = "relative flex-1";
// The body's content fills the scroll, so an EmptyState alone centres in it.
const BODY_CONTENT = "grow";
const ACT_LAYER = "absolute inset-0 items-center justify-end";
// The foot stays under the body, which scrolls past it, and centres the
// selection bar's column.
const DOCKED = "shrink-0 items-center";

// The floating act's room under what scrolls past it, or the toasts that
// stand above it: the act's height over the page inset it floats at.
export function FloatingActRoom() {
	return (
		<View className={FLOATING_ACT_FOOT}>
			<View className={FLOATING_ACT_ROOM} />
		</View>
	);
}

// The act's rooms as module elements, so the room a bleeding body hands its
// regions keeps one identity and no consumer renders again with the Place.
const ACT_ROOM_ELEMENT = <FloatingActRoom />;
const SCROLL_ROOM = <View className={FLOATING_ACT_ROOM} />;
const FOOT_ROOM_ELEMENT = <View className={PAGE_BODY_OVER_FOOT} />;

interface PlaceBase extends Closed {
	title: string;
	context?: Switcher;
	actions?: IconAct[];
	more?: MenuItem[];
	bleed?: boolean;
	children?: ReactNode;
}

// The page's one filled act, or the field or action bar docked at its foot
// whose send or filled act is that act: never both.
type PlaceEnd = { act?: Act; foot?: never } | { foot?: ReactNode; act?: never };

// Where the page is read from: a screen across a room draws the room set,
// which no query detects, so the page states it. It holds no `context`,
// `more` or `foot`, whose layers open outside it.
type PlaceDistance =
	| { distance?: undefined }
	| { distance: "room"; context?: never; more?: never; foot?: never };

export type PlaceProps = PlaceBase & PlaceEnd & PlaceDistance;

// A page in the shell: the top bar (the shell's switcher, the actions, more)
// over the title, its `context` pick (a change set, a version) beside it, the body under it, and the one act floating lifted over
// the body's end, the body keeping room under its last row (a bleeding body's scrolling child
// keeps it) so the act never covers it. With `bleed` the body is the whole box under the title, with no
// side inset and no scroll, for a child that scrolls itself; a Thread standing as
// the body's direct child fills it the same way from its first render, the
// body's scroll kept and stilled so nothing in it remounts. A `foot` docks under the body over the keyboard a sections gap
// under the body's end, the body scrolling past it, and a Thread in such a body stands among its sections. A foot is a
// field (a `MessageInput`) or a selection bar (an `ActionBar` with `chosen`), whose count stands over the full-width act.
// A Split standing as its direct child gets its Details act in its head, and a record the Split shows alone puts a back
// act to the place's route (or to the Split's `back`) in the switcher's stead; while a record stands beside
// the main, the Place draws no head, that record's head the page's one. The
// Shell's tab bar stands under it all, and its toasts over the body.
export function Place({
	title,
	distance,
	context,
	actions,
	act,
	more,
	bleed,
	foot,
	children,
}: PlaceProps) {
	const far = distance === "room";
	const words = useWords();
	const switcher = useContext(ShellSwitcher);
	const route = useContext(PlaceRoute);
	// The claim a docked sheet leaves the foot for the input that returns.
	const claim = useRef(false);
	const region = useFootRegion();
	// What the head shows of the Split in the body, read off its props: a
	// record beside the main stands alone, its head the page's one.
	const split = useSplitHead(children);
	// A Thread standing as the body's child fills it, read off the children:
	// over a docked foot it stands among the sections, the foot the page's one
	// input.
	const fill = foot === undefined && holdsThread(children);
	// The toasts stand over the body, unless a filling Thread (in the body or
	// in its Split's record) stands over its own docked input: its log's region
	// then holds them.
	const toasts =
		fill || split.thread ? null : (
			<ToastRoom>{act ? <FloatingActRoom /> : null}</ToastRoom>
		);
	// A record standing alone returns to the list: the place's own route, or
	// where the Split says its list stands.
	const list = split.back ?? route;
	const lead =
		split.record && list !== undefined ? (
			<IconButton
				icon="ChevronLeft"
				fit="body"
				label={words.back}
				onAct={() => navigate(list)}
			/>
		) : switcher && !far ? (
			<SwitcherPick switcher={switcher} />
		) : null;
	const acts = [...(actions ?? []), ...(split.details ? [split.details] : [])];
	// A top bar with nothing in it is not drawn.
	const bar = lead != null || acts.length > 0 || Boolean(more?.length);
	const room = act ? SCROLL_ROOM : null;
	// A region scrolling inside a bleeding body keeps no page inset under its
	// last row, so its room is the act's height over the page inset, or a
	// sections gap over a docked foot.
	const footRoom = foot !== undefined ? FOOT_ROOM_ELEMENT : null;
	const footprint = act ? ACT_ROOM_ELEMENT : footRoom;
	const tabs = useContext(ShellTabs);
	const page = (
		<DetailsOpen.Provider value={split.held}>
			<RecordShown.Provider value={split.record}>
				<PageTitle.Provider value={title}>
					<View className={PLACE}>
						{split.beside ? null : (
							<View className={cn(PAGE_HEAD, far && PAGE_HEAD_ROOM)}>
								{bar ? (
									<View
										className={cn(PAGE_TOP_BAR, PAGE_TOP_BAR_TOUCH, TOP_BAR)}
									>
										{lead}
										<View className={SPACER} />
										{acts.map((action) => (
											<IconButton key={action.label} {...action} fit="body" />
										))}
										{more?.length ? (
											<Menu label={words.more} items={more} />
										) : null}
									</View>
								) : null}
								{context ? (
									<View className={cn(TITLE_LINE, PAGE_TITLE)}>
										<RNText
											accessibilityRole="header"
											numberOfLines={1}
											className={cn(text({ role: "title" }), TITLE_FIT)}
										>
											{title}
										</RNText>
										<View className={CONTEXT}>
											<Picker {...context} fit="row" />
										</View>
									</View>
								) : (
									<RNText
										accessibilityRole="header"
										className={cn(text({ role: "title" }), TITLE, PAGE_TITLE)}
									>
										{title}
									</RNText>
								)}
							</View>
						)}
						<Lifted
							behavior="padding"
							automaticOffset
							enabled={foot !== undefined}
							onLayout={region.onLayout}
							className={BODY}
						>
							<View className={BODY_WRAP}>
								{bleed ? (
									<View className={BODY}>
										<ActRoom.Provider value={footprint}>
											{children}
										</ActRoom.Provider>
									</View>
								) : (
									// One scroll in every form, so nothing in the body remounts
									// when a Thread arrives: a filling Thread takes its height,
									// with no inset, and scrolls its own log.
									<Scroll
										enabled={!fill}
										scrollEnabled={!fill}
										className={BODY}
										contentContainerClassName={
											fill
												? BODY
												: cn(
														PAGE_BODY,
														foot !== undefined && PAGE_BODY_OVER_FOOT,
														BODY_CONTENT,
													)
										}
									>
										<ThreadRoom.Provider value={fill}>
											{children}
										</ThreadRoom.Provider>
										{room}
									</Scroll>
								)}
								{/* The page's act is its create act by rule, so it carries the plus. */}
								{act ? (
									<View
										pointerEvents="box-none"
										className={cn(FLOATING_ACT, ACT_LAYER)}
									>
										<View className={FLOATING_ACT_LIFT}>
											<Button
												fit="body"
												icon="Plus"
												label={act.label}
												onAct={act.onAct}
												loading={act.loading}
												blocked={act.blocked}
											/>
										</View>
									</View>
								) : null}
								{toasts}
							</View>
							{foot ? (
								<View className={cn(FOOT_DOCKED, DOCKED)}>
									<FootPlace.Provider value="docked">
										<FootRegion.Provider value={region.height}>
											<FootReturn.Provider value={claim}>
												{foot}
											</FootReturn.Provider>
										</FootRegion.Provider>
									</FootPlace.Provider>
								</View>
							) : null}
						</Lifted>
						{tabs}
					</View>
				</PageTitle.Provider>
			</RecordShown.Provider>
		</DetailsOpen.Provider>
	);
	return far ? <RoomScope>{page}</RoomScope> : page;
}
