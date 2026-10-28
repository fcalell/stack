import { Dialog } from "@base-ui/react/dialog";
import type { Selection } from "@fcalell/plugin-api/tanstack-query";
import { HEAD_SUBMIT_AT } from "@fcalell/ui-core/action-bar";
import { cn } from "@fcalell/ui-core/cn";
import { BACK_GLYPH } from "@fcalell/ui-core/list-state";
import { pressStands } from "@fcalell/ui-core/reason";
import {
	LAYER_CARD,
	LAYER_SCRIM,
	LAYER_SHEET_BOTTOM,
	SCRIM,
	SHEET,
	SHEET_CENTERED,
	SHEET_FOOT,
	SHEET_HEAD,
	SHEET_HEAD_ROW,
	SHEET_PARTS,
	type SheetFit,
	sheetDesktop,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import {
	type ReactNode,
	type RefObject,
	use,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import type { Act } from "../../lib/act.ts";
import { type Acting, useAct } from "../../lib/act.ts";
import type { Empty } from "../../lib/empty.tsx";
import { FIELDS, firstTabbable, useReturnFocus } from "../../lib/focus.ts";
import { useFollow } from "../../lib/follow.ts";
import { askDiscard } from "../../lib/leave.ts";
import { useTouch } from "../../lib/media.ts";
import { PortalContainer, PortalHosted } from "../../lib/portal.ts";
import {
	BusyMark,
	FrameBody,
	FrameLine,
	hasBody,
	submitOf,
	useFrame,
} from "../../lib/read.tsx";
import { ReasonHostContext } from "../../lib/reason.ts";
import { useScrolls } from "../../lib/scrolls.ts";
import {
	TouchedContext,
	usePageTurn,
	useTouchState,
} from "../../lib/touched.ts";
import { Scroller, useScroller } from "../../lib/window.tsx";
import { useWords } from "../../lib/words.tsx";
import { ActionBarBase } from "../action-bar/base.tsx";
import { ButtonBase } from "../button/base.tsx";
import { IconButtonBase } from "../button/glyph.tsx";
import { Button } from "../button/index.tsx";
import { Reason } from "../button/reason.tsx";
import { DIVIDER } from "../section/card.tsx";

// The layer the sheet stands on over the scrim: from the bottom edge on
// touch, centred on the desktop.
const BACKDROP = "fixed inset-0 z-(--layer-sheet)";
// The page inset above a bottom sheet keeps a strip of scrim over the tallest
// one, so a press above it still dismisses.
const LAYER_BOTTOM =
	"fixed inset-0 z-(--layer-sheet) flex flex-col justify-end pt-page";
// A decision is centred over the page with no cap of its own.
const LAYER_CENTRED =
	"fixed inset-0 z-(--layer-sheet) flex items-center justify-center";
// Any other card on the desktop opens one static top inset under the viewport's
// top and grows downward from it, the page inset below it, and gives way to what
// they leave, its body scrolling. A flex centre would move its top by half of
// every change under the member's hands (a textarea a line at a time, a
// wizard's next page).
const LAYER_DESKTOP =
	"fixed inset-0 z-(--layer-sheet) flex flex-col items-center pt-[12dvh] pb-page";
const BOX_CARD = "max-h-full min-h-0";
const BOX = "relative flex flex-col";
// A view stands over the whole layer, rising and fading as a centred sheet
// does (it does not travel from its thumbnail). It takes no
// press, so the layer around its content hears one as a press on the scrim
// and dismisses; its content takes its own.
const BOX_VIEW = "relative size-full pointer-events-none";
// A bottom sheet stops at the viewport's top and its body scrolls; the
// bottom inset clears a phone's home indicator.
const BOX_BOTTOM = "max-h-full pb-safe";
// A menu that searches grows to the layer's height, which `max-h-full` caps at
// the page inset under the viewport's top.
const BOX_TALL = "grow";
const BOX_FLOAT = "max-w-full";
// The head is where a bottom sheet is pulled down by a finger, so the browser
// leaves it the vertical axis.
const HEAD = "flex flex-col touch-none";
const HEAD_ROW = "flex items-center";
// On the desktop the head is one line: the title truncates at its floor and the
// close act stands beside it. On touch the title and the submit share a line
// where the whole title fits beside the submit, and the submit wraps under the
// title, at the end, where it does not: a long submit never cuts the title to
// its first letters. The title takes the line's room first (`grow-1000`), and
// one longer than the line stands alone on it and truncates; the submit grows
// only on a line of its own.
const HEAD_WRAP = "flex flex-wrap items-center grow min-w-0 gap-gap";
const HEAD_SUBMIT = "flex shrink-0 grow justify-end";
const TITLE_BLOCK = "flex flex-col grow basis-0 min-w-0";
const TITLE_BLOCK_WRAP =
	"flex flex-col justify-center grow-1000 min-w-0 max-w-full min-h-control";
// The lead act stands on the title's line, a control tall, when the submit
// wraps under it.
const HEAD_ROW_TOP = "items-start";
const TITLE_SLOT = "flex items-center gap-gap min-w-0";
const TITLE = "min-w-0 truncate";
// The desktop head is a two-line row tall (the title over its description)
// whether or not the description stands; on touch the row is the acts'.
const HEAD_ROW_TALL = "py-gap touch:min-h-0";
// The body takes a tab stop only while it scrolls with nothing tabbable inside.
const BODY =
	"flex flex-col grow min-h-0 overflow-y-auto overscroll-contain focus-visible:-outline-offset-2";
const PARTS = "flex flex-col";
// The card's foot carries the raised ground to the box's corners, so it follows
// the box's radius; on touch the box rounds its top only. The foot is a row
// on the desktop, a stack on touch, its acts at its end.
const FOOT =
	"flex items-center rounded-b-sheet touch:flex-col touch:items-stretch touch:rounded-b-none";
const END_ONLY = "justify-end";

/** What every sheet form draws: the public `Sheet`, the confirm and a touch `Menu`. Outside the package's exports. */
export interface SheetBaseProps {
	open: boolean;
	onClose: () => void;
	/** Hears the sheet gone, its leave played (a cell's pick ends its edit). */
	onGone?: () => void;
	/** Hears a trigger tied by `handle` opening the sheet. */
	onOpen?: () => void;
	title: string;
	description?: string;
	back?: () => void;
	submit?: Act;
	fit?: SheetFit;
	/** A decision's acts, the foot's `ActionBar` at both densities. */
	acts?: Act[];
	/** A decision is centred on the desktop; a menu's rows stand under the head with no body or foot; a view (an image's full size) is its children over the whole layer, named by `title`, with no head, body, foot or close act of its own. */
	form?: "centred" | "menu" | "view";
	/** A menu that searches stands the whole viewport height from its first frame, so its list does not jump as the filter narrows. */
	tall?: boolean;
	/** What the body holds, read once for the frame (`Sheet`'s `read`): the submit paints, inert, while it waits or stands still, and stands blocked with the failed sentence once it failed or is missing. */
	read?: Selection<unknown>;
	/** The body's sentence when the `read` is empty. */
	empty?: Empty;
	/** The holder of the sheet's acts' run, when a form in its body has a bar of its own (the one holder keeps the dismissal held while either runs). Absent, the sheet hosts its own. */
	acting?: Acting<number>;
	/** What the sheet opens focused on: its first field (a confirm's typed name), or the element a ref holds (a pick's option); a decision with neither opens on its first act, the way out, and a task's body on its first field, else its first control, else the close act. */
	focus?: "field" | RefObject<HTMLElement | null>;
	/** Ties a trigger elsewhere (a `Dialog.Trigger`) to the sheet. */
	handle?: Dialog.Handle<unknown>;
	/** The body's parts, at the card inset. */
	children?: ReactNode;
	/** The body's form (a `FormBody`), after the parts under a hairline: its rows flush on the sheet, its foot stuck to the body's. */
	fields?: ReactNode;
}

/** A sheet over the scrim: on touch raised from the bottom edge, its submit at the head's end where a keyboard would cover a bar and a blocked submit's reason under the head; on the desktop a card centred across the page, its top a static inset under the viewport's top (a form, or a Pane at `fit: pane`), capped at the viewport less the page inset, its body scrolling, with the submit after Cancel in the foot, or a decision centred. Base UI's dialog traps focus and closes on Escape and on a press outside. */
export function SheetBase({
	open,
	onClose,
	onGone,
	onOpen,
	title,
	description,
	back,
	submit: offered,
	fit,
	acts,
	form,
	tall,
	handle,
	acting: given,
	focus,
	read,
	empty,
	children,
	fields,
}: SheetBaseProps) {
	const touch = useTouch();
	const frame = useFrame(read);
	const words = useWords();
	const own = useAct<number>("line");
	// The submit waits only on the sheet's own read: painted while it waits or
	// stands still, blocked with the sentence once it ended.
	const { waiting, ended } = submitOf(words, frame.form);
	const submit =
		ended === undefined ? offered : offered && { ...offered, blocked: ended };
	// The sheet hosts its acts' run: its head submit, its foot bar and its
	// form's bar share one, so one act pends at a time and the dismissal is held
	// while it runs.
	const acting = given ?? own;
	// The body is the frame's: its failure and its emptiness stand in its place,
	// at the sheet's inset. Its parts stand at the card inset; the form after
	// them is rows flush on the sheet, the hairline between the two drawn once.
	const body =
		hasBody(frame, children) || fields ? (
			<FrameBody frame={frame} fit="part" empty={empty}>
				{children ? (
					<div className={cn(SHEET_PARTS, PARTS)}>{children}</div>
				) : null}
				{fields}
			</FrameBody>
		) : null;
	const container = use(PortalContainer);
	// A sheet in a stage (a container no frame hosts) stays non-modal beside the
	// stage's others; in an app it is modal.
	const scoped = container !== undefined && !use(PortalHosted);
	const titleId = useId();
	const [touchedValue, setTouched] = useTouchState();
	const { touched, leave } = touchedValue;
	const [pressedUnder, setPressedUnder] = useState<string>();
	const popup = useRef<HTMLDivElement | null>(null);
	useReturnFocus(open, popup);
	const scroll = useScroller();
	useScrolls(scroll.node);
	// A sheet whose `form` stands edited asks before it closes: "Discard your
	// edit?", as a page's form does when its page is left, since the form's
	// edit is dropped as the sheet opens again. A bare control in the body holds
	// the app's value, which the sheet keeps, so it asks nothing for it. A
	// menu, a picker and a decision hold no edit of the sheet's: what they take
	// is their own pick.
	const asks = form === undefined && leave.asks();
	const dismiss = () => {
		if (!asks) return onClose();
		void leave
			.attempt(() => askDiscard(words))
			.then((discard) => {
				if (discard) onClose();
			});
	};
	const blocked = submit?.blocked !== undefined;
	const centred = form === "centred" && !touch;
	const view = form === "view";
	// A bottom sheet follows a finger on its head, 1:1, and leaves past the reach
	// or flung; a held dismissal (an act running) and an edit keep it.
	const pull = useFollow({
		target: popup,
		axis: "y",
		away: 1,
		enabled: touch && !centred && !view && !acting.holds && !asks,
		onAway: onClose,
	});
	// The submit's press stands while it is blocked by the reason it came
	// under (`@fcalell/ui-core/reason`).
	const pressed = pressStands(submit?.blocked, pressedUnder);
	usePageTurn(open, title, description, () => {
		leave.clear();
		setTouched(false);
		setPressedUnder(undefined);
	});
	// A decision draws no close act: its acts dismiss it.
	const close = acts ? null : (
		<Dialog.Close
			disabled={acting.holds}
			render={<IconButtonBase icon="X" label={words.close} />}
		/>
	);
	const lead = back ? (
		<Button glyph icon={BACK_GLYPH} label={words.back} onAct={back} />
	) : null;
	const host = useMemo(
		() =>
			blocked ? { press: () => setPressedUnder(submit?.blocked) } : undefined,
		[blocked, submit?.blocked],
	);
	// On touch the submit stands at the head's end in close's place, which
	// moves to the start unless back holds it. It runs as the desktop's foot
	// bar does.
	const headSubmit =
		touch && submit ? (
			<ReasonHostContext value={host}>
				<div className={HEAD_SUBMIT}>
					<ButtonBase
						label={submit.label}
						onAct={() => submit && acting.run(HEAD_SUBMIT_AT, submit)}
						pending={acting.pending === HEAD_SUBMIT_AT}
						blocked={submit.blocked}
						painted={waiting}
					/>
				</div>
			</ReasonHostContext>
		) : null;
	const start = touch ? (lead ?? close) : lead;
	const end = touch ? headSubmit : close;
	const titled = (
		<h2 id={titleId} className={TITLE_SLOT}>
			<span
				className={cn(
					fit === "pane"
						? cn(text({ role: "body" }), textStrong({ role: "body" }))
						: text({ role: "heading" }),
					TITLE,
				)}
			>
				{title}
			</span>
			<BusyMark frame={frame} />
		</h2>
	);
	const said = description ? (
		<p className={text({ role: "meta" })}>{description}</p>
	) : null;
	const headRow = (
		<div
			className={cn(
				SHEET_HEAD_ROW,
				HEAD_ROW,
				!centred && HEAD_ROW_TALL,
				touch && end && HEAD_ROW_TOP,
			)}
		>
			{start}
			{touch && end ? (
				<div className={HEAD_WRAP}>
					<div className={TITLE_BLOCK_WRAP}>{titled}</div>
					{end}
				</div>
			) : (
				<>
					<div className={TITLE_BLOCK}>
						{titled}
						{touch ? null : said}
					</div>
					{end}
				</>
			)}
		</div>
	);
	// On the desktop a submit follows Cancel in the foot's bar, which stands it
	// blocked once the read ended and draws the sentence on a press only.
	const bar =
		acts ??
		(offered && !touch
			? [{ label: words.cancel, onAct: dismiss }, offered]
			: undefined);
	const actionBar = bar ? (
		<ActionBarBase
			acts={bar}
			acting={acting}
			painted={waiting}
			ended={acts ? undefined : ended}
		/>
	) : null;
	const footer = actionBar ? (
		<div className={cn(SHEET_FOOT, FOOT, END_ONLY)}>{actionBar}</div>
	) : null;
	const framed = centred ? (
		<>
			{headRow}
			<FrameLine frame={frame} />
			{body}
			{actionBar}
		</>
	) : (
		<>
			<div
				onPointerDown={pull.onPointerDown}
				onPointerMove={pull.onPointerMove}
				onPointerUp={pull.onPointerUp}
				onPointerCancel={pull.onPointerCancel}
				className={cn(SHEET_HEAD, HEAD)}
			>
				{headRow}
				{/* The submit's reason and its run's line stand under it, with the
				acts, before the description. */}
				{headSubmit && submit?.blocked ? (
					<Reason shown={touched || pressed} end>
						{submit.blocked}
					</Reason>
				) : null}
				{headSubmit &&
				submit?.blocked === undefined &&
				acting.line !== undefined ? (
					<Reason shown failed={acting.pending === undefined} end>
						{acting.line}
					</Reason>
				) : null}
				{touch ? said : null}
				<FrameLine frame={frame} />
			</div>
			{form === "menu" ? (
				children
			) : body ? (
				<div
					ref={scroll.ref}
					aria-busy={(frame.holds && frame.form === "waiting") || undefined}
					data-still={(frame.holds && frame.form === "still") || undefined}
					className={cn(BODY, DIVIDER)}
				>
					<Scroller value={scroll}>{body}</Scroller>
				</div>
			) : null}
			{form === "menu" ? null : footer}
		</>
	);
	const content = view ? children : framed;
	const box = view
		? cn(BOX_VIEW, LAYER_CARD)
		: touch
			? cn(SHEET, BOX, BOX_BOTTOM, tall && BOX_TALL, LAYER_SHEET_BOTTOM)
			: centred
				? cn(SHEET_CENTERED, BOX, BOX_FLOAT, LAYER_CARD)
				: cn(sheetDesktop({ fit }), BOX, BOX_FLOAT, BOX_CARD, LAYER_CARD);
	const layer =
		view || centred ? LAYER_CENTRED : touch ? LAYER_BOTTOM : LAYER_DESKTOP;
	return (
		<Dialog.Root
			handle={handle}
			open={open}
			onOpenChange={(next) => {
				if (next) onOpen?.();
				else if (!acting.holds) dismiss();
			}}
			onOpenChangeComplete={(next) => {
				if (!next) onGone?.();
			}}
			// A surface that scopes its own mode (a showcase stage) holds the
			// sheet beside others, so it hides and traps nothing outside it and
			// stays open while another takes focus. A root frame's sheet covers
			// the frame: focus stays in it, the page behind is inert, and a press
			// on the scrim dismisses.
			modal={!scoped}
			disablePointerDismissal={scoped}
		>
			<Dialog.Portal container={container}>
				<Dialog.Backdrop className={cn(SCRIM, BACKDROP, LAYER_SCRIM)} />
				<Dialog.Viewport
					// A press on the scrim (the layer around the sheet) keeps focus
					// inside the sheet.
					onMouseDown={(event) => {
						if (event.target === event.currentTarget) event.preventDefault();
					}}
					className={layer}
				>
					<Dialog.Popup
						ref={popup}
						// A field and an act take no ref (their props are closed), so the
						// popup finds them. A decision opens on its way out: on touch the
						// stack draws the filled act first, so the first tabbable is not it.
						initialFocus={
							focus === "field"
								? () => popup.current?.querySelector("input") ?? true
								: (focus ??
									(acts
										? () =>
												[
													...(popup.current?.querySelectorAll("button") ?? []),
												].find((act) => act.textContent === acts[0]?.label) ??
												true
										: form === undefined
											? // The head's close act stands first in the tab order, but
												// the task is the body's: its first field, else its first
												// control.
												() =>
													firstTabbable(scroll.holder.current, FIELDS) ??
													firstTabbable(scroll.holder.current) ??
													true
											: undefined))
						}
						role={form === "centred" ? "alertdialog" : "dialog"}
						// Base UI hides the page behind a modal and traps focus but
						// leaves the popup unmarked; the role promises it.
						aria-modal={scoped ? undefined : true}
						aria-label={view ? title : undefined}
						aria-labelledby={view ? undefined : titleId}
						// A field inside takes input: a blocked act says its reason.
						// Only the sheet's `form` edits its leave (through its own
						// form's change): a bare control holds the app's value, which
						// the sheet does not drop, so it asks nothing for it.
						onChange={() => setTouched(true)}
						className={box}
					>
						<TouchedContext value={touchedValue}>{content}</TouchedContext>
					</Dialog.Popup>
				</Dialog.Viewport>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
