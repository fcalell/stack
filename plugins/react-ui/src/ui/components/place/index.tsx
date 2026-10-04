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
	BesideOpen,
	LendAct,
	type LentDetails,
	PageTitle,
	PlaceRoute,
	RecordOpen,
	RecordShown,
	ShellSwitcher,
	ThreadFills,
	useFootDocks,
} from "../../lib/frame.ts";
import { HeadingContext } from "../../lib/heading.ts";
import { useTouch } from "../../lib/media.ts";
import { useWords } from "../../lib/words.tsx";
import { Button } from "../button/index.tsx";
import { IconButtonBase, IconButtonLink } from "../icon-button/base.tsx";
import { IconButton } from "../icon-button/index.tsx";
import { Menu } from "../menu/index.tsx";

const PLACE = "flex flex-col grow min-h-0";
// A page is the size container what stands in it decides its structure by
// (a Split its regions, a Table its grid); the acts a Split lends hide by the
// same widths.
const PAGE = "@container/page group/page";
const BACK = "flex page-tablet:hidden";
const BESIDE_BACK = "flex page-max-tablet:hidden";
// A Split's lent Details act, drawn below `wide` of its page.
const DETAILS = "flex page-wide:hidden";
const DETAILS_BESIDE = "flex";
const HEAD = "flex flex-col";
// Below `tablet` of the page a record standing beside the main stands alone,
// its head the page's one, so the Place draws none.
const HEAD_BESIDE = "page-max-tablet:hidden";
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
const DOCKED = "flex flex-col shrink-0";
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

/** The Details act a Split lends its page: the trigger of its details sheet, drawn below `wide` of the page, and at every width while a record stands beside the main. */
export function Details(props: LentDetails & { fit: IconButtonFit }) {
	const words = useWords();
	return (
		<span className={props.beside ? DETAILS_BESIDE : DETAILS}>
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

/** A page under a head and its hairline: on the desktop the title and its acts share one strip; on touch the top bar (the shell's switcher, the actions, more) stands over the title and the act floats over the body's end, lifted. A `foot` docks at the page's bottom at both densities a sections gap under the body's end, the body scrolling under it, above the tab bar on touch; on the desktop it stands in the measure-wide column a Thread's foot stands in. A Place is the size container what stands in it decides its structure by (a Split its regions, a Table its grid): a Thread in its body fills it, unless the Place has a `foot`, where it stands among the sections; the Split lends it a Details act, drawn below `wide` of its width, and with a record open a back act to the place's route, drawn below `tablet` first: before the title in the strip, in the switcher's stead in the top bar. While a record stands beside the main, below `tablet` the Place draws no head: that record's head is the page's one. */
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
	const [lent, lend] = useState<LentDetails>();
	const [recordOpen, setRecordOpen] = useState(false);
	const [besideOpen, setBesideOpen] = useState(false);
	const [fills, setFills] = useState(false);
	const docked = useFootDocks();
	const fit = touch ? "body" : "bar";
	// The column is a structure that follows density, as the Thread's is.
	const column = !touch && THREAD_COLUMN;
	// A record standing alone returns to the list, the place's own route.
	const back =
		recordOpen && route !== undefined ? (
			<span className={BACK}>
				<IconButtonLink
					icon={backGlyph(touch)}
					fit={fit}
					label={words.back}
					href={route}
				/>
			</span>
		) : null;
	// On touch the shell's switcher leads the top bar, beside the back act
	// where the back act draws; on the desktop it stands in the sidebar.
	const lead = !touch ? null : back ? (
		<span className={BESIDE_BACK}>{switcher}</span>
	) : (
		switcher
	);
	const acts = (actions ?? []).map((action) => (
		<IconButton key={action.label} {...action} fit={fit} />
	));
	const details = lent ? <Details {...lent} fit={fit} /> : null;
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
	// On touch a top bar with nothing in it is not drawn; on the desktop the
	// strip always holds the title.
	const bar =
		!touch ||
		back !== null ||
		lead !== null ||
		acts.length > 0 ||
		details !== null ||
		overflow !== null;
	// The head is one tree on both densities, so crossing the density line
	// keeps its acts, their focus and an open sheet's trigger. Only the
	// title's place, the spacer and the strip's act differ, each a slot that
	// holds `null` where it does not draw, so the acts after it never shift.
	const head = (
		<header className={cn(PAGE_HEAD, HEAD, besideOpen && HEAD_BESIDE)}>
			{bar ? (
				<div className={cn(PAGE_TOP_BAR, ROW)}>
					{back}
					{lead}
					{touch ? null : heading}
					{touch ? <span className={SPACER} /> : null}
					{acts}
					{details}
					{overflow}
					{touch ? null : button}
				</div>
			) : null}
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
			className={
				fills ? BLEED : cn(PAGE_BODY, BODY, foot && PAGE_BODY_OVER_FOOT)
			}
		>
			<ThreadFills value={foot ? null : setFills}>{children}</ThreadFills>
			{floating ? (
				<div aria-hidden className={cn(FLOATING_ACT_ROOM, ACT_ROOM)} />
			) : null}
		</div>
	);
	return (
		<LendAct value={lend}>
			<RecordOpen value={setRecordOpen}>
				<BesideOpen value={setBesideOpen}>
					<RecordShown value={recordOpen}>
						<PageTitle value={titleId}>
							<HeadingContext value={2}>
								<div className={cn(PLACE, PAGE)}>
									{head}
									<div className={BODY_WRAP}>
										{body}
										{layer}
									</div>
									{foot ? (
										<div ref={docked} className={cn(FOOT, DOCKED)}>
											<div className={cn(column, FOOT_COLUMN)}>{foot}</div>
										</div>
									) : null}
								</div>
							</HeadingContext>
						</PageTitle>
					</RecordShown>
				</BesideOpen>
			</RecordOpen>
		</LendAct>
	);
}
