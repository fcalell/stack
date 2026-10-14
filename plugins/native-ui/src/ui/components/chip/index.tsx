import type { ChipFamily } from "@fcalell/ui-core/tokens";
import type { Closed } from "../../lib/closed";
import { ChipBase } from "./base";

export interface ChipProps extends Closed {
	/** The value (a word; truncates past the short measure, 18 characters). */
	label: string;
	family: ChipFamily;
	onRemove?: () => void;
}

// A data value's tag on its family's soft ground; its one act removes the value.
export function Chip({ label, family, onRemove }: ChipProps) {
	return <ChipBase label={label} family={family} onRemove={onRemove} />;
}
