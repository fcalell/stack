import type { StatSpec } from "@fcalell/ui-core/descriptors";
import { Stats, type StatsItem } from "../../components/stats/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { waiting } from "../waiting.ts";
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

// The strip whose figures never arrive: each cell paints its figure.
const waitingFigure = waiting.at(() => 0);
const PAINTED: readonly StatsItem[] = HOME.map((item) => ({
	...item,
	value: waitingFigure,
}));

export function drawStats(frame: ShowcaseFrame) {
	if (isPaint(frame))
		return frame.state === "rest" ? (
			<Wide>
				<Stats items={HOME} />
				<Stats items={PAINTED} />
			</Wide>
		) : undefined;
	if (frame.state === "loading")
		return (
			<Wide>
				<Stats items={PAINTED} />
			</Wide>
		);
	return (
		<Wide>
			<Stats items={HOME} />
			<Stats items={THREE} />
		</Wide>
	);
}
