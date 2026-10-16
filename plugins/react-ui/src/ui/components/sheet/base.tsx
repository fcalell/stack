import { Dialog } from "@base-ui/react/dialog";
import type { Selection } from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import type { Act } from "@fcalell/ui-core/descriptors";
import { pressStands } from "@fcalell/ui-core/reason";
import {
	SCRIM,
	SHEET,
	SHEET_BODY,
	SHEET_CENTERED,
	SHEET_FOOT,
	SHEET_HEAD,
	SHEET_HEAD_ROW,
	SHEET_HEAD_TITLE,
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
import { type Acting, useAct } from "../../lib/act.ts";
import { backGlyph } from "../../lib/back.ts";
import type { Empty } from "../../lib/empty.tsx";
import { useReturnFocus } from "../../lib/focus.ts";
import { useTouch } from "../../lib/media.ts";
import { PortalContainer } from "../../lib/portal.ts";
import {
	BusyMark,
	FrameBody,
	FrameLine,
	submitOf,
	useFrame,
} from "../../lib/read.tsx";
import { ReasonHostContext } from "../../lib/reason.ts";
import { useScrolls } from "../../lib/scrolls.ts";
import { useSettleName } from "../../lib/settle.ts";
import {
	TouchedContext,
	usePageTurn,
	useTouchState,
} from "../../lib/touched.ts";
import { Scroller, useScroller } from "../../lib/window.tsx";
import { useWords } from "../../lib/words.tsx";
import { ActionBarBase } from "../action-bar/base.tsx";
import { ButtonBase } from "../button/base.tsx";
import { Reason } from "../button/reason.tsx";
import { IconButtonBase } from "../icon-button/base.tsx";
import { IconButton } from "../icon-button/index.tsx";

// The layer the sheet stands on over the scrim: from the bottom edge on
// touch, centred on the desktop.
const BACKDROP = "fixed inset-0 z-(--layer-sheet)";
// Motion, on transform and opacity alone: a sheet enters at the slow rung
// and leaves at the base rung, the bottom sheet from its edge, the centred one
// rising a pair as it fades; the scrim fades on the same rung and curve.
// Reduced motion zeroes the rungs.
const SCRIM_MOTION =
	"transition-opacity duration-slow ease-out data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-base data-ending-style:ease-in";
const BOTTOM_MOTION =
	"transition-transform duration-slow ease-out data-starting-style:translate-y-full data-ending-style:translate-y-full data-ending-style:duration-base data-ending-style:ease-in";
const CENTRED_MOTION =
	"transition-[opacity,translate] duration-slow ease-out data-starting-style:translate-y-pair data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-base data-ending-style:ease-in";
// The page inset above a bottom sheet keeps a strip of scrim over the tallest
// one, so a press above it still dismisses.
const LAYER_BOTTOM =
	"fixed inset-0 z-(--layer-sheet) flex flex-col justify-end pt-page";
// A desktop sheet is a card centred over the page, capped at the layer's height
// less the page inset above and below (`LAYER_CARD` keeps that inset), its body
// scrolling. A decision is centred with no cap of its own.
const LAYER_CENTRED =
	"fixed inset-0 z-(--layer-sheet) flex items-center justify-center";
const LAYER_CARD = "py-page";
const BOX_CARD = "max-h-full";
const BOX = "relative flex flex-col";
// A view stands over the whole layer, fading in with the scrim. It takes no
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
const HEAD = "flex flex-col";
const HEAD_ROW = "flex items-center";
// The head submit's place among the sheet's acts, below any bar's index.
const HEAD_SUBMIT_AT = -1;
// A touch head's submit that does not fit beside the title column drops to a
// second line; its wrapper holds it at the row's end on either line.
const HEAD_ROW_WRAP = "flex-wrap";
const HEAD_SUBMIT = "ms-auto min-w-0 max-w-full";
const TITLE_BLOCK = "flex flex-col grow min-w-0";
const TITLE_SLOT = "flex items-center gap-inside min-w-0";
const TITLE = "min-w-0";
// The desktop head is a two-line row tall (the title over its description)
// whether or not the description stands; on touch the row is the acts'.
const HEAD_ROW_TALL = "min-h-row-2 touch:min-h-0";
// The body takes a tab stop only while it scrolls with nothing tabbable inside.
const BODY =
	"flex flex-col grow min-h-0 overflow-y-auto overscroll-contain focus-visible:-outline-offset-2";
// The card's foot carries the raised ground to the box's corners, so it follows
// the box's radius; on touch the box rounds its top only. The foot is a row
// on the desktop, a stack on touch, and its line grows beside the acts in the row.
const FOOT =
	"flex items-center rounded-b-sheet touch:flex-col touch:items-stretch touch:rounded-b-none";
const FOOT_LINE = "flex items-center min-w-0 grow touch:grow-0";
const SPACER = "grow touch:hidden";

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
	foot?: string;
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
	/** What the sheet opens focused on: its first field (a confirm's typed name), or the element a ref holds (a pick's option); a decision with neither opens on its first act, the way out. */
	focus?: "field" | RefObject<HTMLElement | null>;
	/** Ties a trigger elsewhere (a `Dialog.Trigger`) to the sheet. */
	handle?: Dialog.Handle<unknown>;
	children?: ReactNode;
}

/** A sheet over the scrim: on touch raised from the bottom edge, its submit at the head's end where a keyboard would cover a bar and a blocked submit's reason under the head; on the desktop a card centred over the page (a form, or a Pane at `fit: pane`), capped at the viewport less the page inset, its body scrolling, with the submit after Cancel in the foot, or a decision centred. Base UI's dialog traps focus and closes on Escape and on a press outside. */
export function SheetBase({
	open,
	onClose,
	onGone,
	onOpen,
	title,
	description,
	back,
	submit: offered,
	foot,
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
}: SheetBaseProps) {
	const touch = useTouch();
	const frame = useFrame(read);
	const words = useWords();
	const settle = useSettleName();
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
	// The body is the frame's: its failure and its emptiness stand in its place.
	const body = (
		<FrameBody frame={frame} fit="frame" empty={empty}>
			{children}
		</FrameBody>
	);
	const container = use(PortalContainer);
	// A sheet in a stage (a container is named) stays non-modal beside the
	// stage's others; in an app it is modal.
	const scoped = container !== undefined;
	const titleId = useId();
	const [touchedValue, setTouched] = useTouchState();
	const { touched } = touchedValue;
	const [pressedUnder, setPressedUnder] = useState<string>();
	const popup = useRef<HTMLDivElement | null>(null);
	useReturnFocus(open, popup);
	const scroll = useScroller();
	useScrolls(scroll.node);
	const blocked = submit?.blocked !== undefined;
	// The submit's press stands while it is blocked by the reason it came
	// under (`@fcalell/ui-core/reason`).
	const pressed = pressStands(submit?.blocked, pressedUnder);
	usePageTurn(open, title, description, () => {
		setTouched(false);
		setPressedUnder(undefined);
	});
	const iconFit = touch ? "body" : "bar";
	const centred = form === "centred" && !touch;
	const view = form === "view";
	// A decision draws no close act: its acts dismiss it.
	const close = acts ? null : (
		<Dialog.Close
			disabled={acting.holds}
			render={<IconButtonBase icon="X" fit={iconFit} label={words.close} />}
		/>
	);
	const lead = back ? (
		<IconButton
			icon={backGlyph(touch)}
			fit={iconFit}
			label={words.back}
			onAct={back}
		/>
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
						fit="bar"
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
				headSubmit && HEAD_ROW_WRAP,
			)}
		>
			{start}
			<div className={cn(TITLE_BLOCK, headSubmit && SHEET_HEAD_TITLE)}>
				{titled}
				{touch ? null : said}
			</div>
			{end}
		</div>
	);
	// On the desktop a submit follows Cancel in the foot's bar, which stands it
	// blocked once the read ended and draws the sentence on a press only.
	const bar =
		acts ??
		(offered && !touch
			? [{ label: words.cancel, onAct: onClose }, offered]
			: undefined);
	const actionBar = bar ? (
		<ActionBarBase
			acts={bar}
			acting={acting}
			painted={waiting}
			ended={acts ? undefined : ended}
		/>
	) : null;
	const footLine = foot ? (
		<div className={FOOT_LINE}>
			<p className={text({ role: "meta" })}>{foot}</p>
		</div>
	) : null;
	const footer =
		footLine || actionBar ? (
			<div className={cn(SHEET_FOOT, FOOT)}>
				{footLine ?? <div className={SPACER} />}
				{actionBar}
			</div>
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
			<div className={cn(SHEET_HEAD, HEAD)}>
				{headRow}
				{touch ? said : null}
				<FrameLine frame={frame} />
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
			</div>
			{form === "menu" ? (
				children
			) : body ? (
				<div
					ref={scroll.ref}
					aria-busy={(frame.holds && frame.form === "waiting") || undefined}
					style={read === undefined ? undefined : settle}
					className={cn(SHEET_BODY, BODY)}
				>
					<Scroller value={scroll.holder}>{body}</Scroller>
				</div>
			) : null}
			{form === "menu" ? null : footer}
		</>
	);
	const content = view ? children : framed;
	const box = view
		? cn(BOX_VIEW, SCRIM_MOTION)
		: touch
			? cn(SHEET, BOX, BOX_BOTTOM, tall && BOX_TALL, BOTTOM_MOTION)
			: centred
				? cn(SHEET_CENTERED, BOX, BOX_FLOAT, CENTRED_MOTION)
				: cn(sheetDesktop({ fit }), BOX, BOX_FLOAT, BOX_CARD, CENTRED_MOTION);
	const layer =
		view || centred
			? LAYER_CENTRED
			: touch
				? LAYER_BOTTOM
				: cn(LAYER_CENTRED, LAYER_CARD);
	return (
		<Dialog.Root
			handle={handle}
			open={open}
			onOpenChange={(next) => {
				if (next) onOpen?.();
				else if (!acting.holds) onClose();
			}}
			onOpenChangeComplete={(next) => {
				if (!next) onGone?.();
			}}
			// A surface that scopes its own mode (a showcase frame) holds the
			// sheet beside others, so it hides and traps nothing outside it and
			// stays open while another takes focus.
			modal={!scoped}
			disablePointerDismissal={scoped}
		>
			<Dialog.Portal container={container}>
				<Dialog.Backdrop className={cn(SCRIM, BACKDROP, SCRIM_MOTION)} />
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
										: undefined))
						}
						role={form === "centred" ? "alertdialog" : "dialog"}
						aria-label={view ? title : undefined}
						aria-labelledby={view ? undefined : titleId}
						// A field inside takes input: a blocked act says its reason.
						onChange={touchedValue.touch}
						className={box}
					>
						<TouchedContext value={touchedValue}>{content}</TouchedContext>
					</Dialog.Popup>
				</Dialog.Viewport>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
