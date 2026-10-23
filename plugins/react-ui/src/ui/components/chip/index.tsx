import {
	type Datum,
	paints,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import type { ChipFamily } from "@fcalell/ui-core/tokens";
import type { Closed } from "../../lib/closed.ts";
import { ChipBase } from "./base.tsx";

/** A data value's tag: an outlined pill with a dot in its family's hue. */
export interface ChipProps extends Closed {
	/** The value (a word; truncates past the short measure, 20 characters). A selection paints the pill, and the Chip is inert, until its read lands. */
	label: Datum<string>;
	/** The family of values it belongs to, one hue per family across screens. A selection paints the pill like a `label` does. */
	family: Datum<ChipFamily>;
	/** Adds the remove act, a round hit box the chip's height closing its right end. */
	onRemove?: () => void;
}

/** An outlined pill, a dot in the family's hue before the label in the body ink; its one act removes the value. */
export function Chip({ label, family, onRemove }: ChipProps) {
	const [word, hue] = useSelections([label, family]);
	if (paints(word) || paints(hue))
		return <ChipBase label="" family="neutral" painted />;
	// An ended read draws no pill; the frame that holds it says why.
	if (word.painted || hue.painted) return null;
	return <ChipBase label={word.value} family={hue.value} onRemove={onRemove} />;
}
