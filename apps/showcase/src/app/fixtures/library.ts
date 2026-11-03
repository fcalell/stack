// A DJ's crate: the tracks, the set list in the order it is played, and the
// playlists the tracks are dropped on.
export interface Track {
	id: string;
	title: string;
	artist: string;
	bpm: number;
	key: string;
}

export const TRACKS: readonly Track[] = [
	{
		id: "t1",
		title: "Midnight Drive",
		artist: "Aurora Lane",
		bpm: 122,
		key: "8A",
	},
	{ id: "t2", title: "Glass Rooms", artist: "Kito Mori", bpm: 124, key: "9A" },
	{ id: "t3", title: "Low Tide", artist: "Sable & Co", bpm: 118, key: "5B" },
	{
		id: "t4",
		title: "Paper Planes",
		artist: "Aurora Lane",
		bpm: 126,
		key: "10A",
	},
	{ id: "t5", title: "Afterglow", artist: "Neon Atlas", bpm: 128, key: "8A" },
	{ id: "t6", title: "Dust Signal", artist: "Kito Mori", bpm: 130, key: "7A" },
	{
		id: "t7",
		title: "Harbour Lights",
		artist: "Sable & Co",
		bpm: 120,
		key: "6B",
	},
	{
		id: "t8",
		title: "Static Bloom",
		artist: "Neon Atlas",
		bpm: 132,
		key: "9B",
	},
	{ id: "t9", title: "Slow Orbit", artist: "Mira Voss", bpm: 112, key: "4A" },
	{ id: "t10", title: "Night Bus", artist: "Mira Voss", bpm: 123, key: "8B" },
	{
		id: "t11",
		title: "Copper Sky",
		artist: "Aurora Lane",
		bpm: 127,
		key: "11A",
	},
	{ id: "t12", title: "Tape Hiss", artist: "Kito Mori", bpm: 121, key: "3A" },
];

// The playlists, in folders to any depth: a node with `folder` is a folder.
export interface PlaylistNode {
	id: string;
	label: string;
	folder?: readonly PlaylistNode[];
}

export const PLAYLIST_TREE: readonly PlaylistNode[] = [
	{ id: "chill", label: "Chill" },
	{
		id: "sets",
		label: "Sets",
		folder: [
			{ id: "peak", label: "Peak time" },
			{ id: "warmup", label: "Warm-up" },
			{
				id: "closing",
				label: "Closing",
				folder: [{ id: "sunrise", label: "Sunrise" }],
			},
		],
	},
];

const leaves = (nodes: readonly PlaylistNode[]): PlaylistNode[] =>
	nodes.flatMap((node) => (node.folder ? leaves(node.folder) : [node]));

/** The playlists a track can be added to: the tree's leaves. */
export const PLAYLISTS = leaves(PLAYLIST_TREE);
