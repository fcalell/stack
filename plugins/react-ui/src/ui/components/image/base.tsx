import { Dialog } from "@base-ui/react/dialog";
import {
	type Datum,
	paints,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import {
	IMAGE_CLOSE,
	IMAGE_FAILED_INK,
	IMAGE_FULL,
	type ImageFit,
	image,
	imagePicture,
	text,
} from "@fcalell/ui-core/variants";
import { type CSSProperties, useState } from "react";
import { PAINT_BOX } from "../../lib/paint.tsx";
import { useWords } from "../../lib/words.tsx";
import { IconButtonBase } from "../button/glyph.tsx";
import { Icon } from "../icon/index.tsx";
import { SheetBase } from "../sheet/base.tsx";

// The picture and its full view, which an Image draws once and a Gallery once
// per tile, with one full view that steps through its pictures.

const FRAME = "block relative shrink-0 overflow-hidden";
// A press moves the frame's hairline, the pointer's step lighter than the
// press's; the ring is the base layer's.
const PRESS = "hover:border-edge-hover active:border-ink-body";
const PICTURE = "block object-cover";
// A waiting picture is mounted to fetch, and drawn when its bytes are here.
const FETCHING = "absolute inset-0 opacity-0";
// A picture in a box of its aspect fills the box, cover-cropped.
const BOXED = "absolute inset-0 h-full";
// A tile crops a picture taller than it from the top, where a page's head is.
const TOP = "object-top";
const FAILED = "flex flex-col items-center justify-center";
// The words of a failed tile: a thumbnail or a gallery's tile has no room for
// a sentence, so its alt shows in a tooltip, the glyph alone drawn; a content
// tile wraps its alt whole inside its box, centred under the glyph.
const ALT = "min-w-0 max-w-full text-center";
// The full view fills the sheet's layer, which takes no press: the picture
// and the acts take theirs, and a press anywhere else is on the scrim. The
// picture is contained inside the page inset.
const VIEW = "relative flex size-full items-center justify-center";
const FULL_PICTURE =
	"block max-h-full max-w-full object-contain pointer-events-auto";
// The acts' layers cover the picture, so Close stands at its corner and
// Previous and Next at its sides, each centred on its height.
const CLOSE_LAYER =
	"absolute inset-0 flex items-start justify-end pointer-events-none";
const STEP_LAYER =
	"absolute inset-0 flex items-center justify-between pointer-events-none";
const HIT = "flex pointer-events-auto";
const KEYS = "contents";

type Status = "pending" | "loaded" | "failed";

/** The picture's address and its box: the frame paints, waits, fails and opens as an Image's does. */
export interface PictureTileProps {
	src: Datum<string>;
	alt: string;
	fit: ImageFit;
	/** The box's aspect, or none for a thumbnail's square. */
	box: CSSProperties | undefined;
	/** A press on the loaded or waiting picture, with its address. */
	onOpen: (src: string) => void;
}

/** The picture in a hairline frame at its fit: painted while its address is a selection still to land, a skeleton while the bytes come, failed an `ImageOff` glyph in the meta ink (over the alt on the content fit, the alt its tooltip otherwise), and a button that opens it once its address is here. */
export function PictureTile({
	src: given,
	alt,
	fit,
	box,
	onOpen,
}: PictureTileProps) {
	const [named] = useSelections([given]);
	const src = named.painted ? "" : named.value;
	const [seen, setSeen] = useState<{ src: string; status: Status }>();
	// Keyed by the address, so a new `src` is fetched again.
	const status = seen?.src === src ? seen.status : "pending";
	const settle = (settled: Status) => setSeen({ src, status: settled });
	// A picture the browser already holds is complete before its handlers
	// attach.
	const fetched = (node: HTMLImageElement | null) => {
		if (node?.complete && status === "pending")
			settle(node.naturalWidth > 0 ? "loaded" : "failed");
	};
	if (named.painted && !paints(named)) return null;
	if (named.painted)
		return (
			<div
				aria-hidden
				inert
				style={box}
				className={cn(image({ fit }), FRAME, PAINT_BOX)}
			/>
		);
	if (status === "failed")
		return (
			<div
				style={box}
				title={fit === "content" ? undefined : alt}
				className={cn(image({ fit, state: "error" }), FAILED, IMAGE_FAILED_INK)}
			>
				<Icon name="ImageOff" />
				{fit === "content" ? (
					<span className={cn(text({ role: "meta" }), ALT)}>{alt}</span>
				) : null}
			</div>
		);
	return (
		<button
			type="button"
			aria-busy={status === "pending" || undefined}
			onClick={() => onOpen(src)}
			style={box}
			className={cn(
				image({ fit, state: status === "pending" ? "loading" : "rest" }),
				FRAME,
				PRESS,
			)}
		>
			<img
				ref={fetched}
				src={src}
				alt={alt}
				onLoad={() => settle("loaded")}
				onError={() => settle("failed")}
				className={cn(
					imagePicture({ fit }),
					status === "pending" ? FETCHING : PICTURE,
					status === "loaded" && box && BOXED,
					fit === "tile" && TOP,
				)}
			/>
		</button>
	);
}

/** Previous and Next in a full view: each moves to the neighbouring picture, none past the ends. */
export interface PictureSteps {
	onPrevious: (() => void) | undefined;
	onNext: (() => void) | undefined;
}

/** The full picture over the scrim, contain-fit inside the page inset, with a lifted Close act, Escape and a press outside; given steps, a lifted Previous and Next beside it and the arrow keys. */
export function PictureView(props: {
	open: boolean;
	onClose: () => void;
	/** The picture's address; a selection still to land draws no picture yet. */
	src: Datum<string>;
	alt: string;
	steps?: PictureSteps;
}) {
	const words = useWords();
	const { steps } = props;
	const [named] = useSelections([props.src]);
	const src = named.painted ? undefined : named.value;
	const step = (event: React.KeyboardEvent) => {
		if (!steps) return;
		const to =
			event.key === "ArrowLeft"
				? steps.onPrevious
				: event.key === "ArrowRight"
					? steps.onNext
					: undefined;
		if (!to) return;
		event.preventDefault();
		to();
	};
	return (
		<SheetBase
			open={props.open}
			onClose={props.onClose}
			title={props.alt}
			form="view"
		>
			{/* The keys the view takes reach it from whichever act holds focus; the
			wrapper draws no box, so each layer stands over the sheet's layer. */}
			{/* biome-ignore lint/a11y/noStaticElementInteractions: the arrow keys step the view; Previous and Next are its buttons. */}
			<div className={KEYS} onKeyDown={step}>
				<div className={cn(IMAGE_FULL, VIEW)}>
					{src ? (
						<img src={src} alt={props.alt} className={FULL_PICTURE} />
					) : null}
				</div>
				{steps ? (
					<div className={cn(IMAGE_FULL, STEP_LAYER)}>
						<StepAct
							icon="ChevronLeft"
							label={words.previous}
							onAct={steps.onPrevious}
						/>
						<StepAct
							icon="ChevronRight"
							label={words.next}
							onAct={steps.onNext}
						/>
					</div>
				) : null}
				<div className={cn(IMAGE_FULL, CLOSE_LAYER)}>
					<span className={cn(IMAGE_CLOSE, HIT)}>
						<Dialog.Close
							render={<IconButtonBase icon="X" label={words.close} />}
						/>
					</span>
				</div>
			</div>
		</SheetBase>
	);
}

// A step's act, lifted like Close; at an end the place holds nothing, so the
// other stays at its side.
function StepAct(props: {
	icon: "ChevronLeft" | "ChevronRight";
	label: string;
	onAct: (() => void) | undefined;
}) {
	if (!props.onAct) return <span />;
	return (
		<span className={cn(IMAGE_CLOSE, HIT)}>
			<IconButtonBase
				icon={props.icon}
				label={props.label}
				onClick={props.onAct}
			/>
		</span>
	);
}
