// A test clock for the stories that prove timing: `Date.now` and the page's
// timers (`setTimeout`, `setInterval` and their clears) stand still until the
// story moves them with `advance`, so a two-second rule is asserted in
// milliseconds of test time and no frame, throttle or real wait is involved.
//
// A timer asked for 0 ms or less still runs on the real timer, which keeps
// `userEvent`'s own pacing, React's and the browser's turns going while the
// clock is held. `advance` hands the real timer a turn after each step so
// React has rendered what the step caused.
//
// Not vitest's fake timers: a story module cannot import `vitest` (the
// import never resolves in the Storybook iframe), so this is the same idea in
// the page's own terms.
const real = {
	setTimeout: window.setTimeout.bind(window),
	clearTimeout: window.clearTimeout.bind(window),
	setInterval: window.setInterval.bind(window),
	clearInterval: window.clearInterval.bind(window),
	now: Date.now.bind(Date),
};

/** Runs the real timer once, so React and the browser finish what is pending. */
export const settle = () =>
	new Promise<void>((done) => real.setTimeout(done, 0));

interface Timer {
	at: number;
	every: number | undefined;
	run: () => void;
}

export interface TestClock {
	/** The clock's time, epoch milliseconds. */
	now: () => number;
	/** Moves the clock forward, running every timer that falls due in order. */
	advance: (ms: number) => Promise<void>;
	/** How many held intervals run every `ms`. */
	intervals: (ms: number) => number;
	/** Gives the real timers back. */
	stop: () => void;
}

/** Holds the page's clock at `from` (default: the real now) until `stop`. */
export function holdClock(from = real.now()): TestClock {
	let time = from;
	// Held ids stand far above the browser's own, so a clear finds its owner.
	let next = 1_000_000_000;
	const timers = new Map<number, Timer>();
	const add = (run: () => void, ms: number, every: boolean) => {
		const id = ++next;
		timers.set(id, {
			at: time + Math.max(ms, 1),
			every: every ? Math.max(ms, 1) : undefined,
			run,
		});
		return id;
	};
	const w = window as unknown as Record<string, unknown>;
	w.setTimeout = (fn: TimerHandler, ms = 0, ...args: unknown[]) => {
		if (typeof fn !== "function" || ms <= 0)
			return real.setTimeout(fn, ms, ...args);
		return add(() => fn(...args), ms, false);
	};
	w.setInterval = (fn: TimerHandler, ms = 0, ...args: unknown[]) => {
		if (typeof fn !== "function" || ms <= 0)
			return real.setInterval(fn, ms, ...args);
		return add(() => fn(...args), ms, true);
	};
	w.clearTimeout = w.clearInterval = (id?: number) => {
		if (id === undefined) return;
		if (timers.delete(id)) return;
		real.clearTimeout(id);
		real.clearInterval(id);
	};
	Date.now = () => time;
	return {
		now: () => time,
		intervals: (ms) =>
			[...timers.values()].filter((timer) => timer.every === ms).length,
		async advance(ms) {
			const target = time + ms;
			for (;;) {
				let due: [number, Timer] | undefined;
				for (const entry of timers) {
					if (entry[1].at <= target && (!due || entry[1].at < due[1].at))
						due = entry;
				}
				if (!due) break;
				const [id, timer] = due;
				time = timer.at;
				if (timer.every === undefined) timers.delete(id);
				else timer.at += timer.every;
				timer.run();
				await settle();
			}
			time = target;
			await settle();
		},
		stop() {
			timers.clear();
			w.setTimeout = real.setTimeout;
			w.setInterval = real.setInterval;
			w.clearTimeout = real.clearTimeout;
			w.clearInterval = real.clearInterval;
			Date.now = real.now;
		},
	};
}
