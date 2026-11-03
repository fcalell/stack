import type { Datum } from "@fcalell/plugin-api/tanstack-query";
import {
	GALLERY,
	GALLERY_TILE,
	IMAGE_TILE_NARROWEST,
	imageAspect,
	text,
} from "@fcalell/ui-core/variants";
import { useState } from "react";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { PictureTile, PictureView } from "../image/base";

// A caption is cut to its tile's width with an ellipsis; its own width is
// none, so the picture alone sizes the tile.
const CAPTION = "w-0 min-w-full";

/** One picture of a gallery. */
export interface GalleryItem {
	/** What tells the picture apart from the others, kept while the list changes. */
	key: string;
	/** The picture's address. A selection paints the tile, which takes no touch, until its read lands. */
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

// Pictures side by side: each a tile a fixed height at its aspect (no
// narrower than three to four, cropped from its top; no wider than the
// container), its caption cut under it, the tiles wrapping a gap apart. A tile
// paints, waits and fails as an Image does. Pressed, the full view opens on
// that picture in a sheet's view over the scrim, with Previous and Next beside
// it stepping through the others, a Close act, the system's back and a press
// on the scrim.
export function Gallery({ items }: GalleryProps) {
	// The picture open, by its place in the list, with its address as it loaded.
	const [open, setOpen] = useState<{ at: number; src: string }>();
	// A neighbour whose address is a selection still to land opens nothing.
	const stepTo = (at: number) => {
		const src = items[at]?.src;
		return typeof src === "string" ? () => setOpen({ at, src }) : undefined;
	};
	const shown = open === undefined ? undefined : items[open.at];
	return (
		<View className={GALLERY}>
			{items.map((item, at) => (
				<View key={item.key} className={GALLERY_TILE}>
					<PictureTile
						src={item.src}
						alt={item.alt}
						fit="tile"
						box={imageAspect("tile", item.aspect)}
						tall={item.aspect < IMAGE_TILE_NARROWEST ? item.aspect : undefined}
						onOpen={(src) => setOpen({ at, src })}
					/>
					{item.caption ? (
						<RNText
							numberOfLines={1}
							className={cn(text({ role: "meta" }), CAPTION)}
						>
							{item.caption}
						</RNText>
					) : null}
				</View>
			))}
			<PictureView
				open={shown !== undefined}
				onClose={() => setOpen(undefined)}
				src={open?.src ?? ""}
				alt={shown?.alt ?? ""}
				steps={
					open === undefined
						? undefined
						: {
								onPrevious: open.at > 0 ? stepTo(open.at - 1) : undefined,
								onNext:
									open.at < items.length - 1 ? stepTo(open.at + 1) : undefined,
							}
				}
			/>
		</View>
	);
}
