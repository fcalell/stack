import { type Point, toPage } from "./mouse.ts";

export type { Point } from "./mouse.ts";

type Phase = "touchStart" | "touchMove" | "touchEnd";

// The browser's own fingers, over the Chrome DevTools Protocol that Vitest's
// Playwright provider opens, so a touch is real touch events with real
// hit-testing and real pointer events. Each event lists every finger that is
// down. `vitest/browser` throws when it is imported outside a Vitest run, so it
// is imported when an event is sent: a touch story's `play` fails with that in
// Storybook's own UI, and its render still draws there.
//
// Events go out in the order they are asked for, even when a caller does not
// wait for one before asking for the next.
let sent: Promise<unknown> = Promise.resolve();
function send(
	type: Phase,
	down: ReadonlyMap<number, Point>,
	frames: number,
): Promise<unknown> {
	// Read now, so two events asked for together keep their own fingers.
	const touchPoints = [...down].map(([id, point]) => ({
		id,
		...toPage(point),
	}));
	sent = sent
		.catch(() => undefined)
		.then(() => dispatch(type, touchPoints, frames));
	return sent;
}

async function dispatch(
	type: Phase,
	touchPoints: { id: number; x: number; y: number }[],
	frames: number,
) {
	const { cdp } = await import("vitest/browser");
	await cdp().send("Input.dispatchTouchEvent", { type, touchPoints });
	for (let frame = 0; frame < frames; frame++)
		await new Promise((done) => requestAnimationFrame(() => done(undefined)));
}

// Chrome aligns touch and pointer moves to a frame, so an event is handled at the
// next one and what it caused has rendered by the one after. A gesture that
// must act inside a long press's time asks for none, so a slow frame cannot
// outlast the press.
const SETTLED = 2;

// Real time, never a fake clock: a long press is measured by the page's own
// timer.
export const wait = (ms: number) => new Promise((done) => setTimeout(done, ms));

const between = (
	from: Point,
	to: Point,
	step: number,
	steps: number,
): Point => ({
	x: from.x + ((to.x - from.x) * step) / steps,
	y: from.y + ((to.y - from.y) * step) / steps,
});

// One hand: fingers put down, moved and lifted by id.
export function hand() {
	const down = new Map<number, Point>();
	return {
		async down(id: number, point: Point, frames = SETTLED) {
			down.set(id, point);
			await send("touchStart", down, frames);
		},
		async move(id: number, point: Point, frames = SETTLED) {
			down.set(id, point);
			await send("touchMove", down, frames);
		},
		async up(id: number) {
			down.delete(id);
			await send("touchEnd", down, SETTLED);
		},
		// Every finger up, whatever was down: a story's `finally`.
		async lift() {
			if (down.size === 0) return;
			down.clear();
			await send("touchEnd", down, SETTLED);
		},
	};
}

// A finger down at `from` for `pause` ms, moved to `to` in `steps` moves (at
// least four) and lifted at `to`. With no pause the first move is sent with the
// touch, so a node's press cannot lift it, however slow the page, before the pan
// begins. `hold`
// runs with the finger down at `to`; the finger is lifted after it, whether it
// throws or not.
export async function drag(
	from: Point,
	to: Point,
	{
		steps = 4,
		pause = 0,
		hold,
	}: {
		steps?: number;
		pause?: number;
		hold?: () => Promise<void> | void;
	} = {},
) {
	const count = Math.max(4, steps);
	const finger = hand();
	const quick = pause === 0;
	let step = 1;
	if (quick) {
		step = 2;
		await Promise.all([
			finger.down(0, from, 0),
			finger.move(0, between(from, to, 1, count), 0),
		]);
	} else await finger.down(0, from);
	try {
		if (!quick) await wait(pause);
		for (; step <= count; step++)
			await finger.move(0, between(from, to, step, count));
		await hold?.();
	} finally {
		await finger.lift();
	}
}

// A touch and a lift at `point`, with no move.
export async function tap(point: Point) {
	const finger = hand();
	await finger.down(0, point);
	await finger.lift();
}

// A finger down at `point` for `ms`, with no move.
export async function press(point: Point, ms: number) {
	const finger = hand();
	await finger.down(0, point);
	try {
		await wait(ms);
	} finally {
		await finger.lift();
	}
}

// Two fingers either side of `centre` on a horizontal line, `from` px apart,
// moved to `to` px apart in `steps` moves and lifted. `hold` runs with both
// down at the end.
export async function pinch(
	centre: Point,
	from: number,
	to: number,
	{
		steps = 6,
		hold,
	}: { steps?: number; hold?: () => Promise<void> | void } = {},
) {
	const apart = (gap: number): [Point, Point] => [
		{ x: centre.x - gap / 2, y: centre.y },
		{ x: centre.x + gap / 2, y: centre.y },
	];
	const fingers = hand();
	const [a, b] = apart(from);
	await fingers.down(0, a);
	await fingers.down(1, b);
	try {
		for (let step = 1; step <= steps; step++) {
			const [left, right] = apart(from + ((to - from) * step) / steps);
			await fingers.move(0, left);
			await fingers.move(1, right);
		}
		await hold?.();
	} finally {
		await fingers.lift();
	}
}
