import { type Read, read } from "@fcalell/plugin-api/tanstack-query";
import { Pane as PagePane } from "@fcalell/plugin-react-ui/components/pane";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Stats } from "@fcalell/plugin-react-ui/components/stats";
import { Place } from "@fcalell/plugin-react-ui/showcase/frames/place";
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
				<Section
					items={[
						{
							key: "region",
							label: "Region",
							meta: r.waiting.at((rows) => [rows.join(", ")]),
							title: r.waiting.at((rows) => rows.join(", ")),
							href: "#region",
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
// value slot, the sentence stands under the label, the retry icon stands at the
// end, the whole row retries, and a landed read makes it a link
// again, drawing no chevron.
function failedThenRetried(key: string): StoryObj {
	const { state, answer } = onceFailing(`link/${key}`, "Region one");
	return {
		beforeEach: watch,
		render: () => (
			<Pane>
				<Section
					items={[
						{
							key: "plain",
							label: "Plain",
							title: "Plain value",
						},
						{
							key: "region",
							label: "Region",
							meta: ["Where the workspace runs."],
							title: answer,
							href: "#region",
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
			// The alert and the retry icon stand at the row's end, on its label's line
			// centre, the sentence below the line.
			const line = canvas.getByText("Region");
			const marks = row.querySelectorAll("svg");
			await expect(marks).toHaveLength(2);
			// On touch the line stacks under the label, so the marks stand on their own
			// line, one centre.
			const beside = box(line).bottom > box(marks[0] as Element).top;
			await expect(
				Math.abs(middle(marks[0] as Element) - middle(marks[1] as Element)),
			).toBeLessThan(1);
			if (beside)
				await expect(
					Math.abs(middle(marks[0] as Element) - middle(line)),
				).toBeLessThan(1);
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
			await expect(rowOf(link).querySelectorAll("svg")).toHaveLength(0);
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
				<Section
					items={[
						{
							key: "plan",
							label: "Plan",
							meta: ["Your organisation manages it."],
							title: answer,
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
				<Section
					items={[
						{
							key: "knowledge",
							label: "Knowledge",
							meta: ["Notes the repo keeps."],
							title: count,
							href: "#knowledge",
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
			// The value stands on the label's line beside it, or under it where the
			// line stacks (touch).
			const name = canvas.getByText("Knowledge");
			const stacked =
				value.getBoundingClientRect().top >=
				name.getBoundingClientRect().bottom - 1;
			if (!stacked)
				await expect(Math.abs(middle(value) - middle(name))).toBeLessThan(1);
			await expect(seen(canvas)).toHaveLength(0);
			await expect(unheld()).toHaveLength(0);
		},
	};
}

// A read an enclosing frame holds is that frame's: the Pane and the Section
// draw their failed forms once and the rows inside draw nothing of their own.
export const HeldByTheFrame: StoryObj = {
	beforeEach: watch,
	render: () => {
		const r = readsAt("row-read/held");
		return (
			<Pane>
				<Place>
					<PagePane title="Doctor" read={r.failing}>
						<Section
							items={[
								{
									key: "region",
									label: "Region",
									meta: r.failing.at((rows) => [rows.join(", ")]),
									title: r.failing.at((rows) => rows.join(", ")),
								},
							]}
						/>
					</PagePane>
				</Place>
				<Section title="Usage" read={r.failing}>
					<Stats
						items={[
							{
								label: "Disk",
								value: r.failing.at((rows) => rows.length),
								bound: 10,
							},
						]}
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
				<Stats
					items={[
						{
							label: "Disk",
							value: answer.at(([used]) => used as number),
							bound: answer.at(([, max]) => max as number),
							meta: "Resets monthly.",
						},
					]}
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

export const WaitingTouch = { ...touch(Waiting), tags: ["touch"] };
export const FailedThenRetriedTouch = {
	...touch(failedThenRetried("touch")),
	tags: ["touch"],
};
export const FailedWithoutChevronTouch = {
	...touch(failedWithoutChevron("touch")),
	tags: ["touch"],
};
export const CountedTouch = { ...touch(counted("touch")), tags: ["touch"] };
export const HeldByTheFrameTouch = {
	...touch(HeldByTheFrame),
	tags: ["touch"],
};
export const MeterFailedThenRetriedTouch = {
	...touch(meterFailedThenRetried("touch")),
	tags: ["touch"],
};
