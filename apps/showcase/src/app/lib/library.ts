import type { Moved, Picked } from "@fcalell/ui-core/descriptors";
import { moveEntry } from "@fcalell/ui-core/drag";
import { useSyncExternalStore } from "react";
import { TRACKS } from "../fixtures/library.ts";

// The crate's state, held in the page: the set list in play order and the ids
// each playlist holds. A write answers after a beat, as a server's would.
interface Crate {
	setlist: readonly string[];
	playlists: Readonly<Record<string, readonly string[]>>;
}

let crate: Crate = {
	setlist: ["t5", "t2", "t9", "t1", "t7"],
	playlists: { chill: ["t3"], peak: [] },
};
const listeners = new Set<() => void>();

function set(next: Crate) {
	crate = next;
	for (const listener of listeners) listener();
}

const later = () => new Promise<void>((resolve) => setTimeout(resolve, 200));

export function useCrate(): Crate {
	return useSyncExternalStore(
		(listener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		() => crate,
	);
}

/** Moves a track of the set list; the page shows the new order once this settles. */
export async function moveInSetlist(id: string, to: Moved): Promise<void> {
	await later();
	const from = crate.setlist.indexOf(id);
	if (from < 0) return;
	set({ ...crate, setlist: moveEntry(crate.setlist, from, to.index) });
}

/** Adds the tracks a drag carried to a playlist; a pick of the whole crate takes every track. */
export async function addToPlaylist(
	playlist: string,
	picked: Picked,
): Promise<void> {
	await later();
	const ids =
		"ids" in picked
			? picked.ids
			: TRACKS.map((track) => track.id).filter(
					(id) => !picked.except.includes(id),
				);
	const held = crate.playlists[playlist] ?? [];
	set({
		...crate,
		playlists: {
			...crate.playlists,
			[playlist]: [...held, ...ids.filter((id) => !held.includes(id))],
		},
	});
}
