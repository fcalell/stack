import type {
	IconName,
	Option,
	OptionGroup,
	PlaceSpec,
	Switcher,
} from "@fcalell/ui-core/descriptors";
import {
	type ContentTone,
	type PlaceTabState,
	placeTab,
	placeTabLabel,
	SHELL_BANNER,
	SHELL_COLUMN,
	SHELL_TAB_BAR,
	SWITCHER,
	TOASTS,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { type ReactNode, useState } from "react";
import {
	type LayoutRectangle,
	Pressable,
	Text as RNText,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import {
	ActFloats,
	CoverTabs,
	FootDocks,
	PlaceRoute,
	ShellSwitcher,
} from "../../lib/frame";
import { Ink } from "../../lib/ink";
import { isCurrent, navigate, usePathname } from "../../lib/navigate";
import { useWords } from "../../lib/words";
import { Avatar } from "../avatar";
import { Count } from "../count";
import { Icon } from "../icon";
import { List } from "../list";
import { ListRow } from "../list-row";
import { PickSheet } from "../picker/sheet";
import { FloatingActRoom, Place } from "../place";
import { Confirmations } from "../sheet/confirm";
import { ToastList } from "../toast/layer";

const FILL = "flex-1";
const FRAME = "flex-1 overflow-hidden";
const CONTENT = "flex-1";
// The measured content frame's `top` and `bottom` style override the class's
// edges.
const TOAST_LAYER = "absolute inset-0 items-center justify-end";

const TRIGGER = "flex-row items-center min-w-0";
const NAME = "shrink";
const GLYPH = "shrink-0";

const TABS = "flex-row";
const TAB = "flex-col-reverse items-center justify-center min-w-0 flex-1";
const TAB_GLYPH = "relative";
const TAB_COUNT = "absolute top-0 left-full";
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
	banner?: ReactNode;
	switcher?: Switcher;
	children?: ReactNode;
}

// The frame on the column's ground: the banner under the status bar, the
// content, the toast queue over the content's foot (above a Place's act while
// it floats, a Thread's input while it docks), the `confirm()` decisions as
// a sheet, and the tab bar over the home indicator, past five places four and
// a More tab that opens a page of the rest in the content's place. The
// switcher's trigger starts each Place's top bar, the current place's route
// handed down for a Place's back act; a pushed Screen covers the tab bar, and
// the frame then clears the home indicator itself.
// The column holds its own sheets' provider, the nearest one every sheet
// inside resolves, which draws the sheets after the column; the toasts' layer
// stands after the provider's host view, so over every sheet, since React
// Native's `zIndex` orders siblings only. The host view is never flattened: a
// sheet's layer is `accessibilityViewIsModal`, which hides its siblings from
// VoiceOver, and the toasts' layer is not among them.
export function Shell({ places, banner, switcher, children }: ShellProps) {
	const insets = useSafeAreaInsets();
	const [covered, cover] = useState(false);
	const [lifted, lift] = useState(false);
	const [footing, dock] = useState(0);
	const [height, setHeight] = useState<number>();
	const [frame, setFrame] = useState<LayoutRectangle>();
	const pathname = usePathname();
	// The More page stands at the route it opened on: going to a place closes it.
	const [moreAt, setMoreAt] = useState<string>();
	const more = moreAt === pathname;
	const route = places.find((spec) => isCurrent(spec.route, pathname))?.route;
	const rest = places.length > TAB_ROOM ? places.slice(TAB_ROOM - 1) : [];
	// The toasts stand in the content's frame, its edges measured in the column.
	const toasts =
		frame && height !== undefined
			? { top: frame.y, bottom: height - frame.y - frame.height }
			: undefined;
	return (
		<View className={FILL}>
			<View collapsable={false} className={FILL}>
				<BottomSheetModalProvider>
					<View
						onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
						style={{
							paddingTop: insets.top,
							paddingBottom: covered ? insets.bottom : 0,
						}}
						className={cn(SHELL_COLUMN, FRAME)}
					>
						{banner ? <View className={SHELL_BANNER}>{banner}</View> : null}
						<View
							onLayout={(event) => setFrame(event.nativeEvent.layout)}
							className={CONTENT}
						>
							<ShellSwitcher.Provider
								value={switcher ? <SwitcherPick switcher={switcher} /> : null}
							>
								<PlaceRoute.Provider value={route}>
									<CoverTabs.Provider value={cover}>
										<ActFloats.Provider value={lift}>
											<FootDocks.Provider value={dock}>
												{more ? <MorePage places={rest} /> : children}
											</FootDocks.Provider>
										</ActFloats.Provider>
									</CoverTabs.Provider>
								</PlaceRoute.Provider>
							</ShellSwitcher.Provider>
						</View>
						{covered ? null : (
							<TabBar
								places={places}
								pathname={pathname}
								more={more}
								onMore={() => setMoreAt(pathname)}
								onPlace={() => setMoreAt(undefined)}
							/>
						)}
						<Confirmations />
					</View>
				</BottomSheetModalProvider>
			</View>
			{toasts ? (
				<View
					pointerEvents="box-none"
					style={toasts}
					className={cn(TOASTS, TOAST_LAYER)}
				>
					<ToastList />
					{lifted ? <FloatingActRoom /> : null}
					{/* The docked foot's room is its measured height: it grows with the input. */}
					{footing > 0 ? <View style={{ height: footing }} /> : null}
				</View>
			) : null}
		</View>
	);
}

function flatten(options: Switcher["options"]): readonly Option[] {
	const entries: readonly (Option | OptionGroup)[] = options;
	return entries.flatMap((entry) =>
		"options" in entry ? entry.options : [entry],
	);
}

// The switcher is a pick: its trigger in a Place's top bar, and the pick's
// sheet (the options with their avatars under the switcher's label, the
// current one ticked, the act that makes a new one under a hairline).
function SwitcherPick({ switcher }: { switcher: Switcher }) {
	const [open, setOpen] = useState(false);
	const current = flatten(switcher.options).find(
		(option) => option.value === switcher.value,
	);
	const name = current?.label ?? switcher.label;
	return (
		<>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={switcher.label}
				accessibilityValue={{ text: name }}
				accessibilityState={{ expanded: open }}
				onPress={() => setOpen(true)}
				className={cn(SWITCHER, TRIGGER)}
			>
				<Avatar name={name} src={current?.avatar?.src} />
				<RNText
					numberOfLines={1}
					className={cn(
						text({ role: "body" }),
						textStrong({ role: "body" }),
						NAME,
					)}
				>
					{name}
				</RNText>
				<View className={GLYPH}>
					<Ink.Provider value="ink-meta">
						<Icon name="ChevronsUpDown" />
					</Ink.Provider>
				</View>
			</Pressable>
			<PickSheet
				title={switcher.label}
				options={switcher.options}
				value={switcher.value}
				onChange={switcher.onChange}
				act={switcher.act}
				open={open}
				onClose={() => setOpen(false)}
			/>
		</>
	);
}

// The places past the tab bar, a page of rows: each place's glyph leading,
// its count trailing, its route where the row goes.
function MorePage({ places }: { places: readonly PlaceSpec[] }) {
	const words = useWords();
	return (
		<Place title={words.more}>
			<List>
				{places.map((spec) => (
					<ListRow
						key={spec.route}
						leading={{ icon: spec.icon }}
						title={spec.label}
						trailing={
							spec.count === undefined ? undefined : { count: spec.count }
						}
						href={spec.route}
					/>
				))}
			</List>
		</Place>
	);
}

// The places: glyph over label, the count over the glyph's end; past five
// places, four and a More tab, selected while its page stands or the current
// place is among the rest.
// A tab holds its label ahead of its glyph and stacks them reversed, and
// takes no label of its own, so it reads the label then the count.
function TabBar({
	places,
	pathname,
	more,
	onMore,
	onPlace,
}: {
	places: readonly PlaceSpec[];
	pathname: string;
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
					count={spec.count}
					selected={!more && isCurrent(spec.route, pathname)}
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
					selected={
						more || rest.some((spec) => isCurrent(spec.route, pathname))
					}
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
	count?: number;
	selected: boolean;
	onAct: () => void;
}) {
	const state = selected ? "selected" : "idle";
	return (
		<Pressable
			accessibilityRole="link"
			accessibilityState={{ selected }}
			onPress={onAct}
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
		</Pressable>
	);
}
