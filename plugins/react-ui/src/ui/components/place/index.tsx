import { Dialog } from "@base-ui/react/dialog";
import { cn } from "@fcalell/ui-core/cn";
import type {
	Act,
	IconAct,
	MenuItem,
	Route,
	Switcher,
} from "@fcalell/ui-core/descriptors";
import {
	FLOATING_ACT,
	FLOATING_ACT_FOOT,
	FLOATING_ACT_LIFT,
	FLOATING_ACT_ROOM,
	FOOT_DOCKED,
	type IconButtonFit,
	PAGE_BODY,
	PAGE_BODY_OVER_FOOT,
	PAGE_HEAD,
	PAGE_HEAD_ROOM,
	PAGE_TITLE,
	PAGE_TOP_BAR,
	PAGE_TOP_BAR_END,
	PAGE_TOP_BAR_START,
	PAGE_TOP_BAR_TOUCH,
	text,
} from "@fcalell/ui-core/variants";
import { type ReactNode, use, useId, useRef, useState } from "react";
import { backGlyph, LIST_BACK, LIST_BACK_REPLACED } from "../../lib/back.ts";
import type { Closed } from "../../lib/closed.ts";
import { useFootFocus } from "../../lib/focus.ts";
import {
	ActRoom,
	DetailsSheet,
	FootPlace,
	FootRegion,
	PageTitle,
	PlaceRoute,
	ShellSwitcher,
	ThreadRoom,
	useFootRegion,
} from "../../lib/frame.ts";
import { HeadingContext } from "../../lib/heading.ts";
import { DistanceContext, useTouch } from "../../lib/media.ts";
import { useScrolls } from "../../lib/scrolls.ts";
import { useWords } from "../../lib/words.tsx";
import { Button } from "../button/index.tsx";
import { IconButtonBase, IconButtonLink } from "../icon-button/base.tsx";
import { IconButton } from "../icon-button/index.tsx";
import { headPaired } from "../item-header/pair.tsx";
import { Menu } from "../menu/index.tsx";
import { PickerBase } from "../picker/base.tsx";
import { SwitcherPick } from "../shell/switcher.tsx";
import { splitOf } from "../split/index.tsx";
import { BODY_FILLED, PART_ABOVE_FILLED } from "../thread/fill.ts";

const PLACE = "flex flex-col grow min-h-0";
// A page is the size container what stands in it decides its structure by
// (a Split its regions, a Table its grid); the acts a Split's marks show hide by the
// same widths. It marks itself `data-page`, which a Table reads its width by
// (`usePageTablet`).
const PAGE = "@container/page group/page";
// The head's acts for a Split, drawn from the first frame and shown by the
// marks its root carries (`DetailsSheet`): the back act to the list below
// `tablet` with a record open, the switcher giving it its place; the Details
// act below `wide` with a pane, and at every width beside a record. A touch
// top bar holding nothing else stands only while one of them shows.
export const DETAILS =
	"hidden page-max-wide:group-has-data-pane/page:flex group-has-[[data-pane][data-beside]]/page:flex";
export const ROW_MARKED =
	"hidden items-center page-max-tablet:group-has-data-record/page:flex page-max-wide:group-has-data-pane/page:flex group-has-[[data-pane][data-beside]]/page:flex";
const HEAD = "flex flex-col";
// Below `tablet` of the page a record standing beside the main stands alone,
// its head the page's one, so the Place draws none.
const HEAD_BESIDE = "page-max-tablet:group-has-data-beside/page:hidden";
const ROW = "flex items-center";
const ACTS = "flex items-center gap-acts";
const SPACER = "grow";
const TITLE = "min-w-0 grow truncate";
// On touch with no switcher the title shares its row with the acts and wraps
// before them.
export const TITLE_WRAP = "min-w-0 grow";
// With a context the title and its pick stand on one line a pair apart, the
// line taking the spacer's room; the pick's list hangs from its start.
const TITLE_LINE = "flex min-w-0 grow flex-wrap items-center gap-pair";
const TITLE_FIT = "min-w-0 max-w-full truncate";
// Where the line is short the pick yields first: it drops under the title,
// whole, so the title keeps its words.
const CONTEXT = "inline-flex shrink-0";
// The body fills the column, so an EmptyState alone in it centres, and
// scrolls under the fixed head; a bleeding body fills the rest and
// leaves scrolling, and its top inset, to its child. It takes a tab stop only
// while it scrolls with nothing tabbable inside.
const BODY =
	"flex flex-col grow overflow-y-auto focus-visible:-outline-offset-2";
const BLEED = "flex flex-col grow min-h-0";
const BODY_WRAP = "relative flex flex-col grow min-h-0";
// What the body and the docked foot share: the head stands outside it, so the
// foot's bound is the whole of it and the body keeps the rest. With a foot
// its measurement bounds a docked sheet's body (`FootRegion`).
const REGION = "flex flex-col grow min-h-0";
// The foot stays under the body, which scrolls past it, and spans it; a field
// keeps its own measure column inside, which the foot centres at every density,
// so a selection bar wider than the screen's measure stands centred on touch too.
// The docked foot names itself the anchor the Shell's toasts stand above.
const DOCKED =
	"flex flex-col items-center shrink-0 [anchor-name:--docked-foot]";
const ACT_ROOM = "shrink-0";
// The layer marks itself `data-act-floats`: the Shell's toasts stand above
// the act by its room while the mark stands in its column.
const ACT_LAYER =
	"absolute inset-0 flex flex-col items-center justify-end pointer-events-none";
const ACT_HIT = "flex pointer-events-auto";
// From `tablet` of its page a Split's list stands at the body's start, and
// the layer covers its column alone, so the act centres on the list: the list
// sizes to its content, so the layer takes its edges from the list's anchor.
const BESIDE_LIST =
	"page-tablet:group-has-data-split/page:left-[anchor(--split-list_left,0px)] page-tablet:group-has-data-split/page:right-[anchor(--split-list_right,0px)]";

// The floating act's room under what scrolls past it, or the toasts that
// stand above it: the act's height over the page inset it floats at.
export function FloatingActRoom() {
	return (
		<div aria-hidden className={cn(FLOATING_ACT_FOOT, ACT_ROOM)}>
			<div className={FLOATING_ACT_ROOM} />
		</div>
	);
}

/** The Details act a page draws for a Split's pane: the trigger of the details sheet, shown by `shown`. */
export function Details(props: {
	sheet: Dialog.Handle<unknown>;
	fit: IconButtonFit;
	shown: string;
}) {
	const words = useWords();
	return (
		<span className={props.shown}>
			<Dialog.Trigger
				handle={props.sheet}
				render={
					<IconButtonBase
						icon="PanelRight"
						fit={props.fit}
						label={words.details}
					/>
				}
			/>
		</span>
	);
}

interface PlaceBase extends Closed {
	/** The page's title, its one `h1` (a short phrase; truncates). */
	title: string;
	/** The context the page is read in (a change set, a version): a pick beside the title, its option's chip on its trigger, `act` ending its list. */
	context?: Switcher;
	/** Icon acts beside the title, in order. */
	actions?: IconAct[];
	/** The acts past the actions, in a menu under the more act. */
	more?: MenuItem[];
	/** The body runs edge to edge with no inset, and its child scrolls itself. */
	bleed?: boolean;
	/** The route of the view this page stands under (an epic's board under the board of epics): its back act leads there while no record stands alone. */
	up?: Route;
	/** The page's sections. */
	children?: ReactNode;
}

/** The page's one filled act, or the field or action bar docked at its foot whose send or filled act is that act: never both. */
type PlaceEnd =
	| {
			/** The page's one filled act: rightmost in the desktop strip, floating over the body's end on touch. */
			act?: Act;
			foot?: never;
	  }
	| {
			/** The field (a `MessageInput`) or the selection bar (an `ActionBar` with `chosen`) docked at the page's foot, the sections scrolling under it. */
			foot?: ReactNode;
			act?: never;
	  };

/** Where the page is read from: a screen across a room draws the room set, which no query detects, so the page states it. */
type PlaceDistance =
	| { distance?: undefined }
	| {
			/** The page is read from across a room: the room set and the touch structure, in one column that never splits, with no `context`, `more` or `foot`. */
			distance: "room";
			context?: never;
			more?: never;
			foot?: never;
	  };

/** A page in the shell. */
export type PlaceProps = PlaceBase & PlaceEnd & PlaceDistance;

/** A page under a head and its hairline: on the desktop the title, its `context` pick and its acts share one strip, on touch the pick stands on the title line under the top bar; on touch the top bar (the shell's switcher, the actions, more) stands over the title and the act floats over the body's end, lifted. A `foot` docks at the page's bottom at both densities a sections gap under the body's end, the body scrolling under it, above the tab bar on touch; it spans the body, and a `MessageInput` keeps its own measure column inside it. A Place is the size container what stands in it decides its structure by (a Split its regions, a Table its grid): a Thread in its body fills it, unless the Place has a `foot`, where it stands among the sections; it draws the Details act of a Split's pane, below `wide` of its width, and with a record open a back act to the place's route (or to the `back` of the Split standing as its direct child), drawn below `tablet` first: before the title in the strip, in the switcher's stead in the top bar. A page whose list stands at a route deeper than the place's own names the view above it as `up`: a back act to it leads the strip, or the top bar in the switcher's stead, at every width, giving way below `tablet` with a record open to the record's back act. While a record stands beside the main, below `tablet` the Place draws no head: that record's head is the page's one. With `distance` `room` it draws the room set and the touch structure, without the shell's switcher. */
export function Place({
	title,
	distance,
	context,
	actions,
	act,
	more,
	bleed,
	up,
	foot,
	children,
}: PlaceProps) {
	const far = distance === "room";
	const touch = useTouch() || far;
	const words = useWords();
	const switcher = use(ShellSwitcher);
	// A record standing alone returns to the list: the place's own route, or
	// where the Split in the body says its list stands.
	const route = use(PlaceRoute);
	const list = splitOf(children)?.back ?? route;
	const titleId = useId();
	const [bodyNode, setBodyNode] = useState<HTMLDivElement | null>(null);
	const stop = useScrolls(bodyNode);
	const [sheet] = useState(() => Dialog.createHandle<unknown>());
	const dock = useRef<HTMLDivElement>(null);
	const region = useFootRegion(dock, false);
	useFootFocus(dock);
	const fit = touch ? "body" : "bar";
	// With no switcher the touch top bar is the title's row, as the strip is on
	// the desktop; a room Place and one with a switcher keep the bar over the
	// title.
	const single = !touch || (!far && !switcher);
	const back =
		list !== undefined ? (
			<span className={cn(LIST_BACK, touch && single && PAGE_TOP_BAR_START)}>
				<IconButtonLink
					icon={backGlyph(touch)}
					fit={fit}
					label={words.back}
					href={list}
				/>
			</span>
		) : null;
	// The view above leads the strip or the top bar where the record's back act
	// is not shown; on touch it takes the switcher's place, which stays on the
	// places' own level.
	const upAct =
		up !== undefined ? (
			<span
				className={cn(
					LIST_BACK_REPLACED,
					touch && single && PAGE_TOP_BAR_START,
				)}
			>
				<IconButtonLink
					icon={backGlyph(touch)}
					fit={fit}
					label={words.back}
					href={up}
				/>
			</span>
		) : null;
	// On touch the shell's switcher leads the top bar, giving the back act its
	// place where the back act shows; on the desktop it stands in the sidebar.
	const pick =
		switcher && !far ? <SwitcherPick switcher={switcher} touch /> : null;
	const lead =
		upAct ??
		(!touch || !pick ? null : back ? (
			<span className={LIST_BACK_REPLACED}>{pick}</span>
		) : (
			pick
		));
	const acts = (actions ?? []).map((action) => (
		<IconButton key={action.label} {...action} fit={fit} />
	));
	const details = <Details sheet={sheet} fit={fit} shown={DETAILS} />;
	const overflow = more?.length ? (
		<Menu label={words.more} items={more} />
	) : null;
	const heading = (
		<h1
			id={titleId}
			className={cn(
				text({ role: "title" }),
				context ? TITLE_FIT : touch && single ? TITLE_WRAP : TITLE,
				touch && !single && !context && PAGE_TITLE,
			)}
		>
			{title}
		</h1>
	);
	// The pick stands right after the title on the title line, on touch under
	// the top bar as on the desktop in the strip.
	const line = context ? (
		<div className={cn(TITLE_LINE, touch && !single && PAGE_TITLE)}>
			{heading}
			<span className={CONTEXT}>
				<PickerBase {...context} fit="row" />
			</span>
		</div>
	) : (
		heading
	);
	// The page's act is its create act by rule, so it carries the plus.
	const button = act ? (
		<Button
			fit={fit}
			icon="Plus"
			label={act.label}
			onAct={act.onAct}
			loading={act.loading}
			blocked={act.blocked}
		/>
	) : null;
	const floating = touch && button !== null;
	const layer = floating ? (
		<div
			data-act-floats
			className={cn(FLOATING_ACT, ACT_LAYER, bleed && BESIDE_LIST)}
		>
			<span className={cn(FLOATING_ACT_LIFT, ACT_HIT)}>{button}</span>
		</div>
	) : null;
	// A bleeding body hands the act's room to the regions that scroll inside
	// it: the act's height over the page inset, since such a region keeps no
	// inset of its own.
	const room = floating ? <FloatingActRoom /> : null;
	// A top bar over the title with nothing else in it stands only while the
	// Split's marks show its back or Details act; the row holding the title
	// always stands.
	const bar = single || lead !== null || acts.length > 0 || overflow !== null;
	// The head is one tree on both densities, so crossing the density line
	// keeps its acts, their focus and an open sheet's trigger. Only the
	// title's place, the spacer and the strip's act differ, each a slot that
	// holds `null` where it does not draw, so the acts after it never shift.
	const head = (
		<header className={cn(PAGE_HEAD, far && PAGE_HEAD_ROOM, HEAD, HEAD_BESIDE)}>
			<div
				className={cn(
					PAGE_TOP_BAR,
					touch && !single && PAGE_TOP_BAR_TOUCH,
					bar ? ROW : ROW_MARKED,
				)}
			>
				{back}
				{lead}
				{single ? line : null}
				{single ? null : <span className={SPACER} />}
				<span className={cn(ACTS, touch && single && PAGE_TOP_BAR_END)}>
					{acts}
					{details}
					{overflow}
					{touch ? null : button}
				</span>
			</div>
			{single ? null : line}
		</header>
	);
	// A Thread in the body fills it, as a bleeding body's child does: no
	// inset, its log scrolling. Over a docked foot it stands among the
	// sections, the foot the page's one input.
	const body = bleed ? (
		<div className={BLEED}>
			<ActRoom value={room}>{children}</ActRoom>
		</div>
	) : (
		<div
			ref={setBodyNode}
			tabIndex={stop ? 0 : undefined}
			className={cn(
				PAGE_BODY,
				BODY,
				foot ? PAGE_BODY_OVER_FOOT : cn(BODY_FILLED, PART_ABOVE_FILLED),
			)}
		>
			<ThreadRoom value={!foot}>{headPaired(children)}</ThreadRoom>
			{floating ? (
				<div aria-hidden className={cn(FLOATING_ACT_ROOM, ACT_ROOM)} />
			) : null}
		</div>
	);
	return (
		<DetailsSheet value={sheet}>
			<DistanceContext value={far}>
				<PageTitle value={titleId}>
					<HeadingContext value={2}>
						<div
							data-density={far ? "room" : undefined}
							data-foot={foot ? "" : undefined}
							data-page=""
							className={cn(PLACE, PAGE)}
						>
							{head}
							<div ref={foot ? region.ref : undefined} className={REGION}>
								<div className={BODY_WRAP}>
									{body}
									{layer}
								</div>
								{foot ? (
									<div ref={dock} className={cn(FOOT_DOCKED, DOCKED)}>
										<FootPlace value="docked">
											<FootRegion value={region.value}>{foot}</FootRegion>
										</FootPlace>
									</div>
								) : null}
							</div>
						</div>
					</HeadingContext>
				</PageTitle>
			</DistanceContext>
		</DetailsSheet>
	);
}
