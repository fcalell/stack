import {
	type Datum,
	paints,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import { qrModules } from "@fcalell/ui-core/qr";
import { QR_CODE, QR_CODE_INK } from "@fcalell/ui-core/variants";
import { useMemo } from "react";
import { PAINT_BOX } from "../../lib/paint.tsx";

// The drawing fills the tile edge to edge, the quiet zone inside its view box.
const DRAWING = "block size-full";

/** A code a camera reads. */
export interface QrCodeProps {
	/** The text the code carries (an address). A selection paints the tile, inert, until its read lands. Never drawn as words nor read aloud: the label names the code, and the link beside it carries the text. */
	value: Datum<string>;
	/** What the code is for, its accessible name ("Code that adds a device"): a phrase. */
	label: string;
}

/** The code's modules, crisp-edged in the dark ink on a light tile in both modes, inside a four-module quiet zone. The tile is a square at its container's width down to the image's height cap, centred where the cap narrows it, so the code is never cropped. While its text is a selection still to land the tile is painted at that square. It takes no press: an act beside it (a copy of the link) carries the text. */
export function QrCode({ value: given, label }: QrCodeProps) {
	const [named] = useSelections([given]);
	const text = named.painted ? undefined : named.value;
	const code = useMemo(
		() => (text === undefined ? undefined : qrModules(text)),
		[text],
	);
	// An ended read draws no code; the region that holds it says why.
	if (named.painted && !paints(named)) return null;
	if (code === undefined)
		return <div aria-hidden inert className={cn(QR_CODE, PAINT_BOX)} />;
	return (
		<div role="img" aria-label={label} className={cn(QR_CODE, QR_CODE_INK)}>
			<svg
				aria-hidden="true"
				viewBox={`0 0 ${code.side} ${code.side}`}
				shapeRendering="crispEdges"
				className={DRAWING}
			>
				<path d={code.path} fill="currentColor" />
			</svg>
		</div>
	);
}
