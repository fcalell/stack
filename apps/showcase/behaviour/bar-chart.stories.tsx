import { BarChart } from "@fcalell/plugin-react-ui/components/bar-chart";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";

interface Day {
	day: string;
	spend: number;
	parts: Record<string, number>;
}

// A week of spend in dollars: $30.97 on the api, $9.25 on the web.
const DAYS: Day[] = [
	[3.2, 1.5],
	[4.15, 2],
	[5.1, 1],
	[6, 0.5],
	[4.27, 1.25],
	[3.5, 2],
	[4.75, 1],
].map(([api, web], index) => ({
	day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index] ?? "",
	spend: (api ?? 0) + (web ?? 0),
	parts: { api: api ?? 0, web: web ?? 0 },
}));

export default {
	title: "Behaviour/BarChart",
	parameters: { layout: "padded" },
} satisfies Meta;

const bar = {
	key: (day: Day) => day.day,
	value: (day: Day) => day.spend,
	parts: (day: Day) => day.parts,
	at: (day: Day) => day.day,
};

function Spend() {
	return (
		<div className="w-sheet max-w-full">
			<BarChart
				label="Spend per day this week"
				keys={["api", "web"]}
				items={DAYS}
				bar={bar}
				unit={{ currency: "USD" }}
			/>
		</div>
	);
}

const rect = (element: Element) => element.getBoundingClientRect();

// A tick or readout is the element holding exactly its text.
function figure(root: HTMLElement, text: string): HTMLElement {
	const found = [...root.querySelectorAll("span")].find(
		(span) => span.children.length === 0 && span.textContent === text,
	);
	if (!(found instanceof HTMLElement)) throw new Error(`no figure ${text}`);
	return found;
}

const centre = (element: Element) =>
	rect(element).top + rect(element).height / 2;

// A chart in a currency writes its readout in it, exact, and its axis in
// whole dollars; each tick centres on its gridline, the baseline carries the
// zero, and the top tick keeps a pair gap from the head's last line.
const spend: StoryObj = {
	render: () => <Spend />,
	play: async ({ canvasElement }) => {
		await waitFor(() => expect(figure(canvasElement, "$40.22")).toBeVisible());
		await expect(figure(canvasElement, "$30.97")).toBeVisible();
		const plot = canvasElement.querySelector("[role=img]");
		if (!(plot instanceof HTMLElement)) throw new Error("no plot");
		const grid = plot.firstElementChild;
		if (!(grid instanceof HTMLElement)) throw new Error("no gridlines");
		const bands = [...grid.children];
		// A peak of 6.5 ticks on steps of 2 over a top of 8.
		const ticks = ["$8", "$6", "$4", "$2"].map((label) =>
			figure(canvasElement, label),
		);
		for (const [index, tick] of ticks.entries()) {
			const band = bands[index];
			if (!band) throw new Error("no band");
			// The hairline is the band's top edge, a pixel thick.
			await expect(Math.abs(centre(tick) - rect(band).top)).toBeLessThan(1.5);
		}
		const last = bands[bands.length - 1];
		if (!last) throw new Error("no baseline");
		await expect(
			Math.abs(centre(figure(canvasElement, "$0")) - rect(last).bottom),
		).toBeLessThan(1.5);
		const pair = Number.parseFloat(
			getComputedStyle(document.documentElement).getPropertyValue(
				"--spacing-pair",
			),
		);
		// The head holds the total and the keys; a key's figure sits in its entry
		// in the keys' row.
		const head = figure(canvasElement, "$9.25").parentElement?.parentElement
			?.parentElement;
		if (!head) throw new Error("no head");
		await expect(
			rect(ticks[0] as HTMLElement).top - rect(head).bottom,
		).toBeGreaterThanOrEqual(pair - 0.5);
	},
};

export const CurrencyReadoutAndAxis = spend;

// The same scenario in a 375 px phone at the touch density.
export const CurrencyReadoutAndAxisTouch: StoryObj = {
	...spend,
	tags: ["touch"],
	globals: {
		density: "touch",
		viewport: { value: "phone", isRotated: false },
	},
	parameters: {
		viewport: {
			options: {
				phone: {
					name: "Phone",
					styles: { width: "375px", height: "812px" },
					type: "mobile",
				},
			},
		},
	},
};
