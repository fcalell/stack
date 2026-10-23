import { arrivals } from "@fcalell/ui-core/arrive";
import { useEffect, useRef } from "react";

/**
 * The keys among `keys` that arrived on their own after the list's first draw
 * (`ready`: its rows are loaded, not painted): those a row takes `BLOCK_IN` for
 * when it mounts. What the list held when it was first drawn, and what it held
 * at its last commit, is not new.
 */
export function useArrivals(
	keys: readonly string[],
	ready: boolean,
): ReadonlySet<string> {
	const known = useRef<ReadonlySet<string>>(undefined);
	const arrived = ready ? arrivals(known.current, keys) : NONE;
	useEffect(() => {
		if (ready) known.current = new Set(keys);
	}, [ready, keys]);
	return arrived;
}

const NONE: ReadonlySet<string> = new Set();

/**
 * Whether the component has drawn before: false for its first render, true
 * after. A block that comes into a component already on the page (an option's
 * children, chosen after the list drew) fades in; one it mounted with does not.
 */
export function useDrawn(): boolean {
	const drawn = useRef(false);
	useEffect(() => {
		drawn.current = true;
	}, []);
	return drawn.current;
}

/**
 * The keys among `keys` that arrived at the end of a log after its first draw
 * (`ready`: its messages are loaded, not painted): those a message rises in for
 * when it mounts. What the log held when it was first drawn is not new.
 */
export const useStreamed = useArrivals;
