import { ActionBar } from "@fcalell/plugin-react-ui/components/action-bar";
import { FormField } from "@fcalell/plugin-react-ui/components/form-field";
import { Group } from "@fcalell/plugin-react-ui/components/group";
import { Input } from "@fcalell/plugin-react-ui/components/input";
import { Prose } from "@fcalell/plugin-react-ui/components/prose";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Slider } from "@fcalell/plugin-react-ui/components/slider";
import { Facts } from "@fcalell/plugin-react-ui/showcase/frames/definition-row";
import { Static } from "@fcalell/plugin-react-ui/showcase/frames/group";
import { Areas } from "@fcalell/plugin-react-ui/showcase/frames/list";
import { Sentence } from "@fcalell/plugin-react-ui/showcase/frames/prose";
import {
	Bodies,
	Commands,
	Described,
} from "@fcalell/plugin-react-ui/showcase/frames/section";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useState } from "react";
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

// A waiting Prose stands for the lines it is told: one line waits as one line.
const sentence: StoryObj = {
	render: () => <Pair loaded={<Sentence />} waiting={<Sentence loading />} />,
	play: async ({ canvas }) => {
		await stand(canvas);
	},
};

// A waiting Prose without a count keeps its two paragraphs; given one it draws
// that many lines of one.
const lines: StoryObj = {
	render: () => (
		<div className="w-sheet max-w-full">
			<div data-testid="default">
				<Prose markdown="x" loading />
			</div>
			<div data-testid="three">
				<Prose markdown="x" loading={3} />
			</div>
		</div>
	),
	play: async ({ canvas }) => {
		const paragraphs = (id: string) => [
			...(canvas.getByTestId(id).querySelector("[aria-busy]")?.firstElementChild
				?.children ?? []),
		];
		await expect(paragraphs("default")).toHaveLength(2);
		await expect(paragraphs("three")).toHaveLength(1);
		await expect(paragraphs("three")[0]?.children).toHaveLength(3);
	},
};

// A bar waits as the acts it is told, loaded against waiting at each count and
// fit: the control's box at the end, the field across, one per row on touch.
const acts = (count: number) =>
	Array.from({ length: count }, (_, at) => ({
		label: `Act ${at + 1}`,
		onAct: change,
	}));
const actBar: StoryObj = {
	render: () => (
		<>
			{(["end", "full"] as const).flatMap((fit) =>
				[1, 2].map((count) => (
					<Pair
						key={`${fit}-${count}`}
						loaded={<ActionBar fit={fit} acts={acts(count)} />}
						waiting={<ActionBar fit={fit} acts={[]} loading={count} />}
					/>
				)),
			)}
		</>
	),
	play: async ({ canvas }) => {
		for (let at = 0; at < 4; at++) await stand(canvas, at);
		await expect(canvas.queryAllByRole("button")).toHaveLength(6);
	},
};

// `0` and `false` are not waiting: the loaded Prose and the loaded bar draw.
const zero: StoryObj = {
	render: () => (
		<div className="flex flex-col gap-sections w-sheet max-w-full">
			<Prose markdown="Reads as text." loading={0} />
			<ActionBar acts={acts(1)} loading={0} />
			<ActionBar acts={[{ label: "Kept", onAct: change }]} loading={false} />
		</div>
	),
	play: async ({ canvas }) => {
		await expect(canvas.getByText("Reads as text.")).toBeVisible();
		await expect(canvas.getByRole("button", { name: "Act 1" })).toBeVisible();
		await expect(canvas.getByRole("button", { name: "Kept" })).toBeVisible();
	},
};

// A loading Section with `description=""` stands one meta line's bar, so its head
// keeps its loaded height; an undefined `description` stands none.
const described: StoryObj = {
	render: () => (
		<>
			<Pair loaded={<Described />} waiting={<Described loading />} />
			<Pair
				loaded={<Section title="Check" />}
				waiting={<Section title="Check" loading />}
			/>
		</>
	),
	play: async ({ canvas }) => {
		await stand(canvas, 0);
		await stand(canvas, 1);
		const bare = height(canvas.getAllByTestId("waiting")[1] as Element);
		const bar = height(canvas.getAllByTestId("waiting")[0] as Element);
		await expect(bar).toBeGreaterThan(bare);
	},
};

// A loading Section whose body is a Form waits as the Form's own fields and
// its bar: one skeleton field per FormField at the loaded Section's height.
const form: StoryObj = {
	render: () => <Pair loaded={<Commands />} waiting={<Commands loading />} />,
	play: async ({ canvas }) => {
		const { waiting } = await stand(canvas);
		await expect(
			within(waiting).getByRole("region", { name: "Commands" }),
		).toHaveAttribute("aria-busy", "true");
		await expect(within(waiting).queryAllByRole("textbox")).toHaveLength(0);
		await expect(within(waiting).queryAllByRole("button")).toHaveLength(0);
		await expect(
			waiting.querySelectorAll("form div[aria-hidden]"),
		).toHaveLength(5);
	},
};

// The Form's fields stay mounted while they wait: the same input stands
// again once the Section has loaded.
function Refetch() {
	const [loading, setLoading] = useState(false);
	return (
		<>
			<button type="button" onClick={() => setLoading(!loading)}>
				Toggle
			</button>
			<Commands loading={loading} />
		</>
	);
}
const refetch: StoryObj = {
	render: () => <Refetch />,
	play: async ({ canvas, userEvent }) => {
		const input = canvas.getByDisplayValue("pnpm build");
		await userEvent.click(canvas.getByRole("button", { name: "Toggle" }));
		await expect(input).not.toBeVisible();
		await userEvent.click(canvas.getByRole("button", { name: "Toggle" }));
		await expect(input).toBeVisible();
		await expect(canvas.getByDisplayValue("pnpm build")).toBe(input);
	},
};

// A List given its items while it loads stands as the loaded rows with their
// titles, only the trailing counts waiting at the loaded rows' height.
const known: StoryObj = {
	render: () => <Pair loaded={<Areas />} waiting={<Areas loading />} />,
	play: async ({ canvas }) => {
		const { waiting } = await stand(canvas);
		const here = within(waiting);
		for (const name of ["Notes", "Deploys", "Hosts"])
			await expect(here.getByText(name)).toBeVisible();
		await expect(here.queryByText("12")).toBeNull();
	},
};

export const GroupOfStaticParts = group;
export const SliderAloneAndInAGroup = sliders;
export const DefinitionRowsInACard = facts;
export const GroupOfOwnRows = fallback;
export const SectionOverItsParts = bodies;
export const SectionOverFields = fields;
export const SectionOverItsForm = form;
export const SectionFormKeepsItsFields = refetch;

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

export const ProseOfOneLine = sentence;
export const ProseLineCount = lines;
export const ActionBarAtItsActs = actBar;
export const NotWaitingAtZero = zero;
export const SectionDescriptionLine = described;
export const ListOfKnownRows = known;

export const GroupOfStaticPartsTouch = touch(group);
export const ProseOfOneLineTouch = touch(sentence);
export const ActionBarAtItsActsTouch = touch(actBar);
export const SectionDescriptionLineTouch = touch(described);
export const ListOfKnownRowsTouch = touch(known);
export const SliderAloneAndInAGroupTouch = touch(sliders);
export const DefinitionRowsInACardTouch = touch(facts);
export const SectionOverItsPartsTouch = touch(bodies);
export const SectionOverItsFormTouch = touch(form);
