import { useCallback, useSyncExternalStore } from "react";

const TICK_MS = 1000;

// The one coarse clock every live pending bar and age reads: it ticks once a
// second while a reader holds it, each reader leaving once now passes its
// `until`, and stops when none is left.
const readers = new Map<() => void, number>();
let timer: ReturnType<typeof setInterval> | undefined;
let now = Date.now();

function tick() {
	now = Date.now();
	for (const [hear, until] of readers) {
		if (now >= until) readers.delete(hear);
		hear();
	}
	if (readers.size === 0) stop();
}

function stop() {
	clearInterval(timer);
	timer = undefined;
}

function hold(hear: () => void, until: number) {
	if (!timer) now = Date.now();
	if (now >= until) return () => {};
	readers.set(hear, until);
	timer ??= setInterval(tick, TICK_MS);
	return () => {
		readers.delete(hear);
		if (readers.size === 0) stop();
	};
}

// Idle, the clock reads the time afresh at most once a tick, so a render's
// reads agree.
function current() {
	if (!timer && Date.now() - now >= TICK_MS) now = Date.now();
	return now;
}

// What a part draws from the clock: `read` turns now into it, a string or a
// number (compared by identity), and the part renders again only when that
// changes. It ticks until `until` (epoch milliseconds), never past it.
export function useClock<T extends string | number>(
	read: (now: number) => T,
	until = Number.POSITIVE_INFINITY,
): T {
	const subscribe = useCallback(
		(hear: () => void) => hold(hear, until),
		[until],
	);
	return useSyncExternalStore(subscribe, () => read(current()));
}
