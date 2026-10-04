import type { Act, IconAct, MenuItem } from "@fcalell/ui-core/descriptors";
import {
	FLOATING_ACT,
	FLOATING_ACT_FOOT,
	FLOATING_ACT_ROOM,
	PAGE_BODY,
	PAGE_HEAD,
	PAGE_TITLE,
	PAGE_TOP_BAR,
	text,
} from "@fcalell/ui-core/variants";
import { type ReactNode, useContext, useEffect, useState } from "react";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import {
	ActFloats,
	ActRoom,
	LendAct,
	PageTitle,
	PlaceRoute,
	RecordAlone,
	RecordShown,
	ShellSwitcher,
	ThreadFills,
} from "../../lib/frame";
import { Scroll } from "../../lib/hosts";
import { navigate } from "../../lib/navigate";
import { useWords } from "../../lib/words";
import { Button } from "../button";
import { IconButton } from "../icon-button";
import { Menu } from "../menu";

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

// The floating act's room under what scrolls past it, or the toasts that
// stand above it: the act's height over the page inset it floats at.
export function FloatingActRoom() {
	return (
		<View className={FLOATING_ACT_FOOT}>
			<View className={FLOATING_ACT_ROOM} />
		</View>
	);
}

export interface PlaceProps extends Closed {
	title: string;
	actions?: IconAct[];
	act?: Act;
	more?: MenuItem[];
	bleed?: boolean;
	children?: ReactNode;
}

// A page in the shell: the top bar (the shell's switcher, the actions, more)
// over the title, the body under it, and the one act floating over the
// body's end, the body keeping room under its last row (a bleeding body's scrolling child
// keeps it) so the act never covers it. With `bleed` the body is the whole box under the title, with no
// side inset and no scroll, for a child that scrolls itself; a Thread in the
// body fills it the same way (its first frame remounts it out of the
// scroll). A Split inside lends it its Details act, and a record the Split shows alone puts a back
// act to the place's route in the switcher's stead.
export function Place({
	title,
	actions,
	act,
	more,
	bleed,
	children,
}: PlaceProps) {
	const words = useWords();
	const switcher = useContext(ShellSwitcher);
	const route = useContext(PlaceRoute);
	const [lent, lend] = useState<IconAct>();
	const [alone, standAlone] = useState(false);
	const [fills, setFills] = useState(false);
	// A record standing alone returns to the list, the place's own route.
	const lead =
		alone && route !== undefined ? (
			<IconButton
				icon="ChevronLeft"
				fit="body"
				label={words.back}
				onAct={() => navigate(route)}
			/>
		) : (
			switcher
		);
	const acts = [...(actions ?? []), ...(lent ? [lent] : [])];
	// A top bar with nothing in it is not drawn.
	const bar = lead != null || acts.length > 0 || Boolean(more?.length);
	const room = act ? <View className={FLOATING_ACT_ROOM} /> : null;
	// A region scrolling inside a bleeding body keeps no page inset under its
	// last row, so its room is the act's height over the page inset.
	const footprint = act ? <FloatingActRoom /> : null;
	const floats = useContext(ActFloats);
	const floating = act !== undefined;
	useEffect(() => {
		if (!floating || !floats) return;
		floats(true);
		return () => floats(false);
	}, [floating, floats]);
	return (
		<LendAct.Provider value={lend}>
			<RecordAlone.Provider value={standAlone}>
				<RecordShown.Provider value={alone}>
					<PageTitle.Provider value={title}>
						<View className={PLACE}>
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
							<View className={BODY_WRAP}>
								{bleed ? (
									<View className={BODY}>
										<ActRoom.Provider value={footprint}>
											{children}
										</ActRoom.Provider>
									</View>
								) : fills ? (
									// A Thread in the body fills it, as a bleeding body's child
									// does: no inset, its log scrolling.
									<View className={BODY}>
										<ThreadFills.Provider value={setFills}>
											{children}
										</ThreadFills.Provider>
										{room}
									</View>
								) : (
									<Scroll
										className={BODY}
										contentContainerClassName={cn(PAGE_BODY, BODY_CONTENT)}
									>
										<ThreadFills.Provider value={setFills}>
											{children}
										</ThreadFills.Provider>
										{room}
									</Scroll>
								)}
								{/* The page's act is its create act by rule, so it carries the plus. */}
								{act ? (
									<View
										pointerEvents="box-none"
										className={cn(FLOATING_ACT, ACT_LAYER)}
									>
										<Button
											fit="body"
											icon="Plus"
											label={act.label}
											onAct={act.onAct}
											loading={act.loading}
											blocked={act.blocked}
										/>
									</View>
								) : null}
							</View>
						</View>
					</PageTitle.Provider>
				</RecordShown.Provider>
			</RecordAlone.Provider>
		</LendAct.Provider>
	);
}
