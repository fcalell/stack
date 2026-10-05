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
import { FormStands } from "../../lib/form.ts";
import { useTouch } from "../../lib/media.ts";
import { PortalContainer } from "../../lib/portal.ts";
import { ReasonHostContext } from "../../lib/reason.ts";
import { TouchedContext, useTouchState } from "../../lib/touched.ts";
import { useWords } from "../../lib/words.tsx";
import { ActionBar } from "../action-bar/index.tsx";
import { Button } from "../button/index.tsx";
import { Reason } from "../button/reason.tsx";
import { IconButtonBase } from "../icon-button/base.tsx";
import { IconButton } from "../icon-button/index.tsx";
import { backGlyph } from "../place/index.tsx";

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
const LAYER_BOTTOM =
	"fixed inset-0 z-(--layer-sheet) flex flex-col justify-end";
const LAYER_SIDE = "fixed inset-0 z-(--layer-sheet) flex justify-end";
const LAYER_CENTRED =
	"fixed inset-0 z-(--layer-sheet) flex items-center justify-center";
const BOX = "relative flex flex-col";
// A view stands over the whole layer, fading in with the scrim. It takes no
// press, so the layer around its content hears one as a press on the scrim
// and dismisses; its content takes its own.
const BOX_VIEW = "relative size-full pointer-events-none";
// A tall bottom sheet stops at the viewport's top and its body scrolls; the
// bottom inset clears a phone's home indicator.
const BOX_BOTTOM = "max-h-full pb-safe";
const BOX_FLOAT = "max-w-full";
const HEAD = "flex flex-col";
const HEAD_ROW = "flex items-center";
const TITLE_BLOCK = "flex flex-col grow min-w-0";
const TITLE_SLOT = "flex items-center min-w-0";
const TITLE = "truncate";
const BODY = "flex flex-col grow min-h-0 overflow-y-auto overscroll-contain";
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
	fit?: SheetFit;
	/** A decision's acts, the foot's `ActionBar` at both densities. */
	acts?: Act[];
	/** A decision is centred on the desktop; a menu's rows stand under the head with no body or foot; a view (an image's full size) is its children over the whole layer, named by `title`, with no head, body, foot or close act of its own. */
	form?: "centred" | "menu" | "view";
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
	fit,
	acts,
	form,
	handle,
	busy,
	focus,
	children,
}: SheetBaseProps) {
	const touch = useTouch();
	const words = useWords();
	const container = use(PortalContainer);
	const reason = useId();
	const titleId = useId();
	const descriptionId = useId();
	const [touchedValue, setTouched] = useTouchState();
	const { touched } = touchedValue;
	const [pressedUnder, setPressedUnder] = useState<string>();
	const [running, setRunning] = useState(false);
	const popup = useRef<HTMLDivElement>(null);
	const blocked = submit?.blocked !== undefined;
	// The submit's press stands while it is blocked by the reason it came
	// under (`@fcalell/ui-core/reason`).
	const pressed = pressStands(submit?.blocked, pressedUnder);
	// A sheet as it opens, and a new page (a wizard's, or the next queued
	// decision's), has taken no input: reset during render, so it never draws
	// the last one's reason, while a closing sheet keeps its own until it is
	// gone.
	const page = `${title}\n${description ?? ""}`;
	const [shown, setShown] = useState({ open, page });
	if (shown.open !== open || shown.page !== page) {
		setShown({ open, page });
		if (open) {
			setTouched(false);
			setPressedUnder(undefined);
		}
	}
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
			blocked
				? { id: reason, press: () => setPressedUnder(submit?.blocked) }
				: undefined,
		[blocked, reason, submit?.blocked],
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
		<p id={descriptionId} className={text({ role: "meta" })}>
			{description}
		</p>
	) : null;
	const headRow = (
		<div className={cn(SHEET_HEAD_ROW, HEAD_ROW)}>
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
	const actionBar = bar ? <ActionBar acts={bar} /> : null;
	const footLine = foot ? (
		<div className={touch ? FOOT_LINE : FOOT_LINE_ROW}>
			<p className={text({ role: "meta" })}>{foot}</p>
		</div>
	) : null;
	const footer =
		footLine || actionBar ? (
			<div className={cn(SHEET_FOOT, touch ? FOOT_STACK : FOOT_ROW)}>
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
					<Reason id={reason} shown={touched || pressed} end>
						{submit.blocked}
					</Reason>
				) : null}
			</div>
			{form === "menu" ? (
				children
			) : children ? (
				<div className={cn(SHEET_BODY, BODY)}>{children}</div>
			) : null}
			{form === "menu" ? null : footer}
		</>
	);
	const content = view ? children : framed;
	const box = view
		? cn(BOX_VIEW, SCRIM_MOTION)
		: touch
			? cn(SHEET, BOX, BOX_BOTTOM, BOTTOM_MOTION)
			: centred
				? cn(SHEET_CENTERED, BOX, BOX_FLOAT, CENTRED_MOTION)
				: cn(sheetSide({ fit }), BOX, BOX_FLOAT, SIDE_MOTION);
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
			modal={container === undefined}
			disablePointerDismissal={container !== undefined}
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
						role={centred ? "alertdialog" : "dialog"}
						aria-label={view ? title : undefined}
						aria-labelledby={view ? undefined : titleId}
						aria-describedby={description ? descriptionId : undefined}
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
