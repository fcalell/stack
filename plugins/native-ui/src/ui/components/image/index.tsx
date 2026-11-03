import type { Datum } from "@fcalell/plugin-api/tanstack-query";
import { imageAspect } from "@fcalell/ui-core/variants";
import { useState } from "react";
import type { Closed } from "../../lib/closed";
import { PictureTile, PictureView } from "./base";

interface ImageBase extends Closed {
	/** The picture's address. A selection paints the tile, which takes no touch, until its read lands. */
	src: Datum<string>;
	/** What the picture shows: the button's accessible name, the failed form's words and the full view's name (a sentence; wraps in the failed form). */
	alt: string;
}

// A thumbnail is a square and takes no aspect; a content picture's box is
// its width over its height, which only its consumer knows before the bytes
// are here.
type ImageSize =
	| {
			/** A square tile at the thumbnail size, cover-cropped; it fills the tile whatever the picture's shape, so it takes no `aspect`. */
			fit: "thumb";
			/** A thumbnail is a square: it takes no aspect. */
			aspect?: never;
	  }
	| {
			/** The container's width at the picture's `aspect`, capped in height (the default); a content picture, not a tile. */
			fit?: "content";
			/** The picture's width over its height (`16 / 9`), which the screen gives as it knows it before the bytes land: its box stands at it in every state (painted, loading, failed, loaded), the picture cover-cropped to it. */
			aspect: number;
	  };

export type ImageProps = ImageBase & ImageSize;

// The picture in a hairline frame, cover-cropped to its tile or its cap.
// While its address is a selection still to land the frame is painted at the
// loaded height (a thumbnail's square, a content picture's `aspect`), and while
// the bytes are on their way it is a skeleton there; failed, an `ImageOff` glyph in the meta ink
// over the alt text (a thumbnail draws the glyph alone, the alt its name) and
// nothing to open. Pressed, the full picture opens in a sheet's view over the
// scrim (under the toasts), contain-fit inside the page inset and the safe
// area, with a Close act, the system's back and a press on the scrim.
export function Image({ src, alt, fit, aspect }: ImageProps) {
	const place = fit ?? "content";
	const [open, setOpen] = useState<string>();
	return (
		<>
			<PictureTile
				src={src}
				alt={alt}
				fit={place}
				box={imageAspect(place, aspect)}
				onOpen={setOpen}
			/>
			<PictureView
				open={open !== undefined}
				onClose={() => setOpen(undefined)}
				src={open ?? ""}
				alt={alt}
			/>
		</>
	);
}
