// Whether a blocked act's press still stands: a press is kept as the reason
// the act was blocked by when pressed, and it stands while the act is
// blocked by that same reason. Unblocking, or a new reason, forgets the
// press in render, with no state to reset; the new reason waits for its own
// press (or the form's touch). Both plugins' blocked acts and their reason
// hosts (an ActionBar, a sheet, a Section, a Banner, a PendingBar) read it.
export function pressStands(
	blocked: string | undefined,
	pressedUnder: string | undefined,
): boolean {
	return blocked !== undefined && pressedUnder === blocked;
}

// The text props of an act (or a link) that a selection may stand in for: a
// label that counts ("Approve 3"), a reason from a read. Both platforms lift
// them (`lift` in plugin-api) where they draw an act given as a datum.
export const ACT_TEXT = ["label", "blocked"] as const;
export type ActText = (typeof ACT_TEXT)[number];

// The same for an option of a pick: its label, the line under it and its
// blocked reason.
export const OPTION_TEXT = ["label", "line", "blocked"] as const;
export type OptionText = (typeof OPTION_TEXT)[number];
