import {
	type Datum,
	FrameHolds,
	type Selection,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import type { IconAct, MenuItem, Part } from "@fcalell/ui-core/descriptors";
import {
	FOOT_DOCKED,
	PAGE_BODY,
	PAGE_BODY_OVER_FOOT,
	PAGE_HEAD,
	PAGE_HEAD_ROOM,
	PAGE_HEAD_TOUCH,
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
import { inertProps, Painted } from "../../lib/paint";
import { partText } from "../../lib/parts";
import { BusyMark, FrameBody, FrameLine, useFrame } from "../../lib/read";
import type { Route } from "../../lib/route";
import { useWords } from "../../lib/words";
import { IconButton } from "../icon-button";
import { IconButtonBase } from "../icon-button/base";
import { MenuBase } from "../menu/base";
import type { SheetProps } from "../sheet";
import { SheetDocked } from "../sheet/docked";
import { SwitcherPick } from "../shell/switcher";
import { ToastRoom } from "../toast/room";

const PANE = "flex-1";
// The bar is the title's row: it wraps, so acts that do not fit beside the back
// act, the title's floor and the gaps drop whole to a second line.
const TOP_BAR = "relative flex-row flex-wrap items-start";
const ACTS = "shrink-0 flex-row items-center gap-acts ms-auto";
// The title is a row: its text shrinks and wraps, the busy mark after it.
const TITLE = "min-w-0 grow flex-row items-center gap-inside";
const NAME = "shrink";
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
	/** The page's title, its one header (a short phrase; wraps). On a record's Pane it is the record's name, given as a selection of the record's read: it paints while the record loads. */
	title: Datum<Part>;
	/** The route the Pane returns to: a Back act leads its bar. None leaves the shell's switcher there. */
	back?: Route;
	/** Icon acts after the title, in order; a create act is one of them, and on a record's Pane the record's acts. An act paints, inert, while the `read` has no data (waits, stands still, failed or missing) or its own selection waits. */
	actions?: readonly Datum<IconAct>[];
	/** The acts past the actions, in a menu under the more act; the more act paints, inert, as an action does. */
	more?: Datum<readonly MenuItem[]>;
	/** The field (a `MessageInput`) or the selection bar (an `ActionBar` with `chosen`) docked at the Pane's foot over the keyboard, the body scrolling past it. */
	foot?: ReactNode;
	/** A task over the foot: while it is `open` the sheet docks there in the foot's place, the body scrolling above it, and closing hands focus back to the foot's input. */
	sheet?: SheetProps;
	/** What the Pane's page holds, read once for the frame: while it waits the loaded tree paints, its failure and a missing record fill the page in place of the body, and an empty selection draws `empty`. It holds the reads of `read` that no enclosing frame holds: those draw their failure and say they are busy; the rest only wait and empty. */
	read?: Selection<unknown>;
	/** The Pane holds nothing yet: this stands in place of its body, centred in what the body leaves, or at the body's top over its own `children`. With a `read` it stands only when the selection is empty. */
	empty?: EmptyProps;
	/** What the page says when the `read` fails, in place of the generic sentence (a sentence; wraps). */
	failed?: string;
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
	read,
	empty,
	failed,
	children,
}: PaneProps) {
	const words = useWords();
	const frame = useFrame(read, true);
	const [name, overflowAt, ...actionAt] = useSelections([
		title,
		more,
		...(actions ?? []),
	]);
	const far = useContext(DistanceContext);
	const switcher = useContext(ShellSwitcher);
	// The claim a docked sheet leaves the foot for the input that returns.
	const claim = useRef(false);
	const region = useFootRegion(false);
	// A failed or missing page is the whole page: the foot and the docked sheet
	// are not drawn, and return with the data.
	const ended = frame.form === "failed" || frame.form === "missing";
	const docked = ended ? null : sheet?.open ? (
		<SheetDocked {...sheet} region={region.value} />
	) : (
		foot
	);
	const footed = docked != null;
	const lead =
		back !== undefined ? (
			<IconButton
				icon="ChevronLeft"
				fit="body"
				label={words.back}
				onAct={() => navigate(back)}
			/>
		) : switcher ? (
			<SwitcherPick switcher={switcher} />
		) : null;
	// An act is painted, inert, while the read waits or its own datum does; a
	// selection's shape is unknown until it lands, so its paint is a bare glyph.
	const acts = actionAt.map((one, at) =>
		one.painted || frame.inert ? (
			<IconButtonBase
				// biome-ignore lint/suspicious/noArrayIndexKey: a painted act has no name, and the acts stand in a fixed order
				key={at}
				icon={one.painted ? "Ellipsis" : one.value.icon}
				fit="body"
				label={one.painted ? "" : one.value.label}
				onAct={() => {}}
				painted
			/>
		) : (
			<IconButton key={one.value.label} {...one.value} fit="body" />
		),
	);
	const items = overflowAt.painted ? [] : (overflowAt.value ?? []);
	return (
		<BackRoute.Provider value={back}>
			<View
				accessibilityState={{ busy: frame.holds && frame.form === "waiting" }}
				className={PANE}
			>
				<View className={cn(PAGE_HEAD, PAGE_HEAD_TOUCH, far && PAGE_HEAD_ROOM)}>
					<View className={cn(PAGE_TOP_BAR, TOP_BAR)}>
						{lead ? <View className={PAGE_TOP_BAR_START}>{lead}</View> : null}
						<View className={cn(TITLE, PAGE_TITLE_FLOOR, PAGE_TITLE_BLOCK)}>
							<RNText
								accessibilityRole="header"
								{...inertProps(name.painted)}
								className={cn(text({ role: "title" }), NAME)}
							>
								{name.painted ? <Painted role="title" /> : partText(name.value)}
							</RNText>
							<BusyMark frame={frame} />
						</View>
						<View className={cn(ACTS, PAGE_TOP_BAR_END)}>
							{acts}
							{overflowAt.painted || items.length ? (
								<MenuBase
									label={words.more}
									title={words.more}
									items={items}
									painted={overflowAt.painted || frame.inert}
								/>
							) : null}
						</View>
					</View>
					<FrameLine frame={frame} />
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
							{read === undefined && empty ? (
								<EmptyBase fit="page" tone="rest" {...empty} />
							) : (
								<FrameBody
									frame={frame}
									fit="page"
									empty={empty}
									failed={failed}
								>
									{children}
								</FrameBody>
							)}
						</Scroll>
						<ToastRoom />
					</View>
					{docked ? (
						<View
							{...inertProps(frame.inert)}
							className={cn(FOOT_DOCKED, DOCKED)}
						>
							<FrameHolds holds={frame.held}>
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
