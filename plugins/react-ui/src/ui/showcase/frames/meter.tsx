import type { ReactNode } from "react";
import { Group } from "../../components/group/index.tsx";
import { Meter } from "../../components/meter/index.tsx";
import { Section } from "../../components/section/index.tsx";
import { Slider } from "../../components/slider/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { Wide } from "./layout-context.tsx";

const noop = () => {};

const COUNTS = [
	{ label: "failing", value: 3, href: "/tests/failing" },
	{ label: "untested", value: 5, href: "/tests/untested" },
];

function Usage() {
	return (
		<Section title="Hobby plan" description="Resets on Oct 31.">
			<Group>
				{[
					<Meter
						key="requests"
						label="Requests"
						value={250_000}
						max={1_000_000}
						meta="250k of 1M requests"
					/>,
					<Meter
						key="minutes"
						label="Build minutes"
						value={4000}
						max={6000}
						meta="4,000 of 6,000 minutes"
					/>,
					<Meter
						key="bandwidth"
						label="Bandwidth"
						value={92}
						max={100}
						meta="92 of 100 GB"
					/>,
					<Meter
						key="storage"
						label="Storage"
						value={11.8}
						max={10}
						meta="11.8 of 10 GB · 1.8 GB over, billed at the end of the month"
					/>,
					<Meter
						key="reserve"
						label="Jobs this window"
						value={62}
						max={100}
						mark={{ value: 80 }}
						meta="Jobs and watches pause at the reserve"
					/>,
					<Slider
						key="window"
						label="Reserve"
						value={80}
						onChange={noop}
						min={0}
						max={100}
						step={5}
						unit="percent"
					/>,
					<Meter
						key="tests"
						label="Passing"
						value={34}
						max={42}
						counts={[
							{ label: "failing", value: 3, href: "/tests/failing" },
							{ label: "untested", value: 5, href: "/tests/untested" },
						]}
					/>,
				]}
			</Group>
		</Section>
	);
}

// The meters at one level, as board 54's states draw them.
const LEVELS: Record<string, ReactNode> = {
	"METER_FILL.level.under": (
		<>
			<Meter label="Seats" value={1} max={12} meta="1 of 12 seats" />
			<Meter
				label="Preview deploys"
				value={0}
				max={100}
				meta="0 of 100 this month"
			/>
			<Meter label="Build minutes" value={4000} max={6000} />
		</>
	),
	"METER_FILL.level.near": (
		<>
			<Meter label="Bandwidth" value={92} max={100} meta="92 of 100 GB" />
			<Meter label="Projects" value={3} max={3} meta="3 of 3 projects" />
			<Meter
				label="Jobs this window"
				value={85}
				max={100}
				mark={{ value: 80 }}
				meta="Past the reserve: jobs and watches pause"
			/>
		</>
	),
	"METER_FILL.level.over": (
		<Meter label="Storage" value={11.8} max={10} meta="11.8 of 10 GB" />
	),
};

// A `METER_FILL.level` cell draws the meters at that level, every other cell
// the usage group; loading stands beside its loaded form.
export function drawMeter(frame: ShowcaseFrame) {
	let drawn = LEVELS[frame.cell.name] ?? <Usage />;
	if (frame.state === "loading")
		drawn = (
			<>
				<div className="grid grid-cols-2 gap-x-fields">
					<Meter label="Seats" value={1} max={12} meta="1 of 12 seats" />
					<Meter label="" value={0} max={0} meta="" loading />
				</div>
				<div className="grid grid-cols-2 gap-x-fields">
					<Meter label="Passing" value={34} max={42} counts={COUNTS} />
					<Meter label="" value={0} max={0} counts={COUNTS} loading />
				</div>
			</>
		);
	return <Wide>{drawn}</Wide>;
}
