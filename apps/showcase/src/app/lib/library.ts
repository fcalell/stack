import type { Moved, Picked } from "@fcalell/ui-core/descriptors";
import { moveEntry } from "@fcalell/ui-core/drag";
import { createStore } from "@fcalell/ui-core/store";
import { useSyncExternalStore } from "react";
import { TRACKS } from "../fixtures/library.ts";

// The crate's state, held in the page: the set list in play order and the ids
// each playlist holds. A write answers after a beat, as a server's would.
interface Crate {
	setlist: readonly string[];
	playlists: Readonly<Record<string, readonly string[]>>;
}

const crate = createStore<Crate>({
	setlist: ["t5", "t2", "t9", "t1", "t7"],
	playlists: { chill: ["t3"], peak: [], warmup: [], sunrise: [] },
});

const later = () => new Promise<void>((resolve) => setTimeout(resolve, 200));

export function useCrate(): Crate {
	return useSyncExternalStore(crate.subscribe, crate.get);
}

/** Moves a track of the set list; the page shows the new order once this settles. */
export async function moveInSetlist(id: string, to: Moved): Promise<void> {
	await later();
	const from = crate.get().setlist.indexOf(id);
	if (from < 0) return;
	const now = crate.get();
	crate.set({ ...now, setlist: moveEntry(now.setlist, from, to.index) });
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
	const now = crate.get();
	const held = now.playlists[playlist] ?? [];
	crate.set({
		...now,
		playlists: {
			...now.playlists,
			[playlist]: [...held, ...ids.filter((id) => !held.includes(id))],
		},
	});
}
