import type { Datum } from "@fcalell/plugin-api/tanstack-query";
import { IMAGE_CAP_LINES, imageAspect } from "@fcalell/ui-core/variants";
import { useState } from "react";
import type { Closed } from "../../lib/closed.ts";
import { PictureTile, PictureView } from "./base.tsx";

interface ImageBase extends Closed {
	/** The picture's address. A selection paints the tile, inert, until its read lands. */
	src: Datum<string>;
	/** What the picture shows: the button's accessible name, the failed form's words and the full view's name (a sentence; wraps in the failed form). */
	alt: string;
}

/** A thumbnail is a square and takes no aspect; a content picture's box is its width over its height, which only its consumer knows before the bytes are here. */
type ImageSize =
	| {
			/** A square tile. */
			fit: "thumb";
			aspect?: never;
	  }
	| {
			/** The container's width at the picture's aspect, capped in height (the default): a box the cap holds narrows to its aspect and stands centred. */
			fit?: "content";
			/** The picture's width over its height (`16 / 9`): its box stands at it in every state, the picture cover-cropped to it. */
			aspect: number;
	  };

/** A picture that opens full size. */
export type ImageProps = ImageBase & ImageSize;

/** The picture in a hairline frame, cover-cropped to its tile or its cap. While its address is a selection still to land the frame is painted at the loaded height (a thumbnail's square, a content picture's `aspect`), and while the bytes are on their way it is a skeleton there; failed, an `ImageOff` glyph in the meta ink over the alt text (a thumbnail draws the glyph alone, the alt its name) and nothing to open. Pressed, the full picture opens over the scrim, contain-fit inside the page inset, with a Close act, Escape and a press outside. */
export function Image({ src, alt, fit, aspect }: ImageProps) {
	const place = fit ?? "content";
	const [open, setOpen] = useState<string>();
	// The box's aspect is the consumer's data, the same in every state. A box
	// the height cap holds narrows to its aspect, so a tall or square picture
	// stands smaller rather than cropped, centred in its container.
	const ratio = imageAspect(place, aspect);
	const box =
		ratio === undefined
			? undefined
			: {
					aspectRatio: ratio,
					maxWidth: `calc(${IMAGE_CAP_LINES} * var(--spacing-line-body) * ${ratio})`,
				};
	return (
		<>
			<PictureTile src={src} alt={alt} fit={place} box={box} onOpen={setOpen} />
			<PictureView
				open={open !== undefined}
				onClose={() => setOpen(undefined)}
				src={open ?? ""}
				alt={alt}
			/>
		</>
	);
}
