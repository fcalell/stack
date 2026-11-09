import type { Datum } from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import {
	GALLERY,
	GALLERY_TILE,
	imageAspect,
	text,
} from "@fcalell/ui-core/variants";
import { useState } from "react";
import type { Closed } from "../../lib/closed.ts";
import { PictureTile, PictureView } from "../image/base.tsx";

// A caption is cut to its tile's width with an ellipsis and names itself
// through the frame's cut tooltip. Its own width is none, so the picture alone
// sizes the tile and the caption takes the tile's width.
const CAPTION = "w-0 min-w-full truncate";

/** One picture of a gallery. */
export interface GalleryItem {
	/** What tells the picture apart from the others, kept while the list changes. */
	key: string;
	/** The picture's address. A selection paints the tile, inert, until its read lands. */
	src: Datum<string>;
	/** What the picture shows: the tile's accessible name and the full view's name (a sentence). */
	alt: string;
	/** The picture's width over its height (`16 / 10`): the tile stands at it, held no narrower than three to four. */
	aspect: number;
	/** A line under the tile, cut to its width (a file's name, a page's address). */
	caption?: string;
}

export interface GalleryProps extends Closed {
	/** The pictures, in the order the full view steps through them. */
	items: readonly GalleryItem[];
}

/** Pictures side by side: each a tile a fixed height at its aspect (no narrower than three to four, cropped from its top; no wider than the container), its caption cut under it, the tiles wrapping a gap apart. A tile paints, waits and fails as an Image does. Pressed, the full view opens on that picture over the scrim, contain-fit inside the page inset, with Previous and Next beside it (and the arrow keys) stepping through the others, a lifted Close act, Escape and a press outside. */
export function Gallery({ items }: GalleryProps) {
	// The picture open, by its place in the list.
	const [open, setOpen] = useState<number>();
	const shown = open === undefined ? undefined : items[open];
	return (
		<div data-wide="" className={GALLERY}>
			{items.map((item, at) => {
				const ratio = imageAspect("tile", item.aspect);
				return (
					<div key={item.key} className={GALLERY_TILE}>
						<PictureTile
							src={item.src}
							alt={item.alt}
							fit="tile"
							box={{ aspectRatio: ratio }}
							onOpen={() => setOpen(at)}
						/>
						{item.caption ? (
							<span className={cn(text({ role: "meta" }), CAPTION)}>
								{item.caption}
							</span>
						) : null}
					</div>
				);
			})}
			<PictureView
				open={shown !== undefined}
				onClose={() => setOpen(undefined)}
				src={shown?.src ?? ""}
				alt={shown?.alt ?? ""}
				steps={
					open === undefined
						? undefined
						: {
								onPrevious: open > 0 ? () => setOpen(open - 1) : undefined,
								onNext:
									open < items.length - 1 ? () => setOpen(open + 1) : undefined,
							}
				}
			/>
		</div>
	);
}
