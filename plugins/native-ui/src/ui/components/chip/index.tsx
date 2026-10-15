import { type Datum, useSelections } from "@fcalell/plugin-api/tanstack-query";
import type { ChipFamily } from "@fcalell/ui-core/tokens";
import type { Closed } from "../../lib/closed";
import { ChipBase } from "./base";

export interface ChipProps extends Closed {
	/** The value (a word; truncates past the short measure, 18 characters). A selection paints the pill, which takes no touch, until its read lands. */
	label: Datum<string>;
	/** The family of values it belongs to, one hue per family across screens. A selection paints the pill like a `label` does. */
	family: Datum<ChipFamily>;
	onRemove?: () => void;
}

// A data value's tag on its family's soft ground; its one act removes the value.
export function Chip({ label, family, onRemove }: ChipProps) {
	const [word, hue] = useSelections([label, family]);
	if (word.painted || hue.painted)
		return <ChipBase label="" family="neutral" painted />;
	return <ChipBase label={word.value} family={hue.value} onRemove={onRemove} />;
}
