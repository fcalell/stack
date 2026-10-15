import { DefinitionRow } from "@fcalell/plugin-react-ui/components/definition-row";
import { FormField } from "@fcalell/plugin-react-ui/components/form-field";
import { Group } from "@fcalell/plugin-react-ui/components/group";
import { Input } from "@fcalell/plugin-react-ui/components/input";
import { List } from "@fcalell/plugin-react-ui/components/list";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Stat } from "@fcalell/plugin-react-ui/components/stat";
import { readsAt } from "@fcalell/plugin-react-ui/showcase/waiting";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { expect, waitFor } from "storybook/test";

// A part that waits is its loaded form painted: the same tree with its text
// and marks filled, so the screen does not move when the data lands. Each
// scenario draws a part loaded (over a read that answers) and painted (over a
// read that never does) and measures both boxes, at the desktop density and,
// in a 375 px phone, the touch one. The Section heading is the one the shift
// check of `stack screens test` measures on every screen.
const change = () => {};

function Pair(props: { loaded: ReactNode; painted: ReactNode }) {
	return (
		<div className="flex flex-col gap-sections w-sheet max-w-full">
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
const ROW = {
	key: (name: string) => name,
	title: (name: string) => name,
	meta: () => ["Owner", "Frankfurt"],
	status: () => ({ state: "done", label: "Active" }) as const,
};

// A row: the painted rows stand as the loaded row does, each as tall, and
// the list holds `PAINT_ROWS` of them.
export const Row: StoryObj = {
	render: () => (
		<Pair
			loaded={
				<Section title="People" read={PEOPLE.ready}>
					<List items={PEOPLE.ready} row={ROW} />
				</Section>
			}
			painted={
				<Section title="People" read={PEOPLE.waiting}>
					<List items={PEOPLE.waiting} row={ROW} />
				</Section>
			}
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
				<Group
					items={[
						{
							key: "plan",
							row: (
								<DefinitionRow
									label="Plan"
									value={FACTS.ready.at(() => "Business")}
								/>
							),
						},
					]}
				/>
			}
			painted={
				<Group
					items={[
						{
							key: "plan",
							row: (
								<DefinitionRow
									label="Plan"
									value={FACTS.waiting.at(() => "Business")}
								/>
							),
						},
					]}
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
			loaded={<Stat label="need you" value={FIGURES.ready.at(() => 1284)} />}
			painted={<Stat label="need you" value={FIGURES.waiting.at(() => 1284)} />}
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

// A control: the field's box painted inert and the same input follows its
// read, so the field is as tall as the loaded one and no node is replaced.
export const Control: StoryObj = {
	render: () => (
		<Pair
			loaded={
				<FormField label="Workspace name">
					<Input value={FIELDS.ready.at(() => "Acme")} onChange={change} />
				</FormField>
			}
			painted={
				<FormField label="Workspace name">
					<Input value={FIELDS.waiting.at(() => "Acme")} onChange={change} />
				</FormField>
			}
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
			loaded={
				<Section title="Reviewers" read={HEADS.ready}>
					<Group list={{ items: HEADS.ready, row: ROW }} />
				</Section>
			}
			painted={
				<Section title="Reviewers" read={HEADS.waiting}>
					<Group list={{ items: HEADS.waiting, row: ROW }} />
				</Section>
			}
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
						read={DESCRIBED.ready}
					>
						<Group list={{ items: DESCRIBED.ready, row: ROW }} />
					</Section>
				}
				painted={
					<Section
						title="Usage"
						description={DESCRIBED.waiting.at(() => "Resets in 2 h 10 min")}
						read={DESCRIBED.waiting}
					>
						<Group list={{ items: DESCRIBED.waiting, row: ROW }} />
					</Section>
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

// The same scenarios in a 375 px phone at the touch density.
function touch(story: StoryObj): StoryObj {
	return {
		...story,
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
}

export const RowTouch = touch(Row);
export const DefinitionTouch = touch(Definition);
export const FigureTouch = touch(Figure);
export const ControlTouch = touch(Control);
export const HeadingTouch = touch(Heading);
export const DescriptionTouch = touch(Description);

export default {
	title: "Behaviour/Paint",
} satisfies Meta;
