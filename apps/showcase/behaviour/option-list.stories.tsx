import { OptionList } from "@fcalell/plugin-react-ui/components/option-list";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, waitFor } from "storybook/test";

const APPROACHES = [
	{ value: "ask", label: "Ask before each change" },
	{ value: "apply", label: "Apply and report" },
	{ value: "stop", label: "Stop here" },
];

function One() {
	const [value, setValue] = useState<string | null>(null);
	return <OptionList options={APPROACHES} value={value} onChange={setValue} />;
}

function Several() {
	const [value, setValue] = useState<string[]>([]);
	return <OptionList options={APPROACHES} value={value} onChange={setValue} />;
}

export default { title: "Behaviour/OptionList" } satisfies Meta;

// One choice is a radio group: the arrow keys move the choice.
export const Radios: StoryObj = {
	render: () => <One />,
	play: async ({ canvas, userEvent }) => {
		await expect(canvas.getByRole("radiogroup")).toBeInTheDocument();
		const [ask, apply, stop] = canvas.getAllByRole("radio");
		await userEvent.tab();
		await expect(ask).toHaveFocus();
		await userEvent.keyboard("{ArrowDown}");
		await waitFor(() => expect(apply).toBeChecked());
		await expect(apply).toHaveFocus();
		await userEvent.keyboard("{ArrowDown}");
		await waitFor(() => expect(stop).toBeChecked());
		await userEvent.keyboard("{ArrowUp}");
		await waitFor(() => expect(apply).toBeChecked());
	},
};

const SENTENCE =
	"Nothing covers a month with no reading, so its count is blank, not zero, and the report that totals the year then adds a column that no one asked to see, which the reader must explain. A second pass over the same months, run by hand each quarter, finds the same blank counts and then reports them again, so the sentence runs past a full line at any desktop width, and past three lines on a phone.";
const LONG = [
	{ value: "short", label: "Stop here" },
	{ value: "long", label: SENTENCE },
];

function Sized(props: { width: number; loading?: boolean }) {
	const [value, setValue] = useState<string[]>([]);
	return (
		<div style={{ width: props.width }}>
			<OptionList
				options={props.loading ? [] : LONG}
				loading={props.loading}
				value={value}
				onChange={setValue}
			/>
		</div>
	);
}

const px = (element: Element, property: string) =>
	Number.parseFloat(getComputedStyle(element).getPropertyValue(property));

// A label is read whole: a sentence wraps to every line it needs, its tick
// stays on the first line, and the row is its lines and the pair padding.
function wraps(width: number): StoryObj {
	return {
		render: () => <Sized width={width} />,
		play: async ({ canvas }) => {
			const label = await canvas.findByText(SENTENCE);
			const row = label.closest("label");
			const box = canvas.getAllByRole("checkbox")[1];
			if (!row || !box) throw new Error("no long row");
			const line = px(label, "line-height");
			const pair = px(row, "padding-top");
			const lines = label.getBoundingClientRect().height / line;
			await expect(lines).toBeGreaterThanOrEqual(2);
			await expect(Math.abs(lines - Math.round(lines))).toBeLessThan(0.01);
			await expect(row.getBoundingClientRect().height).toBeCloseTo(
				Math.round(lines) * line + 2 * pair,
				1,
			);
			const first = label.getBoundingClientRect().top;
			const tick = box.getBoundingClientRect();
			await expect(tick.top).toBeGreaterThanOrEqual(first - 0.5);
			await expect(tick.bottom).toBeLessThanOrEqual(first + line + 0.5);
		},
	};
}

export const LabelWraps375 = wraps(375);
export const LabelWraps390 = wraps(390);
export const LabelWraps768 = wraps(768);
export const LabelWraps1440 = wraps(1440);

// A short label's row is as tall as its waiting row, at each width.
function keepsHeight(width: number): StoryObj {
	return {
		render: () => (
			<>
				<Sized width={width} />
				<Sized width={width} loading />
			</>
		),
		play: async ({ canvas, canvasElement }) => {
			const short = (await canvas.findByText("Stop here")).closest("label");
			const waiting = canvasElement.querySelector('[aria-hidden="true"] > div');
			if (!short || !waiting) throw new Error("no rows");
			await expect(short.getBoundingClientRect().height).toBeCloseTo(
				waiting.getBoundingClientRect().height,
				1,
			);
		},
	};
}

export const ShortRowKeepsWaitingHeight375 = keepsHeight(375);
export const ShortRowKeepsWaitingHeight768 = keepsHeight(768);
export const ShortRowKeepsWaitingHeight1440 = keepsHeight(1440);

// Several choices are checkboxes, each in the tab order and toggled by Space.
export const Checks: StoryObj = {
	render: () => <Several />,
	play: async ({ canvas, userEvent }) => {
		const [ask, apply] = canvas.getAllByRole("checkbox");
		await userEvent.tab();
		await expect(ask).toHaveFocus();
		await userEvent.keyboard(" ");
		await waitFor(() => expect(ask).toBeChecked());
		await userEvent.tab();
		await expect(apply).toHaveFocus();
		await userEvent.keyboard(" ");
		await waitFor(() => expect(apply).toBeChecked());
		await userEvent.keyboard(" ");
		await waitFor(() => expect(apply).not.toBeChecked());
	},
};
