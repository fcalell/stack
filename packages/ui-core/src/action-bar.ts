// What an action bar derives from its acts: the button fit by bar fit, the failure line's held text and each act's button kind; both platforms' `ActionBar` draws from it.
import type { Act } from "./descriptors.ts";
import type { ActionBarFit, ButtonAct, ButtonFit } from "./variants.ts";

/** The button fit an action bar's fit draws its acts at. */
export const FIT: Record<ActionBarFit, ButtonFit> = {
	end: "body",
	full: "field",
};

/** A kept failure line's text while nothing failed: a no-break space holds the line's height. */
export const NO_FAILURE = " ";

/** The last act is the one filled act; a destructive act draws `danger` filled and the hairline `destructive` otherwise. */
export function kindOf(
	act: Pick<Act, "destructive" | "quiet">,
	last: boolean,
): ButtonAct {
	if (act.destructive) return last ? "danger" : "destructive";
	if (act.quiet && !last) return "quiet";
	return last ? "primary" : "secondary";
}
