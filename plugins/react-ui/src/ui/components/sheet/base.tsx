import { Dialog } from "@base-ui/react/dialog";
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
	type SheetFit,
	sheetSide,
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
import { backGlyph } from "../../lib/back.ts";
import { FormStands } from "../../lib/form.ts";
import { useTouch } from "../../lib/media.ts";
import { PortalContainer, PortalHosted } from "../../lib/portal.ts";
import { ActFailed, ReasonHostContext } from "../../lib/reason.ts";
import { useScrolls } from "../../lib/scrolls.ts";
import {
	TouchedContext,
	usePageTurn,
	useTouchState,
} from "../../lib/touched.ts";
import { useWords } from "../../lib/words.tsx";
import { ActionBar } from "../action-bar/index.tsx";
import { Button } from "../button/index.tsx";
import { Reason } from "../button/reason.tsx";
import { IconButtonBase } from "../icon-button/base.tsx";
import { IconButton } from "../icon-button/index.tsx";

// The layer the sheet stands on over the scrim: from the bottom edge on
// touch, at the end on the desktop, centred for a decision.
const BACKDROP = "fixed inset-0 z-(--layer-sheet)";
// Motion, on transform and opacity alone: a sheet enters at the slow rung
// and leaves at the base rung, the side sheet from its end, the bottom sheet
// from its edge, the centred one rising a pair as it fades; the scrim fades
// on the same rung and curve. Reduced motion zeroes the rungs.
const SCRIM_MOTION =
	"transition-opacity duration-slow ease-out data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-base data-ending-style:ease-in";
const SIDE_MOTION =
	"transition-transform duration-slow ease-out data-starting-style:translate-x-full data-ending-style:translate-x-full data-ending-style:duration-base data-ending-style:ease-in";
const BOTTOM_MOTION =
	"transition-transform duration-slow ease-out data-starting-style:translate-y-full data-ending-style:translate-y-full data-ending-style:duration-base data-ending-style:ease-in";
const CENTRED_MOTION =
	"transition-[opacity,translate] duration-slow ease-out data-starting-style:translate-y-pair data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-base data-ending-style:ease-in";
// The page inset above a bottom sheet keeps a strip of scrim over the tallest
// one, so a press above it still dismisses.
const LAYER_BOTTOM =
	"fixed inset-0 z-(--layer-sheet) flex flex-col justify-end pt-page";
// A side sheet hangs from the top at the end edge: its content's height up to
// the layer's, so a short form is a card and a long one the full height.
const LAYER_SIDE =
	"fixed inset-0 z-(--layer-sheet) flex items-start justify-end";
const BOX_SIDE = "max-h-full";
const LAYER_CENTRED =
	"fixed inset-0 z-(--layer-sheet) flex items-center justify-center";
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
const TITLE_BLOCK = "flex flex-col grow min-w-0";
const TITLE_SLOT = "flex items-center min-w-0";
const TITLE = "min-w-0 wrap-break-word";
// The desktop head is a two-line row tall (the title over its description)
// whether or not the description stands.
const HEAD_ROW_TALL = "min-h-row-2";
// The body takes a tab stop only while it scrolls with nothing tabbable inside.
const BODY =
	"flex flex-col grow min-h-0 overflow-y-auto overscroll-contain focus-visible:-outline-offset-2";
// The side sheet's foot carries the raised ground to the box's corner, so it
// follows the box's radius.
const FOOT_SIDE = "rounded-bl-sheet";
const FOOT_ROW = "flex items-center";
const FOOT_STACK = "flex flex-col";
const FOOT_LINE = "flex items-center min-w-0";
const FOOT_LINE_ROW = "flex items-center min-w-0 grow";
const SPACER = "grow";

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
	failed?: string;
	fit?: SheetFit;
	/** A decision's acts, the foot's `ActionBar` at both densities. */
	acts?: Act[];
	/** A decision is centred on the desktop; a menu's rows stand under the head with no body or foot; a view (an image's full size) is its children over the whole layer, named by `title`, with no head, body, foot or close act of its own. */
	form?: "centred" | "menu" | "view";
	/** A menu that searches stands the whole viewport height from its first frame, so its list does not jump as the filter narrows. */
	tall?: boolean;
	/** An act pends: the close act is inert and says so. */
	busy?: boolean;
	/** What the sheet opens focused on: its first field (a confirm's typed name), or the element a ref holds (a pick's option). */
	focus?: "field" | RefObject<HTMLElement | null>;
	/** Ties a trigger elsewhere (a `Dialog.Trigger`) to the sheet. */
	handle?: Dialog.Handle<unknown>;
	children?: ReactNode;
}

/** A sheet over the scrim: on touch raised from the bottom edge, its submit at the head's end where a keyboard would cover a bar and a blocked submit's reason under the head; on the desktop at the end (a form, or a Split's pane at `fit: pane`) with the submit after Cancel in the foot, or centred for a decision. Base UI's dialog traps focus and closes on Escape and on a press outside. */
export function SheetBase({
	open,
	onClose,
	onGone,
	onOpen,
	title,
	description,
	back,
	submit,
	foot,
	failed,
	fit,
	acts,
	form,
	tall,
	handle,
	busy,
	focus,
	children,
}: SheetBaseProps) {
	const touch = useTouch();
	const words = useWords();
	const container = use(PortalContainer);
	// A container a host names only places the popup: the sheet stays modal.
	const scoped = container !== undefined && !use(PortalHosted);
	const titleId = useId();
	const [touchedValue, setTouched] = useTouchState();
	const { touched } = touchedValue;
	const [pressedUnder, setPressedUnder] = useState<string>();
	const [running, setRunning] = useState(false);
	const popup = useRef<HTMLDivElement>(null);
	const [bodyNode, setBodyNode] = useState<HTMLDivElement | null>(null);
	const stop = useScrolls(bodyNode);
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
			disabled={busy}
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
	// moves to the start unless back holds it. It pends on its promise, as the
	// desktop's foot bar does.
	const runSubmit = () => {
		const ran = submit?.onAct();
		if (!(ran instanceof Promise)) return;
		setRunning(true);
		void ran.finally(() => setRunning(false));
	};
	const headSubmit =
		touch && submit ? (
			<ReasonHostContext value={host}>
				<Button
					fit="bar"
					label={submit.label}
					onAct={runSubmit}
					loading={submit.loading === true || running}
					blocked={submit.blocked}
				/>
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
				!(touch || centred) && HEAD_ROW_TALL,
			)}
		>
			{start}
			<div className={TITLE_BLOCK}>
				{titled}
				{touch ? null : said}
			</div>
			{end}
		</div>
	);
	// On the desktop a submit follows Cancel in the foot's bar.
	const bar =
		acts ??
		(submit && !touch
			? [{ label: words.cancel, onAct: onClose }, submit]
			: undefined);
	const actionBar = bar ? (
		<ActFailed value={failed}>
			<ActionBar acts={bar} />
		</ActFailed>
	) : null;
	const footLine = foot ? (
		<div className={touch ? FOOT_LINE : FOOT_LINE_ROW}>
			<p className={text({ role: "meta" })}>{foot}</p>
		</div>
	) : null;
	const footer =
		footLine || actionBar ? (
			<div
				className={cn(
					SHEET_FOOT,
					touch ? FOOT_STACK : FOOT_ROW,
					!touch && FOOT_SIDE,
				)}
			>
				{footLine ?? (touch ? null : <div className={SPACER} />)}
				{actionBar}
			</div>
		) : null;
	const framed = centred ? (
		<>
			{headRow}
			{children}
			{actionBar}
		</>
	) : (
		<>
			<div className={cn(SHEET_HEAD, HEAD)}>
				{headRow}
				{touch ? said : null}
				{headSubmit && submit?.blocked ? (
					<Reason shown={touched || pressed} end>
						{submit.blocked}
					</Reason>
				) : null}
				{headSubmit && submit?.blocked === undefined && failed ? (
					<Reason shown failed end>
						{failed}
					</Reason>
				) : null}
			</div>
			{form === "menu" ? (
				children
			) : children ? (
				<div
					ref={setBodyNode}
					tabIndex={stop ? 0 : undefined}
					className={cn(SHEET_BODY, BODY)}
				>
					{children}
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
				: cn(sheetSide({ fit }), BOX, BOX_FLOAT, BOX_SIDE, SIDE_MOTION);
	const layer =
		view || centred ? LAYER_CENTRED : touch ? LAYER_BOTTOM : LAYER_SIDE;
	return (
		<Dialog.Root
			handle={handle}
			open={open}
			onOpenChange={(next) => (next ? onOpen?.() : onClose())}
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
						// A field takes no ref (its props are closed), so the popup finds it.
						initialFocus={
							focus === "field"
								? () => popup.current?.querySelector("input") ?? true
								: focus
						}
						role={form === "centred" ? "alertdialog" : "dialog"}
						aria-label={view ? title : undefined}
						aria-labelledby={view ? undefined : titleId}
						// A field inside takes input: a blocked act says its reason.
						onChange={touchedValue.touch}
						className={box}
					>
						<TouchedContext value={touchedValue}>
							<FormStands value="sheet">{content}</FormStands>
						</TouchedContext>
					</Dialog.Popup>
				</Dialog.Viewport>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
