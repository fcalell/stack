import { NO_HOLDS } from "@fcalell/plugin-api/read";
import {
	type Datum,
	FrameHolds,
	type Selection,
	usePainted,
} from "@fcalell/plugin-api/tanstack-query";
import type { ProcedureCall } from "@fcalell/plugin-api/types";
import { cn } from "@fcalell/ui-core/cn";
import type { IconLinkAct, Run } from "@fcalell/ui-core/descriptors";
import type { Tone } from "@fcalell/ui-core/tokens";
import {
	FOOT_DOCKED,
	PAGE_BODY,
	PAGE_BODY_OVER_FOOT,
	PAGE_BODY_UNDER_TOAST,
	PAGE_HEAD_ROOM,
	ROWS_MEASURED,
} from "@fcalell/ui-core/variants";
import {
	type ReactNode,
	use,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import type { IconAct, MenuEntry, Offered } from "../../lib/act.ts";
import type { Closed } from "../../lib/closed.ts";
import type { Empty } from "../../lib/empty.tsx";
import { useFootFocus, usePaneFocus } from "../../lib/focus.ts";
import {
	BackRoute,
	InPane,
	PageTitle,
	PlaceFrame,
	useFootRegion,
} from "../../lib/frame.ts";
import { HeadingContext } from "../../lib/heading.ts";
import { DistanceContext } from "../../lib/media.ts";
import { useParentRoute, useReturnRoute } from "../../lib/navigate.ts";
import { FrameBody, hasBody, useFrame } from "../../lib/read.tsx";
import { useScrolls } from "../../lib/scrolls.ts";
import { Scroller, useScroller } from "../../lib/window.tsx";
import { ItemHeaderBase, type ItemHeaderParts } from "../item-header/base.tsx";
import type { PickOneProps } from "../picker/index.tsx";
import { SheetDocked } from "../sheet/docked.tsx";
import type { SheetProps } from "../sheet/index.tsx";
import { PaneHead } from "./head.tsx";

// A Pane is a column of its place's row and the size container what stands
// in it decides its form by (a Table its grid). Drawn alone it is the last: it
// takes the rest of the row. Which Panes stand, which holds the list width and
// gives way to its floor, and which of a record's acts stand are the Place's to
// say of the Panes it holds (`shell/place.tsx`): a Pane reads none of its
// siblings. The place's Pane standing before an expanded record's is hidden by
// the Place: both keep it mounted, so its scroll and typed text survive, and
// out of the tab order. It marks itself `data-page`, which the Place and the
// focus order name it by, and "last" is the last Pane, not the last child: a
// Sheet in the Place leaves its focus guards after it.
const PANE =
	"@container/page group/pane flex flex-col min-h-0 grow basis-0 min-w-0";
// A record's head names a view timeline on the body (its name's), which the
// Pane lifts over its bar for the bar's name to follow (`record-scope` in
// globals.css).
const RECORD_SCOPE = "record-scope";
// The body scrolls under the fixed head, taking a tab stop only while it
// scrolls with nothing tabbable inside. What stands in it stands within the
// reading width at its start, so a label stays near its value and a Save near the
// fields it saves; wide content (`data-wide`: a Table, a line Diff, a Canvas) stands
// at the body's width, and so does the part that holds it.
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
// track taking the rest (`ROWS_MEASURED`).
const MEASURED =
	"*:max-w-reading [&>[data-wide]]:max-w-none [&>:has([data-wide])]:max-w-none";
// What the body and the docked foot share: the head stands outside it, so the
// foot's bound is the whole of it and the body keeps the rest. With a foot its
// measurement bounds a docked sheet's body.
const REGION = "flex flex-col grow min-h-0";
// The foot stays under the body, which scrolls past it, and spans it; a field
// keeps its own measure column inside, which the foot centres at every density.
// The docked foot names itself the anchor the Shell's toasts stand above, and
// draws nothing, border and inset included, while it holds nothing (a selection
// bar with no row ticked).
const DOCKED =
	"flex flex-col items-center shrink-0 empty:hidden [anchor-name:--docked-foot]";
// A selection bar stands at the body's column, the reading width at its start;
// where the body holds wide content (a Table, whose rows the bar acts on) the
// column is the body's width (`ACTION_BAR_SELECTION` reads the property).
const FOOT_WIDE = "has-[[data-wide]]:[--foot-column:100%]";

export type { RecordFact } from "@fcalell/ui-core/descriptors";

/** A record's head in its Pane: the parts of the head under the bar (the overline, the facts, the description, the image). Where the record lives is the place's name, which the Pane draws before the record's in the bar on the desktop and at the start of the overline on touch, so `overline` never repeats it. */
export type RecordHead<V extends string | null = string> = ItemHeaderParts<V>;

/** What kind of Pane it is, which its props say: the place's own, titled by the place's name, or a record's, titled by the record's name and standing after the place's. A Place holds one of each at most. */
type PaneKindProps<V extends string | null> =
	| {
			/** The place's Pane takes the place's name (the sidebar's label) as its title, so it gives none. */
			title?: never;
			record?: undefined;
	  }
	| {
			/** The record's name (a short phrase; a name whose read failed with no fallback, or that landed empty, draws nothing, no empty heading, the bar keeping its height and its way back, and the body says why), given as a selection of the record's read: it paints while the record loads, and the Pane carries no name until it lands. In the bar, after the place's name and a slash, it is one line at every width, truncating, never under two fifths of the bar; it stands whole, wrapping, in the head at the body's top, as the Pane's `h2` (its Sections start at `h3`; the page's one `h1` is the Place's, the name of the place you are in). */
			title: Datum<Run>;
			/** The record's head: the body opens with the title, at the Pane's heading level, between the overline and the facts, with the `description` as body text under the facts (a string, or runs whose `{ code }` stands boxed in the mono). Its bar holds the place's name, the record's, the Expand act (which folds the place's Pane away and turns to Collapse) and Close, which goes back to the place's Pane as it stood (its tab and filters, which the address's query holds); where the record's Pane stands alone (below `tablet` of its Place) Back stands at the bar's start instead of Close. */
			record: RecordHead<V>;
	  };

interface PaneBase<P extends ProcedureCall> extends Closed {
	/** The kind of record the Pane shows (a short lowercase noun: "project"). Its `read` answering not found fills the page with "Couldn't find this project." and the way back to the page above; without one the sentence is "Couldn't find this." */
	noun?: string;
	/** The sentence the Pane's page says when its read answers not found, in place of the one `noun` words ("No report for that month."); `noun` still names the kind in the bar. A sentence, ending in a full stop. */
	missing?: string;
	/** Icon acts after the title, ordered by weight: the primary act first, so it is the last to fold. Those that do not fit beside the title's floor fold into the bar's more menu, the last first, and return when there is room; a create act is one of them, and on a record's Pane the record's acts. An act is live whatever the `read` does, but on a record's Pane whose `read` failed or answered not found the bar draws none of them: the page below it is the failed or missing form. One given as a selection paints, inert, while its own read waits or stands still, and stands blocked, the failed sentence its name, once that read failed or is missing. An act's `label` and `blocked` may be selections on their own, which paint it the same way. While the Pane's own `read` failed or is missing the bar draws no action and no more menu. */
	acts?: readonly Offered<IconAct | IconLinkAct>[];
	/** The acts past the acts, in a menu under the more act, named "More", whose touch sheet is titled by the Pane's title (a record's name), "More" while it waits; the more act paints and stands blocked as an action does. A record's Pane whose `read` failed or answered not found draws no more act. */
	more?: Offered<readonly MenuEntry[]>;
	/** The scope the page reads in, picked in the bar: an outlined pill at the control height after the title, before the acts, its label truncating at three fifths of the row; below a Pane width of `tablet` it is its dot and chevron, its label its name and tooltip. The title keeps its floor of two fifths. A selection paints, inert, until its read lands. */
	context?: Omit<PickOneProps<string | null>, "fit">;
	/** The tone of the scope the page reads in: a dot in the state's colour before the context pick's label; the app chooses the tone. */
	state?: Tone;
	/** What docks at the Pane's foot, the body scrolling under it: the route gives it, so the Pane decides it from its props. A `Table`'s selection bar is an `ActionBar` with `chosen` (its acts and its count of the rows the `Table`'s `choose` ticks), standing at the body's column (the reading width, the body's width where the body holds wide content) and start; a `Thread` standing among the Pane's sections docks its composer here as a `Composer` (the Thread then draws none of its own), with its `sheet` given as this Pane's. */
	foot?: ReactNode;
	/** A task over the foot: while it is `open` the sheet docks there in the foot's place (the foot gives way to it), the body scrolling above it, and closing hands focus back to the foot's input. */
	sheet?: SheetProps<P>;
	/** The body's one child is a filler (a `Thread` or a `Canvas`) that takes the body's free height: the body is a flex column, and the Sections in it keep their own label columns. Without it the body is the two-column grid every Section's definition rows align to. */
	fill?: boolean;
	/** The Pane's sections, a sections gap apart; none stand while the `read` is empty and the Pane declares an `empty`; without one the sections draw their own. */
	children?: ReactNode;
}

/** A column of a `Place`: the place's own, or a record's (`title` and `record` given together). `empty` belongs to the `read` it answers for, so a Pane given one without the other does not type-check. */
export type PaneProps<
	V extends string | null = string,
	P extends ProcedureCall = ProcedureCall,
> = PaneBase<P> &
	PaneKindProps<V> &
	(
		| {
				read?: undefined;
				empty?: never;
		  }
		| {
				/** What the Pane's page holds, read once for the frame: while it waits the loaded tree paints, its failure and a missing record fill the page in place of the body, and an empty selection draws `empty`, which only a Pane that declares one replaces its body with. It holds the reads of `read` that no enclosing frame holds: those draw their failure and say they are busy; the rest only wait and empty. */
				read: Selection<unknown>;
				/** What the page says when the `read` is empty: this stands in place of the body, centred in what the body leaves. */
				empty?: Empty;
		  }
	);

/** A column of a Place, of two kinds, one of each at most: the place's own Pane, titled by the place's name, and a record's after it, titled by the record's name (the Place throws on a second of a kind, so a record linked from a record opens in its own place). A bar over one hairline (on touch the shell's switcher leading the place's Pane; on a record's Pane the place's name, a slash and the record's, the Expand act and Close, Back at the start instead of Close where it stands alone; the title, the context pick, the acts and more, one line at every width) and a body that scrolls, its children a sections gap apart within the reading width at its start, wide content (a Table, a line Diff, a code block, a Canvas, a chart) at the body's width, the definition lists of its Sections sharing one label column, and a Thread or a Canvas in it filling it when the Pane takes `fill`; a `foot` docks under the body (on touch, a Thread among the sections docks its composer there), a `sheet` in its place while it is open, and the `empty` of its `read` stands in place of the children. Alone, the place's Pane takes the Place; with a record's beside it, it holds the list width, giving way to its floor, and the record's takes the rest, unless the place's Pane fills with a Canvas, which takes the spare room while the record holds the list width. Below `tablet` of its Place only the last stands. The record's Expand act folds the place's Pane away, mounted, the record taking the Place, and turns to Collapse, which brings it back; Close goes back to the place's Pane as it stood. On a record's Pane the acts and more are the record's acts; its `record` puts the name, whole and wrapping, between the overline and the facts of a head at the body's top, and a `read` that fails or answers not found fills the page with the failed or missing form in place of the head (the missing sentence worded by `noun`, its way back the page above, which stands there and not as the bar's Close), and the bar then keeps the place's name and names the record's kind after its slash (its `noun`, else "Not found" or "Failed"), with none of the record's acts. An empty `read` keeps the head, the empty form standing under it. Every Pane's name is an `h2` and its Sections start at `h3`, whatever Panes stand before or after it: the page's one `h1` is the Place's, so a Pane is written the same alone and among others and reads nothing of its siblings. */
export function Pane<
	V extends string | null = string,
	P extends ProcedureCall = ProcedureCall,
>({
	title: name,
	record,
	noun,
	missing,
	acts,
	more,
	context,
	state,
	foot,
	sheet,
	read,
	empty,
	fill,
	children,
}: PaneProps<V, P>) {
	const titleId = useId();
	// A Pane in a room Place stands its head off the top on the table.
	const far = use(DistanceContext);
	const place = use(PlaceFrame);
	const kind = record === undefined ? "place" : "record";
	useLayoutEffect(() => place?.stand(kind), [place?.stand, kind]);
	// The place's Pane is titled by the place's name; a record's draws it
	// before the record's.
	const title = name ?? place?.name ?? "";
	const within = record ? (place?.name ?? "") : undefined;
	// Only a record's Pane has a way back in its bar, to the place's Pane as it
	// stood; a missing read of the place's Pane leads to the page above.
	const parent = useParentRoute();
	const returns = useReturnRoute();
	const toward = record ? returns : parent;
	const [expanded, setExpanded] = useState(false);
	const held = useFrame(read);
	// A Pane that declares no `empty` leaves an empty read to its Sections, which
	// draw their own; only a Pane's own `empty` replaces its body.
	const frame =
		held.form === "empty" && empty === undefined
			? { ...held, form: "ready" as const }
			: held;
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
	// A record's head opens the body, in the frame's body: a failed or missing
	// read draws its form and not the head, and the bar's title is then the
	// Pane's heading. An empty read is a record with nothing in it: its head
	// stands, whole and wrapping, and the empty form under it.
	const headless = frame.form === "failed" || frame.form === "missing";
	const head = record ? (
		<ItemHeaderBase
			name={title}
			nameId={named}
			within={within}
			overline={record.overline}
			facts={record.facts}
			description={record.description}
			image={record.image}
		/>
	) : null;
	const content = record ? (
		<>
			{head}
			{children}
		</>
	) : (
		children
	);
	// A page with nothing to draw in its body has none: an empty one is only its padding.
	const bodied = hasBody(frame, content);
	return (
		<BackRoute value={toward}>
			<InPane value>
				<PageTitle value={named}>
					<HeadingContext value={3}>
						<section
							ref={setPaneNode}
							// The title names the region; a record's overline is text beside it.
							aria-labelledby={named}
							aria-busy={(frame.holds && frame.form === "waiting") || undefined}
							data-still={(frame.holds && frame.form === "still") || undefined}
							data-page=""
							data-expanded={expanded ? "" : undefined}
							data-fill={fill ? "" : undefined}
							className={cn(
								PANE,
								far && PAGE_HEAD_ROOM,
								record && RECORD_SCOPE,
							)}
						>
							<PaneHead
								within={within}
								titleId={titleId}
								title={title}
								back={record ? toward : undefined}
								expand={
									record
										? { expanded, onAct: () => setExpanded((was) => !was) }
										: undefined
								}
								far={far}
								acts={acts}
								more={more}
								context={context}
								state={state}
								frame={frame}
								headed={record !== undefined && !headless}
								noun={noun}
							/>
							{bodied || footed ? (
								<div
									ref={footed ? region.ref : undefined}
									className={cn(REGION, FOOT_WIDE)}
								>
									{bodied ? (
										<div
											ref={scroll.ref}
											className={cn(
												PAGE_BODY,
												flexed ? FLEX : [ROWS_MEASURED, GRID],
												BODY,
												MEASURED,
												footed ? PAGE_BODY_OVER_FOOT : PAGE_BODY_UNDER_TOAST,
											)}
										>
											<Scroller value={scroll}>
												{frame.form === "empty" ? head : null}
												<FrameBody
													frame={frame}
													empty={empty}
													noun={noun}
													missing={missing}
													headed
												>
													{content}
												</FrameBody>
											</Scroller>
										</div>
									) : null}
									{footed ? (
										<div ref={dock} className={cn(FOOT_DOCKED, DOCKED)}>
											<FrameHolds holds={NO_HOLDS}>{docked}</FrameHolds>
										</div>
									) : null}
								</div>
							) : null}
						</section>
					</HeadingContext>
				</PageTitle>
			</InPane>
		</BackRoute>
	);
}
