import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import { cn } from "@fcalell/ui-core/cn";
import type {
	Act,
	IconAct,
	IconName,
	MenuItem,
} from "@fcalell/ui-core/descriptors";
import {
	FLOATING_ACT,
	FLOATING_ACT_ROOM,
	type IconButtonFit,
	iconButton,
	PAGE_BODY,
	PAGE_HEAD,
	PAGE_STRIP,
	PAGE_TOP_BAR,
	POPOVER,
	row,
	text,
} from "@fcalell/ui-core/variants";
import { type ReactNode, use, useId, useState } from "react";
import type { Closed } from "../../lib/closed.ts";
import {
	ActRoom,
	LendAct,
	PageTitle,
	PlaceRoute,
	RecordOpen,
	ShellSwitcher,
} from "../../lib/frame.ts";
import { HeadingContext } from "../../lib/heading.ts";
import { spacing, useTouch } from "../../lib/media.ts";
import { navigate } from "../../lib/navigate.ts";
import { PortalContainer } from "../../lib/portal.ts";
import { useWords } from "../../lib/words.tsx";
import { Button } from "../button/index.tsx";
import { Icon } from "../icon/index.tsx";
import { IconButton } from "../icon-button/index.tsx";

const PLACE = "flex flex-col grow min-h-0";
// A bleeding page is the size container a Split inside decides its regions
// by; the acts it lends hide by the same widths.
const PAGE = "@container/page";
const BACK = "flex page-tablet:hidden";
const BESIDE_BACK = "flex page-max-tablet:hidden";
// A Split's lent Details act, drawn below `wide` of its page.
const DETAILS = "flex page-wide:hidden";
const HEAD = "flex flex-col";
const ROW = "flex items-center";
const SPACER = "grow";
const TITLE = "min-w-0 grow truncate";
// The body scrolls under the fixed head; a bleeding body fills the rest and
// leaves scrolling, and its top inset, to its child.
const BODY = "flex flex-col overflow-y-auto";
const BLEED = "flex flex-col grow min-h-0";
const BODY_WRAP = "relative flex flex-col grow min-h-0";
const ACT_ROOM = "shrink-0";
const ACT_LAYER =
	"absolute inset-0 flex flex-col items-center justify-end pointer-events-none";
const ACT_HIT = "flex pointer-events-auto";

// The more and Details acts are an IconButton's box on their popup's
// trigger; the more act stays pressed while its menu is open.
const ACT_BOX = "relative inline-flex items-center justify-center shrink-0";
const ACT_PRESS =
	"hover:bg-wash-hover hover:text-ink-body active:bg-wash-press active:text-ink-body";
const MORE_OPEN = "data-popup-open:bg-wash-press data-popup-open:text-ink-body";
const MENU = "flex flex-col w-popover";
const MENU_ROWS = "flex flex-col gap-rows";
// The highlight wash marks the keyboard's row, so a row draws no ring.
const MENU_ROW = "flex items-center outline-none";
const MENU_GLYPH = "flex shrink-0 text-ink-meta";
const MENU_LINE = "flex flex-col min-w-0 grow";
const MENU_LABEL = "truncate";
const MENU_DANGER = "text-danger";

/** The overflow of a page's acts: an icon act that opens a menu of `MenuItem`s, a destructive one in danger ink, a blocked one inert with its reason under its label. */
export function More(props: {
	items: readonly MenuItem[];
	fit: IconButtonFit;
}) {
	const words = useWords();
	const container = use(PortalContainer);
	return (
		<Menu.Root modal={false}>
			<Menu.Trigger
				render={(trigger) => (
					<button
						{...trigger}
						aria-label={words.more}
						className={cn(
							iconButton({ fit: props.fit }),
							ACT_BOX,
							ACT_PRESS,
							MORE_OPEN,
						)}
					>
						<Icon name="Ellipsis" fit="control" />
					</button>
				)}
			/>
			<Menu.Portal container={container}>
				<Menu.Positioner align="end" sideOffset={() => spacing("pair")}>
					<Menu.Popup className={cn(POPOVER, MENU)}>
						<div className={MENU_ROWS}>
							{props.items.map((item) => (
								<Menu.Item
									key={item.label}
									label={item.label}
									onClick={item.onAct}
									disabled={item.blocked !== undefined}
									className={(state) =>
										cn(
											row({
												state: state.highlighted ? "highlighted" : "rest",
											}),
											MENU_ROW,
										)
									}
								>
									{item.icon ? (
										<span className={MENU_GLYPH}>
											<Icon name={item.icon} />
										</span>
									) : null}
									<span className={MENU_LINE}>
										<span
											className={cn(
												text({ role: "body" }),
												MENU_LABEL,
												item.destructive && MENU_DANGER,
											)}
										>
											{item.label}
										</span>
										{item.blocked ? (
											<span className={text({ role: "meta" })}>
												{item.blocked}
											</span>
										) : null}
									</span>
								</Menu.Item>
							))}
						</div>
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
}

/** The Details act a Split lends its page: the trigger of its details sheet, drawn below `wide` of the page. */
export function Details(props: {
	sheet: Dialog.Handle<unknown>;
	fit: IconButtonFit;
}) {
	const words = useWords();
	return (
		<span className={DETAILS}>
			<Dialog.Trigger
				handle={props.sheet}
				aria-label={words.details}
				className={cn(iconButton({ fit: props.fit }), ACT_BOX, ACT_PRESS)}
			>
				<Icon name="PanelRight" fit="control" />
			</Dialog.Trigger>
		</span>
	);
}

/** The back act's glyph, shared by the Place and the Screen. */
export function backGlyph(touch: boolean): IconName {
	return touch ? "ChevronLeft" : "ArrowLeft";
}

/** A page in the shell. */
export interface PlaceProps extends Closed {
	/** The page's title, its one `h1`. */
	title: string;
	/** Icon acts beside the title, in order. */
	actions?: IconAct[];
	/** The page's one filled act: rightmost in the desktop strip, floating over the body's end on touch. */
	act?: Act;
	/** The acts past the actions, in a menu under the more act. */
	more?: MenuItem[];
	/** The body runs edge to edge with no inset, and its child scrolls itself. */
	bleed?: boolean;
	/** The page's sections. */
	children?: ReactNode;
}

/** A page: on the desktop the title and its acts share one strip under a hairline; on touch the top bar (the shell's switcher, the actions, more) stands over the title and the act floats over the body's end. A bleeding Place is the size container a Split inside decides its regions by: the Split lends it a Details act, drawn below `wide` of its width, and with a record open a back act to the place's route, drawn below `tablet` first: before the title in the strip, in the switcher's stead in the top bar. */
export function Place({
	title,
	actions,
	act,
	more,
	bleed,
	children,
}: PlaceProps) {
	const touch = useTouch();
	const words = useWords();
	const switcher = use(ShellSwitcher);
	const route = use(PlaceRoute);
	const titleId = useId();
	const [sheet, lend] = useState<Dialog.Handle<unknown>>();
	const [recordOpen, setRecordOpen] = useState(false);
	const fit = touch ? "body" : "bar";
	// A record standing alone returns to the list, the place's own route.
	const back =
		recordOpen && route !== undefined ? (
			<span className={BACK}>
				<IconButton
					icon={backGlyph(touch)}
					fit={fit}
					label={words.back}
					onAct={() => navigate(route)}
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
	const details = sheet ? <Details sheet={sheet} fit={fit} /> : null;
	const overflow = more?.length ? <More items={more} fit={fit} /> : null;
	const heading = (
		<h1 id={titleId} className={cn(text({ role: "title" }), TITLE)}>
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
	// A bleeding body hands the act's room to the regions that scroll inside
	// it: the act's whole footprint, since such a region keeps no page inset.
	const room = floating ? (
		<div aria-hidden className={cn(FLOATING_ACT, ACT_ROOM)}>
			<div className={FLOATING_ACT_ROOM} />
		</div>
	) : null;
	// The head is one tree on both densities, so crossing the density line
	// keeps its acts, their focus and an open sheet's trigger. Only the
	// title's place, the spacer and the strip's act differ, each a slot that
	// holds `null` where it does not draw, so the acts after it never shift.
	const head = (
		<header className={cn(touch && PAGE_HEAD, HEAD)}>
			<div className={cn(touch ? PAGE_TOP_BAR : PAGE_STRIP, ROW)}>
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
	const body = bleed ? (
		<div className={BLEED}>
			<ActRoom value={room}>{children}</ActRoom>
		</div>
	) : (
		<div className={cn(PAGE_BODY, BODY)}>
			{children}
			{floating ? (
				<div aria-hidden className={cn(FLOATING_ACT_ROOM, ACT_ROOM)} />
			) : null}
		</div>
	);
	return (
		<LendAct value={lend}>
			<RecordOpen value={setRecordOpen}>
				<PageTitle value={titleId}>
					<HeadingContext value={2}>
						<div className={cn(PLACE, bleed && PAGE)}>
							{head}
							<div className={BODY_WRAP}>
								{body}
								{floating ? (
									<div className={cn(FLOATING_ACT, ACT_LAYER)}>
										<span className={ACT_HIT}>{button}</span>
									</div>
								) : null}
							</div>
						</div>
					</HeadingContext>
				</PageTitle>
			</RecordOpen>
		</LendAct>
	);
}
