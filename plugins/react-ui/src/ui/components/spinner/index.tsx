import { cn } from "@fcalell/ui-core/cn";
import { SPINNER, SPINNER_ARC, SPINNER_TRACK } from "@fcalell/ui-core/variants";
import type { Closed } from "../../lib/closed.ts";

const BOX = "relative shrink-0";
const TRACK = "absolute inset-0 border-current";
// The ink goes ahead of the cell: tailwind-merge drops an earlier
// `border-t-transparent` under a later border colour, where the cascade
// keeps it.
const ARC_INK = "border-current";
const ARC = "absolute inset-0 animate-spin";

/** A spinner takes no props. */
export interface SpinnerProps extends Closed {}

/** A turning ring in the ink of its place (currentColor), the size of the glyph it replaces; hidden from assistive tech, since its owner announces the wait. */
export function Spinner(_: SpinnerProps) {
	return (
		<span aria-hidden className={cn(SPINNER, BOX)}>
			<span className={cn(SPINNER_TRACK, TRACK)} />
			<span className={cn(ARC_INK, SPINNER_ARC, ARC)} />
		</span>
	);
}
