import { cn } from "@fcalell/ui-core/cn";
import {
	BUSY_GLYPHS,
	SPINNER,
	SPINNER_ARC,
	SPINNER_TRACK,
} from "@fcalell/ui-core/variants";
import type { Closed } from "../../lib/closed.ts";
import { BusyGlyphs, busyScrambles } from "../../lib/scramble.tsx";

// It enters by a fade on `fast`, then turns (the loop keeps turning under
// reduced motion; the fade snaps).
const BOX = "relative shrink-0 animate-spinner-in";
const TRACK = "absolute inset-0 border-current";
// The ink goes ahead of the cell: tailwind-merge drops an earlier
// `border-t-transparent` under a later border colour, where the cascade
// keeps it.
const ARC_INK = "border-current";
const ARC = "absolute inset-0 animate-spin";
// Three glyphs wide, the ink of its place.
const GLYPHS =
	"inline-flex shrink-0 items-center justify-center overflow-hidden animate-spinner-in";

/** A spinner takes no props. */
export interface SpinnerProps extends Closed {}

/** A turning ring in the ink of its place (currentColor), the size of the glyph it replaces; hidden from assistive tech, since its owner announces the wait. Where the theme scrambles its text (`theme.loading`) it is three mono glyphs cycling at the tick in a box three glyphs wide, `···` under reduced motion. */
export function Spinner(_: SpinnerProps) {
	if (busyScrambles())
		return (
			<span
				aria-hidden
				style={{ width: "3ch" }}
				className={cn(BUSY_GLYPHS, GLYPHS)}
			>
				<BusyGlyphs />
			</span>
		);
	return (
		<span aria-hidden className={cn(SPINNER, BOX)}>
			<span className={cn(SPINNER_TRACK, TRACK)} />
			<span className={cn(ARC_INK, SPINNER_ARC, ARC)} />
		</span>
	);
}
