import { Toast as ToastControl } from "@base-ui/react/toast";
import { cn } from "@fcalell/ui-core/cn";
import type { PlaceSpec, Switcher } from "@fcalell/ui-core/descriptors";
import {
	placeRow,
	placeRowGlyph,
	placeTab,
	placeTabLabel,
	SHELL_BANNER,
	SHELL_COLUMN,
	SHELL_PLACES,
	SHELL_SIDEBAR,
	SHELL_TAB_BAR,
	SWITCHER_SLOT,
	TOASTS,
	text,
} from "@fcalell/ui-core/variants";
import { type ReactNode, useState } from "react";
import type { Closed } from "../../lib/closed.ts";
import { PlaceRoute, ShellSwitcher } from "../../lib/frame.ts";
import { useTouch } from "../../lib/media.ts";
import { isCurrent, useRoute } from "../../lib/navigate.ts";
import { toasts } from "../../lib/toast.ts";
import { useWords } from "../../lib/words.tsx";
import { Count } from "../count/index.tsx";
import { Icon } from "../icon/index.tsx";
import { List } from "../list/index.tsx";
import { FloatingActRoom, Place } from "../place/index.tsx";
import { Confirmations } from "../sheet/confirm.tsx";
import { ToastList } from "../toast/layer.tsx";
import { SwitcherPick } from "./switcher.tsx";

// The shell fills the viewport; the page inside scrolls its own body.
const FRAME = "flex h-dvh overflow-hidden";
const SIDEBAR = "relative flex flex-col shrink-0";
const SLOT = "flex";
const PLACES = "flex flex-col";
// The column reads the marks the page inside draws: a pushed Screen's
// `data-screen` hides the tab bar, a floating act's `data-act-floats` lifts
// the toasts by the act's room. Both hold from the first paint and across
// the density line, since the page draws them in its own tree.
const COLUMN = "group/column relative flex flex-col min-w-0 grow";
const BANNER_SLOT = "flex flex-col";
// The page and the toasts standing over its foot: at the end on the
// desktop, centred on touch, above the tab bar and, while a Place's act
// floats or a foot docks, above the act or the foot. It is the main
// landmark, so a page's headers inside it are no banners.
const MAIN = "relative flex flex-col grow min-h-0";
const ACT_ROOM = "hidden shrink-0 group-has-data-act-floats/column:flex";
// The toasts stand on their layer over an open sheet's portal, so nothing
// between them and the root makes a stacking context (no `isolate`, `z-*` or
// transform on the frame, the column or `main`; verify b-layers holds it).
// Their foot is the top of a docked foot (a Place's `foot`, a filling
// Thread's input), which names itself the `--docked-foot` anchor: the layer
// stands above it by layout as it grows, and at `main`'s foot without one.
const TOASTS_LAYER =
	"absolute inset-0 bottom-[anchor(--docked-foot_top,0px)] z-(--layer-toasts) flex flex-col items-end justify-end pointer-events-none touch:items-center";
// A place row rings inset, inside the sidebar's inset.
const ROW_BOX = "flex items-center focus-visible:-outline-offset-2";
const ROW_PRESS = "hover:bg-wash-hover active:bg-wash-press";
const ROW_SELECTED_PRESS = "hover:bg-wash-selected-hover";
const GLYPH = "flex shrink-0";
const LABEL = "truncate grow";

const TABS = "flex pb-safe group-has-data-screen/column:hidden";
const TAB =
	"flex flex-col-reverse items-center justify-center min-w-0 grow basis-0 focus-visible:-outline-offset-2";
const TAB_GLYPH = "relative flex";
const TAB_COUNT = "absolute top-0 left-full flex";
const TAB_LABEL = "max-w-full truncate";
// A tab bar holds five tabs at most: past five places, four and More.
const TAB_ROOM = 5;

/** The app's frame. */
export interface ShellProps extends Closed {
	/** The places, in order; the one at the current route is selected. */
	places: readonly PlaceSpec[];
	/** A `Banner` over the column, at the page inset. */
	banner?: ReactNode;
	/** What the app is looking at, and what it can switch to. */
	switcher?: Switcher;
	/** The current `Place` or `Screen`. */
	children?: ReactNode;
}

/** The frame: on the desktop the sidebar (the switcher, then the places) beside the column; on touch the column over the tab bar, the switcher at the head of each Place's top bar, and past five places four tabs and More, which opens a page of the rest; on both, the current place's route handed down for a Place's back act, a pushed Screen covering the tab bar, the `toast()` queue standing over the page's foot (at the end on the desktop, centred on touch; above a floating act or a docked foot) and the first `confirm()` decision as a sheet. */
export function Shell({ places, banner, switcher, children }: ShellProps) {
	const touch = useTouch();
	const words = useWords();
	const at = useRoute();
	// The More page stands at the route it opened on: going to a place closes it.
	const [moreAt, setMoreAt] = useState<string>();
	const more = moreAt === at;
	const route = places.find((spec) => isCurrent(spec.route, at))?.route;
	const rest = places.length > TAB_ROOM ? places.slice(TAB_ROOM - 1) : [];
	// The More page stands in the page's place while it is open on touch.
	const page = touch && more ? <MorePage places={rest} /> : children;
	// The sidebar and the tab bar differ by density; the column, and the page
	// in it, keep one tree position on both, so crossing the density line
	// keeps the page.
	const sidebar = touch ? null : (
		<nav aria-label={words.places} className={cn(SHELL_SIDEBAR, SIDEBAR)}>
			{switcher ? (
				<div className={cn(SWITCHER_SLOT, SLOT)}>
					<SwitcherPick switcher={switcher} touch={false} />
				</div>
			) : null}
			<div className={cn(SHELL_PLACES, PLACES)}>
				{places.map((spec) => {
					const current = isCurrent(spec.route, at);
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
	const tabs = touch ? (
		<TabBar places={places} at={at} more={more} onMore={() => setMoreAt(at)} />
	) : null;
	// The toast queue and the confirm() decisions stand in every Shell.
	return (
		<ToastControl.Provider toastManager={toasts}>
			<div className={FRAME}>
				{sidebar}
				<div className={cn(SHELL_COLUMN, COLUMN)}>
					{banner ? (
						<div className={cn(SHELL_BANNER, BANNER_SLOT)}>{banner}</div>
					) : null}
					<main className={MAIN}>
						<ShellSwitcher value={switcher}>
							<PlaceRoute value={route}>{page}</PlaceRoute>
						</ShellSwitcher>
						<ToastControl.Viewport
							aria-label={words.notifications}
							className={cn(TOASTS, TOASTS_LAYER)}
						>
							<ToastList />
							<div className={ACT_ROOM}>
								<FloatingActRoom />
							</div>
						</ToastControl.Viewport>
					</main>
					{tabs}
				</div>
			</div>
			<Confirmations />
		</ToastControl.Provider>
	);
}

// The places past the tab bar, a page of rows: each place's glyph leading,
// its count trailing, its route where the row goes.
function MorePage(props: { places: readonly PlaceSpec[] }) {
	const words = useWords();
	return (
		<Place title={words.more}>
			<List
				items={props.places}
				row={{
					key: (spec) => spec.route,
					leading: { icon: (spec) => spec.icon },
					title: (spec) => spec.label,
					trailing: (spec) =>
						spec.count === undefined ? undefined : { count: spec.count },
					href: (spec) => spec.route,
				}}
			/>
		</Place>
	);
}

// The touch shell's places: glyph over label, the count over the glyph's
// end; past five places, four and a More tab, which opens the page of the
// rest and is selected while it stands or the current place is among them.
// A tab holds its label ahead of its glyph and stacks them reversed, so its
// name reads the label then the count.
function TabBar(props: {
	places: readonly PlaceSpec[];
	at: string;
	more: boolean;
	onMore: () => void;
}) {
	const { places, at, more } = props;
	const words = useWords();
	const fits = places.length <= TAB_ROOM;
	const shown = fits ? places : places.slice(0, TAB_ROOM - 1);
	const rest = fits ? [] : places.slice(TAB_ROOM - 1);
	const inRest = rest.some((spec) => isCurrent(spec.route, at));
	const moreSelected = more || inRest;
	return (
		<nav aria-label={words.places} className={cn(SHELL_TAB_BAR, TABS)}>
			{shown.map((spec) => {
				const current = !more && isCurrent(spec.route, at);
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
				<button
					type="button"
					aria-current={moreSelected ? "page" : undefined}
					onClick={props.onMore}
					className={cn(
						placeTab({ state: moreSelected ? "selected" : "idle" }),
						TAB,
					)}
				>
					<Tab
						icon={<Icon name="Ellipsis" fit="control" />}
						label={words.more}
						selected={moreSelected}
					/>
				</button>
			) : null}
		</nav>
	);
}

function Tab(props: { icon: ReactNode; label: string; selected: boolean }) {
	return (
		<>
			<span
				className={cn(
					placeTabLabel({ state: props.selected ? "selected" : "idle" }),
					TAB_LABEL,
				)}
			>
				{props.label}
			</span>
			<span className={TAB_GLYPH}>{props.icon}</span>
		</>
	);
}
