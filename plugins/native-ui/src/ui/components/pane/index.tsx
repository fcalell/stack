import type { IconAct, MenuItem } from "@fcalell/ui-core/descriptors";
import {
	FOOT_DOCKED,
	PAGE_BODY,
	PAGE_BODY_OVER_FOOT,
	PAGE_HEAD,
	PAGE_HEAD_ROOM,
	PAGE_TITLE_BLOCK,
	PAGE_TITLE_FLOOR,
	PAGE_TOP_BAR,
	PAGE_TOP_BAR_END,
	PAGE_TOP_BAR_START,
	text,
} from "@fcalell/ui-core/variants";
import { type ReactNode, useContext, useRef } from "react";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import {
	BackRoute,
	DistanceContext,
	FootPlace,
	FootRegion,
	FootReturn,
	PageTitle,
	ShellSwitcher,
	useFootRegion,
} from "../../lib/frame";
import { Lifted, Scroll } from "../../lib/hosts";
import { navigate } from "../../lib/navigate";
import type { Route } from "../../lib/route";
import { useWords } from "../../lib/words";
import { IconButton } from "../icon-button";
import { Menu } from "../menu";
import { SwitcherPick } from "../shell/switcher";
import { ToastRoom } from "../toast/room";

const PANE = "flex-1";
// The bar is the title's row: it wraps, so acts that do not fit beside the back
// act, the title's floor and the gaps drop whole to a second line.
const TOP_BAR = "relative flex-row flex-wrap items-start";
const ACTS = "shrink-0 flex-row items-center gap-acts ms-auto";
const TITLE = "min-w-0 grow";
// The body scrolls under the fixed bar, and the foot docks under it.
const BODY = "flex-1";
const BODY_WRAP = "relative flex-1";
// The body's content fills the scroll, so an EmptyState alone centres in it
// and a Thread in it takes the free height.
const BODY_CONTENT = "grow";
// The foot stays under the body, which scrolls past it, and centres the
// selection bar's column.
const DOCKED = "shrink-0 items-center";

/** A page of a `Place`: on the phone one screen. */
export interface PaneProps extends Closed {
	/** The page's title, its one header (a short phrase; wraps). */
	title: string;
	/** The route the Pane returns to: a Back act leads its bar. None leaves the shell's switcher there. */
	back?: Route;
	/** Icon acts after the title, in order; a create act is one of them. */
	actions?: IconAct[];
	/** The acts past the actions, in a menu under the more act. */
	more?: MenuItem[];
	/** The field (a `MessageInput`) or the selection bar (an `ActionBar` with `chosen`) docked at the Pane's foot over the keyboard, the body scrolling past it. */
	foot?: ReactNode;
	/** Accepted for the web's sake; on the phone every Pane is a screen of the router's stack, so it changes nothing. */
	cover?: boolean;
	/** Accepted for the web's sake; the phone's body is one column at the screen's width, so it changes nothing. */
	wide?: boolean;
	/** The Pane's sections, a sections gap apart. */
	children?: ReactNode;
}

/** A page of a Place, on the phone one screen: a bar (the back act where `back` is set, else the shell's switcher; the title wrapping; then the actions and more, which drop whole to a second line when they do not fit), a body that scrolls, its children a sections gap apart, and a `foot` that docks under the body over the keyboard. The toasts stand over the body, above the foot. `cover` and `wide` are the web's: on the phone a Pane is always the whole screen and its column the screen's width, so both change nothing. */
export function Pane({
	title,
	back,
	actions,
	more,
	foot,
	children,
}: PaneProps) {
	const words = useWords();
	const far = useContext(DistanceContext);
	const switcher = useContext(ShellSwitcher);
	// The claim a docked sheet leaves the foot for the input that returns.
	const claim = useRef(false);
	const region = useFootRegion(false);
	const lead =
		back !== undefined ? (
			<IconButton
				icon="ChevronLeft"
				fit="body"
				label={words.back}
				onAct={() => navigate(back)}
			/>
		) : switcher && !far ? (
			<SwitcherPick switcher={switcher} />
		) : null;
	return (
		<BackRoute.Provider value={back}>
			<PageTitle.Provider value={title}>
				<View className={PANE}>
					<View className={cn(PAGE_HEAD, far && PAGE_HEAD_ROOM)}>
						<View className={cn(PAGE_TOP_BAR, TOP_BAR)}>
							{lead ? <View className={PAGE_TOP_BAR_START}>{lead}</View> : null}
							<RNText
								accessibilityRole="header"
								className={cn(
									text({ role: "title" }),
									TITLE,
									PAGE_TITLE_FLOOR,
									PAGE_TITLE_BLOCK,
								)}
							>
								{title}
							</RNText>
							<View className={cn(ACTS, PAGE_TOP_BAR_END)}>
								{(actions ?? []).map((action) => (
									<IconButton key={action.label} {...action} fit="body" />
								))}
								{more?.length ? <Menu label={words.more} items={more} /> : null}
							</View>
						</View>
					</View>
					<Lifted
						behavior="padding"
						automaticOffset
						enabled={foot !== undefined}
						onLayout={region.onLayout}
						className={BODY}
					>
						<View className={BODY_WRAP}>
							<Scroll
								className={BODY}
								contentContainerClassName={cn(
									PAGE_BODY,
									foot !== undefined && PAGE_BODY_OVER_FOOT,
									BODY_CONTENT,
								)}
							>
								{children}
							</Scroll>
							<ToastRoom />
						</View>
						{foot ? (
							<View className={cn(FOOT_DOCKED, DOCKED)}>
								<FootPlace.Provider value="docked">
									<FootRegion.Provider value={region.value}>
										<FootReturn.Provider value={claim}>
											{foot}
										</FootReturn.Provider>
									</FootRegion.Provider>
								</FootPlace.Provider>
							</View>
						) : null}
					</Lifted>
				</View>
			</PageTitle.Provider>
		</BackRoute.Provider>
	);
}
