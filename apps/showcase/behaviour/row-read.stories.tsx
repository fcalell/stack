import { type Read, read } from "@fcalell/plugin-api/tanstack-query";
import { DefinitionRow } from "@fcalell/plugin-react-ui/components/definition-row";
import { Group } from "@fcalell/plugin-react-ui/components/group";
import { Meter } from "@fcalell/plugin-react-ui/components/meter";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { readsAt } from "@fcalell/plugin-react-ui/showcase/waiting";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { expect, spyOn, waitFor } from "storybook/test";

// A row is the frame of the selections it draws, as a collection is its
// items': a definition's value and description, a meter's label, value and
// max. Waiting paints them as it did. When one failed and no enclosing frame
// holds that read, the row draws the failure in place: the label stays, the
// value slot shows the alert, the description reads "This didn't load.", the
// chevron becomes the retry icon (the end group's, on a row with no chevron)
// and pressing the row retries; once loaded it is a link again. A read an
// enclosing frame holds is that frame's to say, once.
export default { title: "Behaviour/Row read" } satisfies Meta;

const SENTENCE = "This didn't load.";
const UNHELD = /no frame holds it/;

let logged: ReturnType<typeof spyOn>;
const watch = () => {
	logged = spyOn(console, "error");
	return () => logged.mockRestore();
};
const unheld = () =>
	logged.mock.calls.filter(
		(args: unknown[]) => typeof args[0] === "string" && UNHELD.test(args[0]),
	);

const box = (element: Element) => element.getBoundingClientRect();
const middle = (element: Element) => box(element).top + box(element).height / 2;

// A read that rejects its first answer and lands on the second; `calls` counts
// its fetches.
function onceFailing<T>(name: string, landed: T) {
	const state = { calls: 0 };
	const answer: Read<T> = read({
		queryKey: ["row-read", name],
		queryFn: () => {
			state.calls += 1;
			return state.calls === 1
				? Promise.reject(new Error("The read fails once."))
				: Promise.resolve(landed);
		},
		retry: false,
		staleTime: Number.POSITIVE_INFINITY,
	});
	return { state, answer };
}

function Pane(props: { children: ReactNode }) {
	return <div className="w-pane max-w-full">{props.children}</div>;
}

const rowOf = (element: HTMLElement) => {
	const row = element.closest("div");
	if (!row) throw new Error("the label has no row");
	return row;
};

const seen = (canvas: { queryAllByText: (text: string) => HTMLElement[] }) =>
	canvas.queryAllByText(SENTENCE);

// While the read waits the row paints its value and description and takes no
// press, as before.
export const Waiting: StoryObj = {
	beforeEach: watch,
	render: () => {
		const r = readsAt("row-read/waiting");
		return (
			<Pane>
				<Group
					items={[
						{
							key: "region",
							row: (
								<DefinitionRow
									label="Region"
									description={r.waiting.at((rows) => rows.join(", "))}
									value={r.waiting.at((rows) => rows.join(", "))}
									href="#region"
								/>
							),
						},
					]}
				/>
			</Pane>
		);
	},
	play: async ({ canvas }) => {
		const row = rowOf(canvas.getByText("Region"));
		await expect(row.querySelectorAll("[data-painted]").length).toBeGreaterThan(
			1,
		);
		await expect(row).toHaveAttribute("inert");
		await expect(canvas.queryByRole("link")).toBeNull();
		await expect(seen(canvas)).toHaveLength(0);
		await expect(unheld()).toHaveLength(0);
	},
};

// A failed row outside every frame: the label stays, the alert stands in the
// value slot, the sentence stands under the label, the retry icon stands where
// the chevron did, the whole row retries, and a landed read makes it a link
// again with its chevron.
function failedThenRetried(key: string): StoryObj {
	const { state, answer } = onceFailing(`link/${key}`, "Region one");
	return {
		beforeEach: watch,
		render: () => (
			<Pane>
				<Group
					items={[
						{
							key: "plain",
							row: <DefinitionRow label="Plain" value="Plain value" />,
						},
						{
							key: "region",
							row: (
								<DefinitionRow
									label="Region"
									description="Where the workspace runs."
									value={answer}
									href="#region"
								/>
							),
						},
					]}
				/>
			</Pane>
		),
		play: async ({ canvas, userEvent }) => {
			await canvas.findByText(SENTENCE);
			await expect(seen(canvas)).toHaveLength(1);
			await expect(canvas.queryByText("Where the workspace runs.")).toBeNull();
			await expect(canvas.getByText("Region")).toBeVisible();
			await expect(canvas.queryByRole("link")).toBeNull();
			const retry = canvas.getByRole("button", { name: "Retry Region" });
			const row = rowOf(retry);
			// The alert and the retry icon stand at the row's end, on its centre.
			const marks = row.querySelectorAll("svg");
			await expect(marks).toHaveLength(2);
			for (const mark of marks) {
				await expect(Math.abs(middle(mark) - middle(row))).toBeLessThan(1);
			}
			await expect(box(marks[1] as Element).right).toBeLessThanOrEqual(
				box(row).right,
			);
			await expect(state.calls).toBe(1);
			await userEvent.click(retry);
			await canvas.findByText("Region one");
			await waitFor(() => expect(state.calls).toBe(2));
			await expect(seen(canvas)).toHaveLength(0);
			const link = canvas.getByRole("link", { name: "Region" });
			await expect(link).toHaveAttribute("href", "#region");
			await expect(rowOf(link).querySelectorAll("svg")).toHaveLength(1);
			await expect(unheld()).toHaveLength(0);
		},
	};
}

// A failed row with no chevron: the retry icon goes in the end group after the
// alert, and pressing the row retries.
function failedWithoutChevron(key: string): StoryObj {
	const { state, answer } = onceFailing(`plain/${key}`, "Business");
	return {
		beforeEach: watch,
		render: () => (
			<Pane>
				<Group
					items={[
						{
							key: "plan",
							row: (
								<DefinitionRow
									label="Plan"
									description="Your organisation manages it."
									value={answer}
								/>
							),
						},
					]}
				/>
			</Pane>
		),
		play: async ({ canvas, userEvent }) => {
			await canvas.findByText(SENTENCE);
			const retry = canvas.getByRole("button", { name: "Retry Plan" });
			const row = rowOf(retry);
			await expect(row.querySelectorAll("svg")).toHaveLength(2);
			await userEvent.click(retry);
			await canvas.findByText("Business");
			await waitFor(() => expect(state.calls).toBe(2));
			await expect(seen(canvas)).toHaveLength(0);
			await expect(canvas.queryByRole("button")).toBeNull();
			await expect(
				canvas.getByText("Your organisation manages it."),
			).toBeVisible();
			await expect(row.querySelectorAll("svg")).toHaveLength(0);
			await expect(unheld()).toHaveLength(0);
		},
	};
}

// A counted row: its value is the count of the read it holds, as the repo
// page's Knowledge row; failed, it is the failed form, and loaded the count.
function counted(key: string): StoryObj {
	const { state, answer } = onceFailing(`counted/${key}`, ["a", "b", "c"]);
	const count = answer.at((rows) => `${rows.length}`);
	return {
		beforeEach: watch,
		render: () => (
			<Pane>
				<Group
					items={[
						{
							key: "knowledge",
							row: (
								<DefinitionRow
									label="Knowledge"
									description="Notes the repo keeps."
									value={count}
									href="#knowledge"
								/>
							),
						},
					]}
				/>
			</Pane>
		),
		play: async ({ canvas, userEvent }) => {
			await canvas.findByText(SENTENCE);
			await userEvent.click(
				canvas.getByRole("button", { name: "Retry Knowledge" }),
			);
			const value = await canvas.findByText("3");
			await waitFor(() => expect(state.calls).toBe(2));
			const row = rowOf(canvas.getByRole("link", { name: "Knowledge" }));
			await expect(Math.abs(middle(value) - middle(row))).toBeLessThan(1);
			await expect(seen(canvas)).toHaveLength(0);
			await expect(unheld()).toHaveLength(0);
		},
	};
}

// A read an enclosing frame holds is that frame's: the Section draws its failed
// form once and the rows inside draw nothing of their own.
export const HeldByTheFrame: StoryObj = {
	beforeEach: watch,
	render: () => {
		const r = readsAt("row-read/held");
		return (
			<Pane>
				<Section title="Doctor" read={r.failing}>
					<Group
						items={[
							{
								key: "region",
								row: (
									<DefinitionRow
										label="Region"
										description={r.failing.at((rows) => rows.join(", "))}
										value={r.failing.at((rows) => rows.join(", "))}
									/>
								),
							},
						]}
					/>
				</Section>
				<Section title="Usage" read={r.failing}>
					<Meter
						label="Disk"
						value={r.failing.at((rows) => rows.length)}
						max={10}
					/>
				</Section>
			</Pane>
		);
	},
	play: async ({ canvas }) => {
		await canvas.findAllByText(SENTENCE);
		// One failure line per surface: the Section's, with its Retry.
		await expect(seen(canvas)).toHaveLength(2);
		await expect(canvas.getAllByRole("button", { name: "Retry" })).toHaveLength(
			2,
		);
		await expect(canvas.queryByText("Region")).toBeNull();
		await expect(canvas.queryByText("Disk")).toBeNull();
		await expect(unheld()).toHaveLength(0);
	},
};

// A meter is a row too: the label stays, the alert and the retry icon stand at
// its head's end, the sentence stands under the bar, and pressing the meter
// retries; loaded, it is the meter.
function meterFailedThenRetried(key: string): StoryObj {
	const { state, answer } = onceFailing(`meter/${key}`, [3, 4]);
	return {
		beforeEach: watch,
		render: () => (
			<Pane>
				<Meter
					label="Disk"
					value={answer.at(([used]) => used as number)}
					max={answer.at(([, max]) => max as number)}
					meta="Resets monthly."
				/>
			</Pane>
		),
		play: async ({ canvas, userEvent }) => {
			await canvas.findByText(SENTENCE);
			await expect(canvas.getByText("Disk")).toBeVisible();
			await expect(canvas.queryByRole("meter")).toBeNull();
			await expect(canvas.queryByText("Resets monthly.")).toBeNull();
			const retry = canvas.getByRole("button", { name: "Retry Disk" });
			await expect(retry.querySelectorAll("svg")).toHaveLength(0);
			await expect(state.calls).toBe(1);
			await userEvent.click(retry);
			await canvas.findByText("75%");
			await waitFor(() => expect(state.calls).toBe(2));
			await expect(canvas.getByRole("meter", { name: "Disk" })).toBeVisible();
			await expect(canvas.getByText("Resets monthly.")).toBeVisible();
			await expect(seen(canvas)).toHaveLength(0);
			await expect(unheld()).toHaveLength(0);
		},
	};
}

export const FailedThenRetried = failedThenRetried("desktop");
export const FailedWithoutChevron = failedWithoutChevron("desktop");
export const Counted = counted("desktop");
export const MeterFailedThenRetried = meterFailedThenRetried("desktop");

// The same stories in a 375 px phone at the touch density, each over its own
// read.
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

export const WaitingTouch = touch(Waiting);
export const FailedThenRetriedTouch = touch(failedThenRetried("touch"));
export const FailedWithoutChevronTouch = touch(failedWithoutChevron("touch"));
export const CountedTouch = touch(counted("touch"));
export const HeldByTheFrameTouch = touch(HeldByTheFrame);
export const MeterFailedThenRetriedTouch = touch(
	meterFailedThenRetried("touch"),
);
