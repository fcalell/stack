import { type Read, read } from "@fcalell/plugin-api/tanstack-query";
import { Form } from "@fcalell/plugin-react-ui/components/form";
import { Group } from "@fcalell/plugin-react-ui/components/group";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Sheet } from "@fcalell/plugin-react-ui/components/sheet";
import { Stage } from "@fcalell/plugin-react-ui/showcase/frames/overlay-stage";
import { readsAt } from "@fcalell/plugin-react-ui/showcase/waiting";
import { WAIT_DELAY } from "@fcalell/ui-core/paint";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useQueryClient } from "@tanstack/react-query";
import { Profiler, type ReactNode, useState } from "react";
import { expect, waitFor, within } from "storybook/test";

// A frame that holds its read as the root says what that read does after its
// first answer: busy draws a mark after the heading (only once the read has
// lasted the wait delay), stale a line with Retry under the heading, paused a
// line with nothing to press. None of them is the first wait, so none sets
// aria-busy. Each frame is drawn in the three states, at both widths.
const ROW = { key: (name: string) => name, title: (name: string) => name };
const ITEMS = ["Notes", "Deploys"];
const STATES = ["busy", "stale", "paused"] as const;
type Held = (typeof STATES)[number];

// A sheet stands in a stage, so its box holds it.
const BODY = <Group list={{ items: ITEMS, row: ROW }} />;

const FRAMES: Record<string, (read: Read<readonly string[]>) => ReactNode> = {
	pane: (read) => (
		<div className="h-[16rem]">
			<Place>
				<Pane title="Deploys" read={read}>
					{BODY}
				</Pane>
			</Place>
		</div>
	),
	section: (read) => (
		<Section title="Members" read={read}>
			{BODY}
		</Section>
	),
	sheet: (read) => (
		<Stage contain>
			<Sheet open onClose={() => {}} title="Details" fit="pane" read={read}>
				{BODY}
			</Sheet>
		</Stage>
	),
	form: (read) => (
		<Form
			groups={[
				{ title: "General", read, fields: BODY },
				{ title: "Region", fields: BODY },
			]}
		/>
	),
	root: (read) => (
		<Form read={read} bar={{ acts: [{ label: "Save", onAct: () => {} }] }}>
			{BODY}
		</Form>
	),
};

// Every state of one frame, each over a read set of its own.
function Frames(props: { name: string }) {
	return (
		<div className="flex flex-col gap-sections">
			{STATES.map((state) => (
				<div key={state} data-testid={state}>
					{FRAMES[props.name]?.(readsAt(`frame-states/${props.name}`)[state])}
				</div>
			))}
		</div>
	);
}

const marks = (root: ParentNode) => root.querySelectorAll("[data-busy]");
// A frame with no heading (a Form's root) has nowhere to put the mark.
async function check(headed: boolean) {
	const box = (state: Held) => within(document.body).getByTestId(state);
	// Busy: the mark stands after the delay, and nothing else is said.
	if (headed)
		await waitFor(() => expect(marks(box("busy")).length).toBeGreaterThan(0), {
			timeout: WAIT_DELAY + 2000,
		});
	else await new Promise((done) => setTimeout(done, WAIT_DELAY + 300));
	if (!headed) await expect(marks(box("busy")).length).toBe(0);
	await expect(box("busy")).not.toHaveTextContent("Couldn't refresh.");
	// Stale: the sentence and Retry, and no mark once the refetch has failed.
	const stale = await within(box("stale")).findByText("Couldn't refresh.");
	await expect(stale).toBeVisible();
	await expect(
		within(box("stale")).getByRole("button", { name: "Retry" }),
	).toBeVisible();
	// Paused: the sentence, no act and no mark.
	await within(box("paused")).findByText("Waiting for a connection.");
	await expect(
		within(box("paused")).queryByRole("button", { name: "Retry" }),
	).toBeNull();
	await expect(marks(box("paused")).length).toBe(0);
	// None of them is the first wait.
	for (const state of STATES) {
		await expect(box(state).querySelector("[aria-busy=true]")).toBeNull();
	}
}

export default { title: "Behaviour/Frame states" } satisfies Meta;

const touched = (story: StoryObj): StoryObj => ({
	...story,
	tags: ["touch"],
	globals: {
		density: "touch",
		viewport: { value: "phone", isRotated: false },
	},
	parameters: {
		...story.parameters,
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
});

const story = (name: string): StoryObj => ({
	render: () => <Frames name={name} />,
	play: () => check(name !== "root"),
});

export const Pane_: StoryObj = story("pane");
export const PaneTouch = touched(story("pane"));
export const Section_: StoryObj = story("section");
export const SectionTouch = touched(story("section"));
export const Sheet_: StoryObj = story("sheet");
export const SheetTouch = touched(story("sheet"));
export const FormGroup: StoryObj = story("form");
export const FormGroupTouch = touched(story("form"));
export const FormRoot: StoryObj = story("root");
export const FormRootTouch = touched(story("root"));

// A refetch of `ms` over rows it holds, then the same rows.
let made = 0;
function slow(ms: number) {
	return read({
		queryKey: ["frame-states", "refetch", made++],
		queryFn: () =>
			new Promise<readonly string[]>((done) =>
				setTimeout(() => done(ITEMS), ms),
			),
		initialData: ITEMS,
		staleTime: Number.POSITIVE_INFINITY,
	});
}

let drawn = 0;
const COUNTED = (
	<Profiler
		id="body"
		onRender={() => {
			drawn += 1;
		}}
	>
		<Group list={{ items: ITEMS, row: ROW }} />
	</Profiler>
);

function Refetching(props: { items: Read<readonly string[]> }) {
	const client = useQueryClient();
	return (
		<div className="flex flex-col gap-sections">
			<button
				type="button"
				onClick={() =>
					void client.invalidateQueries({
						queryKey: props.items.options.queryKey,
					})
				}
			>
				Refetch
			</button>
			<Section title="People" read={props.items}>
				{COUNTED}
			</Section>
		</div>
	);
}

function Pick(props: { ms: number }) {
	const [items] = useState(() => slow(props.ms));
	return <Refetching items={items} />;
}

// A same-data refetch renders the frame (its mark) and nothing under it: the
// body's children are the same elements, so React bails out of them.
export const RefetchRendersOnlyTheFrame: StoryObj = {
	render: () => <Pick ms={WAIT_DELAY + 600} />,
	play: async ({ canvas, userEvent, canvasElement }) => {
		await canvas.findByText("Notes");
		const before = drawn;
		await userEvent.click(canvas.getByRole("button", { name: "Refetch" }));
		await waitFor(() => expect(marks(canvasElement).length).toBe(1), {
			timeout: WAIT_DELAY + 400,
		});
		await waitFor(() => expect(marks(canvasElement).length).toBe(0), {
			timeout: 2000,
		});
		await expect(drawn).toBe(before);
	},
};

// How visible the busy mark is: 0 before the fade, 1 once it has run.
const shown = (root: ParentNode) =>
	Math.max(
		0,
		...[...root.querySelectorAll<HTMLElement>("[data-busy]")].map((mark) =>
			Number(getComputedStyle(mark).opacity),
		),
	);

// A refetch the server answers inside the wait delay never shows its mark.
export const FastRefetchShowsNoMark: StoryObj = {
	render: () => <Pick ms={50} />,
	play: async ({ canvas, canvasElement, userEvent }) => {
		await canvas.findByText("Notes");
		const seen: number[] = [];
		const watch = setInterval(() => seen.push(shown(canvasElement)), 10);
		await userEvent.click(canvas.getByRole("button", { name: "Refetch" }));
		await new Promise((done) => setTimeout(done, WAIT_DELAY + 300));
		clearInterval(watch);
		await expect(Math.max(...seen)).toBe(0);
	},
};
