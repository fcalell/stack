import { Dialog } from "@base-ui/react/dialog";
import {
	type Datum,
	FrameHolds,
	isSelection,
	paints,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import type {
	GroupSpec,
	IconName,
	PlaceSpec,
} from "@fcalell/ui-core/descriptors";
import { PAINT_ROWS } from "@fcalell/ui-core/paint";
import { flatPlaces, placeAt, placeTrail } from "@fcalell/ui-core/route";
import {
	LAYER_CARD,
	placeRow,
	placeRowGlyph,
	SHELL_BANNER,
	SHELL_COLUMN,
	SHELL_FOOT,
	SHELL_GROUP_LABEL,
	SHELL_INSET,
	SHELL_LAYER,
	SHELL_MARK,
	SHELL_PLACES,
	SHELL_RAIL,
	SHELL_SIDEBAR,
	SWITCHER_SLOT,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { type ReactNode, useMemo, useState } from "react";
import type { Closed } from "../../lib/closed.ts";
import { useColumn } from "../../lib/folds.ts";
import { PlaceRoute, ShellHome, ShellMenu } from "../../lib/frame.ts";
import { useMark } from "../../lib/mark.tsx";
import { useTouch } from "../../lib/media.ts";
import { isRoute, useRoute } from "../../lib/navigate.ts";
import { PAINT_BOX, Painted } from "../../lib/paint.tsx";
import { FrameBody, useFrame } from "../../lib/read.tsx";
import { useWords } from "../../lib/words.tsx";
import { Button } from "../button/index.tsx";
import { Icon } from "../icon/index.tsx";
import { FrameHost, FrameMain } from "./host.tsx";
import { Place } from "./place.tsx";
import { GroupRow, RailEntry } from "./rail.tsx";
import { GLYPH, LABEL, ROW_BOX } from "./row.ts";
import { type Switcher, SwitcherPick } from "./switcher.tsx";
import { PlaceTree } from "./tree.tsx";

// A page read from across a room draws its own room `Place` outside the Shell.
export { Place };

// The shell fills the viewport; the page inside scrolls its own body.
const FRAME = "flex h-dvh overflow-hidden";
const SIDEBAR = "relative flex flex-col shrink-0 min-h-0";
// The switcher slot is a bar: its row centred in the strip, the close act
// (on the touch layer) at its end.
const SLOT = "flex items-center gap-gap";
const PLACES = "flex flex-col";
const RUN = "flex flex-col";
// With groups the sidebar is the rail and the column side by side; the rail's
// entries scroll above its footer places.
const SPLIT = "flex shrink-0 min-h-0";
const RAIL_ENTRIES = "flex flex-col gap-gap grow min-h-0 overflow-y-auto";
const RAIL_FOOT = "flex flex-col gap-gap shrink-0 pt-gap";
// The touch group view's head: the way back to the groups, then the heading.
const BACK = "flex items-center gap-gap";
// The column clears the top safe inset, so a banner or a page's head never
// stands under a notch.
const COLUMN = "relative flex flex-col min-w-0 grow pt-safe";
const BANNER_SLOT = "flex flex-col";
// The app's name beside its mark when the shell has no switcher.
const NAME = "truncate";
// The touch places layer stands over the whole viewport on the sheet's rung;
// its places scroll as the sidebar's do.
const LAYER = "fixed inset-0 z-(--layer-sheet) flex flex-col";
const CLOSE = "ms-auto";

/** A group of places the sidebar names: its label (the column's heading), its icon (its entry on the rail), its switcher when it is a scope, and its places when a read gives them. */
export interface ShellGroup extends Omit<GroupSpec, "switcher"> {
	/** The scope the group's places follow, a row under the label. */
	switcher?: Switcher;
	/** The group's places, constants or a selection: the group stands where it stands in `groups`, whose order is the rail's: before the first plain run whose group `groups` lists after it, else after the plain runs. While the selection waits the heading draws over `PAINT_ROWS` painted place rows, inert; once it failed or is missing the group is the read's frame and draws the compact failed or missing form with Retry in the rows' place (so the read counts as held and its failure is drawn once), and when it is loaded and empty the group is absent (no heading, no switcher row) The group's `switcher` selections of the same read need no frame of their own. */
	places?: Datum<readonly PlaceSpec[]>;
}

/** The app's frame. */
export interface ShellProps extends Closed {
	/** The places, in order; the one at the current route is selected. */
	places: readonly PlaceSpec[];
	/** The groups, in the rail's order: every group a place names, which a place naming one `groups` does not list throws for, and the ones that carry a switcher or a read of their own (a group of its own stands before the plain group listed after it). A Shell that names any group draws a rail of them beside the column; one that names none draws the column alone. */
	groups?: readonly ShellGroup[];
	/** A `Banner` over the column, at the page inset. */
	banner?: ReactNode;
	/** What the app is looking at, and what it can switch to. */
	switcher?: Switcher;
	/** A part that stands under the place across the column (a `Dock`), whatever the route; without one the Shell draws nothing there. */
	foot?: ReactNode;
	/** The route's Panes, in order: each deeper one a step into what the one before it lists. */
	children?: ReactNode;
}

/** The frame, with the route's Panes in a row (the place) on its canvas: the place's Pane, and a record's after it, the place's then at the list width giving way to its floor and the record's taking the rest, a hairline between them, and below `tablet` of the column only the last standing. A route renders its `Pane`s and no place of its own. A `foot` stands under the place across the column. On the desktop the sidebar beside the column: the mark and the switcher on one bar, then the places, a group's switcher under its heading. A Shell that names groups draws the sidebar as a rail of icon entries (the ungrouped places first, named by their first place and headed by nothing in the column, then each group; the footer places at the rail's foot) beside the group column: pressing an entry shows that group's column until the route changes, and the column folds away to leave the rail, which the viewer's choice keeps. On touch the column alone, the same places on a layer over the viewport that the menu act leading a Pane's bar opens (the groups first, a tap showing a group's places with a way back) and that closes on its close act, Escape or going to a place. */
export function Shell({
	places,
	groups,
	banner,
	switcher,
	foot,
	children,
}: ShellProps) {
	const touch = useTouch();
	const words = useWords();
	const at = useRoute();
	// The places layer stands at the route it opened on: going to a place
	// closes it.
	const [openAt, setOpenAt] = useState<string>();
	const open = openAt === at;
	// The current place is the one that owns the address among every place the
	// sidebar draws, a group's own included. The lookup is an enrichment, never
	// a draw of the read's state: it reads quietly (`or`), so it paints and holds
	// nothing, and a group whose places wait or failed contributes no candidate.
	const owned = useMemo(
		() =>
			(groups ?? []).map((group) =>
				isSelection(group.places) ? group.places.or([]) : (group.places ?? []),
			),
		[groups],
	);
	const drawn = useSelections(owned);
	const grouped = drawn.flatMap((each) => (each.painted ? [] : each.value));
	const spec = [...places, ...grouped];
	// A place's children are places too: the address is owned by the deepest.
	const flat = flatPlaces(spec);
	const route = placeAt(flat, at);
	const trail = placeTrail(spec, at);
	const mark = useMark();
	// A place that is a spot on its page (`#activity`) leads nowhere from an
	// address nothing serves, so home is the first place that is a route.
	const first = places.find((spec) => isRoute(spec.route));
	const home = first && { label: first.label, href: first.route };
	const close = () => setOpenAt(undefined);
	const rows = runs(places, groups);
	const railed = (groups?.length ?? 0) > 0 || places.some((one) => one.group);
	const entries = railed ? rail(rows) : [];
	const ends = places.filter((one) => one.end);
	// The group the current place stands in: a place of the rows, else a place
	// a group's own read gave. None for a footer place, or none at the address.
	const owner = railed ? ownerOf(places, groups, drawn, route) : undefined;
	// The column shows the group the viewer pressed, at the route it was
	// pressed at: going to a place returns it to the current place's group.
	const [picked, setPicked] = useState<{ at: string; group?: string }>();
	const stands = picked?.at === at ? picked : owner;
	const entry =
		entries.find((one) => one.group === stands?.group) ?? entries[0];
	const [columned, setColumned] = useColumn();
	// The group the touch layer shows, once one is tapped: none each time it opens.
	const [viewed, setViewed] = useState<{ group?: string }>();
	const viewing = viewed && entries.find((one) => one.group === viewed.group);
	const common = {
		route,
		trail,
		onPlace: touch ? close : undefined,
	};
	const closer = touch ? (
		<span className={CLOSE}>
			<Button glyph icon="X" label={words.close} onAct={close} />
		</span>
	) : undefined;
	const plain = (
		<PlacesBody switcher={switcher} ends={ends} end={closer} {...common}>
			<Runs rows={rows} {...common} />
		</PlacesBody>
	);
	const listed = (
		<PlacesBody switcher={switcher} ends={ends} end={closer} {...common}>
			{viewing === undefined ? (
				<div className={cn(SHELL_PLACES, PLACES)}>
					{entries.map((one) => (
						<GroupRow
							key={one.group ?? ""}
							icon={one.icon}
							label={one.label}
							current={owner !== undefined && one.group === owner.group}
							onPress={() => setViewed({ group: one.group })}
						/>
					))}
				</div>
			) : (
				<>
					<div className={BACK}>
						<Button
							glyph
							icon="ChevronLeft"
							label={words.back}
							onAct={() => setViewed(undefined)}
						/>
						{viewing.group === undefined ? null : (
							<Heading label={viewing.label} />
						)}
					</div>
					<Runs rows={viewing.runs} bare {...common} />
				</>
			)}
		</PlacesBody>
	);
	// The rail's entries scroll above its footer places; the column beside it
	// folds away.
	const railing = (
		<nav aria-label={words.places} className={SPLIT}>
			<div className={cn(SHELL_RAIL, SIDEBAR)}>
				<div className={RAIL_ENTRIES}>
					{entries.map((one) => (
						<RailEntry
							key={one.group ?? ""}
							icon={one.icon}
							label={one.label}
							current={owner !== undefined && one.group === owner.group}
							shown={columned && one === entry}
							onPress={() => {
								setPicked({ at, group: one.group });
								setColumned(true);
							}}
						/>
					))}
				</div>
				{ends.length > 0 ? (
					<div className={RAIL_FOOT}>
						{ends.map((one) => (
							<RailEntry
								key={one.route}
								icon={one.icon}
								label={one.label}
								current={one.route === route}
								href={one.route}
							/>
						))}
					</div>
				) : null}
			</div>
			{columned ? (
				<div className={cn(SHELL_SIDEBAR, SHELL_INSET, SIDEBAR)}>
					<PlacesBody
						switcher={switcher}
						ends={[]}
						end={
							<span className={CLOSE}>
								<Button
									glyph
									icon="PanelLeftClose"
									label={`${words.collapse} ${words.places}`}
									onAct={() => setColumned(false)}
								/>
							</span>
						}
						{...common}
					>
						{entry ? (
							<>
								{entry.group === undefined ? null : (
									<Heading label={entry.label} />
								)}
								<Runs rows={entry.runs} bare {...common} />
							</>
						) : null}
					</PlacesBody>
				</div>
			) : null}
		</nav>
	);
	// The sidebar and the layer differ by density; the column, and the page
	// in it, keep one tree position on both, so crossing the density line
	// keeps the page.
	const body = railed ? listed : plain;
	const sidebar = touch ? null : railed ? (
		railing
	) : (
		<nav
			aria-label={words.places}
			className={cn(SHELL_SIDEBAR, SHELL_INSET, SIDEBAR)}
		>
			{body}
		</nav>
	);
	const layer = touch ? (
		<Dialog.Root
			open={open}
			onOpenChange={(next) => {
				if (!next) close();
			}}
			modal
		>
			<Dialog.Portal>
				<Dialog.Popup
					aria-label={words.places}
					className={cn(SHELL_LAYER, LAYER, LAYER_CARD)}
				>
					<nav
						aria-label={words.places}
						className={cn(SHELL_INSET, SIDEBAR, "grow")}
					>
						{body}
					</nav>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	) : null;
	const menu = touch
		? {
				icon: "Menu" as const,
				label: words.places,
				onAct: () => {
					setOpenAt(at);
					setViewed(undefined);
				},
			}
		: undefined;
	return (
		<FrameHost>
			<div className={FRAME}>
				{sidebar}
				<div className={cn(SHELL_COLUMN, COLUMN)}>
					{banner ? (
						<div className={cn(SHELL_BANNER, BANNER_SLOT)}>{banner}</div>
					) : null}
					<FrameMain>
						<ShellHome value={home}>
							<ShellMenu value={menu}>
								<PlaceRoute value={route}>
									<Place
										title={
											flat.find((one) => one.route === route)?.label ??
											mark?.name
										}
									>
										{children}
									</Place>
								</PlaceRoute>
							</ShellMenu>
						</ShellHome>
					</FrameMain>
					{foot}
					{layer}
				</div>
			</div>
		</FrameHost>
	);
}

// The sidebar's content, drawn in the sidebar and on the touch layer alike:
// the switcher slot (the mark in the row's glyph slot, the switcher's trigger
// after it, `end` at the bar's end), what the caller puts under it (the runs
// of places, or a group's heading over its runs) and the footer places.
function PlacesBody(props: {
	switcher: Switcher | undefined;
	ends: readonly PlaceSpec[];
	route: string | undefined;
	trail: readonly string[];
	end?: ReactNode;
	onPlace?: () => void;
	children?: ReactNode;
}) {
	const { switcher, ends, route, trail, end, onPlace, children } = props;
	const words = useWords();
	const mark = useMark();
	// The sidebar is the dark calibration in both modes: the dark icon stands.
	const glyph = mark ? (
		<img src={mark.dark ?? mark.src} alt="" className={SHELL_MARK} />
	) : undefined;
	let lead: ReactNode = null;
	if (switcher) lead = <SwitcherPick switcher={switcher} glyph={glyph} />;
	else if (mark)
		lead = (
			<span className={cn(placeRow(), ROW_BOX)}>
				<span className={cn(placeRowGlyph(), GLYPH)}>{glyph}</span>
				<span
					className={cn(
						text({ role: "body" }),
						textStrong({ role: "body" }),
						NAME,
					)}
				>
					{mark.name}
				</span>
			</span>
		);
	return (
		<>
			{lead || end ? (
				<div className={cn(SWITCHER_SLOT, SLOT)}>
					{lead}
					{end}
				</div>
			) : null}
			{children}
			{ends.length > 0 ? (
				<div className={cn(SHELL_FOOT, RUN)}>
					<PlaceTree
						specs={ends}
						label={words.places}
						route={route}
						trail={trail}
						onPlace={onPlace}
					/>
				</div>
			) : null}
		</>
	);
}

// The runs of places, scrolling between the switcher bar and the footer.
function Runs(props: {
	rows: readonly Run[];
	bare?: boolean;
	route: string | undefined;
	trail: readonly string[];
	onPlace?: () => void;
}) {
	const { rows, bare, route, trail, onPlace } = props;
	return (
		<div className={cn(SHELL_PLACES, PLACES)}>
			{rows.map((run) => (
				<GroupRun
					key={run.key}
					label={run.group}
					bare={bare}
					switcher={run.switcher}
					places={run.read ?? run.places}
					route={route}
					trail={trail}
					onPlace={onPlace}
				/>
			))}
		</div>
	);
}

function Heading({ label }: { label: string }) {
	return (
		<span className={cn(text({ role: "caption" }), SHELL_GROUP_LABEL)}>
			{label}
		</span>
	);
}

type Run = {
	key: string;
	group?: string;
	name: string;
	icon: IconName;
	switcher?: Switcher;
	places: PlaceSpec[];
	read?: Datum<readonly PlaceSpec[]>;
};

// The consecutive places of one group, in order: the sidebar draws a run under
// its group's heading. A group that owns its places (a `places` of its own)
// stands where it stands in `groups`: before the first plain run whose group
// `groups` lists after it, else after the plain runs. The footer group is drawn
// apart. A place naming a group `groups` does not list is a contract error.
function runs(
	places: readonly PlaceSpec[],
	groups: readonly ShellGroup[] | undefined,
) {
	const out: Run[] = [];
	const listed = groups ?? [];
	for (const spec of places) {
		if (spec.end) continue;
		const last = out.at(-1);
		if (last && last.group === spec.group) {
			last.places.push(spec);
			continue;
		}
		const group = listed.find((one) => one.label === spec.group);
		if (spec.group !== undefined && !group)
			throw new Error(
				`Shell: the group "${spec.group}" of the place "${spec.label}" is not in \`groups\``,
			);
		out.push({
			key: spec.route,
			group: spec.group,
			name: group?.label ?? spec.label,
			icon: group?.icon ?? spec.icon,
			switcher: group?.switcher,
			places: [spec],
		});
	}
	listed.forEach((spec, at) => {
		if (!spec.places) return;
		const after = listed.slice(at + 1).map((one) => one.label);
		const before = out.findIndex(
			(run) => run.group !== undefined && after.includes(run.group),
		);
		out.splice(before < 0 ? out.length : before, 0, {
			key: `group:${spec.label}`,
			group: spec.label,
			name: spec.label,
			icon: spec.icon,
			switcher: spec.switcher,
			places: [],
			read: spec.places,
		});
	});
	return out;
}

// A group on the rail: all its runs, named and drawn by its group, or for the
// ungrouped places by their first place.
interface Entry {
	group: string | undefined;
	label: string;
	icon: IconName;
	runs: Run[];
}

// The rail's entries: the ungrouped places first, then each group in the order
// of its first run.
function rail(rows: readonly Run[]): Entry[] {
	const out: Entry[] = [];
	for (const run of rows) {
		let entry = out.find((one) => one.group === run.group);
		if (!entry) {
			entry = { group: run.group, label: run.name, icon: run.icon, runs: [] };
			out.push(entry);
		}
		entry.runs.push(run);
	}
	return [
		...out.filter((one) => one.group === undefined),
		...out.filter((one) => one.group !== undefined),
	];
}

// The group the place at `route` stands in, wrapped (the ungrouped places' is
// `{ group: undefined }`): a place of `places`, else one a group's own read
// gave. None for a footer place or no place.
function ownerOf(
	places: readonly PlaceSpec[],
	groups: readonly ShellGroup[] | undefined,
	drawn: readonly (
		| { painted: true }
		| { painted: false; value: readonly PlaceSpec[] }
	)[],
	route: string | undefined,
): { group?: string } | undefined {
	const holds = (specs: readonly PlaceSpec[]) =>
		flatPlaces(specs).some((one) => one.route === route);
	const own = places.find((one) => !one.end && holds([one]));
	if (own) return { group: own.group };
	const read = drawn.findIndex((each) => !each.painted && holds(each.value));
	return read < 0 ? undefined : { group: groups?.[read]?.label };
}

const PAINTED_PLACES = Array.from({ length: PAINT_ROWS }, (_, at) => at);

// One run: the group's label, its switcher as a row under it, then its places,
// or `PAINT_ROWS` painted rows at the row height while their read waits.
function GroupRun(props: {
	label: string | undefined;
	// The heading stands above the run (a group's column draws it once).
	bare?: boolean;
	switcher: Switcher | undefined;
	places: Datum<readonly PlaceSpec[]>;
	route: string | undefined;
	trail: readonly string[];
	onPlace?: () => void;
}) {
	const { label, bare, switcher, route, trail, onPlace } = props;
	const words = useWords();
	const [drawn] = useSelections([props.places] as const);
	// The group is the frame of its places' read: it holds it, so the read's
	// failure is drawn once, here, in the compact failed and missing forms.
	const frame = useFrame(isSelection(props.places) ? props.places : undefined);
	const waits = paints(drawn);
	const specs = drawn.painted ? [] : drawn.value;
	const ended = frame.form === "failed" || frame.form === "missing";
	// A group loaded and empty is absent: no label, no switcher row, nothing.
	if (!(waits || ended) && specs.length === 0) return null;
	return (
		<FrameHolds holds={frame.held}>
			<div className={RUN} aria-busy={(waits && frame.holds) || undefined}>
				{label === undefined || bare ? null : <Heading label={label} />}
				{switcher && !ended ? <SwitcherPick switcher={switcher} /> : null}
				{ended ? (
					<FrameBody frame={frame} fit="part" />
				) : waits ? (
					PAINTED_PLACES.map((at) => (
						<PaintedPlace key={`painted:${at}`} at={at} />
					))
				) : (
					<PlaceTree
						specs={specs}
						label={label ?? words.places}
						route={route}
						trail={trail}
						onPlace={onPlace}
					/>
				)}
			</div>
		</FrameHolds>
	);
}

// A place row while its read waits: the row's box, its glyph slot and its
// label painted.
function PaintedPlace({ at }: { at: number }) {
	return (
		<span inert aria-hidden className={cn(placeRow(), ROW_BOX)}>
			<span className={cn(placeRowGlyph(), GLYPH)}>
				<span className={cn(PAINT_BOX, "*:invisible")}>
					<Icon name="Square" />
				</span>
			</span>
			<span className={cn(text({ role: "body" }), LABEL)}>
				<Painted role="phrase" at={at} />
			</span>
		</span>
	);
}
