import { Dialog } from "@base-ui/react/dialog";
import {
	type Datum,
	FrameHolds,
	isSelection,
	paints,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import type { GroupSpec, PlaceSpec } from "@fcalell/ui-core/descriptors";
import { PAINT_ROWS } from "@fcalell/ui-core/paint";
import { placeAt } from "@fcalell/ui-core/route";
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
	SHELL_SIDEBAR,
	SWITCHER_SLOT,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { type ReactNode, useMemo, useState } from "react";
import type { Closed } from "../../lib/closed.ts";
import { PlaceRoute, ShellHome, ShellMenu } from "../../lib/frame.ts";
import { useMark } from "../../lib/mark.tsx";
import { useTouch } from "../../lib/media.ts";
import { follow, isRoute, useRoute } from "../../lib/navigate.ts";
import { PAINT_BOX, Painted } from "../../lib/paint.tsx";
import { FrameBody, useFrame } from "../../lib/read.tsx";
import { useWords } from "../../lib/words.tsx";
import { Button } from "../button/index.tsx";
import { Icon } from "../icon/index.tsx";
import { FrameHost, FrameMain } from "./host.tsx";
import { Place } from "./place.tsx";
import { type Switcher, SwitcherPick } from "./switcher.tsx";

// A page read from across a room draws its own room `Place` outside the Shell.
export { Place };

// The shell fills the viewport; the page inside scrolls its own body.
const FRAME = "flex h-dvh overflow-hidden";
const SIDEBAR = "relative flex flex-col shrink-0";
// The switcher slot is a bar: its row centred in the strip, the close act
// (on the touch layer) at its end.
const SLOT = "flex items-center gap-gap";
const PLACES = "flex flex-col";
const RUN = "flex flex-col";
// A place's count: the meta ink, tabular figures, at the caption role.
const PLACE_COUNT = "text-ink-meta tabular-nums";
// The column clears the top safe inset, so a banner or a page's head never
// stands under a notch.
const COLUMN = "relative flex flex-col min-w-0 grow pt-safe";
const BANNER_SLOT = "flex flex-col";
// A place row rings inset, inside the sidebar's inset.
const ROW_BOX = "flex items-center focus-visible:-outline-offset-2";
const ROW_PRESS = "hover:bg-wash-hover active:bg-wash-press";
const ROW_SELECTED_PRESS = "hover:bg-ink-body/10";
const GLYPH = "flex shrink-0";
const LABEL = "truncate grow";
// The app's name beside its mark when the shell has no switcher.
const NAME = "truncate";
// The touch places layer stands over the whole viewport on the sheet's rung
// and scrolls when the places outgrow it.
const LAYER = "fixed inset-0 z-(--layer-sheet) flex flex-col overflow-y-auto";
const CLOSE = "ms-auto";

/** A group of places the sidebar names: its label, its switcher when it is a scope, and its places when a read gives them. */
export interface ShellGroup extends Omit<GroupSpec, "switcher"> {
	/** The scope the group's places follow, a row under the label. */
	switcher?: Switcher;
	/** The group's places, constants or a selection: the group stands where it stands in `groups`, whose order is the sidebar's: before the first plain run whose group `groups` lists after it, else after the plain runs. While the selection waits the label draws over `PAINT_ROWS` painted place rows, inert; once it failed or is missing the group is the read's frame and draws the compact failed or missing form with Retry in the rows' place (so the read counts as held and its failure is drawn once), and when it is loaded and empty the group is absent (no label, no switcher row) The group's `switcher` selections of the same read need no frame of their own. */
	places?: Datum<readonly PlaceSpec[]>;
}

/** The app's frame. */
export interface ShellProps extends Closed {
	/** The places, in order; the one at the current route is selected. */
	places: readonly PlaceSpec[];
	/** The groups, in the sidebar's order: the ones that carry a switcher or a read of their own, and the labels the plain places name (a group of its own stands before the plain group listed after it). */
	groups?: readonly ShellGroup[];
	/** A `Banner` over the column, at the page inset. */
	banner?: ReactNode;
	/** What the app is looking at, and what it can switch to. */
	switcher?: Switcher;
	/** The route's Panes, in order: each deeper one a step into what the one before it lists. */
	children?: ReactNode;
}

/** The frame, with the route's Panes in a row (the place) on its canvas, each but the last at the list width giving way to its floor, the last taking the rest, a hairline between them, and below `tablet` of the column only the last standing, below `desktop` the last two, never more than three (the oldest folds first). A route renders its `Pane`s and no place of its own. On the desktop the sidebar (the mark and the switcher on one bar, then the places in their groups, a group's switcher under its label, the footer group at the bottom) beside the column; on touch the column alone, the same places on a layer over the viewport that the menu act leading a Pane's bar opens and that closes on its close act, Escape or going to a place. */
export function Shell({
	places,
	groups,
	banner,
	switcher,
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
	const route = placeAt(spec, at);
	const mark = useMark();
	// A place that is a spot on its page (`#activity`) leads nowhere from an
	// address nothing serves, so home is the first place that is a route.
	const first = places.find((spec) => isRoute(spec.route));
	const home = first && { label: first.label, href: first.route };
	const close = () => setOpenAt(undefined);
	const body = (
		<PlacesBody
			places={places}
			groups={groups}
			route={route}
			switcher={switcher}
			onPlace={touch ? close : undefined}
			end={
				touch ? (
					<span className={CLOSE}>
						<Button glyph icon="X" label={words.close} onAct={close} />
					</span>
				) : undefined
			}
		/>
	);
	// The sidebar and the layer differ by density; the column, and the page
	// in it, keep one tree position on both, so crossing the density line
	// keeps the page.
	const sidebar = touch ? null : (
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
					<nav aria-label={words.places} className={cn(SHELL_INSET, SIDEBAR)}>
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
				onAct: () => setOpenAt(at),
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
											spec.find((one) => one.route === route)?.label ??
											mark?.name
										}
									>
										{children}
									</Place>
								</PlaceRoute>
							</ShellMenu>
						</ShellHome>
					</FrameMain>
					{layer}
				</div>
			</div>
		</FrameHost>
	);
}

// The sidebar's content, drawn in the sidebar and on the touch layer alike:
// the switcher slot (the mark in the row's glyph slot, the switcher's trigger
// after it, `end` at the bar's end), the runs of places under their group
// labels, a group's switcher as a row under its label, and the footer group.
function PlacesBody(props: {
	places: readonly PlaceSpec[];
	groups: readonly ShellGroup[] | undefined;
	route: string | undefined;
	switcher: Switcher | undefined;
	end?: ReactNode;
	onPlace?: () => void;
}) {
	const { places, groups, route, switcher, end, onPlace } = props;
	const mark = useMark();
	// The sidebar is the dark calibration in both modes: the dark icon stands.
	const glyph = mark ? (
		<img src={mark.dark ?? mark.src} alt="" className={SHELL_MARK} />
	) : undefined;
	const foot = places.filter((spec) => spec.end);
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
			<div className={cn(SHELL_PLACES, PLACES)}>
				{runs(places, groups).map((run) => (
					<GroupRun
						key={run.key}
						label={run.group}
						switcher={run.switcher}
						places={run.read ?? run.places}
						route={route}
						onPlace={onPlace}
					/>
				))}
				{foot.length > 0 ? (
					<div className={cn(SHELL_FOOT, RUN)}>
						{foot.map((spec) => (
							<PlaceLink
								key={spec.route}
								spec={spec}
								route={route}
								onPlace={onPlace}
							/>
						))}
					</div>
				) : null}
			</div>
		</>
	);
}

// The consecutive places of one group, in order: the sidebar draws a label
// over each run that names a group. A group that owns its places (a `places`
// of its own) stands where it stands in `groups`: before the first plain run
// whose group `groups` lists after it, else after the plain runs. The footer
// group is drawn apart.
function runs(
	places: readonly PlaceSpec[],
	groups: readonly ShellGroup[] | undefined,
) {
	type Run = {
		key: string;
		group?: string;
		switcher?: Switcher;
		places: PlaceSpec[];
		read?: Datum<readonly PlaceSpec[]>;
	};
	const out: Run[] = [];
	const listed = groups ?? [];
	for (const spec of places) {
		if (spec.end) continue;
		const last = out.at(-1);
		if (last && last.group === spec.group) last.places.push(spec);
		else
			out.push({
				key: spec.route,
				group: spec.group,
				switcher: listed.find((one) => one.label === spec.group)?.switcher,
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
			switcher: spec.switcher,
			places: [],
			read: spec.places,
		});
	});
	return out;
}

const PAINTED_PLACES = Array.from({ length: PAINT_ROWS }, (_, at) => at);

// One run: the group's label, its switcher as a row under it, then its places,
// or `PAINT_ROWS` painted rows at the row height while their read waits.
function GroupRun(props: {
	label: string | undefined;
	switcher: Switcher | undefined;
	places: Datum<readonly PlaceSpec[]>;
	route: string | undefined;
	onPlace?: () => void;
}) {
	const { label, switcher, route, onPlace } = props;
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
				{label === undefined ? null : (
					<span className={cn(text({ role: "caption" }), SHELL_GROUP_LABEL)}>
						{label}
					</span>
				)}
				{switcher && !ended ? <SwitcherPick switcher={switcher} /> : null}
				{ended ? (
					<FrameBody frame={frame} fit="part" />
				) : waits ? (
					PAINTED_PLACES.map((at) => (
						<PaintedPlace key={`painted:${at}`} at={at} />
					))
				) : (
					specs.map((spec) => (
						<PlaceLink
							key={spec.route}
							spec={spec}
							route={route}
							onPlace={onPlace}
						/>
					))
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

// A place in the sidebar: its glyph, its label and its count.
function PlaceLink(props: {
	spec: PlaceSpec;
	route: string | undefined;
	onPlace?: () => void;
}) {
	const { spec, onPlace } = props;
	const current = spec.route === props.route;
	const state = current ? "selected" : "rest";
	return (
		<a
			href={spec.route}
			onClick={(event) => {
				follow(event);
				onPlace?.();
			}}
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
			<span
				className={cn(text({ role: "body" }), placeRowGlyph({ state }), LABEL)}
			>
				{spec.label}
			</span>
			{spec.count === undefined ? null : (
				<span className={cn(text({ role: "caption" }), PLACE_COUNT)}>
					{spec.count}
				</span>
			)}
		</a>
	);
}
