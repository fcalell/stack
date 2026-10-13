import { cn } from "@fcalell/ui-core/cn";
import type {
	IconAct,
	MenuItem,
	Part,
	Route,
} from "@fcalell/ui-core/descriptors";
import {
	FOOT_DOCKED,
	PAGE_BODY,
	PAGE_BODY_OVER_FOOT,
	PAGE_HEAD,
	PAGE_HEAD_ROOM,
	PAGE_TOP_BAR,
	text,
} from "@fcalell/ui-core/variants";
import { type ReactNode, use, useId, useRef, useState } from "react";
import { backGlyph } from "../../lib/back.ts";
import type { Closed } from "../../lib/closed.ts";
import { EmptyBase, type EmptyProps } from "../../lib/empty.tsx";
import { useFootFocus, usePaneFocus } from "../../lib/focus.ts";
import {
	BackRoute,
	PageTitle,
	ShellSwitcher,
	useFootRegion,
} from "../../lib/frame.ts";
import { HeadingContext } from "../../lib/heading.ts";
import { DistanceContext, useTouch } from "../../lib/media.ts";
import { partText } from "../../lib/parts.ts";
import { useScrolls } from "../../lib/scrolls.ts";
import { useWords } from "../../lib/words.tsx";
import { IconButtonLink } from "../icon-button/base.tsx";
import { IconButton } from "../icon-button/index.tsx";
import { Menu } from "../menu/index.tsx";
import { SheetDocked } from "../sheet/docked.tsx";
import type { SheetProps } from "../sheet/index.tsx";
import { SwitcherPick } from "../shell/switcher.tsx";

// A Pane is a column of its Place's row and the size container what stands
// in it decides its form by (a Table its grid). Each Pane but the last holds
// the list width and gives way to its floor as the Place narrows, never sized
// by what it holds, so nothing moves as its rows land; the last takes the
// rest. A hairline parts each from the next. Below `tablet` of the Place only
// the last stands, and a Pane standing before a covering one is hidden: both
// keep it mounted, so its scroll and typed text survive, and out of the tab
// order. It marks itself `data-page`, which a Table reads its width by.
const PANE =
	"@container/page group/pane flex flex-col min-h-0 w-list min-w-region-min shrink border-e border-edge last:grow last:basis-0 last:min-w-0 last:border-e-0 place-max-tablet:not-last:hidden [&:has(~[data-cover])]:hidden";
// The back act stands at the bar's start as Back where the Pane stands alone
// (below `tablet` of the Place, first in it, or covering it), and at its end
// as Close where a Pane stands before it.
const ALONE =
	"hidden place-max-tablet:flex group-first/pane:flex group-data-cover/pane:flex";
const BESIDE =
	"flex place-max-tablet:hidden group-first/pane:hidden group-data-cover/pane:hidden";
const HEAD = "flex flex-col";
// On touch the head carries a step of block padding and the row is the
// title's: it wraps, so acts that do not fit beside the back act, the title's
// floor and the gaps drop whole to a second line, and the back act or the
// switcher reaches the page inset by its start, the acts by their end. The row
// anchors its items to the top, so a 44 px act centres on the title's first line.
const HEAD_TOUCH = "touch:py-inside";
const ROW = "flex items-center touch:flex-wrap touch:items-start";
const START = "touch:-ms-icon-inset";
const ACTS = "flex shrink-0 items-center gap-acts ms-auto touch:-me-icon-inset";
// The title truncates on the desktop; on touch it wraps, with a step of block
// padding so a wrapped title never butts the head's edges, holding at least two
// fifths of the row (a structural fraction, never a width).
const TITLE =
	"min-w-0 grow truncate touch:min-w-2/5 touch:basis-0 touch:overflow-visible touch:whitespace-normal touch:text-clip touch:py-inside";
// The body scrolls under the fixed head, taking a tab stop only while it
// scrolls with nothing tabbable inside. What stands in it stands within the
// measure at its start, so a label stays near its value and a Save near the
// fields it saves; a `wide` Pane lifts it. A Thread or a Canvas in it fills it
// by plain flex, the body's height being definite.
const BODY =
	"flex flex-col grow min-h-0 overflow-y-auto focus-visible:-outline-offset-2";
const MEASURED = "*:max-w-measure";
// What the body and the docked foot share: the head stands outside it, so the
// foot's bound is the whole of it and the body keeps the rest. With a foot its
// measurement bounds a docked sheet's body.
const REGION = "flex flex-col grow min-h-0";
// The foot stays under the body, which scrolls past it, and spans it; a field
// keeps its own measure column inside, which the foot centres at every density.
// The docked foot names itself the anchor the Shell's toasts stand above.
const DOCKED =
	"flex flex-col items-center shrink-0 [anchor-name:--docked-foot]";

/** A column of a `Place`. */
export interface PaneProps extends Closed {
	/** The Pane's title, an `h1` (a short phrase; truncates on the desktop, wraps on touch). On a record's Pane it is the record's name; while the record loads the app passes the generic word for the kind ("Deploy"). */
	title: Part;
	/** The route the Pane returns to: Back where it stands alone, Close where a Pane stands before it. None draws no back act. */
	back?: Route;
	/** Icon acts after the title, in order; a create act is one of them, and on a record's Pane the record's acts. */
	actions?: IconAct[];
	/** The acts past the actions, in a menu under the more act. */
	more?: MenuItem[];
	/** The field (a `MessageInput`) or the selection bar (an `ActionBar` with `chosen`) docked at the Pane's foot, the body scrolling under it. */
	foot?: ReactNode;
	/** A task over the foot: while it is `open` the sheet docks there in the foot's place, the body scrolling above it, and closing hands focus back to the foot's input. */
	sheet?: SheetProps;
	/** The Pane holds nothing yet: this stands in place of its body, centred in what the body leaves, or at the body's top over its own `children`. */
	empty?: EmptyProps;
	/** The Pane spans its Place, the Panes before it hidden, mounted. */
	cover?: boolean;
	/** What it holds stands at the Pane's width, not the measure: a `Canvas`, a code `Diff`. */
	wide?: boolean;
	/** The Pane's sections, a sections gap apart; none stand while `empty` is set. */
	children?: ReactNode;
}

/** A column of a Place: a bar over one hairline (the back act, the title, the actions and more; on touch the shell's switcher leads where there is no back act) and a body that scrolls, its children a sections gap apart within the measure at its start (the Pane's width with `wide`), a Thread or a Canvas in it filling it; a `foot` docks under the body, a `sheet` in its place while it is open, and `empty` stands in place of the children. Each Pane but the last holds the list width, giving way to its floor; the last takes the rest. Below `tablet` of its Place only the last stands; a `cover` Pane spans its Place, the Panes before it hidden and mounted. Its back act draws as Back where it stands alone and as Close where a Pane stands before it. On a record's Pane the title is the record's name, the actions and more its acts, and the record's place and facts stand in an `ItemHeader` at the body's top. */
export function Pane({
	title,
	back,
	actions,
	more,
	foot,
	sheet,
	empty,
	cover,
	wide,
	children,
}: PaneProps) {
	const touch = useTouch();
	const far = use(DistanceContext);
	const words = useWords();
	const switcher = use(ShellSwitcher);
	const titleId = useId();
	const [paneNode, setPaneNode] = useState<HTMLElement | null>(null);
	usePaneFocus(paneNode);
	const [bodyNode, setBodyNode] = useState<HTMLDivElement | null>(null);
	const body = useRef<HTMLDivElement | null>(null);
	const stop = useScrolls(bodyNode);
	const dock = useRef<HTMLDivElement>(null);
	// The body keeps a log's floor above a docked foot, and its insets: a
	// Thread in it gives way to a docked sheet only down to two rows.
	const region = useFootRegion(dock, true, body);
	useFootFocus(dock);
	const docked = sheet?.open ? (
		<SheetDocked {...sheet} region={region.value} />
	) : (
		foot
	);
	const fit = touch ? "body" : "bar";
	const goBack =
		back === undefined ? null : (
			<span className={cn(ALONE, START)}>
				<IconButtonLink
					icon={backGlyph(touch)}
					fit={fit}
					label={words.back}
					href={back}
				/>
			</span>
		);
	const close =
		back === undefined ? null : (
			<span className={BESIDE}>
				<IconButtonLink icon="X" fit={fit} label={words.close} href={back} />
			</span>
		);
	// On touch the shell's switcher leads a Pane with no way back; on the
	// desktop it stands in the sidebar.
	const pick =
		touch && !far && switcher && back === undefined ? (
			<span className={START}>
				<SwitcherPick switcher={switcher} touch />
			</span>
		) : null;
	const acts = (actions ?? []).map((action) => (
		<IconButton key={action.label} {...action} fit={fit} />
	));
	const overflow = more?.length ? (
		<Menu label={words.more} items={more} />
	) : null;
	const heading = (
		<h1 id={titleId} className={cn(text({ role: "title" }), TITLE)}>
			{partText(title)}
		</h1>
	);
	// The head is one tree on both densities, so crossing the density line
	// keeps its acts and their focus.
	const head = (
		<header className={cn(PAGE_HEAD, far && PAGE_HEAD_ROOM, HEAD_TOUCH, HEAD)}>
			<div className={cn(PAGE_TOP_BAR, ROW)}>
				{goBack}
				{pick}
				{heading}
				<span className={ACTS}>
					{acts}
					{overflow}
					{close}
				</span>
			</div>
		</header>
	);
	return (
		<BackRoute value={back}>
			<PageTitle value={titleId}>
				<HeadingContext value={2}>
					<section
						ref={setPaneNode}
						aria-labelledby={titleId}
						data-page=""
						data-cover={cover ? "" : undefined}
						className={PANE}
					>
						{head}
						<div ref={docked ? region.ref : undefined} className={REGION}>
							<div
								ref={(node) => {
									body.current = node;
									setBodyNode(node);
								}}
								tabIndex={stop ? 0 : undefined}
								className={cn(
									PAGE_BODY,
									BODY,
									!wide && MEASURED,
									docked && PAGE_BODY_OVER_FOOT,
								)}
							>
								{empty ? (
									<EmptyBase fit="page" tone="rest" {...empty} />
								) : (
									children
								)}
							</div>
							{docked ? (
								<div ref={dock} className={cn(FOOT_DOCKED, DOCKED)}>
									{docked}
								</div>
							) : null}
						</div>
					</section>
				</HeadingContext>
			</PageTitle>
		</BackRoute>
	);
}
