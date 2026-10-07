import { FormField } from "@fcalell/plugin-react-ui/components/form-field";
import { Group } from "@fcalell/plugin-react-ui/components/group";
import { Input } from "@fcalell/plugin-react-ui/components/input";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Slider } from "@fcalell/plugin-react-ui/components/slider";
import { Facts } from "@fcalell/plugin-react-ui/showcase/frames/definition-row";
import { Static } from "@fcalell/plugin-react-ui/showcase/frames/group";
import { Bodies } from "@fcalell/plugin-react-ui/showcase/frames/section";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { expect, waitFor, within } from "storybook/test";

// A waiting part stands as its loaded form stands, so the screen does not
// move when the data lands. Each scenario draws a loaded form and a waiting one
// of the same part and measures both boxes, at the desktop density and, in a
// 375 px phone, the touch one.
const change = () => {};

function Pair(props: { loaded: ReactNode; waiting: ReactNode }) {
	return (
		<div className="flex flex-col gap-sections w-sheet max-w-full">
			<div data-testid="loaded">{props.loaded}</div>
			<div data-testid="waiting">{props.waiting}</div>
		</div>
	);
}

const height = (element: Element) => element.getBoundingClientRect().height;

type Play = NonNullable<StoryObj["play"]>;
type Canvas = Parameters<Play>[0]["canvas"];

// Both boxes, which layout settles on (the fonts and the waiting forms'
// layout effects land in the first frames).
async function stand(canvas: Canvas, at = 0) {
	const loaded = canvas.getAllByTestId("loaded")[at] as HTMLElement;
	const waiting = canvas.getAllByTestId("waiting")[at] as HTMLElement;
	await waitFor(() =>
		expect(Math.abs(height(loaded) - height(waiting))).toBeLessThan(1),
	);
	return { loaded, waiting };
}

const slider = (
	<Slider
		label="Reserve"
		value={80}
		onChange={change}
		min={0}
		max={100}
		step={5}
		unit="percent"
	/>
);

export default {
	title: "Behaviour/Waiting",
} satisfies Meta;

// A waiting Group holding static parts draws one waiting form per part it
// holds, in order, so its card is the loaded card's height.
const group: StoryObj = {
	render: () => <Pair loaded={<Static />} waiting={<Static loading />} />,
	play: async ({ canvas }) => {
		const { loaded, waiting } = await stand(canvas);
		const rows = (box: Element) => box.firstElementChild?.children.length;
		await expect(rows(waiting)).toBe(6);
		await expect(rows(waiting)).toBe(rows(loaded));
	},
};

// A Slider waits at its own height in a Group's card and alone in a Section.
const sliders: StoryObj = {
	render: () => (
		<>
			<Pair
				loaded={<Group>{slider}</Group>}
				waiting={<Group loading>{slider}</Group>}
			/>
			<Pair
				loaded={<Section title="Session">{slider}</Section>}
				waiting={
					<Section title="Session" loading>
						{slider}
					</Section>
				}
			/>
		</>
	),
	play: async ({ canvas }) => {
		await stand(canvas, 0);
		await stand(canvas, 1);
	},
};

// A waiting DefinitionRow draws the form of the row it is given (one line,
// an act, a link, a description, a lock, a control) at its loaded height, so
// the card holds its height.
const facts: StoryObj = {
	render: () => <Pair loaded={<Facts />} waiting={<Facts loading />} />,
	play: async ({ canvas }) => {
		const { loaded, waiting } = await stand(canvas);
		const rows = (box: Element) => [...(box.firstElementChild?.children ?? [])];
		const [here, there] = [rows(loaded), rows(waiting)];
		await expect(there).toHaveLength(here.length);
		for (const [at, row] of here.entries())
			await expect(
				Math.abs(height(row) - height(there[at] as Element)),
			).toBeLessThan(1);
	},
};

// A Group holding rows no part answers for keeps its three setting rows.
const fallback: StoryObj = {
	render: () => (
		<Pair
			loaded={
				<Group>
					<div>Own row</div>
				</Group>
			}
			waiting={
				<Group loading>
					<div>Own row</div>
				</Group>
			}
		/>
	),
	play: async ({ canvas }) => {
		const waiting = canvas.getByTestId("waiting");
		await waitFor(() =>
			expect(waiting.firstElementChild?.children).toHaveLength(3),
		);
	},
};

// A loading Section whose body is a Prose, a Thread or a Code draws that
// part's own waiting form (visible, where skeleton fields would hide the
// body); the Code's Section keeps its loaded height.
const bodies: StoryObj = {
	render: () => <Pair loaded={<Bodies />} waiting={<Bodies loading />} />,
	play: async ({ canvas }) => {
		const waiting = within(canvas.getByTestId("waiting"));
		const loaded = within(canvas.getByTestId("loaded"));
		const prose = waiting
			.getByRole("region", { name: "Notes" })
			.querySelector("div[aria-busy]");
		await expect(prose).toBeVisible();
		await expect(waiting.queryByText(/Moves the billing/)).toBeNull();
		const thread = waiting.getByRole("region", { name: "Thread" });
		await expect(thread.querySelectorAll("article[aria-busy]")).toHaveLength(3);
		for (const message of thread.querySelectorAll("article[aria-busy]"))
			await expect(message).toBeVisible();
		const check = (box: typeof waiting) =>
			box.getByRole("region", { name: "Check" });
		await waitFor(() =>
			expect(
				Math.abs(height(check(loaded)) - height(check(waiting))),
			).toBeLessThan(1),
		);
	},
};

// A loading Section holding fields is unchanged: skeleton fields stand in
// for them, the fields themselves kept mounted and hidden.
const fields: StoryObj = {
	render: () => (
		<Section title="Profile" loading>
			<FormField label="Workspace name">
				<Input value="Acme" onChange={change} />
			</FormField>
		</Section>
	),
	play: async ({ canvas }) => {
		await expect(canvas.queryByRole("textbox")).toBeNull();
	},
};

export const GroupOfStaticParts = group;
export const SliderAloneAndInAGroup = sliders;
export const DefinitionRowsInACard = facts;
export const GroupOfOwnRows = fallback;
export const SectionOverItsParts = bodies;
export const SectionOverFields = fields;

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

export const GroupOfStaticPartsTouch = touch(group);
export const SliderAloneAndInAGroupTouch = touch(sliders);
export const DefinitionRowsInACardTouch = touch(facts);
export const SectionOverItsPartsTouch = touch(bodies);
