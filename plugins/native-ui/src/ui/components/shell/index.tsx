import type {
	IconName,
	PlaceSpec,
	Switcher,
} from "@fcalell/ui-core/descriptors";
import {
	type ContentTone,
	HAIRLINE,
	type PlaceTabState,
	placeTab,
	placeTabLabel,
	row,
	SHELL_BANNER,
	SHELL_COLUMN,
	SHELL_TAB_BAR,
	SWITCHER,
	TOASTS,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { type ReactNode, useState } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { CoverTabs, PlaceRoute, ShellSwitcher } from "../../lib/frame";
import { Ink } from "../../lib/ink";
import { MenuRow, MenuSheet } from "../../lib/more";
import { isCurrent, navigate, usePathname } from "../../lib/navigate";
import { dismissToast, useToasts } from "../../lib/toast";
import { useWords } from "../../lib/words";
import { Avatar } from "../avatar";
import { Count } from "../count";
import { Icon } from "../icon";
import { Sheet } from "../sheet";
import { Toast } from "../toast";
import { Confirmations } from "./confirmation";

const FRAME = "flex-1 overflow-hidden";
const CONTENT = "flex-1";
const TOAST_LAYER = "absolute inset-x-0 bottom-0 items-center";

const TRIGGER = "flex-row items-center min-w-0";
const NAME = "shrink";
const GLYPH = "shrink-0";
const SWITCH_ROW = "flex-row items-center active:bg-wash-press";
const SWITCH_LABEL = "min-w-0 flex-1";
const CREATE = "border-t pt-float";

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
// content, the toast queue over the content's foot, the `confirm()`
// decisions as a sheet, and the tab bar over the home indicator, past five
// places four and a More tab whose sheet holds the rest. The switcher's
// trigger starts each Place's top bar, the current place's route handed down
// for a Place's back act; a pushed Screen covers the tab bar,
// and the frame then clears the home indicator itself.
export function Shell({ places, banner, switcher, children }: ShellProps) {
	const insets = useSafeAreaInsets();
	const toasts = useToasts();
	const [covered, cover] = useState(false);
	const pathname = usePathname();
	const route = places.find((spec) => isCurrent(spec.route, pathname))?.route;
	return (
		<View
			style={{
				paddingTop: insets.top,
				paddingBottom: covered ? insets.bottom : 0,
			}}
			className={cn(SHELL_COLUMN, FRAME)}
		>
			{banner ? <View className={SHELL_BANNER}>{banner}</View> : null}
			<View className={CONTENT}>
				<ShellSwitcher.Provider
					value={switcher ? <SwitcherTrigger switcher={switcher} /> : null}
				>
					<PlaceRoute.Provider value={route}>
						<CoverTabs.Provider value={cover}>{children}</CoverTabs.Provider>
					</PlaceRoute.Provider>
				</ShellSwitcher.Provider>
				{toasts.length > 0 ? (
					<View pointerEvents="box-none" className={cn(TOASTS, TOAST_LAYER)}>
						{toasts.map((entry) => (
							<Pressable key={entry.id} onPress={() => dismissToast(entry.id)}>
								<Toast
									sentence={entry.sentence}
									state={entry.state}
									act={entry.act}
								/>
							</Pressable>
						))}
					</View>
				) : null}
			</View>
			{covered ? null : <TabBar places={places} pathname={pathname} />}
			<Confirmations />
		</View>
	);
}

// The switcher's trigger in a Place's top bar and its sheet: the options with
// their avatars under the switcher's label, the current one ticked, then the
// create act under a hairline.
function SwitcherTrigger({ switcher }: { switcher: Switcher }) {
	const [open, setOpen] = useState(false);
	const close = () => setOpen(false);
	return (
		<>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={switcher.name}
				onPress={() => setOpen(true)}
				className={cn(SWITCHER, TRIGGER)}
			>
				<Avatar name={switcher.name} src={switcher.avatar} />
				<RNText
					numberOfLines={1}
					className={cn(
						text({ role: "body" }),
						textStrong({ role: "body" }),
						NAME,
					)}
				>
					{switcher.name}
				</RNText>
				<View className={GLYPH}>
					<Ink.Provider value="ink-meta">
						<Icon name="ChevronsUpDown" />
					</Ink.Provider>
				</View>
			</Pressable>
			<Sheet open={open} onClose={close} title={switcher.label}>
				<View>
					{switcher.options.map((option) => {
						const current = option.label === switcher.name;
						return (
							<Pressable
								key={option.label}
								accessibilityRole="radio"
								accessibilityState={{
									selected: current,
									disabled: option.blocked !== undefined,
								}}
								disabled={option.blocked !== undefined}
								onPress={() => {
									close();
									option.onAct();
								}}
								className={cn(row({ state: "rest" }), SWITCH_ROW)}
							>
								<Avatar name={option.label} src={option.avatar} />
								<RNText
									numberOfLines={1}
									className={cn(text({ role: "body" }), SWITCH_LABEL)}
								>
									{option.label}
								</RNText>
								{current ? (
									<Ink.Provider value="ink-body">
										<Icon name="Check" />
									</Ink.Provider>
								) : null}
							</Pressable>
						);
					})}
				</View>
				{switcher.create ? (
					<View className={cn(HAIRLINE, CREATE)}>
						<MenuRow
							item={switcher.create}
							onAct={() => {
								close();
								switcher.create?.onAct();
							}}
						/>
					</View>
				) : null}
			</Sheet>
		</>
	);
}

// The places: glyph over label, the count over the glyph's end; past five
// places, four and a More tab whose sheet holds the rest.
// A tab holds its label ahead of its glyph and stacks them reversed, and
// takes no label of its own, so it reads the label then the count.
function TabBar({
	places,
	pathname,
}: {
	places: readonly PlaceSpec[];
	pathname: string;
}) {
	const insets = useSafeAreaInsets();
	const words = useWords();
	const [open, setOpen] = useState(false);
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
					selected={isCurrent(spec.route, pathname)}
					onAct={() => navigate(spec.route)}
				/>
			))}
			{rest.length > 0 ? (
				<>
					<Tab
						icon="Ellipsis"
						label={words.more}
						selected={rest.some((spec) => isCurrent(spec.route, pathname))}
						onAct={() => setOpen(true)}
					/>
					<MenuSheet
						title={words.more}
						open={open}
						onClose={() => setOpen(false)}
						items={rest.map((spec) => ({
							label: spec.label,
							icon: spec.icon,
							onAct: () => navigate(spec.route),
						}))}
					/>
				</>
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
