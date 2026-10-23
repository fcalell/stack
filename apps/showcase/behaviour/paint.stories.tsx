import { Form } from "@fcalell/plugin-react-ui/components/form";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Prose } from "@fcalell/plugin-react-ui/components/prose";
import {
	Section,
	type Row as SheetRow,
} from "@fcalell/plugin-react-ui/components/section";
import { Stats } from "@fcalell/plugin-react-ui/components/stats";
import { Place } from "@fcalell/plugin-react-ui/showcase/frames/place";
import { readsAt } from "@fcalell/plugin-react-ui/showcase/waiting";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { expect, waitFor } from "storybook/test";
import { orpc } from "../src/app/lib/api.ts";
import { through } from "./support.ts";

// A part that waits is its loaded form painted: the same tree with its text
// and marks filled, so the screen does not move when the data lands. Each
// scenario draws a part loaded (over a read that answers) and painted (over a
// read that never does) and measures both boxes, at the desktop density and,
// in a 375 px phone, the touch one. The Section heading is the one the shift
// check of `stack screens test` measures on every screen.

function Pair(props: { loaded: ReactNode; painted: ReactNode }) {
	return (
		<div className="flex flex-col gap-section w-sheet max-w-full">
			<div data-testid="loaded">{props.loaded}</div>
			<div data-testid="painted">{props.painted}</div>
		</div>
	);
}

type Play = NonNullable<StoryObj["play"]>;
type Canvas = Parameters<Play>[0]["canvas"];

const box = (element: Element) => element.getBoundingClientRect();

// The two sides, once the loaded one has landed (`landed` is a text it draws
// that the painted one must not) and layout has settled on the fonts.
async function sides(canvas: Canvas, landed: string) {
	const loaded = canvas.getByTestId("loaded");
	const painted = canvas.getByTestId("painted");
	await waitFor(() => expect(loaded).toHaveTextContent(landed));
	await expect(painted).not.toHaveTextContent(landed);
	await expect(painted.querySelector("[data-painted]")).not.toBeNull();
	return { loaded, painted };
}

const PEOPLE = readsAt("paint/row");
const toRow = (name: string): SheetRow => ({
	key: name,
	title: name,
	meta: ["Owner", "Frankfurt"],
	status: { tone: "done", label: "Active" },
});
const rowsOf = (reads: typeof PEOPLE.ready) =>
	reads.at((names) => names.map(toRow));

// A row: the painted rows stand as the loaded row does, each as tall, and
// the list holds `PAINT_ROWS` of them.
export const Row: StoryObj = {
	render: () => (
		<Pair
			loaded={<Section title="People" items={rowsOf(PEOPLE.ready)} />}
			painted={<Section title="People" items={rowsOf(PEOPLE.waiting)} />}
		/>
	),
	play: async ({ canvas }) => {
		const { loaded, painted } = await sides(canvas, "Ana Ruiz");
		const rows = (side: Element) => [
			...(side.querySelector("section > div:last-child > div")?.children ?? []),
		];
		await expect(rows(painted)).toHaveLength(4);
		await expect(rows(loaded)).toHaveLength(3);
		for (const row of rows(painted))
			await expect(
				Math.abs(box(row).height - box(rows(loaded)[0] as Element).height),
			).toBeLessThan(1);
	},
};

const FACTS = readsAt("paint/definition");

// A definition row: label and value, painted at the loaded row's height.
export const Definition: StoryObj = {
	render: () => (
		<Pair
			loaded={
				<Section
					items={[{ label: "Plan", title: FACTS.ready.at(() => "Business") }]}
				/>
			}
			painted={
				<Section
					items={[{ label: "Plan", title: FACTS.waiting.at(() => "Business") }]}
				/>
			}
		/>
	),
	play: async ({ canvas }) => {
		const { loaded, painted } = await sides(canvas, "Business");
		await expect(
			Math.abs(box(painted).height - box(loaded).height),
		).toBeLessThan(1);
		await expect(Math.abs(box(painted).width - box(loaded).width)).toBeLessThan(
			1,
		);
	},
};

const FIGURES = readsAt("paint/stat");

// A stat: its figure painted at the display role's line, the label constant.
export const Figure: StoryObj = {
	render: () => (
		<Pair
			loaded={
				<Stats
					items={[{ label: "need you", value: FIGURES.ready.at(() => 1284) }]}
				/>
			}
			painted={
				<Stats
					items={[{ label: "need you", value: FIGURES.waiting.at(() => 1284) }]}
				/>
			}
		/>
	),
	play: async ({ canvas }) => {
		const { loaded, painted } = await sides(canvas, "1,284");
		await expect(
			Math.abs(box(painted).height - box(loaded).height),
		).toBeLessThan(1);
		await expect(painted).toHaveTextContent("need you");
	},
};

const FIELDS = readsAt("paint/control");
const renamed = through(orpc.forms.rename, async () => ({ id: "workspace-1" }));

const workspace = (reads: typeof FIELDS.ready) => (
	<Form
		act={renamed}
		given={{ workspaceId: "acme" }}
		values={reads.at(() => ({ name: "Acme" }))}
		fields={{ name: { label: "Workspace name" } }}
	/>
);

// A control: the form's field box painted inert and the same input follows
// the read, so the form is as tall as the loaded one and no node is replaced.
export const Control: StoryObj = {
	render: () => (
		<Pair
			loaded={workspace(FIELDS.ready)}
			painted={workspace(FIELDS.waiting)}
		/>
	),
	play: async ({ canvas, canvasElement, userEvent }) => {
		const input = canvasElement.querySelector(
			'[data-testid="loaded"] input',
		) as HTMLInputElement;
		await waitFor(() => expect(input.value).not.toBe(""));
		const painted = canvas.getByTestId("painted");
		const { loaded } = { loaded: canvas.getByTestId("loaded") };
		await expect(
			Math.abs(box(painted).height - box(loaded).height),
		).toBeLessThan(1);
		await expect(painted.querySelector("input")?.closest("[inert]")).not.toBe(
			null,
		);
		// The loaded input takes typing as the one that waited would.
		await userEvent.type(input, " Inc");
		await expect(input).toHaveValue("Acme Inc");
		await expect(
			canvasElement.querySelector('[data-testid="loaded"] input'),
		).toBe(input);
	},
};

const HEADS = readsAt("paint/heading");
const DESCRIBED = readsAt("paint/description");

// A Section heading: the title stands where it stands loaded, at the same
// height, whatever its body paints. The count waits out the read.
export const Heading: StoryObj = {
	render: () => (
		<Pair
			loaded={<Section title="Reviewers" items={rowsOf(HEADS.ready)} />}
			painted={<Section title="Reviewers" items={rowsOf(HEADS.waiting)} />}
		/>
	),
	play: async ({ canvas }) => {
		const { loaded, painted } = await sides(canvas, "Ana Ruiz");
		const head = (side: Element) => {
			const found = box(side.querySelector("h2") as Element);
			return { top: found.top - box(side).top, height: found.height };
		};
		await expect(head(painted).top).toBeCloseTo(head(loaded).top, 0);
		await expect(head(painted).height).toBeCloseTo(head(loaded).height, 0);
		// A count is not painted: only the loaded heading has one.
		await expect(loaded.querySelector("h2")).toHaveTextContent(/Reviewers\s*3/);
		await expect(painted.querySelector("h2")).toHaveTextContent(/^Reviewers$/);
	},
};

// A Section description that waits is one clipped line, as tall as the loaded
// short sentence, however narrow the column.
export const Description: StoryObj = {
	render: () => (
		<div className="w-pane max-w-full">
			<Pair
				loaded={
					<Section
						title="Usage"
						description="Resets in 2 h 10 min"
						items={rowsOf(DESCRIBED.ready)}
					/>
				}
				painted={
					<Section
						title="Usage"
						description={DESCRIBED.waiting.at(() => "Resets in 2 h 10 min")}
						items={rowsOf(DESCRIBED.waiting)}
					/>
				}
			/>
		</div>
	),
	play: async ({ canvas }) => {
		const { loaded, painted } = await sides(canvas, "Resets in");
		const bar = painted.querySelector("[data-painted]") as HTMLElement;
		const line = box(loaded.querySelector("p") as Element).height;
		await expect(box(bar.parentElement as Element).height).toBeCloseTo(line, 0);
		await expect(bar.getClientRects().length).toBe(1);
	},
};

const NOTES = readsAt("paint/definition-description");
const NOTE = "Resets in 2 h 10 min";
const note = (reads: typeof NOTES.ready) => (
	<Section
		items={[
			{
				label: "Test status",
				title: reads.at(() => "Passing"),
				meta: reads.at(() => [NOTE]),
			},
		]}
	/>
);

// A definition row's description that waits is one clipped line: beside a value
// in a 420 px column a wrapped sentence of filler stood 44 px taller than the
// one line that landed.
export const DefinitionDescription: StoryObj = {
	render: () => (
		<div style={{ width: 420 }} className="max-w-full">
			<Pair loaded={note(NOTES.ready)} painted={note(NOTES.waiting)} />
		</div>
	),
	play: async ({ canvas }) => {
		const { loaded, painted } = await sides(canvas, NOTE);
		await expect(
			Math.abs(box(painted).height - box(loaded).height),
		).toBeLessThan(1);
		for (const bar of painted.querySelectorAll("[data-painted]"))
			await expect(bar.getClientRects().length).toBe(1);
	},
};

const BODY = readsAt("paint/prose");
const MARKDOWN = "A short paragraph of the text that landed.";

// A Prose that waits paints `PAINT_ROWS` lines, one paragraph of four clipped
// bars, wherever the column stands: it was four paragraphs of wrapped filler,
// about 300 px against a loaded text of 96 to 156.
export const ProseLines: StoryObj = {
	render: () => (
		<div style={{ width: 420 }} className="max-w-full">
			<Pair
				loaded={<Prose markdown={BODY.ready.at(() => MARKDOWN)} />}
				painted={<Prose markdown={BODY.waiting.at(() => MARKDOWN)} />}
			/>
		</div>
	),
	play: async ({ canvas }) => {
		const { loaded, painted } = await sides(canvas, "A short paragraph");
		const bars = [...painted.querySelectorAll("[data-painted]")];
		await expect(bars).toHaveLength(4);
		const line = Number.parseFloat(
			getComputedStyle(loaded.querySelector("p") as Element).lineHeight,
		);
		await expect(box(painted).height).toBeCloseTo(4 * line, 0);
		for (const bar of bars) await expect(bar.getClientRects().length).toBe(1);
	},
};

const MARKED = readsAt("paint/chip");

// A painted row draws no chip: whether an item has one is its own data, so a
// sheet whose rows carry a chip paints the rows a sheet without it paints.
export const NoChip: StoryObj = {
	render: () => (
		<Pair
			loaded={
				<Section
					items={MARKED.waiting.at((names) =>
						names.map((name) => ({
							...toRow(name),
							chip: { family: "violet" as const, label: "New" },
						})),
					)}
				/>
			}
			painted={<Section items={rowsOf(MARKED.waiting)} />}
		/>
	),
	play: async ({ canvas }) => {
		const marked = canvas.getByTestId("loaded");
		const plain = canvas.getByTestId("painted");
		await waitFor(() =>
			expect(marked.querySelector("[data-painted]")).not.toBeNull(),
		);
		await expect(marked.innerHTML).toBe(plain.innerHTML);
	},
};

const CHANGED = readsAt("paint/change");
const WARNED = readsAt("paint/marks");

// A painted row draws no change mark either, on a list row, a file row and a
// definition row: whether an item is in a change set is its own data, so a
// sheet whose rows carry one paints the rows a sheet without it paints.
export const NoChange: StoryObj = {
	render: () => (
		<Pair
			loaded={
				<>
					<Section
						items={CHANGED.waiting.at((names) =>
							names.map((name) => ({
								...toRow(name),
								change: "added" as const,
							})),
						)}
					/>
					<Section
						items={CHANGED.waiting.at((names) =>
							names.map((name) => ({
								key: name,
								path: name,
								added: 1,
								removed: 0,
								change: "added" as const,
							})),
						)}
					/>
					<Section
						items={CHANGED.waiting.at((names) =>
							names.map((name) => ({
								label: name,
								change: "added" as const,
							})),
						)}
					/>
				</>
			}
			painted={
				<>
					<Section items={rowsOf(CHANGED.waiting)} />
					<Section
						items={CHANGED.waiting.at((names) =>
							names.map((name) => ({
								key: name,
								path: name,
								added: 1,
								removed: 0,
							})),
						)}
					/>
					<Section
						items={CHANGED.waiting.at((names) =>
							names.map((name) => ({ label: name })),
						)}
					/>
				</>
			}
		/>
	),
	play: async ({ canvas }) => {
		const marked = canvas.getByTestId("loaded");
		const plain = canvas.getByTestId("painted");
		await waitFor(() =>
			expect(marked.querySelector("[data-painted]")).not.toBeNull(),
		);
		// A sheet names its settle by an id of its own.
		const same = (side: Element) =>
			side.innerHTML.replace(/_r_[a-z0-9]+_/g, "_");
		await expect(same(marked)).toBe(same(plain));
	},
};

// A painted row is a title over a meta line, so a loaded row with a meta line
// stands as tall as it whatever marks it carries: a warning and a trailing value
// add no height there.
export const MarkHoldsTheSecondLine: StoryObj = {
	render: () => (
		<Pair
			loaded={
				<Section
					items={WARNED.ready.at((names) =>
						names.map((name) => ({
							key: name,
							title: name,
							meta: ["Owner"],
							trailing: { value: "9 min" },
							warning: "Not in this change set",
						})),
					)}
				/>
			}
			painted={<Section items={rowsOf(WARNED.waiting)} />}
		/>
	),
	play: async ({ canvas }) => {
		const { loaded, painted } = await sides(canvas, "Ana Ruiz");
		const rows = (side: Element) => [
			...(side.firstElementChild?.children ?? []),
		];
		for (const row of rows(painted))
			await expect(
				Math.abs(box(row).height - box(rows(loaded)[0] as Element).height),
			).toBeLessThan(1);
	},
};

const COUNTS = readsAt("paint/stats");
const counts = (reads: typeof COUNTS.ready) => [
	{ label: "Submitted", value: reads.at(() => 12), meta: "Waiting for triage" },
	{ label: "In spec", value: reads.at(() => 3), meta: "Draft" },
	{ label: "In build", value: reads.at(() => 7), meta: "Ready" },
	{ label: "Incidents open", value: reads.at(() => 0) },
	{
		label: "Lead time",
		value: reads.at(() => 14),
		unit: "days",
		meta: "Median, last 90 days",
	},
];

// Five counts in a Pane's measure stand a cell about a hundred px wide: the
// waiting figure's filler gives way to the unit, which never breaks its word,
// so the painted strip is as tall as the loaded one.
export const StatsUnit: StoryObj = {
	render: () => (
		<Place>
			<Pane title="Home">
				<div data-testid="loaded">
					<Stats items={counts(COUNTS.ready)} />
				</div>
				<div data-testid="painted">
					<Stats items={counts(COUNTS.waiting)} />
				</div>
			</Pane>
		</Place>
	),
	play: async ({ canvas }) => {
		const loaded = canvas.getByTestId("loaded");
		await waitFor(() => expect(loaded).toHaveTextContent("14"));
		const painted = canvas.getByTestId("painted");
		await expect(painted.querySelector("[data-painted]")).not.toBeNull();
		await expect(
			Math.abs(box(painted).height - box(loaded).height),
		).toBeLessThan(1);
		for (const unit of canvas.getAllByText("days")) {
			const line = Number.parseFloat(getComputedStyle(unit).lineHeight);
			await expect(box(unit).height).toBeLessThanOrEqual(line + 1);
		}
	},
};

// The same scenarios in a 375 px phone at the touch density.
function touch(story: StoryObj): StoryObj {
	return {
		...story,
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
}

export const RowTouch = { ...touch(Row), tags: ["touch"] };
export const DefinitionTouch = { ...touch(Definition), tags: ["touch"] };
export const FigureTouch = { ...touch(Figure), tags: ["touch"] };
export const ControlTouch = { ...touch(Control), tags: ["touch"] };
export const HeadingTouch = { ...touch(Heading), tags: ["touch"] };
export const DescriptionTouch = { ...touch(Description), tags: ["touch"] };
export const DefinitionDescriptionTouch = {
	...touch(DefinitionDescription),
	tags: ["touch"],
};

export default {
	title: "Behaviour/Paint",
} satisfies Meta;
