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
