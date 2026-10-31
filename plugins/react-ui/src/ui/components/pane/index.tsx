import { NO_HOLDS } from "@fcalell/plugin-api/read";
import {
	type Datum,
	FrameHolds,
	type Selection,
	usePainted,
} from "@fcalell/plugin-api/tanstack-query";
import type { ProcedureCall } from "@fcalell/plugin-api/types";
import { cn } from "@fcalell/ui-core/cn";
import type { IconLinkAct, Route, Run } from "@fcalell/ui-core/descriptors";
import type { Tone } from "@fcalell/ui-core/tokens";
import {
	FOOT_DOCKED,
	PAGE_BODY,
	PAGE_BODY_OVER_FOOT,
	PAGE_HEAD_ROOM,
	ROWS,
} from "@fcalell/ui-core/variants";
import { type ReactNode, use, useId, useRef, useState } from "react";
import type { IconAct, MenuEntry } from "../../lib/act.ts";
import type { Closed } from "../../lib/closed.ts";
import type { Empty } from "../../lib/empty.tsx";
import { useFootFocus, usePaneFocus } from "../../lib/focus.ts";
import { BackRoute, PageTitle, useFootRegion } from "../../lib/frame.ts";
import { HeadingContext } from "../../lib/heading.ts";
import { DistanceContext } from "../../lib/media.ts";
import { useParentRoute } from "../../lib/navigate.ts";
import { FrameBody, hasBody, useFrame } from "../../lib/read.tsx";
import { useScrolls } from "../../lib/scrolls.ts";
import { Scroller, useScroller } from "../../lib/window.tsx";
import {
	type Fact,
	ItemHeaderBase,
	type ItemHeaderParts,
} from "../item-header/base.tsx";
import type { PickOneProps } from "../picker/index.tsx";
import { SheetDocked } from "../sheet/docked.tsx";
import type { SheetProps } from "../sheet/index.tsx";
import { PaneHead } from "./head.tsx";

// A Pane is a column of its place's row and the size container what stands
// in it decides its form by (a Table its grid). Drawn alone it is the last: it
// takes the rest of the row. Which Panes stand, which hold the list width and
// give way to their floor, and which head draws Back or Close are the Place's
// to say of the Panes it holds (`shell/place.tsx`): a Pane reads none of its
// siblings. A Pane standing before a covering one is hidden by the Place: both
// keep it mounted, so its scroll and typed text survive, and out of the tab
// order. It marks itself `data-page`, which the Place and the focus order name
// it by, and "last" is the last Pane, not the last child: a Sheet in the Place
// leaves its focus guards after it.
const PANE =
	"@container/page group/pane flex flex-col min-h-0 grow basis-0 min-w-0";
// A record's head names a view timeline on the body (its name's), which the
// Pane lifts over its bar for the bar's name to follow (`record-scope` in
// globals.css).
const RECORD_SCOPE = "record-scope";
// The body scrolls under the fixed head, taking a tab stop only while it
// scrolls with nothing tabbable inside. What stands in it stands within the
// reading width at its start, so a label stays near its value and a Save near the
// fields it saves; a `wide` Pane lifts it.
// The body is the head of the `ROWS` chain: its two columns (`auto minmax(0,1fr)`)
// are the label column and the value column of every definition list in it,
// which its Sections and Forms subgrid down to their rows, so the lists read as
// one grid. A Thread or a Canvas that fills the body (`fill`), and the Pane's
// own failed, missing and empty forms, take the free height by plain flex, the
// body's height being definite, so that body is a flex column (grid rows cannot
// hand one child the free height) and carries no `ROWS`.
const BODY = "grow min-h-0 overflow-y-auto focus-visible:-outline-offset-2";
const GRID = "auto-rows-max content-start";
const FLEX = "flex flex-col";
// A subgrid draws in its parent's columns, so a cap on each part's box would not
// bound its rows: the body's own columns end at the reading width, a third
// track taking the rest. The `!` beats the two columns `ROWS` gives, whose
// class the render walk names.
const MEASURED = "*:max-w-reading";
const MEASURED_GRID =
	"[grid-template-columns:auto_minmax(0,1fr)_max(0px,calc(100%-var(--container-reading)))]!";
// What the body and the docked foot share: the head stands outside it, so the
// foot's bound is the whole of it and the body keeps the rest. With a foot its
// measurement bounds a docked sheet's body.
const REGION = "flex flex-col grow min-h-0";
// The foot stays under the body, which scrolls past it, and spans it; a field
// keeps its own measure column inside, which the foot centres at every density.
// The docked foot names itself the anchor the Shell's toasts stand above.
const DOCKED =
	"flex flex-col items-center shrink-0 [anchor-name:--docked-foot]";
// A selection bar stands at the body's column, the reading width at its start;
// a `wide` Pane's body is the Pane's width, so its bar is (`ACTION_BAR_SELECTION`
// reads the property).
const FOOT_WIDE = "[--foot-column:100%]";

export type { Fact };

/** A record's head in its Pane: where the record lives, which the bar holds, and the parts of the head under it. */
export interface RecordHead<V extends string | null = string>
	extends ItemHeaderParts<V> {
	/** Where the record lives, drawn in the bar before the name, in the meta ink and parted from it by a slash, on the desktop; on touch, where the bar holds the name alone (once the head's name has scrolled up under it), it leads the head's overline instead, so it is given here once and never repeated in `overline` (a short phrase such as "Agents" or "Work · Code"; one line, truncating; a `{ code }` run stands bare in the mono). A selection paints in its place, and the bar's acts stand, until its read lands. */
	within: Datum<Run>;
}

interface PaneBase<V extends string | null, P extends ProcedureCall>
	extends Closed {
	/** The Pane's title (a short phrase; a title whose read failed with no fallback draws nothing, the bar keeping its height and its back act, and the body says why). In the bar it is one line at every width, truncating, never under two fifths of the bar. It is the Pane's `h2` whatever the Panes around it, and its Sections start at `h3`; the page's one `h1` is the Place's (the Shell draws it, the name of the place you are in). On a record's Pane it is the record's name, given as a selection of the record's read: it paints while the record loads, and the Pane carries no name until it lands. With a `record` it stands whole, wrapping, in the head at the body's top. */
	title: Datum<Run>;
	/** A record's head: the bar holds `record.within` in place of the title, and the body opens with the title, at the Pane's heading level, between the overline and the facts, with the `description` as body text under the facts (a string, or runs whose `{ code }` stands boxed in the mono). A Pane given one always draws its name; one without keeps the title in the bar. */
	record?: RecordHead<V>;
	/** The kind of record the Pane shows (a short lowercase noun: "project"). Its `read` answering not found fills the page with "Couldn't find this project." and the way back, the Pane's `back`; without one the sentence is "Couldn't find this." */
	noun?: string;
	/** The route the Pane returns to: Back where it stands alone, Close where a Pane stands before it, and the way back a missing read says. Absent, it is the parent route the router gives (the page above this one in the route tree), and no back act where it cannot give one; `false` draws none. */
	back?: Route | false;
	/** Icon acts after the title, ordered by weight: the primary act first, so it is the last to fold. Those that do not fit beside the title's floor fold into the bar's more menu, the last first, and return when there is room; a create act is one of them, and on a record's Pane the record's acts. An act is live whatever the `read` does, but on a record's Pane whose `read` failed or answered not found the bar draws none of them: the page below it is the failed or missing form. One given as a selection paints, inert, while its own read waits or stands still, and stands blocked, the failed sentence its name, once that read failed or is missing. While the Pane's own `read` failed or is missing the bar draws no action and no more menu. */
	actions?: readonly Datum<IconAct | IconLinkAct>[];
	/** The acts past the actions, in a menu under the more act, named "More", whose touch sheet is titled by the Pane's title (a record's name), "More" while it waits; the more act paints and stands blocked as an action does. A record's Pane whose `read` failed or answered not found draws no more act. */
	more?: Datum<readonly MenuEntry[]>;
	/** The context the page reads in, picked in the bar: Live, a change set, a version. It stands after the title as a 28 px outlined pill (the control height, 44 px on touch) before the actions, its chosen label truncating at the popover's width, and gives way to the title's floor. A selection paints, inert, until its read lands. */
	context?: Omit<PickOneProps<string | null>, "fit">;
	/** The tone of the context the page reads in: `active` for Live, `attention` for a draft, `idle` for a version. It draws a dot in the state's colour before the context pick's label. */
	state?: Tone;
	/** What docks at the Pane's foot, the body scrolling under it: the route gives it, so the Pane decides it from its props. A `Table`'s selection bar is an `ActionBar` with `chosen` (its acts and its count of the rows the `Table`'s `choose` ticks), standing at the body's column (the reading width, the Pane's width with `wide`) and start; a `Thread` standing among the Pane's sections docks its composer here as a `Composer` (the Thread then draws none of its own), with its `sheet` given as this Pane's. */
	foot?: ReactNode;
	/** A task over the foot: while it is `open` the sheet docks there in the foot's place (the foot gives way to it), the body scrolling above it, and closing hands focus back to the foot's input. */
	sheet?: SheetProps<P>;
	/** The Pane spans its Place, the Panes before it hidden, mounted. */
	cover?: boolean;
	/** What it holds stands at the Pane's width, not the reading width: a `Canvas`, a code `Diff`. */
	wide?: boolean;
	/** The body's one child is a filler (a `Thread` or a `Canvas`) that takes the body's free height: the body is a flex column, and the Sections in it keep their own label columns. Without it the body is the two-column grid every Section's definition rows align to. */
	fill?: boolean;
	/** The Pane's sections, a sections gap apart; none stand while the `read` is empty. */
	children?: ReactNode;
}

/** A column of a `Place`. `empty` belongs to the `read` it answers for, so a Pane given one without the other does not type-check. */
export type PaneProps<
	V extends string | null = string,
	P extends ProcedureCall = ProcedureCall,
> = PaneBase<V, P> &
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

/** A column of a Place: a bar over one hairline (the back act, the title, the context pick, the actions and more, one line at every width; on touch the shell's switcher leads where there is no back act) and a body that scrolls, its children a sections gap apart within the reading width at its start (the Pane's width with `wide`), the definition lists of its Sections sharing one label column, and a Thread or a Canvas in it filling it when the Pane takes `fill`; a `foot` docks under the body (on touch, a Thread among the sections docks its composer there), a `sheet` in its place while it is open, and the `empty` of its `read` stands in place of the children. Each Pane but the last holds the list width, giving way to its floor; the last takes the rest. Below `tablet` of its Place only the last stands; a `cover` Pane spans its Place, the Panes before it hidden and mounted. Its back act draws as Back where it stands alone and as Close where a Pane stands before it. On a record's Pane the title is the record's name and the actions and more its acts; its `record` puts the record's place in the bar and the name, whole and wrapping, between the overline and the facts of a head at the body's top, and a `read` that fails or answers not found fills the page with the failed or missing form in place of the head (the missing sentence worded by `noun`, its way back the `back`, which stands there and not as the bar's Close), and the bar then keeps the record's place with no slash after it and none of the record's acts. Every Pane's name is an `h2` and its Sections start at `h3`, whatever Panes stand before or after it: the page's one `h1` is the Place's, so a Pane is written the same alone and among others and reads nothing of its siblings. */
export function Pane<
	V extends string | null = string,
	P extends ProcedureCall = ProcedureCall,
>({
	title,
	record,
	noun,
	back,
	actions,
	more,
	context,
	state,
	foot,
	sheet,
	read,
	empty,
	cover,
	wide,
	fill,
	children,
}: PaneProps<V, P>) {
	const titleId = useId();
	// A Pane in a room Place stands its head off the top on the table.
	const far = use(DistanceContext);
	const parent = useParentRoute() as Route | undefined;
	const toward = back === false ? undefined : (back ?? parent);
	const frame = useFrame(read);
	// The bar owns the title's subscription; the Pane asks only whether it is
	// still filler, which is what names the region.
	const filler = usePainted([title]);
	const [paneNode, setPaneNode] = useState<HTMLElement | null>(null);
	usePaneFocus(paneNode);
	const body = useRef<HTMLDivElement | null>(null);
	const scroll = useScroller(body);
	useScrolls(scroll.node);
	const dock = useRef<HTMLDivElement | null>(null);
	// The foot is what the route gave: its `sheet` while open, else its `foot`.
	const task = sheet?.open ? sheet : undefined;
	// The body keeps a log's floor above a docked foot, and its insets: a
	// Thread in it gives way to a docked sheet only down to two rows.
	const region = useFootRegion(task !== undefined, dock, true, body);
	useFootFocus(dock);
	// The foot and the docked sheet stand whatever the page's read does: they
	// draw nothing of it. A docked sheet takes the foot's place, bars and all.
	const docked = task ? <SheetDocked {...task} region={region.value} /> : foot;
	const footed = Boolean(docked);
	// The Pane's own forms and a filler take the body's free height.
	const flexed =
		fill === true ||
		frame.form === "failed" ||
		frame.form === "missing" ||
		frame.form === "empty";
	const named = filler ? undefined : titleId;
	// A record's head opens the body, in the frame's body: a failed, missing or
	// empty read draws its form and not the head, and the bar's title is then
	// the Pane's heading.
	const headless =
		frame.form === "failed" ||
		frame.form === "missing" ||
		frame.form === "empty";
	const content = record ? (
		<>
			<ItemHeaderBase
				name={title}
				nameId={named}
				within={record.within}
				overline={record.overline}
				facts={record.facts}
				description={record.description}
			/>
			{children}
		</>
	) : (
		children
	);
	// A page with nothing to draw in its body has none: an empty one is only its padding.
	const bodied = hasBody(frame, content);
	return (
		<BackRoute value={toward}>
			<PageTitle value={named}>
				<HeadingContext value={3}>
					<section
						ref={setPaneNode}
						// The title names the region; a record's overline is text beside it.
						aria-labelledby={named}
						aria-busy={(frame.holds && frame.form === "waiting") || undefined}
						data-still={(frame.holds && frame.form === "still") || undefined}
						data-page=""
						data-cover={cover ? "" : undefined}
						className={cn(PANE, far && PAGE_HEAD_ROOM, record && RECORD_SCOPE)}
					>
						<PaneHead
							within={record?.within}
							titleId={record && !headless ? undefined : titleId}
							title={title}
							back={toward}
							actions={actions}
							more={more}
							context={context}
							state={state}
							frame={frame}
							headed={record !== undefined && !headless}
						/>
						{bodied || footed ? (
							<div ref={footed ? region.ref : undefined} className={REGION}>
								{bodied ? (
									<div
										ref={scroll.ref}
										className={cn(
											PAGE_BODY,
											flexed ? FLEX : [ROWS, GRID],
											BODY,
											!wide && MEASURED,
											!wide && !flexed && MEASURED_GRID,
											footed && PAGE_BODY_OVER_FOOT,
										)}
									>
										<Scroller value={scroll}>
											<FrameBody frame={frame} empty={empty} noun={noun} headed>
												{content}
											</FrameBody>
										</Scroller>
									</div>
								) : null}
								{footed ? (
									<div
										ref={dock}
										className={cn(FOOT_DOCKED, DOCKED, wide && FOOT_WIDE)}
									>
										<FrameHolds holds={NO_HOLDS}>{docked}</FrameHolds>
									</div>
								) : null}
							</div>
						) : null}
					</section>
				</HeadingContext>
			</PageTitle>
		</BackRoute>
	);
}
