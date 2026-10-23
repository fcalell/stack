import type { StatSpec } from "@fcalell/ui-core/descriptors";
import { Stats, type StatsItem } from "../../components/stats/index.tsx";
import { isFirstCell, type ShowcaseFrame } from "../cells.ts";
import { readsAt, waiting } from "../waiting.ts";
import { Wide } from "./layout-context.tsx";
import { isPaint } from "./painted.tsx";

// An organization home's strip: each cell a link to its list, zeros drawn.
const HOME: readonly StatSpec[] = [
	{ label: "Projects", value: 12, href: "/projects" },
	{ label: "Open reviews", value: 0, meta: "Last 90 days", href: "/reviews" },
	{
		label: "Tests",
		value: 1284,
		counts: [
			{ label: "failing", value: 3, href: "/tests/failing" },
			{ label: "untested", value: 0, href: "/tests/untested" },
		],
	},
	{ label: "Storage", value: 11.8, unit: "GB", meta: "Of 10 GB" },
];

// An odd count ends a narrow strip on one cell across its row.
const THREE: readonly StatSpec[] = HOME.slice(0, 3);

const COUNTS = [
	{ label: "failing", value: 3, href: "/tests/failing" as const },
	{ label: "untested", value: 5, href: "/tests/untested" as const },
];

// A plan's usage: each cell a share of its bound, as board 54 draws them, with
// a mark and a line of counts among them.
const USAGE: readonly StatSpec[] = [
	{
		label: "Requests",
		value: 250_000,
		bound: 1_000_000,
		meta: "250k of 1M requests",
	},
	{
		label: "Jobs this window",
		value: 62,
		bound: 100,
		mark: { value: 80 },
		meta: "Jobs and watches pause at the reserve",
	},
	{ label: "Passing", value: 34, bound: 42, counts: COUNTS },
];

// The shares at one level.
const LEVELS: Record<string, readonly StatSpec[]> = {
	"METER_FILL.level.under": [
		{ label: "Seats", value: 1, bound: 12, meta: "1 of 12 seats" },
		{
			label: "Preview deploys",
			value: 0,
			bound: 100,
			meta: "0 of 100 this month",
		},
		{ label: "Build minutes", value: 4000, bound: 6000 },
	],
	"METER_FILL.level.near": [
		{ label: "Bandwidth", value: 92, bound: 100, meta: "92 of 100 GB" },
		{ label: "Projects", value: 3, bound: 3, meta: "3 of 3 projects" },
		{
			label: "Jobs this window",
			value: 85,
			bound: 100,
			mark: { value: 80 },
			meta: "Past the reserve: jobs and watches pause",
		},
	],
	"METER_FILL.level.over": [
		{ label: "Storage", value: 11.8, bound: 10, meta: "11.8 of 10 GB" },
	],
};

// The strips whose figures never arrive: each cell paints its figure, or its
// share.
const waitingFigure = waiting.at(() => 0);
const painted = (items: readonly StatSpec[]): readonly StatsItem[] =>
	items.map((item) => ({ ...item, value: waitingFigure }));

// The shares over a read that failed, no frame above holding it: each is the
// failed form itself, one with a line under its bar and one with counts.
function Failed(props: { id: string }) {
	const used = readsAt(props.id).failing.at((rows) => rows.length);
	const cells: readonly StatsItem[] = [
		{
			label: "Requests",
			value: used,
			bound: 1_000_000,
			meta: "250k of 1M",
		},
		{ label: "Passing", value: used, bound: 42, counts: COUNTS },
	];
	return <Stats items={cells} />;
}

// A `METER_FILL.level` cell draws the shares at that level, every other cell
// the usage; a `PAINT` cell draws each strip loaded with the same strip
// painted beside it.
export function drawStats(frame: ShowcaseFrame) {
	const usage = LEVELS[frame.cell.name] ?? USAGE;
	if (isPaint(frame))
		return frame.state === "rest" ? (
			<Wide>
				<Stats items={HOME} />
				<Stats items={painted(HOME)} />
				<Stats items={USAGE} />
				<Stats items={painted(USAGE)} />
			</Wide>
		) : undefined;
	// The error state, on the first cell, draws the shares over a read that failed.
	if (frame.state === "error")
		return isFirstCell(frame) ? (
			<Wide>
				<Failed id={frame.id} />
			</Wide>
		) : undefined;
	if (frame.state === "loading")
		return (
			<Wide>
				<Stats items={painted(HOME)} />
				<Stats items={painted(usage)} />
			</Wide>
		);
	return (
		<Wide>
			<Stats items={HOME} />
			<Stats items={THREE} />
			<Stats items={usage} />
		</Wide>
	);
}
