import type {
	GroupSpec,
	IconName,
	OptionPick,
	PlaceSpec,
} from "@fcalell/ui-core/descriptors";
import { placeAt } from "@fcalell/ui-core/route";
import { tabCount } from "@fcalell/ui-core/tokens";
import {
	type ContentTone,
	type PlaceTabState,
	placeTab,
	placeTabLabel,
	SHELL_BANNER,
	SHELL_COLUMN_PHONE,
	SHELL_TAB_BAR,
} from "@fcalell/ui-core/variants";
import { type ReactNode, useMemo, useState } from "react";
import { Text as RNText, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import {
	PlaceRoute,
	ShellHome,
	ShellSwitcher,
	ShellTabs,
} from "../../lib/frame";
import { Ink } from "../../lib/ink";
import { isRoute, navigate, usePathname } from "../../lib/navigate";
import { Press } from "../../lib/press";
import { useWords } from "../../lib/words";
import { Count } from "../count";
import { Icon } from "../icon";
import { Pane } from "../pane";
import { Section } from "../section";
import { FrameHost } from "./host";
import { Place } from "./place";
import { SwitcherPick } from "./switcher";

const FRAME = "flex-1 overflow-hidden";
const CONTENT = "flex-1";

const TABS = "flex-row";
const TAB = "flex-col-reverse items-center justify-center min-w-0 flex-1";
const TAB_GLYPH = "relative";
const TAB_COUNT = "absolute -top-gap left-full -ms-hairline";
const TAB_LABEL = "max-w-full";
// A tab bar holds five tabs at most: past five places, four and More.
const TAB_ROOM = 5;

// TODO: the tab's glyph ink is `PLACE_TAB`'s ink restated, since ui-core has
// no content-tone reader for it; read it off the cell once ui-core exports one.
const TAB_INK: Record<PlaceTabState, ContentTone> = {
	idle: "ink-meta",
	selected: "ink-body",
};

export interface ShellProps extends Closed {
	places: readonly PlaceSpec[];
	/** The groups the places name, for the ones that carry a switcher: the More page draws a group's switcher over its places. */
	groups?: readonly GroupSpec[];
	banner?: ReactNode;
	switcher?: OptionPick;
	children?: ReactNode;
}

// The frame on the column's ground: the banner under the status bar, the
// content, the toast queue over the page's box (the Pane's body over its docked foot
// and the tab bar), the `confirm()` decisions as a sheet, and
// the tab bar over the home indicator, past five places four and a More tab
// that opens a page of the rest in the content's place. The switcher's
// trigger starts the bar of each Pane that has no back act and the tab bar
// stands under the Place the Shell draws around the screen, the current
// place's route handed down for a
// read that answers not found. The sheets' provider, the toasts and the
// `confirm()` host are `FrameHost`'s.
export function Shell({
	places,
	groups,
	banner,
	switcher,
	children,
}: ShellProps) {
	const insets = useSafeAreaInsets();
	const pathname = usePathname();
	// The More page stands at the route it opened on: going to a place closes it.
	const [moreAt, setMoreAt] = useState<string>();
	const more = moreAt === pathname;
	const route = placeAt(places, pathname);
	const rest = places.length > TAB_ROOM ? places.slice(TAB_ROOM - 1) : [];
	// A place that is a spot on its page (`#activity`) leads nowhere from an
	// address nothing serves, so home is the first place that is a route.
	const first = places.find((spec) => isRoute(spec.route));
	const home = first && { label: first.label, href: first.route };
	// The tab bar each Place draws changes only with the places, the route and
	// the More page, so a Shell state change re-renders no Place.
	const tabs = useMemo(
		() => (
			<TabBar
				places={places}
				route={route}
				more={more}
				onMore={() => setMoreAt(pathname)}
				onPlace={() => setMoreAt(undefined)}
			/>
		),
		[places, route, pathname, more],
	);
	return (
		<FrameHost>
			<View
				style={{ paddingTop: insets.top }}
				className={cn(SHELL_COLUMN_PHONE, FRAME)}
			>
				{banner ? <View className={SHELL_BANNER}>{banner}</View> : null}
				<View className={CONTENT}>
					<ShellHome.Provider value={home}>
						<ShellSwitcher.Provider value={switcher}>
							<ShellTabs.Provider value={tabs}>
								<PlaceRoute.Provider value={route}>
									<Place>
										{more ? (
											<MorePage places={rest} groups={groups} />
										) : (
											children
										)}
									</Place>
								</PlaceRoute.Provider>
							</ShellTabs.Provider>
						</ShellSwitcher.Provider>
					</ShellHome.Provider>
				</View>
			</View>
		</FrameHost>
	);
}

// The places past the tab bar, a page of rows: each place's glyph leading,
// its count trailing, its route where the row goes; a group with a switcher
// among them draws the switcher's row before the rows.
function MorePage({
	places,
	groups,
}: {
	places: readonly PlaceSpec[];
	groups: readonly GroupSpec[] | undefined;
}) {
	const words = useWords();
	const switchers = (groups ?? []).filter(
		(group) =>
			group.switcher && places.some((spec) => spec.group === group.label),
	);
	return (
		<Pane title={words.more}>
			{switchers.map((group) =>
				group.switcher ? (
					<SwitcherPick key={group.label} switcher={group.switcher} />
				) : null,
			)}
			<Section
				items={places.map((spec) => ({
					key: spec.route,
					leading: { icon: spec.icon },
					title: spec.label,
					trailing:
						spec.count === undefined ? undefined : { count: spec.count },
					href: spec.route,
				}))}
			/>
		</Pane>
	);
}

// The places: glyph over label, the count a badge on the glyph's top-right
// corner, its start at the glyph box's edge, on the bar's ground; past five
// places, four and a More tab, selected while its page stands or the current
// place is among the rest.
// A tab holds its label ahead of its glyph and stacks them reversed, and
// takes no label of its own, so it reads the label then the count.
function TabBar({
	places,
	route,
	more,
	onMore,
	onPlace,
}: {
	places: readonly PlaceSpec[];
	route: string | undefined;
	more: boolean;
	onMore: () => void;
	onPlace: () => void;
}) {
	const insets = useSafeAreaInsets();
	const words = useWords();
	const fits = places.length <= TAB_ROOM;
	const shown = fits ? places : places.slice(0, TAB_ROOM - 1);
	const rest = fits ? [] : places.slice(TAB_ROOM - 1);
	return (
		<View
			role="navigation"
			accessibilityLabel={words.places}
			style={{ paddingBottom: insets.bottom }}
			className={cn(SHELL_TAB_BAR, TABS)}
		>
			{shown.map((spec) => (
				<Tab
					key={spec.route}
					icon={spec.icon}
					label={spec.label}
					count={
						spec.count === undefined ? undefined : tabCount(words, spec.count)
					}
					selected={!more && spec.route === route}
					onAct={() => {
						onPlace();
						navigate(spec.route);
					}}
				/>
			))}
			{rest.length > 0 ? (
				<Tab
					icon="Ellipsis"
					label={words.more}
					selected={more || rest.some((spec) => spec.route === route)}
					onAct={onMore}
				/>
			) : null}
		</View>
	);
}

function Tab({
	icon,
	label,
	count,
	selected,
	onAct,
}: {
	icon: IconName;
	label: string;
	count?: string;
	selected: boolean;
	onAct: () => void;
}) {
	const state = selected ? "selected" : "idle";
	return (
		<Press
			accessibilityRole="link"
			accessibilityState={{ selected }}
			onPress={onAct}
			wash="rounded-row bg-wash-press"
			give
			className={cn(placeTab({ state }), TAB)}
		>
			<RNText
				numberOfLines={1}
				className={cn(placeTabLabel({ state }), TAB_LABEL)}
			>
				{label}
			</RNText>
			<View className={TAB_GLYPH}>
				<Ink.Provider value={TAB_INK[state]}>
					<Icon name={icon} fit="control" />
				</Ink.Provider>
				{count === undefined ? null : (
					<View className={TAB_COUNT}>
						<Count value={count} />
					</View>
				)}
			</View>
		</Press>
	);
}
