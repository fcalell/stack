export interface Point {
	x: number;
	y: number;
}

// A client point of the story's frame as a point of the page the browser's
// input goes to: the test runs in an iframe of the page that holds the
// Playwright session.
export function toPage(point: Point): Point {
	const frame = window.frameElement;
	const box = frame?.getBoundingClientRect();
	return {
		x: point.x + (box?.left ?? 0) + (frame?.clientLeft ?? 0),
		y: point.y + (box?.top ?? 0) + (frame?.clientTop ?? 0),
	};
}

// The browser's own mouse, over the Chrome DevTools Protocol that Vitest's
// Playwright provider opens, so a press, a move and a release are real pointer
// events with real hit-testing. `vitest/browser` throws when it is imported
// outside a Vitest run, so it is imported when an event is sent: Storybook's
// own UI loads the story file and fails only in the play.
async function send(
	type: "mouseMoved" | "mousePressed" | "mouseReleased",
	point: Point,
	down: boolean,
) {
	const { cdp } = await import("vitest/browser");
	await cdp().send("Input.dispatchMouseEvent", {
		type,
		...toPage(point),
		button: "left",
		buttons: down ? 1 : 0,
		clickCount: type === "mouseMoved" ? 0 : 1,
	});
	// Each event is given a frame, so what it caused has rendered before the next.
	await new Promise((done) => requestAnimationFrame(() => done(undefined)));
}

const between = (
	from: Point,
	to: Point,
	step: number,
	steps: number,
): Point => ({
	x: from.x + ((to.x - from.x) * step) / steps,
	y: from.y + ((to.y - from.y) * step) / steps,
});

// Presses at `from`, moves to `to` in `steps` moves (at least four: a node
// follows each move and a connection needs movement before its release) and
// releases at `to`. `hold` runs with the button down at `to`, to read what the
// drag is doing; the button is released after it, whether it throws or not.
export async function drag(
	from: Point,
	to: Point,
	{
		steps = 4,
		hold,
	}: { steps?: number; hold?: () => Promise<void> | void } = {},
) {
	const count = Math.max(4, steps);
	await send("mouseMoved", from, false);
	await send("mousePressed", from, true);
	try {
		for (let step = 1; step <= count; step++)
			await send("mouseMoved", between(from, to, step, count), true);
		await hold?.();
	} finally {
		await send("mouseReleased", to, false);
	}
}

// A press and a release at `point`, with no move.
export async function click(point: Point) {
	await send("mouseMoved", point, false);
	await send("mousePressed", point, true);
	await send("mouseReleased", point, false);
}
