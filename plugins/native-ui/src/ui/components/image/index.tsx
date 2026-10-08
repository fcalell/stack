import {
	IMAGE_CLOSE,
	IMAGE_FULL,
	image,
	imageAspect,
	imageContentTone,
	imagePicture,
	text,
} from "@fcalell/ui-core/variants";
import { useState } from "react";
import {
	Pressable,
	Image as RNImage,
	Text as RNText,
	View,
} from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { Ink } from "../../lib/ink";
import { useWords } from "../../lib/words";
import { Icon } from "../icon";
import { IconButton } from "../icon-button";
import { SheetBase } from "../sheet/base";

const FRAME = "overflow-hidden";
const PRESS = "active:border-ink-body";
// A waiting picture is mounted to fetch, and drawn when its bytes are here.
const FETCHING = "absolute inset-0 opacity-0";
// A picture in a box of its aspect fills the box, cover-cropped.
const FILLS = "h-full";
const FAILED = "items-center justify-center overflow-hidden";
// The words of a failed content tile, wrapped whole inside its box and
// centred under the glyph; a thumbnail has no room for a sentence, so its alt
// names the tile and the glyph is drawn alone.
const ALT = "shrink max-w-full text-center";
// A press on the scrim around the picture closes the view.
const SCRIM_HIT = "absolute inset-0";
const VIEW = "flex-1 items-center justify-center";
const FULL_PICTURE = "size-full";
// The act's layer covers the picture, so the act stands at its corner and the
// picture keeps the touch everywhere else.
const CLOSE_LAYER = "absolute inset-0 items-end";

interface ImageBase extends Closed {
	src: string;
	/** What the picture shows: the button's accessible name, the failed form's words and the full view's name (a sentence; wraps in the failed form). */
	alt: string;
	// The tile at its box, a skeleton.
	loading?: boolean;
}

// A thumbnail is a square and takes no aspect; a content picture's box is
// its width over its height, which only its consumer knows before the bytes
// are here.
type ImageSize =
	| {
			// A square tile.
			fit: "thumb";
			aspect?: never;
	  }
	| {
			// The container's width at the picture's aspect, capped in height (the
			// default).
			fit?: "content";
			// The picture's width over its height (`16 / 9`): its box stands at it in
			// every state, the picture cover-cropped to it.
			aspect: number;
	  };

export type ImageProps = ImageBase & ImageSize;

interface Seen {
	src: string;
	status: "loaded" | "failed";
}

// The picture in a hairline frame, cover-cropped to its tile or its cap.
// Waiting, the frame is a skeleton at the loaded height (a thumbnail's square,
// a content picture's `aspect`); failed, an `ImageOff` glyph in the meta ink
// over the alt text (a thumbnail draws the glyph alone, the alt its name) and
// nothing to open. Pressed, the full picture opens in a sheet's view over the
// scrim (under the toasts), contain-fit inside the page inset and the safe
// area, with a Close act, the system's back and a press on the scrim.
export function Image({ src, alt, fit, aspect, loading }: ImageProps) {
	const place = fit ?? "content";
	const [seen, setSeen] = useState<Seen>();
	const [open, setOpen] = useState(false);
	// Keyed by the address, so a new `src` is fetched again.
	const current = seen?.src === src ? seen : undefined;
	const pending = current === undefined;
	// The box's aspect is the consumer's data, the same in every state.
	const boxed = imageAspect(place, aspect);
	const box = boxed === undefined ? undefined : { aspectRatio: boxed };
	if (loading)
		return (
			<View
				accessibilityState={{ busy: true }}
				style={box}
				className={cn(image({ fit: place, state: "loading" }), FRAME)}
			/>
		);
	if (current?.status === "failed")
		return (
			<View
				accessible={place === "thumb"}
				accessibilityRole={place === "thumb" ? "image" : undefined}
				accessibilityLabel={place === "thumb" ? alt : undefined}
				style={box}
				className={cn(image({ fit: place, state: "error" }), FAILED)}
			>
				<Ink.Provider value={imageContentTone()}>
					<Icon name="ImageOff" />
				</Ink.Provider>
				{place === "thumb" ? null : (
					<RNText className={cn(text({ role: "meta" }), ALT)}>{alt}</RNText>
				)}
			</View>
		);
	return (
		<>
			<Pressable
				accessibilityRole="imagebutton"
				accessibilityLabel={alt}
				accessibilityState={{ busy: pending }}
				onPress={() => setOpen(true)}
				style={box}
				className={cn(
					image({ fit: place, state: pending ? "loading" : "rest" }),
					FRAME,
					PRESS,
				)}
			>
				<RNImage
					source={{ uri: src }}
					accessible={false}
					accessibilityIgnoresInvertColors
					onLoad={() => setSeen({ src, status: "loaded" })}
					onError={() => setSeen({ src, status: "failed" })}
					className={
						pending ? FETCHING : cn(imagePicture({ fit: place }), box && FILLS)
					}
				/>
			</Pressable>
			<SheetBase
				open={open}
				onClose={() => setOpen(false)}
				title={alt}
				form="view"
			>
				<FullView onClose={() => setOpen(false)} src={src} alt={alt} />
			</SheetBase>
		</>
	);
}

function FullView(props: { onClose: () => void; src: string; alt: string }) {
	const words = useWords();
	return (
		<>
			<Pressable
				accessible={false}
				onPress={props.onClose}
				className={SCRIM_HIT}
			/>
			<View pointerEvents="none" className={cn(IMAGE_FULL, VIEW)}>
				<RNImage
					source={{ uri: props.src }}
					resizeMode="contain"
					accessible
					accessibilityRole="image"
					accessibilityLabel={props.alt}
					accessibilityIgnoresInvertColors
					className={FULL_PICTURE}
				/>
			</View>
			<View pointerEvents="box-none" className={cn(IMAGE_FULL, CLOSE_LAYER)}>
				<View className={IMAGE_CLOSE}>
					<IconButton
						icon="X"
						fit="body"
						label={words.close}
						onAct={props.onClose}
					/>
				</View>
			</View>
		</>
	);
}
