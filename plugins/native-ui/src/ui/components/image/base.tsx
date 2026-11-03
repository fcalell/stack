import {
	type Datum,
	paints,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import {
	IMAGE_CLOSE,
	IMAGE_FULL,
	type ImageFit,
	image,
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
import { cn } from "../../lib/cn";
import { Ink } from "../../lib/ink";
import { inertProps, PAINT_BOX, PaintView } from "../../lib/paint";
import { useWords } from "../../lib/words";
import { Button } from "../button";
import { Icon } from "../icon";
import { SheetBase } from "../sheet/base";

// The picture and its full view, which an Image draws once and a Gallery once
// per tile, with one full view that steps through its pictures.

const FRAME = "overflow-hidden";
const PRESS = "active:border-ink-body";
// A waiting picture is mounted to fetch, and drawn when its bytes are here.
const FETCHING = "absolute inset-0 opacity-0";
// A picture in a box of its aspect fills the box, cover-cropped.
const FILLS = "h-full";
// A picture taller than its tile stands at the tile's width and its own
// aspect from the tile's top, so the frame crops it from the top, where a
// page's head is (the native picture has no crop position).
const FROM_TOP = "w-full";
const FAILED = "items-center justify-center overflow-hidden";
// The words of a failed content tile, wrapped whole inside its box and
// centred under the glyph; a thumbnail or a gallery's tile has no room for a
// sentence, so its alt names the tile and the glyph is drawn alone.
const ALT = "shrink max-w-full text-center";
// A press on the scrim around the picture closes the view.
const SCRIM_HIT = "absolute inset-0";
const VIEW = "flex-1 items-center justify-center";
const FULL_PICTURE = "size-full";
// The acts' layers cover the picture, so Close stands at its corner and
// Previous and Next at its sides, and the picture keeps the touch everywhere
// else.
const CLOSE_LAYER = "absolute inset-0 items-end";
const STEP_LAYER = "absolute inset-0 flex-row items-center justify-between";

interface Seen {
	src: string;
	status: "loaded" | "failed";
}

/** The picture's address and its box: the frame paints, waits, fails and opens as an Image's does. */
export interface PictureTileProps {
	src: Datum<string>;
	alt: string;
	fit: ImageFit;
	/** The box's aspect, or none for a thumbnail's square. */
	box: number | undefined;
	/** The picture's own aspect where it is taller than its box, which then crops it from the top. */
	tall?: number;
	/** A press on the loaded or waiting picture, with its address. */
	onOpen: (src: string) => void;
}

/** The picture in a hairline frame at its fit: painted while its address is a selection still to land, a skeleton while the bytes come, failed an `ImageOff` glyph in the meta ink (over the alt on the content fit, the alt its name otherwise), and a button that opens it once its address is here. */
export function PictureTile({
	src: given,
	alt,
	fit,
	box: boxed,
	tall,
	onOpen,
}: PictureTileProps) {
	const [named] = useSelections([given]);
	const waits = paints(named);
	const src = named.painted ? "" : named.value;
	const [seen, setSeen] = useState<Seen>();
	// Keyed by the address, so a new `src` is fetched again.
	const current = seen?.src === src ? seen : undefined;
	const pending = current === undefined;
	const box = boxed === undefined ? undefined : { aspectRatio: boxed };
	const glyphOnly = fit !== "content";
	// An ended read draws no picture; the frame that holds it says why.
	if (named.painted && !waits) return null;
	if (named.painted)
		return (
			<PaintView
				painted
				{...inertProps(true)}
				style={box}
				className={cn(image({ fit }), FRAME, PAINT_BOX)}
			/>
		);
	if (current?.status === "failed")
		return (
			<View
				accessible={glyphOnly}
				accessibilityRole={glyphOnly ? "image" : undefined}
				accessibilityLabel={glyphOnly ? alt : undefined}
				style={box}
				className={cn(image({ fit, state: "error" }), FAILED)}
			>
				<Ink.Provider value={imageContentTone()}>
					<Icon name="ImageOff" />
				</Ink.Provider>
				{glyphOnly ? null : (
					<RNText className={cn(text({ role: "meta" }), ALT)}>{alt}</RNText>
				)}
			</View>
		);
	return (
		<Pressable
			accessibilityRole="imagebutton"
			accessibilityLabel={alt}
			accessibilityState={{ busy: pending }}
			onPress={() => onOpen(src)}
			style={box}
			className={cn(
				image({ fit, state: pending ? "loading" : "rest" }),
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
				style={
					!pending && tall !== undefined ? { aspectRatio: tall } : undefined
				}
				className={
					pending
						? FETCHING
						: tall !== undefined
							? FROM_TOP
							: cn(imagePicture({ fit }), box && FILLS)
				}
			/>
		</Pressable>
	);
}

/** Previous and Next in a full view: each moves to the neighbouring picture, none past the ends. */
export interface PictureSteps {
	onPrevious: (() => void) | undefined;
	onNext: (() => void) | undefined;
}

/** The full picture in a sheet's view over the scrim (under the toasts), contain-fit inside the page inset and the safe area, with a Close act, the system's back and a press on the scrim; given steps, Previous and Next beside it. */
export function PictureView(props: {
	open: boolean;
	onClose: () => void;
	src: string;
	alt: string;
	steps?: PictureSteps;
}) {
	const words = useWords();
	const { steps } = props;
	return (
		<SheetBase
			open={props.open}
			onClose={props.onClose}
			title={props.alt}
			form="view"
		>
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
			{steps ? (
				<View pointerEvents="box-none" className={cn(IMAGE_FULL, STEP_LAYER)}>
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
				</View>
			) : null}
			<View pointerEvents="box-none" className={cn(IMAGE_FULL, CLOSE_LAYER)}>
				<View className={IMAGE_CLOSE}>
					<Button glyph icon="X" label={words.close} onAct={props.onClose} />
				</View>
			</View>
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
	if (!props.onAct) return <View />;
	return (
		<View className={IMAGE_CLOSE}>
			<Button glyph icon={props.icon} label={props.label} onAct={props.onAct} />
		</View>
	);
}
