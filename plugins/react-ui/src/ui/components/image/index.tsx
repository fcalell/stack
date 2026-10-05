import { Dialog } from "@base-ui/react/dialog";
import { cn } from "@fcalell/ui-core/cn";
import {
	IMAGE_CLOSE,
	IMAGE_FAILED_INK,
	IMAGE_FULL,
	type ImageFit,
	image,
	imageAspect,
	imagePicture,
	text,
} from "@fcalell/ui-core/variants";
import { useState } from "react";
import type { Closed } from "../../lib/closed.ts";
import { useWords } from "../../lib/words.tsx";
import { Icon } from "../icon/index.tsx";
import { IconButtonBase } from "../icon-button/base.tsx";
import { SheetBase } from "../sheet/base.tsx";

const FRAME = "block relative overflow-hidden";
// A press moves the frame's hairline, the pointer's step lighter than the
// press's; the ring is the base layer's.
const PRESS = "hover:border-edge-hover active:border-ink-body";
const PICTURE = "block object-cover";
// A waiting picture is mounted to fetch, and drawn when its bytes are here.
const FETCHING = "absolute inset-0 opacity-0";
// A picture in a box of its aspect fills the box, cover-cropped.
const BOXED = "absolute inset-0 h-full";
const FAILED = "flex flex-col items-center justify-center";
// The words of a failed tile: a thumbnail has no room for a sentence, so its
// alt names the tile to assistive tech and in a tooltip, the glyph alone
// drawn.
const ALT: Record<ImageFit, string> = {
	thumb: "sr-only",
	content: "min-w-0 max-w-full truncate",
};
// The full view fills the sheet's layer, which takes no press: the picture
// and the act take theirs, and a press anywhere else is on the scrim. The
// picture is contained inside the page inset.
const VIEW = "relative flex size-full items-center justify-center";
const FULL_PICTURE =
	"block max-h-full max-w-full object-contain pointer-events-auto";
// The act's layer covers the picture, so the act stands at its corner.
const CLOSE_LAYER =
	"absolute inset-0 flex items-start justify-end pointer-events-none";
const CLOSE_HIT = "flex pointer-events-auto";

interface ImageBase extends Closed {
	/** The picture's address. */
	src: string;
	/** What the picture shows: the button's accessible name, the failed form's words and the full view's name. */
	alt: string;
	/** The tile at its box, a skeleton. */
	loading?: boolean;
}

/** A thumbnail is a square and takes no aspect; a content picture's box is its width over its height, which only its consumer knows before the bytes are here. */
type ImageSize =
	| {
			/** A square tile. */
			fit: "thumb";
			aspect?: never;
	  }
	| {
			/** The container's width at the picture's aspect, capped in height (the default). */
			fit?: "content";
			/** The picture's width over its height (`16 / 9`): its box stands at it in every state, the picture cover-cropped to it. */
			aspect: number;
	  };

/** A picture that opens full size. */
export type ImageProps = ImageBase & ImageSize;

type Status = "pending" | "loaded" | "failed";

/** The picture in a hairline frame, cover-cropped to its tile or its cap. Waiting, the frame is a skeleton at the loaded height (a thumbnail's square, a content picture's `aspect`); failed, an `ImageOff` glyph in the meta ink over the alt text (a thumbnail draws the glyph alone, the alt its name) and nothing to open. Pressed, the full picture opens over the scrim, contain-fit inside the page inset, with a Close act, Escape and a press outside. */
export function Image({ src, alt, fit, aspect, loading }: ImageProps) {
	const place = fit ?? "content";
	const words = useWords();
	const [seen, setSeen] = useState<{ src: string; status: Status }>();
	const [open, setOpen] = useState(false);
	// Keyed by the address, so a new `src` is fetched again.
	const status = seen?.src === src ? seen.status : "pending";
	const settle = (settled: Status) => setSeen({ src, status: settled });
	// A picture the browser already holds is complete before its handlers
	// attach.
	const fetched = (node: HTMLImageElement | null) => {
		if (node?.complete && status === "pending")
			settle(node.naturalWidth > 0 ? "loaded" : "failed");
	};
	// The box's aspect is the consumer's data, the same in every state.
	const ratio = imageAspect(place, aspect);
	const box = ratio === undefined ? undefined : { aspectRatio: ratio };
	if (loading)
		return (
			<div
				aria-busy
				style={box}
				className={cn(image({ fit: place, state: "loading" }), FRAME)}
			/>
		);
	if (status === "failed")
		return (
			<div
				style={box}
				title={place === "thumb" ? alt : undefined}
				className={cn(
					image({ fit: place, state: "error" }),
					FAILED,
					IMAGE_FAILED_INK,
				)}
			>
				<Icon name="ImageOff" />
				<span className={cn(text({ role: "meta" }), ALT[place])}>{alt}</span>
			</div>
		);
	return (
		<>
			<button
				type="button"
				aria-busy={status === "pending" || undefined}
				onClick={() => setOpen(true)}
				style={box}
				className={cn(
					image({
						fit: place,
						state: status === "pending" ? "loading" : "rest",
					}),
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
						imagePicture({ fit: place }),
						status === "pending" ? FETCHING : PICTURE,
						status === "loaded" && box && BOXED,
					)}
				/>
			</button>
			<SheetBase
				open={open}
				onClose={() => setOpen(false)}
				title={alt}
				form="view"
			>
				<div className={cn(IMAGE_FULL, VIEW)}>
					<img src={src} alt={alt} className={FULL_PICTURE} />
				</div>
				<div className={cn(IMAGE_FULL, CLOSE_LAYER)}>
					<span className={cn(IMAGE_CLOSE, CLOSE_HIT)}>
						<Dialog.Close
							render={
								<IconButtonBase icon="X" fit="body" label={words.close} />
							}
						/>
					</span>
				</div>
			</SheetBase>
		</>
	);
}
