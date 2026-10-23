import { BarChart } from "@fcalell/plugin-react-ui/components/bar-chart";
import { Canvas } from "@fcalell/plugin-react-ui/components/canvas";
import { Diff } from "@fcalell/plugin-react-ui/components/diff";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Table } from "@fcalell/plugin-react-ui/components/table";
import { Thread } from "@fcalell/plugin-react-ui/components/thread";
import { Place } from "@fcalell/plugin-react-ui/showcase/frames/place";
import { readsAt } from "@fcalell/plugin-react-ui/showcase/waiting";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { sectionOf } from "./support.ts";

// Thread, BarChart, Table, Canvas (by its nodes) and Diff (by its hunks)
// are frames of their items as a Section's sheet is: their failed, missing and empty forms
// come from their own selection, in their own box with the generic sentences.
// A Thread is the exception that keeps its composer and reply: its failed and
// missing forms stand in the log's place and its empty form is an empty log.
const MESSAGE = {
	key: (name: string) => name,
	author: () => "other" as const,
	body: (name: string) => name,
};

export default { title: "Behaviour/Collections II" } satisfies Meta;

const threads = readsAt("collections-ii/thread");

function Conversation(props: {
	items: typeof threads.failing;
	onSend: () => void;
}) {
	const [value, setValue] = useState("");
	return (
		<div className="h-[28rem]">
			<Place>
				<Pane fill title="Assistant">
					<Thread
						items={props.items}
						message={MESSAGE}
						composer={{ value, onChange: setValue, onSend: props.onSend }}
					/>
				</Pane>
			</Place>
		</div>
	);
}

const sent = fn();

export const ThreadWhoseItemsFailedKeepsItsComposerAndSends: StoryObj = {
	render: () => <Conversation items={threads.failing} onSend={sent} />,
	play: async ({ canvas }) => {
		await canvas.findByText("This didn't load.");
		await expect(canvas.getByRole("button", { name: "Retry" })).toBeVisible();
		// The failure stands in the log's place; the input is live under it.
		const input = canvas.getByRole("textbox");
		await expect(input.closest("[inert]")).toBeNull();
		await expect(input).not.toBeDisabled();
		await userEvent.type(input, "Hello");
		await userEvent.click(canvas.getByRole("button", { name: /send/i }));
		await expect(sent).toHaveBeenCalledTimes(1);
	},
};

export const ThreadWhoseItemsAreMissingKeepsItsFoot: StoryObj = {
	render: () => <Conversation items={threads.missing} onSend={fn()} />,
	play: async ({ canvas }) => {
		await canvas.findByText("Couldn't find this.");
		await expect(canvas.getByRole("textbox")).toBeVisible();
	},
};

export const EmptyThreadIsAnEmptyLogWithItsFoot: StoryObj = {
	render: () => <Conversation items={threads.empty} onSend={fn()} />,
	play: async ({ canvas }) => {
		const log = await canvas.findByRole("log");
		// The read answers none: the painted messages give way to an empty log.
		await waitFor(() => expect(log.textContent).toBe(""));
		// No sentence stands in the log; the input does.
		await expect(canvas.queryByText("Nothing here yet.")).toBeNull();
		await expect(canvas.getByRole("textbox")).toBeVisible();
	},
};

const BAR = {
	key: (name: string) => name,
	value: () => 1,
};
const FACTS = [
	{ key: "name", label: "Fact", cell: (name: string) => name },
	{ key: "staging", label: "Staging", cell: (name: string) => name },
	{ key: "production", label: "Production", cell: (name: string) => name },
];
const FACT = { id: (name: string) => name };
const NODE = (name: string) => ({
	id: name,
	icon: "Circle" as const,
	title: name,
});

const sides = readsAt("collections-ii/sides");
const hunks = (rows: readonly string[]) =>
	rows.map(() => ({ header: "@@", lines: [] }));

export const ChartTableAndDiffFailInTheirOwnBoxes: StoryObj = {
	render: () => (
		<div className="h-[60rem]">
			<Place>
				<Pane title="Forms">
					<Section title="Chart">
						<BarChart label="Runs" items={sides.failing} bar={BAR} />
					</Section>
					<Section title="Facts">
						<Table columns={FACTS} items={sides.missing} row={FACT} />
					</Section>
					<Section title="Patch">
						<Diff label="Patch" hunks={sides.failing.at(hunks)} />
					</Section>
					<Section title="Empty chart">
						<BarChart label="Runs" items={sides.empty} bar={BAR} />
					</Section>
				</Pane>
			</Place>
		</div>
	),
	play: async ({ canvas }) => {
		const chart = within(sectionOf(canvas, "Chart"));
		await chart.findByText("This didn't load.");
		await expect(chart.getByRole("button", { name: "Retry" })).toBeVisible();
		const facts = within(sectionOf(canvas, "Facts"));
		await facts.findByText("Couldn't find this.");
		const patch = within(sectionOf(canvas, "Patch"));
		await patch.findByText("This didn't load.");
		await expect(patch.getByRole("button", { name: "Retry" })).toBeVisible();
		await within(sectionOf(canvas, "Empty chart")).findByText(
			"Nothing here yet.",
		);
	},
};

const graphs = readsAt("collections-ii/canvas");

export const CanvasFailsInItsGround: StoryObj = {
	render: () => (
		<div className="flex h-[24rem] flex-col">
			<Canvas
				label="Workflow"
				nodes={graphs.failing.at((rows) => rows.map(NODE))}
			/>
		</div>
	),
	play: async ({ canvas }) => {
		await canvas.findByText("This didn't load.");
		await expect(canvas.getByRole("button", { name: "Retry" })).toBeVisible();
		// The ground stands, named; no graph is drawn in it.
		await expect(
			canvas.getByRole("region", { name: "Workflow" }),
		).toBeVisible();
	},
};

export const EmptyCanvasDrawsTheGenericSentence: StoryObj = {
	render: () => (
		<div className="flex h-[24rem] flex-col">
			<Canvas
				label="Workflow"
				nodes={graphs.empty.at((rows) => rows.map(NODE))}
			/>
		</div>
	),
	play: async ({ canvas }) => {
		await canvas.findByText("Nothing here yet.");
	},
};

const lines = readsAt("collections-ii/lines");

export const HeldChartAndDiffDrawTheirStaleAndPausedLine: StoryObj = {
	render: () => (
		<div className="h-[40rem]">
			<Place>
				<Pane title="Lines">
					<Section title="Stale">
						<BarChart label="Runs" items={lines.stale} bar={BAR} />
					</Section>
					<Section title="Paused">
						<Table columns={FACTS} items={lines.paused} row={FACT} />
					</Section>
				</Pane>
			</Place>
		</div>
	),
	play: async ({ canvas }) => {
		const stale = within(sectionOf(canvas, "Stale"));
		await stale.findByText("Couldn't refresh.");
		const paused = within(sectionOf(canvas, "Paused"));
		await paused.findByText("Waiting for a connection.");
	},
};
