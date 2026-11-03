// The crates a DJ files tracks under, the tracks in them and who each can be
// handed to.
export const BANDS = [
	{ key: "warmup", label: "Warm-up" },
	{ key: "peak", label: "Peak time" },
	{ key: "closing", label: "Closing" },
];

export const OWNERS = [
	{ value: "ana", label: "Ana Ruiz" },
	{ value: "ben", label: "Ben Kaya" },
	{ value: "ema", label: "Ema Okafor" },
];

export const CRATE_TRACKS = [
	["c1", "Slow Orbit", "Mira Voss", "warmup", "ana"],
	["c2", "Low Tide", "Sable & Co", "warmup", "ben"],
	["c3", "Night Bus", "Mira Voss", "warmup", "ana"],
	["c4", "Afterglow", "Neon Atlas", "peak", "ema"],
	["c5", "Dust Signal", "Kito Mori", "peak", "ben"],
	["c6", "Static Bloom", "Neon Atlas", "peak", "ana"],
	["c7", "Copper Sky", "Aurora Lane", "closing", "ema"],
	["c8", "Harbour Lights", "Sable & Co", "closing", "ben"],
].map(([id, title, artist, crate, owner]) => ({
	id: String(id),
	title: String(title),
	artist: String(artist),
	crate: String(crate),
	owner: String(owner),
}));
