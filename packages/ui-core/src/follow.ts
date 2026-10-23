// The follow: what a finger or a pointer carries moves 1:1 with it, no easing,
// and only its release eases. The deciding is
// pure, so the web's pointer events and the phone's gesture handler give the
// same answer: how far the held thing stands from rest, how fast it is going
// and where its release goes. Positions are measured toward `away`, the
// direction the thing leaves in (1 toward the end of its axis, -1 toward the
// start); against it nothing follows.
import { tuned } from "./paint.ts";
import { EASING, type Easing } from "./tokens.ts";

// The finger's travel before a gesture is a drag rather than a press, in px.
export const SLOP = 8;
// Past `tuned.fling` toward `away`, in px per ms, a release carries on and
// leaves; past it the other way it goes back, however far it was carried.
// Slower than a fling, a release leaves when it was carried `tuned.reach` of
// its extent. Both are read at the release, so a tuned value is the next
// release's.
// A speed reads the last stretch of the pointer's path before the release, not
// its whole: a finger that stopped before it lifted is not a fling.
const WINDOW = 100;

// A pointer's place along the axis at a time (ms).
export interface Sample {
	at: number;
	value: number;
}

// How far the held thing stands from rest after the pointer travelled `delta` along the axis; against `away` it stays at rest.
export function position(delta: number, away: 1 | -1): number {
	return Math.max(0, delta * away);
}

// The speed toward `away` in px per ms over the stretch of `samples` (oldest first) within the last 100 ms before `now`, the release's time; negative going back, 0 with too little to read (a finger that stopped before it lifted left none).
export function velocity(
	samples: readonly Sample[],
	away: 1 | -1,
	now: number,
): number {
	const recent = samples.filter((sample) => now - sample.at <= WINDOW);
	const first = recent[0];
	const last = recent.at(-1);
	if (!first || !last || last.at === first.at) return 0;
	return ((last.value - first.value) * away) / (last.at - first.at);
}

// Where a release goes, given how far it was carried (`position`), how fast it was going (`speed`, toward `away`) and the extent it has to travel to be gone.
export function release(
	position: number,
	speed: number,
	extent: number,
): "away" | "back" {
	if (speed >= tuned.fling) return "away";
	if (speed <= -tuned.fling) return "back";
	return position >= extent * tuned.reach ? "away" : "back";
}

// The cubic Bézier of a curve at progress `x` (0 to 1): the value its
// control points `(x1, y1)` and `(x2, y2)` give, found by solving for the
// parameter whose x is `x` (Newton's steps, then bisection).
function bezier(
	[x1, y1, x2, y2]: readonly [number, number, number, number],
	x: number,
): number {
	const at = (t: number, a: number, b: number) =>
		3 * a * (1 - t) ** 2 * t + 3 * b * (1 - t) * t ** 2 + t ** 3;
	const slope = (t: number, a: number, b: number) =>
		3 * a * (1 - t) ** 2 + 6 * (b - a) * (1 - t) * t + 3 * (1 - b) * t ** 2;
	let t = x;
	for (let i = 0; i < 8; i++) {
		const error = at(t, x1, x2) - x;
		const rate = slope(t, x1, x2);
		if (Math.abs(error) < 1e-6 || rate < 1e-6) break;
		t -= error / rate;
	}
	let low = 0;
	let high = 1;
	for (let i = 0; i < 24 && Math.abs(at(t, x1, x2) - x) > 1e-6; i++) {
		if (at(t, x1, x2) < x) low = t;
		else high = t;
		t = (low + high) / 2;
	}
	return at(t, y1, y2);
}

// How far along its path a move on `curve` stands once `progress` (0 to 1) of its time has gone.
export function eased(curve: Easing, progress: number): number {
	if (progress <= 0) return 0;
	if (progress >= 1) return 1;
	return bezier(EASING[curve], progress);
}

// The value `progress` of the way from `from` to `to`.
export function mix(from: number, to: number, progress: number): number {
	return from + (to - from) * progress;
}
