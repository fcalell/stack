import { createClock } from "@fcalell/ui-core/clock";
import { useCallback, useSyncExternalStore } from "react";

const clock = createClock();

// What a part draws from the clock: `read` turns now into it, a string or a
// number (compared by identity), and the part renders again only when that
// changes. It ticks until `until` (epoch milliseconds), never past it.
export function useClock<T extends string | number>(
	read: (now: number) => T,
	until = Number.POSITIVE_INFINITY,
): T {
	const subscribe = useCallback(
		(hear: () => void) => clock.hold(hear, until),
		[until],
	);
	return useSyncExternalStore(subscribe, () => read(clock.now()));
}
