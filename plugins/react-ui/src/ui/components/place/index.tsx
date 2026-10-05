import { Dialog } from "@base-ui/react/dialog";
import { cn } from "@fcalell/ui-core/cn";
import type {
	Act,
	IconAct,
	MenuItem,
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
	text,
} from "@fcalell/ui-core/variants";
import { type ReactNode, use, useId, useRef, useState } from "react";
import { backGlyph } from "../../lib/back.ts";
import type { Closed } from "../../lib/closed.ts";
import { useFootFocus } from "../../lib/focus.ts";
import {
	ActRoom,
	DetailsSheet,
	FootPlace,
	PageTitle,
	PlaceRoute,
	ShellSwitcher,
	ThreadRoom,
} from "../../lib/frame.ts";
import { HeadingContext } from "../../lib/heading.ts";
import { DistanceContext, useTouch } from "../../lib/media.ts";
import { useScrolls } from "../../lib/scrolls.ts";
import { useWords } from "../../lib/words.tsx";
import { Button } from "../button/index.tsx";
import { IconButtonBase, IconButtonLink } from "../icon-button/base.tsx";
import { IconButton } from "../icon-button/index.tsx";
import { Menu } from "../menu/index.tsx";
import { PickerBase } from "../picker/base.tsx";
import { SwitcherPick } from "../shell/switcher.tsx";
import { splitOf } from "../split/index.tsx";
import { BODY_FILLED } from "../thread/fill.ts";

// The column clips what stands past its sides, so its docked foot's shadow
// never falls on the region beside it; its top stays open for the lift.
const PLACE = "flex flex-col grow min-h-0 overflow-x-clip";
// A page is the size container what stands in it decides its structure by
// (a Split its regions, a Table its grid); the acts a Split's marks show hide by the
// same widths.
const PAGE = "@container/page group/page";
// The head's acts for a Split, drawn from the first frame and shown by the
// marks its root carries (`DetailsSheet`): the back act to the list below
// `tablet` with a record open, the switcher giving it its place; the Details
// act below `wide` with a pane, and at every width beside a record. A touch
// top bar holding nothing else stands only while one of them shows.
const BACK = "hidden page-max-tablet:group-has-data-record/page:flex";
const BESIDE_BACK = "flex page-max-tablet:group-has-data-record/page:hidden";
export const DETAILS =
	"hidden page-max-wide:group-has-data-pane/page:flex group-has-[[data-pane][data-beside]]/page:flex";
const ROW_MARKED =
	"hidden items-center page-max-tablet:group-has-data-record/page:flex page-max-wide:group-has-data-pane/page:flex group-has-[[data-pane][data-beside]]/page:flex";
const HEAD = "flex flex-col";
// Below `tablet` of the page a record standing beside the main stands alone,
// its head the page's one, so the Place draws none; its title stays read as
// an unseen `h1`, so the page keeps its `h1` and the record its level.
const HEAD_BESIDE = "page-max-tablet:group-has-data-beside/page:hidden";
const TITLE_ALONE =
	"sr-only hidden page-max-tablet:group-has-data-beside/page:block";
const ROW = "flex items-center";
const SPACER = "grow";
const TITLE = "min-w-0 grow truncate";
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
// The foot stays under the body, which scrolls past it, and spans it; a field
// keeps its own measure column inside, which the foot centres on the desktop.
// The docked foot names itself the anchor the Shell's toasts stand above.
const DOCKED = "flex flex-col shrink-0 [anchor-name:--docked-foot]";
const DOCKED_CENTRES = "items-center";
const ACT_ROOM = "shrink-0";
// The layer marks itself `data-act-floats`: the Shell's toasts stand above
// the act by its room while the mark stands in its column.
const ACT_LAYER =
	"absolute inset-0 flex flex-col items-center justify-end pointer-events-none";
const ACT_HIT = "flex pointer-events-auto";
// From `tablet` of its page a Split's list stands at the body's start, and
// the layer covers its column alone, so the act centres on the list.
const BESIDE_LIST =
	"page-tablet:group-has-data-split/page:right-auto page-tablet:group-has-data-split/page:w-list";

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
	/** The page's title, its one `h1`. */
	title: string;
	/** The context the page is read in (a change set, a version): a pick beside the title, its option's chip on its trigger, `act` ending its list. */
	context?: Switcher;
	/** Icon acts beside the title, in order. */
	actions?: IconAct[];
	/** The acts past the actions, in a menu under the more act. */
	more?: MenuItem[];
	/** The body runs edge to edge with no inset, and its child scrolls itself. */
	bleed?: boolean;
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

/** A page under a head and its hairline: on the desktop the title, its `context` pick and its acts share one strip, on touch the pick stands on the title line under the top bar; on touch the top bar (the shell's switcher, the actions, more) stands over the title and the act floats over the body's end, lifted. A `foot` docks at the page's bottom at both densities a sections gap under the body's end, the body scrolling under it, above the tab bar on touch; it spans the body, and a `MessageInput` keeps its own measure column inside it. A Place is the size container what stands in it decides its structure by (a Split its regions, a Table its grid): a Thread in its body fills it, unless the Place has a `foot`, where it stands among the sections; it draws the Details act of a Split's pane, below `wide` of its width, and with a record open a back act to the place's route (or to the `back` of the Split standing as its direct child), drawn below `tablet` first: before the title in the strip, in the switcher's stead in the top bar. While a record stands beside the main, below `tablet` the Place draws no head, its `h1` staying read, unseen: that record's head is the page's one. With `distance` `room` it draws the room set and the touch structure, without the shell's switcher. */
export function Place({
	title,
	distance,
	context,
	actions,
	act,
	more,
	bleed,
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
	const stop = useScrolls(bodyNode, "y");
	const [sheet] = useState(() => Dialog.createHandle<unknown>());
	const dock = useRef<HTMLDivElement>(null);
	useFootFocus(dock);
	const fit = touch ? "body" : "bar";
	const back =
		list !== undefined ? (
			<span className={BACK}>
				<IconButtonLink
					icon={backGlyph(touch)}
					fit={fit}
					label={words.back}
					href={list}
				/>
			</span>
		) : null;
	// On touch the shell's switcher leads the top bar, giving the back act its
	// place where the back act shows; on the desktop it stands in the sidebar.
	const pick =
		switcher && !far ? <SwitcherPick switcher={switcher} touch /> : null;
	const lead = !touch ? null : back ? (
		<span className={BESIDE_BACK}>{pick}</span>
	) : (
		pick
	);
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
				context ? TITLE_FIT : TITLE,
				touch && !context && PAGE_TITLE,
			)}
		>
			{title}
		</h1>
	);
	// The pick stands right after the title on the title line, on touch under
	// the top bar as on the desktop in the strip.
	const line = context ? (
		<div className={cn(TITLE_LINE, touch && PAGE_TITLE)}>
			{heading}
			<span className={CONTEXT}>
				<PickerBase {...context} fit="row" align="start" />
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
	// On touch a top bar with nothing else in it stands only while the Split's
	// marks show its back or Details act; on the desktop the
	// strip always holds the title.
	const bar = !touch || lead !== null || acts.length > 0 || overflow !== null;
	// The head is one tree on both densities, so crossing the density line
	// keeps its acts, their focus and an open sheet's trigger. Only the
	// title's place, the spacer and the strip's act differ, each a slot that
	// holds `null` where it does not draw, so the acts after it never shift.
	const head = (
		<header className={cn(PAGE_HEAD, far && PAGE_HEAD_ROOM, HEAD, HEAD_BESIDE)}>
			<div className={cn(PAGE_TOP_BAR, bar ? ROW : ROW_MARKED)}>
				{back}
				{lead}
				{touch ? null : line}
				{touch ? <span className={SPACER} /> : null}
				{acts}
				{details}
				{overflow}
				{touch ? null : button}
			</div>
			{touch ? line : null}
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
			className={cn(PAGE_BODY, BODY, foot ? PAGE_BODY_OVER_FOOT : BODY_FILLED)}
		>
			<ThreadRoom value={!foot}>{children}</ThreadRoom>
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
							className={cn(PLACE, PAGE)}
						>
							<h1 className={TITLE_ALONE}>{title}</h1>
							{head}
							<div className={BODY_WRAP}>
								{body}
								{layer}
							</div>
							{foot ? (
								<div
									ref={dock}
									className={cn(FOOT_DOCKED, DOCKED, !touch && DOCKED_CENTRES)}
								>
									<FootPlace value="docked">{foot}</FootPlace>
								</div>
							) : null}
						</div>
					</HeadingContext>
				</PageTitle>
			</DistanceContext>
		</DetailsSheet>
	);
}
