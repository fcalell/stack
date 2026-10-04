import type { Act, IconAct, MenuItem } from "@fcalell/ui-core/descriptors";
import {
	FLOATING_ACT,
	FLOATING_ACT_FOOT,
	FLOATING_ACT_LIFT,
	FLOATING_ACT_ROOM,
	FOOT,
	PAGE_BODY,
	PAGE_BODY_OVER_FOOT,
	PAGE_HEAD,
	PAGE_TITLE,
	PAGE_TOP_BAR,
	text,
} from "@fcalell/ui-core/variants";
import { type ReactNode, useContext } from "react";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import {
	ActRoom,
	DetailsOpen,
	PageTitle,
	PlaceRoute,
	RecordShown,
	ShellSwitcher,
	ShellTabs,
	ThreadRoom,
	useToastBox,
} from "../../lib/frame";
import { Lifted, Scroll } from "../../lib/hosts";
import { navigate } from "../../lib/navigate";
import { useWords } from "../../lib/words";
import { Button } from "../button";
import { IconButton } from "../icon-button";
import { Menu } from "../menu";
import { useSplitHead } from "../split";
import { holdsThread } from "../thread";

const PLACE = "flex-1";
const TOP_BAR = "flex-row items-center";
const SPACER = "flex-1";
const TITLE = "min-w-0 grow";
// The body scrolls under the fixed head; a bleeding body leaves scrolling
// to its child, which keeps the act's room.
const BODY = "flex-1";
const BODY_WRAP = "relative flex-1";
// The body's content fills the scroll, so an EmptyState alone centres in it.
const BODY_CONTENT = "grow";
const ACT_LAYER = "absolute inset-0 items-center justify-end";
const TOAST_ROOM = "absolute inset-0";
const FILL = "flex-1";
// The foot stays under the body, which scrolls past it.
const DOCKED = "shrink-0";

// The floating act's room under what scrolls past it, or the toasts that
// stand above it: the act's height over the page inset it floats at.
export function FloatingActRoom() {
	return (
		<View className={FLOATING_ACT_FOOT}>
			<View className={FLOATING_ACT_ROOM} />
		</View>
	);
}

// The box the Shell's toasts stand in, over the body: above the room of a
// floating act, and by the page's layout above a docked foot and the tab bar.
export function ToastRoom({ act }: { act: boolean }) {
	const box = useToastBox();
	return (
		<View pointerEvents="none" className={TOAST_ROOM}>
			<View ref={box.ref} onLayout={box.onLayout} className={FILL} />
			{act ? <FloatingActRoom /> : null}
		</View>
	);
}

interface PlaceBase extends Closed {
	title: string;
	actions?: IconAct[];
	more?: MenuItem[];
	bleed?: boolean;
	children?: ReactNode;
}

// The page's one filled act, or the field docked at its foot whose send is
// that act: never both.
type PlaceEnd = { act?: Act; foot?: never } | { foot?: ReactNode; act?: never };

export type PlaceProps = PlaceBase & PlaceEnd;

// A page in the shell: the top bar (the shell's switcher, the actions, more)
// over the title, the body under it, and the one act floating lifted over
// the body's end, the body keeping room under its last row (a bleeding body's scrolling child
// keeps it) so the act never covers it. With `bleed` the body is the whole box under the title, with no
// side inset and no scroll, for a child that scrolls itself; a Thread standing as
// the body's direct child fills it the same way from its first render, the
// body's scroll kept and stilled so nothing in it remounts. A `foot` docks under the body over the keyboard a sections gap
// under the body's end, the body scrolling past it, and a Thread in such a body stands among its sections.
// A Split standing as its direct child gets its Details act in its head, and a record the Split shows alone puts a back
// act to the place's route in the switcher's stead; while a record stands beside
// the main, the Place draws no head, that record's head the page's one. The
// Shell's tab bar stands under it all, and its toasts over the body.
export function Place({
	title,
	actions,
	act,
	more,
	bleed,
	foot,
	children,
}: PlaceProps) {
	const words = useWords();
	const switcher = useContext(ShellSwitcher);
	const route = useContext(PlaceRoute);
	// What the head shows of the Split in the body, read off its props: a
	// record beside the main stands alone, its head the page's one.
	const split = useSplitHead(children);
	// A Thread standing as the body's child fills it, read off the children:
	// over a docked foot it stands among the sections, the foot the page's one
	// input.
	const fill = foot === undefined && holdsThread(children);
	// A record standing alone returns to the list, the place's own route.
	const lead =
		split.record && route !== undefined ? (
			<IconButton
				icon="ChevronLeft"
				fit="body"
				label={words.back}
				onAct={() => navigate(route)}
			/>
		) : (
			switcher
		);
	const acts = [...(actions ?? []), ...(split.details ? [split.details] : [])];
	// A top bar with nothing in it is not drawn.
	const bar = lead != null || acts.length > 0 || Boolean(more?.length);
	const room = act ? <View className={FLOATING_ACT_ROOM} /> : null;
	// A region scrolling inside a bleeding body keeps no page inset under its
	// last row, so its room is the act's height over the page inset.
	const footprint = act ? <FloatingActRoom /> : null;
	const tabs = useContext(ShellTabs);
	return (
		<DetailsOpen.Provider value={split.held}>
			<RecordShown.Provider value={split.record}>
				<PageTitle.Provider value={title}>
					<View className={PLACE}>
						{split.beside ? null : (
							<View className={PAGE_HEAD}>
								{bar ? (
									<View className={cn(PAGE_TOP_BAR, TOP_BAR)}>
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
								<RNText
									accessibilityRole="header"
									className={cn(text({ role: "title" }), TITLE, PAGE_TITLE)}
								>
									{title}
								</RNText>
							</View>
						)}
						<Lifted
							behavior="padding"
							automaticOffset
							enabled={foot !== undefined}
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
								<ToastRoom act={act !== undefined} />
							</View>
							{foot ? <View className={cn(FOOT, DOCKED)}>{foot}</View> : null}
						</Lifted>
						{tabs}
					</View>
				</PageTitle.Provider>
			</RecordShown.Provider>
		</DetailsOpen.Provider>
	);
}
