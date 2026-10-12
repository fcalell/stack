import type { IconAct, MenuItem, Part } from "@fcalell/ui-core/descriptors";
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
import { EmptyBase, type EmptyProps } from "../../lib/empty";
import {
	BackRoute,
	DistanceContext,
	FootReturn,
	ShellSwitcher,
	useFootRegion,
} from "../../lib/frame";
import { Lifted, Scroll } from "../../lib/hosts";
import { navigate } from "../../lib/navigate";
import { partText } from "../../lib/parts";
import type { Route } from "../../lib/route";
import { useWords } from "../../lib/words";
import { IconButton } from "../icon-button";
import { Menu } from "../menu";
import type { SheetProps } from "../sheet";
import { SheetDocked } from "../sheet/docked";
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
// The body's content fills the scroll, so an empty state alone centres in it
// and a Thread in it takes the free height.
const BODY_CONTENT = "grow";
// The foot stays under the body, which scrolls past it, and centres the
// selection bar's column.
const DOCKED = "shrink-0 items-center";

/** A page of a `Place`: on the phone one screen. */
export interface PaneProps extends Closed {
	/** The page's title, its one header (a short phrase; wraps). On a record's Pane it is the record's name; while the record loads the app passes the generic word for the kind ("Deploy"). */
	title: Part;
	/** The route the Pane returns to: a Back act leads its bar. None leaves the shell's switcher there. */
	back?: Route;
	/** Icon acts after the title, in order; a create act is one of them, and on a record's Pane the record's acts. */
	actions?: IconAct[];
	/** The acts past the actions, in a menu under the more act. */
	more?: MenuItem[];
	/** The field (a `MessageInput`) or the selection bar (an `ActionBar` with `chosen`) docked at the Pane's foot over the keyboard, the body scrolling past it. */
	foot?: ReactNode;
	/** A task over the foot: while it is `open` the sheet docks there in the foot's place, the body scrolling above it, and closing hands focus back to the foot's input. */
	sheet?: SheetProps;
	/** The Pane holds nothing yet: this stands in place of its body, centred in what the body leaves, or at the body's top over its own `children`. */
	empty?: EmptyProps;
	/** Accepted for the web's sake; on the phone every Pane is a screen of the router's stack, so it changes nothing. */
	cover?: boolean;
	/** Accepted for the web's sake; the phone's body is one column at the screen's width, so it changes nothing. */
	wide?: boolean;
	/** The Pane's sections, a sections gap apart; none stand while `empty` is set. */
	children?: ReactNode;
}

/** A page of a Place, on the phone one screen: a bar (the back act where `back` is set, else the shell's switcher; the title wrapping; then the actions and more, which drop whole to a second line when they do not fit), a body that scrolls, its children a sections gap apart, and a `foot` that docks under the body over the keyboard, a `sheet` in its place while it is open, and `empty` standing in place of the children. On a record's Pane the title is the record's name, the actions and more its acts, and the record's place and facts stand in an `ItemHeader` at the body's top. The toasts stand over the body, above the foot. `cover` and `wide` are the web's: on the phone a Pane is always the whole screen and its column the screen's width, so both change nothing. */
export function Pane({
	title,
	back,
	actions,
	more,
	foot,
	sheet,
	empty,
	children,
}: PaneProps) {
	const words = useWords();
	const name = partText(title);
	const far = useContext(DistanceContext);
	const switcher = useContext(ShellSwitcher);
	// The claim a docked sheet leaves the foot for the input that returns.
	const claim = useRef(false);
	const region = useFootRegion(false);
	const docked = sheet?.open ? (
		<SheetDocked {...sheet} region={region.value} />
	) : (
		foot
	);
	const footed = docked !== undefined;
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
							{name}
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
					enabled={footed}
					onLayout={region.onLayout}
					className={BODY}
				>
					<View className={BODY_WRAP}>
						<Scroll
							className={BODY}
							contentContainerClassName={cn(
								PAGE_BODY,
								footed && PAGE_BODY_OVER_FOOT,
								BODY_CONTENT,
							)}
						>
							{empty ? (
								<EmptyBase fit="page" tone="rest" {...empty} />
							) : (
								children
							)}
						</Scroll>
						<ToastRoom />
					</View>
					{docked ? (
						<View className={cn(FOOT_DOCKED, DOCKED)}>
							<FootReturn.Provider value={claim}>{docked}</FootReturn.Provider>
						</View>
					) : null}
				</Lifted>
			</View>
		</BackRoute.Provider>
	);
}
