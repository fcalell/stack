import type { IconAct, MenuItem } from "@fcalell/ui-core/descriptors";
import {
	PAGE_BODY,
	PAGE_HEAD,
	PAGE_TITLE,
	PAGE_TOP_BAR,
	PAGE_TOP_BAR_TOUCH,
	text,
} from "@fcalell/ui-core/variants";
import { type ReactNode, useContext } from "react";
import { Text as RNText, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import {
	ActRoom,
	BackRoute,
	Beside,
	DetailsOpen,
	PageTitle,
} from "../../lib/frame";
import { Scroll } from "../../lib/hosts";
import { navigate } from "../../lib/navigate";
import type { Route } from "../../lib/route";
import { useWords } from "../../lib/words";
import { IconButton } from "../icon-button";
import { headPaired } from "../item-header/pair";
import { Menu } from "../menu";
import { useSplitHead } from "../split";
import { ToastRoom } from "../toast/room";

const SCREEN = "flex-1";
const TOP_BAR = "relative flex-row items-center";
const SPACER = "flex-1";
const TITLE = "min-w-0 grow";
const BODY = "flex-1";
const BODY_WRAP = "relative flex-1";
// The body's content fills the scroll, so an EmptyState alone centres in it.
const BODY_CONTENT = "grow";

export interface ScreenProps extends Closed {
	/** The page's title, its one header (a short phrase; wraps). */
	title: string;
	back?: Route;
	actions?: IconAct[];
	more?: MenuItem[];
	children?: ReactNode;
}

// A page pushed over a place: the top bar (back, the actions, more) over the
// title, the body scrolling under it, no filled act; it draws no tab bar, so
// it covers the Shell's from its first frame, and clears the home indicator
// itself, the toasts standing over its body. A Split standing as its direct
// child gets its Details act in its head. As a Split's `beside` record it stands in the main's stead in
// the Place, which keeps the tab bar and the toasts' box; it keeps the
// floating act's room under its body, and, its head the page's one, draws the
// Details act of the Split's pane while it is open.
export function Screen({ title, back, actions, more, children }: ScreenProps) {
	const words = useWords();
	const frame = useContext(Beside);
	const beside = frame !== null;
	// Beside, it stands in the main's stead in a bleeding Place, so its body
	// keeps the room of the act floating over it, as the main does.
	const room = useContext(ActRoom);
	const split = useSplitHead(children);
	// A record the Split shows alone returns to the list: where the Split says
	// it stands, else the screen's own `back`.
	const exit = split.record ? (split.back ?? back) : back;
	const insets = useSafeAreaInsets();
	const acts = [
		...(actions ?? []),
		...(split.details ? [split.details] : []),
		...(frame?.details ? [frame.details] : []),
	];
	// A top bar with nothing in it is not drawn.
	const bar = exit !== undefined || acts.length > 0 || Boolean(more?.length);
	return (
		<DetailsOpen.Provider value={split.held}>
			<PageTitle.Provider value={title}>
				<View
					style={beside ? undefined : { paddingBottom: insets.bottom }}
					className={SCREEN}
				>
					<View className={PAGE_HEAD}>
						{bar ? (
							<View className={cn(PAGE_TOP_BAR, PAGE_TOP_BAR_TOUCH, TOP_BAR)}>
								{exit === undefined ? null : (
									<IconButton
										icon="ChevronLeft"
										fit="body"
										label={words.back}
										onAct={() => navigate(exit)}
									/>
								)}
								<View className={SPACER} />
								{acts.map((action) => (
									<IconButton key={action.label} {...action} fit="body" />
								))}
								{more?.length ? <Menu label={words.more} items={more} /> : null}
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
						<Scroll
							className={BODY}
							contentContainerClassName={cn(PAGE_BODY, BODY_CONTENT)}
						>
							<BackRoute.Provider value={back}>
								{headPaired(children)}
							</BackRoute.Provider>
							{beside ? room : null}
						</Scroll>
						{beside ? null : <ToastRoom />}
					</View>
				</View>
			</PageTitle.Provider>
		</DetailsOpen.Provider>
	);
}
