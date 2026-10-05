import {
	IMAGE_CLOSE,
	IMAGE_FULL,
	type ImageFit,
	image,
	imagePicture,
	SCRIM,
	text,
} from "@fcalell/ui-core/variants";
import { useState } from "react";
import {
	Modal,
	Pressable,
	Image as RNImage,
	Text as RNText,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { Ink } from "../../lib/ink";
import { useWords } from "../../lib/words";
import { Icon } from "../icon";
import { IconButton } from "../icon-button";

const FRAME = "overflow-hidden";
const PRESS = "active:border-edge-strong";
// A waiting picture is mounted to fetch, and drawn when its bytes are here.
const FETCHING = "absolute inset-0 opacity-0";
const FAILED = "items-center justify-center overflow-hidden";
const ALT = "shrink max-w-full";
const FULL = "flex-1";
// A press on the scrim around the picture closes the view.
const SCRIM_HIT = "absolute inset-0";
const VIEW = "flex-1 items-center justify-center";
const FULL_PICTURE = "size-full";
// The act's layer covers the picture, so the act stands at its corner and the
// picture keeps the touch everywhere else.
const CLOSE_LAYER = "absolute inset-0 items-end";

export interface ImageProps extends Closed {
	src: string;
	// What the picture shows: the button's name, the failed form's words and
	// the full view's name.
	alt: string;
	// A square `thumb` tile, or `content` (the default): the container's width
	// at the picture's own aspect, capped in height.
	fit?: ImageFit;
	// The tile at its box, a skeleton.
	loading?: boolean;
}

interface Seen {
	src: string;
	status: "loaded" | "failed";
	// The loaded picture's width over its height.
	aspect?: number;
}

// The picture in a hairline frame, cover-cropped to its tile or its cap.
// Waiting, the frame is a skeleton; failed, an `ImageOff` glyph over the alt
// text and nothing to open. Pressed, the full picture opens in a modal over
// the scrim, contain-fit inside the page inset and the safe area, with a
// Close act, the system's back and a press on the scrim.
export function Image({ src, alt, fit, loading }: ImageProps) {
	const place = fit ?? "content";
	const [seen, setSeen] = useState<Seen>();
	const [open, setOpen] = useState(false);
	// Keyed by the address, so a new `src` is fetched again.
	const current = seen?.src === src ? seen : undefined;
	const pending = current === undefined;
	if (loading)
		return (
			<View
				accessibilityState={{ busy: true }}
				className={cn(image({ fit: place, state: "loading" }), FRAME)}
			/>
		);
	if (current?.status === "failed")
		return (
			<View className={cn(image({ fit: place, state: "error" }), FAILED)}>
				<Ink.Provider value="ink-meta">
					<Icon name="ImageOff" />
				</Ink.Provider>
				<RNText numberOfLines={1} className={cn(text({ role: "meta" }), ALT)}>
					{alt}
				</RNText>
			</View>
		);
	return (
		<>
			<Pressable
				accessibilityRole="imagebutton"
				accessibilityLabel={alt}
				accessibilityState={{ busy: pending }}
				onPress={() => setOpen(true)}
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
					onLoad={({ nativeEvent: { source } }) =>
						setSeen({
							src,
							status: "loaded",
							aspect:
								source.height > 0 ? source.width / source.height : undefined,
						})
					}
					onError={() => setSeen({ src, status: "failed" })}
					style={
						place === "content" && current?.aspect
							? { aspectRatio: current.aspect }
							: undefined
					}
					className={pending ? FETCHING : imagePicture({ fit: place })}
				/>
			</Pressable>
			<FullView
				open={open}
				onClose={() => setOpen(false)}
				src={src}
				alt={alt}
			/>
		</>
	);
}

function FullView(props: {
	open: boolean;
	onClose: () => void;
	src: string;
	alt: string;
}) {
	const insets = useSafeAreaInsets();
	const words = useWords();
	return (
		<Modal
			visible={props.open}
			transparent
			animationType="fade"
			statusBarTranslucent
			onRequestClose={props.onClose}
		>
			<View
				accessibilityViewIsModal
				style={{
					paddingTop: insets.top,
					paddingBottom: insets.bottom,
					paddingLeft: insets.left,
					paddingRight: insets.right,
				}}
				className={cn(SCRIM, FULL)}
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
			</View>
		</Modal>
	);
}
