import {
	type Datum,
	paints,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import { qrModules } from "@fcalell/ui-core/qr";
import { QR_CODE, QR_CODE_INK } from "@fcalell/ui-core/variants";
import { useMemo } from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useResolveClassNames } from "uniwind";
import { cn } from "../../lib/cn";
import { inertProps, PAINT_BOX, PaintView } from "../../lib/paint";

/** A code a camera reads. */
export interface QrCodeProps {
	/** The text the code carries (an address). A selection paints the tile, which takes no touch, until its read lands. Never drawn as words nor read aloud: the label names the code, and the link beside it carries the text. */
	value: Datum<string>;
	/** What the code is for, its accessible name ("Code that adds a device"): a phrase. */
	label: string;
}

// The code's modules, crisp-edged in the dark ink on a light tile in both
// modes, inside a four-module quiet zone. The tile is a square at its
// container's width down to the image's height cap, centred where the cap
// narrows it, so the code is never cropped. While its text is a selection
// still to land the tile is painted at that square. It takes no touch: an act
// beside it (a copy of the link) carries the text.
export function QrCode({ value: given, label }: QrCodeProps) {
	const [named] = useSelections([given]);
	const text = named.painted ? undefined : named.value;
	const code = useMemo(
		() => (text === undefined ? undefined : qrModules(text)),
		[text],
	);
	// react-native-svg takes values, so the modules' ink is resolved. It has
	// no crisp-edge hint; the modules are one path, so two that touch draw no
	// seam between them.
	const { color } = useResolveClassNames(QR_CODE_INK);
	// An ended read draws no code; the region that holds it says why.
	if (named.painted && !paints(named)) return null;
	if (code === undefined)
		return (
			<PaintView
				painted
				{...inertProps(true)}
				className={cn(QR_CODE, PAINT_BOX)}
			/>
		);
	return (
		<View
			accessible
			accessibilityRole="image"
			accessibilityLabel={label}
			className={QR_CODE}
		>
			<Svg
				width="100%"
				height="100%"
				viewBox={`0 0 ${code.side} ${code.side}`}
				color={color}
				aria-hidden
			>
				<Path d={code.path} fill="currentColor" />
			</Svg>
		</View>
	);
}
