import { NO_HOLDS } from "@fcalell/plugin-api/read";
import {
	type Datum,
	FrameHolds,
	type Selection,
	usePainted,
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
} from "@fcalell/ui-core/variants";
import { type ReactNode, useId, useRef, useState } from "react";
import type { Closed } from "../../lib/closed.ts";
import type { Empty } from "../../lib/empty.tsx";
import { useFootFocus, usePaneFocus } from "../../lib/focus.ts";
import {
	BackRoute,
	PageTitle,
	PaneOverline,
	useFootRegion,
} from "../../lib/frame.ts";
import { HeadingContext } from "../../lib/heading.ts";
import { FrameBody, hasBody, useFrame } from "../../lib/read.tsx";
import { useScrolls } from "../../lib/scrolls.ts";
import { useSettleName } from "../../lib/settle.ts";
import { Scroller, useScroller } from "../../lib/window.tsx";
import { SheetDocked } from "../sheet/docked.tsx";
import type { SheetProps } from "../sheet/index.tsx";
import { PaneHead } from "./head.tsx";

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

interface PaneBase extends Closed {
	/** The Pane's title, an `h1` (a short phrase; one line at every width, truncating, never under two fifths of the bar; a title whose read failed with no fallback draws nothing, the bar keeping its height and its back act, and the body says why). On a record's Pane it is the record's name, given as a selection of the record's read: it paints while the record loads, and the Pane carries no name until it lands. */
	title: Datum<Part>;
	/** The route the Pane returns to: Back where it stands alone, Close where a Pane stands before it. None draws no back act. */
	back?: Route;
	/** Icon acts after the title, in order; those that do not fit beside the title's floor fold into the bar's more menu, the last first, and return when there is room; a create act is one of them, and on a record's Pane the record's acts. An act is live whatever the `read` does. One given as a selection paints, inert, while its own read waits or stands still, and stands blocked, the failed sentence its name, once that read failed or is missing. */
	actions?: readonly Datum<IconAct>[];
	/** The acts past the actions, in a menu under the more act; the more act paints and stands blocked as an action does. */
	more?: Datum<readonly MenuItem[]>;
	/** The field (a `MessageInput`) or the selection bar (an `ActionBar` with `chosen`) docked at the Pane's foot, the body scrolling under it. */
	foot?: ReactNode;
	/** A task over the foot: while it is `open` the sheet docks there in the foot's place, the body scrolling above it, and closing hands focus back to the foot's input. */
	sheet?: SheetProps;
	/** The Pane spans its Place, the Panes before it hidden, mounted. */
	cover?: boolean;
	/** What it holds stands at the Pane's width, not the measure: a `Canvas`, a code `Diff`. */
	wide?: boolean;
	/** The Pane's sections, a sections gap apart; none stand while the `read` is empty. */
	children?: ReactNode;
}

/** A column of a `Place`. `empty` belongs to the `read` it answers for, so a Pane given one without the other does not type-check. */
export type PaneProps = PaneBase &
	(
		| {
				read?: undefined;
				empty?: never;
		  }
		| {
				/** What the Pane's page holds, read once for the frame: while it waits the loaded tree paints, its failure and a missing record fill the page in place of the body, and an empty selection draws `empty`. It holds the reads of `read` that no enclosing frame holds: those draw their failure and say they are busy; the rest only wait and empty. */
				read: Selection<unknown>;
				/** What the page says when the `read` is empty: this stands in place of the body, centred in what the body leaves. */
				empty?: Empty;
		  }
	);

/** A column of a Place: a bar over one hairline (the back act, the title, the actions and more, one line at every width; on touch the shell's switcher leads where there is no back act) and a body that scrolls, its children a sections gap apart within the measure at its start (the Pane's width with `wide`), a Thread or a Canvas in it filling it; a `foot` docks under the body, a `sheet` in its place while it is open, and the `empty` of its `read` stands in place of the children. Each Pane but the last holds the list width, giving way to its floor; the last takes the rest. Below `tablet` of its Place only the last stands; a `cover` Pane spans its Place, the Panes before it hidden and mounted. Its back act draws as Back where it stands alone and as Close where a Pane stands before it. On a record's Pane the title is the record's name, the actions and more its acts, and the record's place and facts stand in an `ItemHeader` at the body's top. */
export function Pane({
	title,
	back,
	actions,
	more,
	foot,
	sheet,
	read,
	empty,
	cover,
	wide,
	children,
}: PaneProps) {
	const titleId = useId();
	const overlineId = useId();
	const frame = useFrame(read);
	const settle = useSettleName();
	// The bar owns the title's subscription; the Pane asks only whether it is
	// still filler, which is what names the region.
	const filler = usePainted([title]);
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
	const named = filler ? undefined : titleId;
	// A page with nothing to draw in its body has none: an empty one is only its padding.
	const bodied = hasBody(frame, children);
	return (
		<BackRoute value={back}>
			<PageTitle value={named}>
				<PaneOverline value={overlineId}>
					<HeadingContext value={2}>
						<section
							ref={setPaneNode}
							// A record's overline leads its title in the name, when it holds one.
							aria-labelledby={named && `${overlineId} ${named}`}
							aria-busy={(frame.holds && frame.form === "waiting") || undefined}
							style={read === undefined ? undefined : settle}
							data-page=""
							data-cover={cover ? "" : undefined}
							className={PANE}
						>
							<PaneHead
								titleId={titleId}
								title={title}
								back={back}
								actions={actions}
								more={more}
								frame={frame}
							/>
							{bodied || docked ? (
								<div ref={docked ? region.ref : undefined} className={REGION}>
									{bodied ? (
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
												<FrameBody frame={frame} fit="page" empty={empty}>
													{children}
												</FrameBody>
											</Scroller>
										</div>
									) : null}
									{docked ? (
										<div ref={dock} className={cn(FOOT_DOCKED, DOCKED)}>
											<FrameHolds holds={NO_HOLDS}>{docked}</FrameHolds>
										</div>
									) : null}
								</div>
							) : null}
						</section>
					</HeadingContext>
				</PaneOverline>
			</PageTitle>
		</BackRoute>
	);
}
