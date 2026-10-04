import { Toast as ToastControl } from "@base-ui/react/toast";
import { cn } from "@fcalell/ui-core/cn";
import type {
	Option,
	OptionGroup,
	PlaceSpec,
	Switcher,
} from "@fcalell/ui-core/descriptors";
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
	SWITCHER,
	SWITCHER_SLOT,
	TOASTS,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { type ReactNode, useState } from "react";
import type { Closed } from "../../lib/closed.ts";
import {
	ActFloats,
	CoverTabs,
	FootDocks,
	PlaceRoute,
	ShellSwitcher,
} from "../../lib/frame.ts";
import { useTouch } from "../../lib/media.ts";
import { isCurrent, useRoute } from "../../lib/navigate.ts";
import { toasts } from "../../lib/toast.ts";
import { useWords } from "../../lib/words.tsx";
import { Avatar } from "../avatar/index.tsx";
import { Count } from "../count/index.tsx";
import { Icon } from "../icon/index.tsx";
import { List } from "../list/index.tsx";
import { PickerBase } from "../picker/base.tsx";
import { FloatingActRoom, Place } from "../place/index.tsx";
import { Confirmations } from "../sheet/confirm.tsx";
import { ToastList } from "../toast/layer.tsx";

// The shell fills the viewport; the page inside scrolls its own body.
const FRAME = "flex h-dvh overflow-hidden";
const SIDEBAR = "relative flex flex-col shrink-0";
const SLOT = "flex";
const PLACES = "flex flex-col";
const COLUMN = "relative flex flex-col min-w-0 grow";
const BANNER_SLOT = "flex flex-col";
// The page and the toasts standing over its foot: at the end on the
// desktop, centred on touch, above the tab bar and, while a Place's act
// floats or a foot docks, above the act or the foot. It is the main landmark, so a page's headers inside
// it are no banners.
const MAIN = "relative flex flex-col grow min-h-0";
const ROOM = "shrink-0";
// The toasts stand on their layer over an open sheet's portal, so nothing
// between them and the root makes a stacking context (no `isolate`, `z-*` or
// transform on the frame, the column or `main`; verify b-layers holds it).
const TOASTS_LAYER =
	"absolute inset-0 z-(--layer-toasts) flex flex-col items-end justify-end pointer-events-none touch:items-center";
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

const TABS = "flex pb-safe";
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
	const [covered, cover] = useState(false);
	const [lifted, lift] = useState(false);
	const [footing, dock] = useState(0);
	// The More page stands at the route it opened on: going to a place closes it.
	const [moreAt, setMoreAt] = useState<string>();
	const more = moreAt === at;
	const trigger = switcher ? (
		<SwitcherPick switcher={switcher} touch={touch} />
	) : null;
	const route = places.find((spec) => isCurrent(spec.route, at))?.route;
	const rest = places.length > TAB_ROOM ? places.slice(TAB_ROOM - 1) : [];
	// The More page stands in the page's place while it is open on touch.
	const page = touch && more ? <MorePage places={rest} /> : children;
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
	const tabs =
		touch && !covered ? (
			<TabBar
				places={places}
				at={at}
				more={more}
				onMore={() => setMoreAt(at)}
			/>
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
						<ShellSwitcher value={trigger}>
							<PlaceRoute value={route}>
								<CoverTabs value={cover}>
									<ActFloats value={lift}>
										<FootDocks value={dock}>{page}</FootDocks>
									</ActFloats>
								</CoverTabs>
							</PlaceRoute>
						</ShellSwitcher>
						<ToastControl.Viewport
							aria-label={words.notifications}
							className={cn(TOASTS, TOASTS_LAYER)}
						>
							<ToastList />
							{lifted ? <FloatingActRoom /> : null}
							{footing > 0 ? (
								// The docked foot's room is its measured height: it grows with the input.
								<div aria-hidden className={ROOM} style={{ height: footing }} />
							) : null}
						</ToastControl.Viewport>
					</main>
					{tabs}
				</div>
			</div>
			<Confirmations />
		</ToastControl.Provider>
	);
}

function flatten(options: Switcher["options"]): readonly Option[] {
	const entries: readonly (Option | OptionGroup)[] = options;
	return entries.flatMap((entry) =>
		"options" in entry ? entry.options : [entry],
	);
}

// The switcher is a pick (its options with their avatars, the current one
// ticked, the act that makes a new one under a hairline), drawn as a place
// row in the sidebar and a compact trigger in a touch top bar.
function SwitcherPick(props: { switcher: Switcher; touch: boolean }) {
	const { switcher, touch } = props;
	const current = flatten(switcher.options).find(
		(option) => option.value === switcher.value,
	);
	const name = current?.label ?? switcher.label;
	return (
		<PickerBase
			label={switcher.label}
			options={switcher.options}
			value={switcher.value}
			onChange={switcher.onChange}
			act={switcher.act}
			drawn={(handed, open) => (
				<button
					{...handed}
					type="button"
					aria-label={`${switcher.label}, ${name}`}
					className={
						touch
							? cn(SWITCHER, TRIGGER_TOUCH)
							: cn(
									placeRow({ state: open ? "active" : "rest" }),
									TRIGGER,
									!open && ROW_PRESS,
								)
					}
				>
					<span aria-hidden className={GLYPH}>
						<Avatar name={name} src={current?.avatar?.src} />
					</span>
					<span
						className={cn(
							text({ role: "body" }),
							textStrong({ role: "body" }),
							touch ? NAME_TOUCH : NAME,
						)}
					>
						{name}
					</span>
					<span className={cn(placeRowGlyph({ state: "rest" }), GLYPH)}>
						<Icon name="ChevronsUpDown" />
					</span>
				</button>
			)}
		/>
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
