import { useCallback, useSyncExternalStore } from "react";

// The viewer's open and folded branches of the sidebar are theirs from one
// visit to the next: a convenience, so a store that is blocked or empty
// leaves the choice for the visit alone. What was read or written stands
// here, the one source every tree of the page reads. A choice is by the
// branch's route; a branch never chosen is left to the Shell (open on the
// current place's path, else folded).
const KEY = "stack:places:open";

let held: Readonly<Record<string, boolean>> | undefined;
const listeners = new Set<() => void>();

function read(): Readonly<Record<string, boolean>> {
	if (held) return held;
	let saved: Record<string, boolean> = {};
	try {
		const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "{}");
		if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
			saved = Object.fromEntries(
				Object.entries(parsed).filter(
					(entry): entry is [string, boolean] => typeof entry[1] === "boolean",
				),
			);
		}
	} catch {}
	held = saved;
	return held;
}

function write(route: string, open: boolean): void {
	held = { ...read(), [route]: open };
	try {
		localStorage.setItem(KEY, JSON.stringify(held));
	} catch {}
	for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

const NONE: Readonly<Record<string, boolean>> = {};

/** The branches the viewer opened or folded (by route) and the act that records a choice. Outside the package's exports. */
export function useFolds(): {
	chosen: Readonly<Record<string, boolean>>;
	choose: (route: string, open: boolean) => void;
} {
	const chosen = useSyncExternalStore(subscribe, read, () => NONE);
	const choose = useCallback(
		(route: string, open: boolean) => write(route, open),
		[],
	);
	return { chosen, choose };
}
