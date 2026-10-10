// When a waiting form shows, free of any framework: both platforms run these
// two numbers and this one decision, and the decision is tested without
// rendering. A waiting form is for a read that lasts: a read the local server
// answers in a few milliseconds draws none, and a form once drawn stays long
// enough that it never blinks. Fixed, not a token or an option: one rhythm for
// every waiting form of an app.

// How long a read runs before its waiting form is drawn (ms).
export const WAIT_DELAY = 200;
// How long a drawn waiting form stays once drawn (ms), though the read settles.
export const WAIT_MIN = 500;

// Where a waiting form stands.
export type WaitStep =
	// Not waiting, nothing drawn.
	| { kind: "idle" }
	// Waiting inside the delay: the form stands undrawn, holding its place.
	| { kind: "delay"; after: number }
	// Waiting past the delay: the form is drawn.
	| { kind: "drawn" }
	// The read settled inside the minimum: the form stays `after` ms more.
	| { kind: "hold"; after: number }
	// The read settled and the minimum has passed: the form goes.
	| { kind: "gone" };

// The next step of a waiting form. `drawnAt` is when it was drawn, or
// `undefined` while it is not; `now` the same clock.
export function waitStep(
	waiting: boolean,
	drawnAt: number | undefined,
	now: number,
): WaitStep {
	if (waiting)
		return drawnAt === undefined
			? { kind: "delay", after: WAIT_DELAY }
			: { kind: "drawn" };
	if (drawnAt === undefined) return { kind: "idle" };
	const left = WAIT_MIN - (now - drawnAt);
	return left > 0 ? { kind: "hold", after: left } : { kind: "gone" };
}
