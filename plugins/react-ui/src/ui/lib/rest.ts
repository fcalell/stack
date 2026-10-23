// A tooltip shows after the pointer's rest, and a second one within `RECENT`
// of the last's going shows with no rest and no fade (the reader is already
// scanning names). Base UI's provider keeps that window for the icon acts'
// names; the cut-text tooltip mounts and unmounts its own, so it reads the
// moment either one went from here.
export const RECENT = 300;

let gone = Number.NEGATIVE_INFINITY;

/** A tooltip has just gone. */
export function hid(): void {
	gone = performance.now();
}

/** Whether a tooltip went within `RECENT`, so the next shows at once. */
export function recently(): boolean {
	return performance.now() - gone < RECENT;
}
