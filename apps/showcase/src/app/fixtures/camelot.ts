// Tracks per Camelot key in wheel order, 1A to 12B: twenty-four buckets, each
// named by its key.
const COUNTS = [
	42, 31, 58, 24, 66, 19, 73, 38, 81, 27, 64, 33, 55, 22, 47, 29, 61, 36, 52,
	18, 44, 26, 39, 15,
];

export const CAMELOT = COUNTS.map((count, index) => ({
	key: `${Math.floor(index / 2) + 1}${index % 2 === 0 ? "A" : "B"}`,
	count,
}));

// A day in six three-hour buckets, a run short enough to name every bar.
export const HOURS = [
	["00h", 12],
	["04h", 6],
	["08h", 28],
	["12h", 51],
	["16h", 64],
	["20h", 47],
].map(([hour, count]) => ({ hour: String(hour), count: Number(count) }));
