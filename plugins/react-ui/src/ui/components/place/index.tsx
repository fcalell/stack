import { Dialog } from "@base-ui/react/dialog";
import { cn } from "@fcalell/ui-core/cn";
import type {
	Act,
	IconAct,
	IconName,
	MenuItem,
} from "@fcalell/ui-core/descriptors";
import {
	FLOATING_ACT,
	FLOATING_ACT_FOOT,
	FLOATING_ACT_LIFT,
	FLOATING_ACT_ROOM,
	FOOT,
	type IconButtonFit,
	PAGE_BODY,
	PAGE_BODY_OVER_FOOT,
	PAGE_HEAD,
	PAGE_TITLE,
	PAGE_TOP_BAR,
	THREAD_COLUMN,
	text,
} from "@fcalell/ui-core/variants";
import { type ReactNode, use, useId, useState } from "react";
import type { Closed } from "../../lib/closed.ts";
import {
	ActRoom,
	DetailsSheet,
	PageTitle,
	PlaceRoute,
	ShellSwitcher,
	ThreadRoom,
} from "../../lib/frame.ts";
import { HeadingContext } from "../../lib/heading.ts";
import { useTouch } from "../../lib/media.ts";
import { useWords } from "../../lib/words.tsx";
import { Button } from "../button/index.tsx";
import { IconButtonBase, IconButtonLink } from "../icon-button/base.tsx";
import { IconButton } from "../icon-button/index.tsx";
import { Menu } from "../menu/index.tsx";
import { SwitcherPick } from "../shell/switcher.tsx";
import { BODY_FILLED } from "../thread/fill.ts";

const PLACE = "flex flex-col grow min-h-0";
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
// its head the page's one, so the Place draws none.
const HEAD_BESIDE = "page-max-tablet:group-has-data-beside/page:hidden";
const ROW = "flex items-center";
const SPACER = "grow";
const TITLE = "min-w-0 grow truncate";
// The body fills the column, so an EmptyState alone in it centres, and
// scrolls under the fixed head; a bleeding body fills the rest and
// leaves scrolling, and its top inset, to its child.
const BODY = "flex flex-col grow overflow-y-auto";
const BLEED = "flex flex-col grow min-h-0";
const BODY_WRAP = "relative flex flex-col grow min-h-0";
// The foot stays under the body, which scrolls past it; on the desktop it
// stands in the measure-wide column a Thread's foot stands in.
// The docked foot names itself the anchor the Shell's toasts stand above.
const DOCKED = "flex flex-col shrink-0 [anchor-name:--docked-foot]";
const FOOT_COLUMN = "flex flex-col";
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

/** The back act's glyph, shared by the Place and the Screen. */
export function backGlyph(touch: boolean): IconName {
	return touch ? "ChevronLeft" : "ArrowLeft";
}

interface PlaceBase extends Closed {
	/** The page's title, its one `h1`. */
	title: string;
	/** Icon acts beside the title, in order. */
	actions?: IconAct[];
	/** The acts past the actions, in a menu under the more act. */
	more?: MenuItem[];
	/** The body runs edge to edge with no inset, and its child scrolls itself. */
	bleed?: boolean;
	/** The page's sections. */
	children?: ReactNode;
}

/** The page's one filled act, or the field docked at its foot whose send is that act: never both. */
type PlaceEnd =
	| {
			/** The page's one filled act: rightmost in the desktop strip, floating over the body's end on touch. */
			act?: Act;
			foot?: never;
	  }
	| {
			/** The field docked at the page's foot (a `MessageInput`), the sections scrolling under it. */
			foot?: ReactNode;
			act?: never;
	  };

/** A page in the shell. */
export type PlaceProps = PlaceBase & PlaceEnd;

/** A page under a head and its hairline: on the desktop the title and its acts share one strip; on touch the top bar (the shell's switcher, the actions, more) stands over the title and the act floats over the body's end, lifted. A `foot` docks at the page's bottom at both densities a sections gap under the body's end, the body scrolling under it, above the tab bar on touch; on the desktop it stands in the measure-wide column a Thread's foot stands in. A Place is the size container what stands in it decides its structure by (a Split its regions, a Table its grid): a Thread in its body fills it, unless the Place has a `foot`, where it stands among the sections; it draws the Details act of a Split's pane, below `wide` of its width, and with a record open a back act to the place's route, drawn below `tablet` first: before the title in the strip, in the switcher's stead in the top bar. While a record stands beside the main, below `tablet` the Place draws no head: that record's head is the page's one. */
export function Place({
	title,
	actions,
	act,
	more,
	bleed,
	foot,
	children,
}: PlaceProps) {
	const touch = useTouch();
	const words = useWords();
	const switcher = use(ShellSwitcher);
	const route = use(PlaceRoute);
	const titleId = useId();
	const [sheet] = useState(() => Dialog.createHandle<unknown>());
	const fit = touch ? "body" : "bar";
	// The column is a structure that follows density, as the Thread's is.
	const column = !touch && THREAD_COLUMN;
	// A record standing alone returns to the list, the place's own route.
	const back =
		route !== undefined ? (
			<span className={BACK}>
				<IconButtonLink
					icon={backGlyph(touch)}
					fit={fit}
					label={words.back}
					href={route}
				/>
			</span>
		) : null;
	// On touch the shell's switcher leads the top bar, giving the back act its
	// place where the back act shows; on the desktop it stands in the sidebar.
	const pick = switcher ? <SwitcherPick switcher={switcher} touch /> : null;
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
			className={cn(text({ role: "title" }), TITLE, touch && PAGE_TITLE)}
		>
			{title}
		</h1>
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
		<header className={cn(PAGE_HEAD, HEAD, HEAD_BESIDE)}>
			<div className={cn(PAGE_TOP_BAR, bar ? ROW : ROW_MARKED)}>
				{back}
				{lead}
				{touch ? null : heading}
				{touch ? <span className={SPACER} /> : null}
				{acts}
				{details}
				{overflow}
				{touch ? null : button}
			</div>
			{touch ? heading : null}
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
			<PageTitle value={titleId}>
				<HeadingContext value={2}>
					<div className={cn(PLACE, PAGE)}>
						{head}
						<div className={BODY_WRAP}>
							{body}
							{layer}
						</div>
						{foot ? (
							<div className={cn(FOOT, DOCKED)}>
								<div className={cn(column, FOOT_COLUMN)}>{foot}</div>
							</div>
						) : null}
					</div>
				</HeadingContext>
			</PageTitle>
		</DetailsSheet>
	);
}
