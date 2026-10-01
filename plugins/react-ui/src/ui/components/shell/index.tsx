import { Menu } from "@base-ui/react/menu";
import { cn } from "@fcalell/ui-core/cn";
import type { PlaceSpec, Switcher } from "@fcalell/ui-core/descriptors";
import {
	POPOVER,
	placeRow,
	placeRowGlyph,
	placeTab,
	placeTabLabel,
	row,
	SHELL_COLUMN,
	SHELL_PLACES,
	SHELL_SIDEBAR,
	SHELL_TAB_BAR,
	SWITCHER,
	SWITCHER_SLOT,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { type ReactNode, use, useState } from "react";
import type { Closed } from "../../lib/closed.ts";
import { CoverTabs, PlaceRoute, ShellSwitcher } from "../../lib/frame.ts";
import { spacing, useTouch } from "../../lib/media.ts";
import { isCurrent, usePathname } from "../../lib/navigate.ts";
import { PortalContainer } from "../../lib/portal.ts";
import { useWords } from "../../lib/words.tsx";
import { Avatar } from "../avatar/index.tsx";
import { Count } from "../count/index.tsx";
import { Icon } from "../icon/index.tsx";

// The shell fills the viewport; the page inside scrolls its own body.
const FRAME = "flex h-dvh overflow-hidden";
const SIDEBAR = "relative flex flex-col shrink-0";
const SLOT = "flex";
const PLACES = "flex flex-col";
const COLUMN = "relative flex flex-col min-w-0 grow";
// A place row rings inset, inside the sidebar's inset.
const ROW_BOX = "flex items-center focus-visible:-outline-offset-2";
const ROW_PRESS = "hover:bg-wash-hover active:bg-wash-press";
const ROW_SELECTED_PRESS = "hover:bg-wash-selected-hover";
const GLYPH = "flex shrink-0";
const LABEL = "truncate grow";

const TRIGGER = "flex items-center w-full focus-visible:-outline-offset-2";
const TRIGGER_TOUCH = "flex items-center min-w-0";
const NAME = "truncate grow text-left";
const NAME_TOUCH = "truncate";
const MENU = "flex flex-col w-(--anchor-width)";
const MENU_TOUCH = "flex flex-col w-popover";
const MENU_ROWS = "flex flex-col gap-rows";
const MENU_LABEL = "px-control-x pt-pair";
const MENU_CREATE = "flex flex-col gap-rows border-t border-edge pt-float";
// The highlight wash marks the keyboard's row, so a row draws no ring.
const MENU_ROW = "flex items-center outline-none";
const MENU_ROW_LABEL = "min-w-0 grow truncate";
const MENU_CHECK = "flex shrink-0 text-ink-body";
const MENU_GLYPH = "flex shrink-0 text-ink-meta";

const TABS = "flex pb-safe";
const TAB =
	"flex flex-col items-center justify-center min-w-0 grow basis-0 focus-visible:-outline-offset-2";
const TAB_GLYPH = "relative flex";
const TAB_COUNT = "absolute top-0 left-full -translate-x-1/2 flex";
const TAB_LABEL = "max-w-full truncate";
// A tab bar holds five tabs at most: past five places, four and More.
const TAB_ROOM = 5;

/** The app's frame. */
export interface ShellProps extends Closed {
	/** The places, in order; the one at the current route is selected. */
	places: readonly PlaceSpec[];
	/** A strip over the column, a `Banner`. */
	banner?: ReactNode;
	/** What the app is looking at, and what it can switch to. */
	switcher?: Switcher;
	/** The current `Place` or `Screen`. */
	children?: ReactNode;
}

/** The frame: on the desktop the sidebar (the switcher, then the places) beside the column; on touch the column over the tab bar, the switcher at the head of each Place's top bar; on both, the current place's route handed down for a Place's back act and a pushed Screen covering the tab bar. */
export function Shell({ places, banner, switcher, children }: ShellProps) {
	const touch = useTouch();
	const words = useWords();
	const pathname = usePathname();
	const [covered, cover] = useState(false);
	const trigger = switcher ? (
		<SwitcherMenu switcher={switcher} touch={touch} />
	) : null;
	const route = places.find((spec) => isCurrent(spec.route, pathname))?.route;
	// The sidebar and the tab bar differ by density; the column, and the page
	// in it, keep one tree position on both, so crossing the density line
	// keeps the page.
	const sidebar = touch ? null : (
		<nav aria-label={words.places} className={cn(SHELL_SIDEBAR, SIDEBAR)}>
			{trigger ? (
				<div className={cn(SWITCHER_SLOT, SLOT)}>{trigger}</div>
			) : null}
			<div className={cn(SHELL_PLACES, PLACES)}>
				{places.map((spec) => {
					const current = isCurrent(spec.route, pathname);
					const state = current ? "selected" : "rest";
					return (
						<a
							key={spec.route}
							href={spec.route}
							aria-current={current ? "page" : undefined}
							className={cn(
								placeRow({ state }),
								ROW_BOX,
								current ? ROW_SELECTED_PRESS : ROW_PRESS,
							)}
						>
							<span className={cn(placeRowGlyph({ state }), GLYPH)}>
								<Icon name={spec.icon} />
							</span>
							<span className={cn(text({ role: "body" }), LABEL)}>
								{spec.label}
							</span>
							{spec.count === undefined ? null : <Count value={spec.count} />}
						</a>
					);
				})}
			</div>
		</nav>
	);
	const tabs =
		touch && !covered ? <TabBar places={places} pathname={pathname} /> : null;
	return (
		<div className={FRAME}>
			{sidebar}
			<div className={cn(SHELL_COLUMN, COLUMN)}>
				{banner}
				<ShellSwitcher value={trigger}>
					<PlaceRoute value={route}>
						<CoverTabs value={cover}>{children}</CoverTabs>
					</PlaceRoute>
				</ShellSwitcher>
				{tabs}
			</div>
		</div>
	);
}

// The switcher's trigger (a place row in the sidebar, a compact trigger in a
// touch top bar) and its menu: the options with their avatars, the current
// one checked, then the create act under a hairline.
function SwitcherMenu(props: { switcher: Switcher; touch: boolean }) {
	const { switcher, touch } = props;
	const container = use(PortalContainer);
	return (
		<Menu.Root modal={false}>
			<Menu.Trigger
				render={(trigger, state) => (
					<button
						{...trigger}
						className={
							touch
								? cn(SWITCHER, TRIGGER_TOUCH)
								: cn(
										placeRow({ state: state.open ? "active" : "rest" }),
										TRIGGER,
										!state.open && ROW_PRESS,
									)
						}
					>
						<span aria-hidden className={GLYPH}>
							<Avatar name={switcher.name} src={switcher.avatar} />
						</span>
						<span
							className={cn(
								text({ role: "body" }),
								textStrong({ role: "body" }),
								touch ? NAME_TOUCH : NAME,
							)}
						>
							{switcher.name}
						</span>
						<span className={cn(placeRowGlyph({ state: "rest" }), GLYPH)}>
							<Icon name="ChevronsUpDown" />
						</span>
					</button>
				)}
			/>
			<Menu.Portal container={container}>
				<Menu.Positioner align="start" sideOffset={() => spacing("pair")}>
					<Menu.Popup className={cn(POPOVER, touch ? MENU_TOUCH : MENU)}>
						<Menu.RadioGroup value={switcher.name} className={MENU_ROWS}>
							<Menu.GroupLabel
								className={cn(
									text({ role: "meta" }),
									textStrong({ role: "meta" }),
									MENU_LABEL,
								)}
							>
								{switcher.label}
							</Menu.GroupLabel>
							{switcher.options.map((option) => (
								<Menu.RadioItem
									key={option.label}
									value={option.label}
									label={option.label}
									onClick={option.onAct}
									disabled={option.blocked !== undefined}
									className={(item) =>
										cn(
											row({ state: item.highlighted ? "highlighted" : "rest" }),
											MENU_ROW,
										)
									}
								>
									<span aria-hidden className={GLYPH}>
										<Avatar name={option.label} src={option.avatar} />
									</span>
									<span className={cn(text({ role: "body" }), MENU_ROW_LABEL)}>
										{option.label}
									</span>
									<Menu.RadioItemIndicator className={MENU_CHECK}>
										<Icon name="Check" />
									</Menu.RadioItemIndicator>
								</Menu.RadioItem>
							))}
						</Menu.RadioGroup>
						{switcher.create ? (
							<div className={MENU_CREATE}>
								<Menu.Item
									label={switcher.create.label}
									onClick={switcher.create.onAct}
									className={(item) =>
										cn(
											row({ state: item.highlighted ? "highlighted" : "rest" }),
											MENU_ROW,
										)
									}
								>
									{switcher.create.icon ? (
										<span className={MENU_GLYPH}>
											<Icon name={switcher.create.icon} />
										</span>
									) : null}
									<span className={cn(text({ role: "body" }), MENU_ROW_LABEL)}>
										{switcher.create.label}
									</span>
								</Menu.Item>
							</div>
						) : null}
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
}

// The touch shell's places: glyph over label, the count over the glyph's
// end; past five places, four and a More tab whose menu holds the rest.
function TabBar(props: { places: readonly PlaceSpec[]; pathname: string }) {
	const { places, pathname } = props;
	const words = useWords();
	const container = use(PortalContainer);
	const fits = places.length <= TAB_ROOM;
	const shown = fits ? places : places.slice(0, TAB_ROOM - 1);
	const rest = fits ? [] : places.slice(TAB_ROOM - 1);
	const inRest = rest.some((spec) => isCurrent(spec.route, pathname));
	return (
		<nav aria-label={words.places} className={cn(SHELL_TAB_BAR, TABS)}>
			{shown.map((spec) => {
				const current = isCurrent(spec.route, pathname);
				return (
					<a
						key={spec.route}
						href={spec.route}
						aria-current={current ? "page" : undefined}
						className={cn(
							placeTab({ state: current ? "selected" : "idle" }),
							TAB,
						)}
					>
						<Tab
							icon={
								<>
									<Icon name={spec.icon} fit="control" />
									{spec.count === undefined ? null : (
										<span className={TAB_COUNT}>
											<Count value={spec.count} />
										</span>
									)}
								</>
							}
							label={spec.label}
							selected={current}
						/>
					</a>
				);
			})}
			{rest.length > 0 ? (
				<Menu.Root modal={false}>
					<Menu.Trigger
						render={(trigger) => (
							<button
								{...trigger}
								className={cn(
									placeTab({ state: inRest ? "selected" : "idle" }),
									TAB,
								)}
							>
								<Tab
									icon={<Icon name="Ellipsis" fit="control" />}
									label={words.more}
									selected={inRest}
								/>
							</button>
						)}
					/>
					<Menu.Portal container={container}>
						<Menu.Positioner
							side="top"
							align="end"
							sideOffset={() => spacing("pair")}
						>
							<Menu.Popup className={cn(POPOVER, MENU_TOUCH)}>
								<div className={MENU_ROWS}>
									{rest.map((spec) => (
										<Menu.LinkItem
											key={spec.route}
											href={spec.route}
											label={spec.label}
											aria-current={
												isCurrent(spec.route, pathname) ? "page" : undefined
											}
											className={(item) =>
												cn(
													row({
														state: item.highlighted ? "highlighted" : "rest",
													}),
													MENU_ROW,
												)
											}
										>
											<span className={MENU_GLYPH}>
												<Icon name={spec.icon} />
											</span>
											<span
												className={cn(text({ role: "body" }), MENU_ROW_LABEL)}
											>
												{spec.label}
											</span>
											{spec.count === undefined ? null : (
												<Count value={spec.count} />
											)}
										</Menu.LinkItem>
									))}
								</div>
							</Menu.Popup>
						</Menu.Positioner>
					</Menu.Portal>
				</Menu.Root>
			) : null}
		</nav>
	);
}

function Tab(props: { icon: ReactNode; label: string; selected: boolean }) {
	return (
		<>
			<span className={TAB_GLYPH}>{props.icon}</span>
			<span
				className={cn(
					placeTabLabel({ state: props.selected ? "selected" : "idle" }),
					TAB_LABEL,
				)}
			>
				{props.label}
			</span>
		</>
	);
}
