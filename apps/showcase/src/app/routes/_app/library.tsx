import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import type { Row } from "@fcalell/plugin-react-ui/components/section";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Table } from "@fcalell/plugin-react-ui/components/table";
import type { TableColumn } from "@fcalell/ui-core/descriptors";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PLAYLISTS, TRACKS, type Track } from "../../fixtures/library.ts";
import { act } from "../../lib/act.ts";
import { addToPlaylist, moveInSetlist, useCrate } from "../../lib/library.ts";

export const Route = createFileRoute("/_app/library")({
	component: Library,
});

const COLUMNS: TableColumn<Track>[] = [
	{
		key: "title",
		label: "Title",
		width: "1/4",
		sortable: true,
		cell: (track) => track.title,
	},
	{
		key: "artist",
		label: "Artist",
		sortable: true,
		cell: (track) => track.artist,
	},
	{
		key: "bpm",
		label: "BPM",
		kind: "number",
		sortable: true,
		cell: (track) => track.bpm,
	},
	{ key: "key", label: "Key", kind: "source", cell: (track) => track.key },
];

// A track's one act is its play: an icon at its end, the same act on
// Shift+Enter, with the sentence toasted once it has run. The rest of its acts
// are its menu, where each playlist that takes a dragged track is also an entry.
const ROW = {
	id: (track: Track) => track.id,
	act: (track: Track) => ({
		icon: "Play" as const,
		label: `Play ${track.title}`,
		onAct: act,
		done: `Playing ${track.title}`,
	}),
	more: (track: Track) => [
		{ icon: "Copy" as const, label: `Copy ${track.title}`, onAct: act },
	],
};

const BY_ID = new Map(TRACKS.map((track) => [track.id, track]));

// A set list's row: a track, dragged to a playlist, played from its icon.
const toRow = (track: Track): Row => ({
	key: track.id,
	title: track.title,
	facts: [track.artist, `${track.bpm} BPM`],
	drag: { kind: "track", picked: { ids: [track.id] } },
	onOpen: act,
	act: {
		icon: "Play",
		label: `Play ${track.title}`,
		onAct: act,
		done: `Playing ${track.title}`,
	},
});

// A crate: the set list moves by a drag to the line between two rows (or Alt
// with an arrow, or its menu), a track or the tracks ticked in the library drag
// onto a playlist row here or in the sidebar, and a playlist is also an entry
// in each track's menu.
function Library() {
	const crate = useCrate();
	const [chosen, setChosen] = useState<string[]>([]);
	return (
		<Pane title="Library" wide>
			<Section
				title="Set list"
				items={crate.setlist.flatMap((id) => {
					const track = BY_ID.get(id);
					return track ? [toRow(track)] : [];
				})}
				reorder={{ onMove: moveInSetlist, done: "Set list updated" }}
			/>
			<Section
				title="Playlists"
				items={PLAYLISTS.map(
					(playlist): Row => ({
						key: playlist.id,
						leading: { icon: "ListMusic" },
						title: playlist.label,
						trailing: { count: crate.playlists[playlist.id]?.length ?? 0 },
						drop: {
							accepts: "track",
							label: `Add to ${playlist.label}`,
							onDrop: (drag) => addToPlaylist(playlist.id, drag.picked),
							done: `Added to ${playlist.label}`,
						},
					}),
				)}
			/>
			<Section title="Tracks">
				<Table
					columns={COLUMNS}
					items={TRACKS}
					row={ROW}
					drag={{ kind: "track" }}
					choose={{ chosen, onChange: setChosen }}
					onOpen={act}
				/>
			</Section>
		</Pane>
	);
}
