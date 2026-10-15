import { NO_HOLDS } from "@fcalell/plugin-api/read";
import {
	type Datum,
	FrameHolds,
	type Selection,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
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
import { Painted } from "../../lib/paint.tsx";
import { partText } from "../../lib/parts.ts";
import {
	BusyMark,
	endedItems,
	endedReason,
	FrameBody,
	FrameLine,
	useFrame,
} from "../../lib/read.tsx";
import { useScrolls } from "../../lib/scrolls.ts";
import { useSettleName } from "../../lib/settle.ts";
import { Scroller, useScroller } from "../../lib/window.tsx";
import { useWords } from "../../lib/words.tsx";
import { IconButtonBase, IconButtonLink } from "../icon-button/base.tsx";
import { IconButton } from "../icon-button/index.tsx";
import { MenuBase } from "../menu/base.tsx";
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
// The heading is the title's line, the busy mark after the title. On touch it
// holds at least two fifths of the row (a structural fraction, never a width),
// with a step of block padding so a wrapped title never butts the head's edges.
const TITLE =
	"flex min-w-0 grow items-center gap-inside touch:min-w-2/5 touch:basis-0 touch:py-inside";
// The title truncates on the desktop; on touch it wraps.
const NAME =
	"min-w-0 truncate touch:overflow-visible touch:whitespace-normal touch:text-clip";
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
	/** The Pane's title, an `h1` (a short phrase; truncates on the desktop, wraps on touch). On a record's Pane it is the record's name, given as a selection of the record's read: it paints while the record loads, and the Pane carries no name until it lands. */
	title: Datum<Part>;
	/** The route the Pane returns to: Back where it stands alone, Close where a Pane stands before it. None draws no back act. */
	back?: Route;
	/** Icon acts after the title, in order; a create act is one of them, and on a record's Pane the record's acts. An act is live whatever the `read` does. One given as a selection paints, inert, while its own read waits or stands still, and stands blocked, the failed sentence its name, once that read failed or is missing. */
	actions?: readonly Datum<IconAct>[];
	/** The acts past the actions, in a menu under the more act; the more act paints and stands blocked as an action does. */
	more?: Datum<readonly MenuItem[]>;
	/** The field (a `MessageInput`) or the selection bar (an `ActionBar` with `chosen`) docked at the Pane's foot, the body scrolling under it. */
	foot?: ReactNode;
	/** A task over the foot: while it is `open` the sheet docks there in the foot's place, the body scrolling above it, and closing hands focus back to the foot's input. */
	sheet?: SheetProps;
	/** What the Pane's page holds, read once for the frame: while it waits the loaded tree paints, its failure and a missing record fill the page in place of the body, and an empty selection draws `empty`. It holds the reads of `read` that no enclosing frame holds: those draw their failure and say they are busy; the rest only wait and empty. */
	read?: Selection<unknown>;
	/** The Pane holds nothing yet: this stands in place of its body, centred in what the body leaves, or at the body's top over its own `children`. With a `read` it stands only when the selection is empty. */
	empty?: EmptyProps;
	/** What the page says when the `read` fails, in place of the generic sentence (a sentence; wraps). */
	failed?: string;
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
	read,
	empty,
	failed,
	cover,
	wide,
	children,
}: PaneProps) {
	const touch = useTouch();
	const far = use(DistanceContext);
	const words = useWords();
	const switcher = use(ShellSwitcher);
	const titleId = useId();
	const frame = useFrame(read);
	const settle = useSettleName();
	const [name, overflowAt, ...actionAt] = useSelections([
		title,
		more,
		...(actions ?? []),
	]);
	const [paneNode, setPaneNode] = useState<HTMLElement | null>(null);
	usePaneFocus(paneNode);
	const body = useRef<HTMLDivElement | null>(null);
	const scroll = useScroller(body);
	useScrolls(scroll.node);
	const dock = useRef<HTMLDivElement>(null);
	// The body keeps a log's floor above a docked foot, and its insets: a
	// Thread in it gives way to a docked sheet only down to two rows.
	const region = useFootRegion(dock, true, body);
	useFootFocus(dock);
	// The foot and the docked sheet stand whatever the page's read does: they
	// draw nothing of it.
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
		touch && switcher && back === undefined ? (
			<span className={START}>
				<SwitcherPick switcher={switcher} touch />
			</span>
		) : null;
	// An act is painted, inert, while its own datum waits; a selection's shape
	// is unknown until it lands, so its paint is a bare glyph. One whose read
	// ended stands blocked with the sentence for its name, never a false yes.
	const acts = actionAt.map((one, at) => {
		if (!one.painted) {
			return <IconButton key={one.value.label} {...one.value} fit={fit} />;
		}
		const ended = endedReason(words, one.phase);
		return (
			<IconButtonBase
				// biome-ignore lint/suspicious/noArrayIndexKey: a painted act has no name, and the acts stand in a fixed order
				key={at}
				icon={ended ? "CircleAlert" : "Ellipsis"}
				fit={fit}
				label={ended ?? ""}
				disabled={ended !== undefined}
				painted={ended === undefined}
			/>
		);
	});
	const overflowEnded = overflowAt.painted
		? endedReason(words, overflowAt.phase)
		: undefined;
	const items = overflowEnded
		? endedItems(words, overflowEnded)
		: overflowAt.painted
			? []
			: (overflowAt.value ?? []);
	const overflow =
		overflowAt.painted || items.length ? (
			<MenuBase
				label={words.more}
				title={words.more}
				items={items}
				painted={overflowAt.painted && overflowEnded === undefined}
			/>
		) : null;
	// A painted title is filler, not a heading: it stands as a paragraph of the
	// heading's own look until the title lands.
	const Title = name.painted ? "p" : "h1";
	const heading = (
		<Title id={titleId} className={cn(text({ role: "title" }), TITLE)}>
			<span className={NAME}>
				{name.painted ? <Painted role="title" /> : partText(name.value)}
			</span>
			<BusyMark frame={frame} />
		</Title>
	);
	const named = name.painted ? undefined : titleId;
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
			<FrameLine frame={frame} />
		</header>
	);
	return (
		<BackRoute value={back}>
			<PageTitle value={named}>
				<HeadingContext value={2}>
					<section
						ref={setPaneNode}
						aria-labelledby={named}
						aria-busy={(frame.holds && frame.form === "waiting") || undefined}
						style={read === undefined ? undefined : settle}
						data-page=""
						data-cover={cover ? "" : undefined}
						className={PANE}
					>
						{head}
						<div ref={docked ? region.ref : undefined} className={REGION}>
							<div
								ref={scroll.ref}
								className={cn(
									PAGE_BODY,
									BODY,
									!wide && MEASURED,
									docked && PAGE_BODY_OVER_FOOT,
								)}
							>
								<Scroller value={scroll.holder}>
									{read === undefined && empty ? (
										<EmptyBase fit="page" tone="rest" {...empty} />
									) : (
										<FrameBody
											frame={frame}
											fit="page"
											empty={empty}
											failed={failed}
										>
											{children}
										</FrameBody>
									)}
								</Scroller>
							</div>
							{docked ? (
								<div ref={dock} className={cn(FOOT_DOCKED, DOCKED)}>
									<FrameHolds holds={NO_HOLDS}>{docked}</FrameHolds>
								</div>
							) : null}
						</div>
					</section>
				</HeadingContext>
			</PageTitle>
		</BackRoute>
	);
}
