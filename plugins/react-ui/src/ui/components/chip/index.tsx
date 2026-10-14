import type { ChipFamily } from "@fcalell/ui-core/tokens";
import type { Closed } from "../../lib/closed.ts";
import { ChipBase } from "./base.tsx";

/** A data value's tag on its family's soft ground. */
export interface ChipProps extends Closed {
	/** The value (a word; truncates past the short measure, 18 characters). */
	label: string;
	/** The family of values it belongs to, one hue per family across screens. */
	family: ChipFamily;
	/** Adds the remove act, a round hit box the chip's height closing its right end. */
	onRemove?: () => void;
}

/** A pill of a family's soft ground and ink; its one act removes the value. */
export function Chip({ label, family, onRemove }: ChipProps) {
	return <ChipBase label={label} family={family} onRemove={onRemove} />;
}
