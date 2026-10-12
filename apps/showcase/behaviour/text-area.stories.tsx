import { Button } from "@fcalell/plugin-react-ui/components/button";
import { Form } from "@fcalell/plugin-react-ui/components/form";
import { FormField } from "@fcalell/plugin-react-ui/components/form-field";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { TextArea } from "@fcalell/plugin-react-ui/components/text-area";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, waitFor } from "storybook/test";

const LINES = Array.from({ length: 80 }, (_, line) => `line ${line + 1}`);
const act = () => {};

function Source(props: { kind: "prose" | "source"; value: string }) {
	const [value, setValue] = useState(props.value);
	return (
		<FormField label="Source">
			<TextArea kind={props.kind} value={value} onChange={setValue} />
		</FormField>
	);
}

function Page(props: { kind: "prose" | "source"; value: string }) {
	return (
		<div className="flex flex-col h-dvh">
			<Place>
				<Pane title="Edit page">
					<Form bar={{ acts: [{ label: "Save", onAct: act }] }}>
						<Source {...props} />
					</Form>
				</Pane>
			</Place>
		</div>
	);
}

function Sectioned(props: { value: string }) {
	return (
		<div className="flex flex-col h-dvh">
			<Place>
				<Pane title="Edit page">
					<Section title="Source">
						<Form bar={{ acts: [{ label: "Save", onAct: act }] }}>
							<Source kind="source" value={props.value} />
						</Form>
					</Section>
				</Pane>
			</Place>
		</div>
	);
}

export default { title: "Behaviour/TextArea" } satisfies Meta;

// A source field never fills the page: it is as tall as its value, and the
// page's body scrolls past it to the act under it.
export const SourceGrowsWithItsValue: StoryObj = {
	render: () => <Page kind="source" value={LINES.join("\n")} />,
	play: async ({ canvas }) => {
		const field = canvas.getByRole("textbox", { name: "Source" });
		await waitFor(() =>
			expect(field.getBoundingClientRect().height).toBeGreaterThan(innerHeight),
		);
		await expect(field.scrollHeight).toBeLessThanOrEqual(field.clientHeight);
	},
};

// An empty source field keeps its three lines, whatever room the page leaves.
export const EmptySourceKeepsItsThreeLines: StoryObj = {
	render: () => <Page kind="source" value="" />,
	play: async ({ canvas }) => {
		const field = canvas.getByRole("textbox", { name: "Source" });
		await expect(field.getBoundingClientRect().height).toBeLessThan(
			innerHeight / 3,
		);
	},
};

// Prose grows with its value.
export const ProseGrows: StoryObj = {
	render: () => <Page kind="prose" value="One line." />,
	play: async ({ canvas }) => {
		const field = canvas.getByRole("textbox", { name: "Source" });
		await expect(field.getBoundingClientRect().height).toBeLessThan(
			innerHeight / 3,
		);
	},
};

export const SectionedGrows: StoryObj = {
	render: () => <Sectioned value={LINES.slice(0, 12).join("\n")} />,
	play: async ({ canvas }) => {
		const field = canvas.getByRole("textbox", { name: "Source" });
		await expect(field.scrollHeight).toBeLessThanOrEqual(field.clientHeight);
		await expect(field.getBoundingClientRect().height).toBeLessThan(
			innerHeight / 2,
		);
	},
};

const NOTE = "A note the operator reads,\nthen edits.";

// The text, then the field the Edit act swaps in for it.
function Swap() {
	const [editing, setEditing] = useState(false);
	const [value, setValue] = useState(NOTE);
	if (!editing)
		return (
			<div>
				<p>{value}</p>
				<Button label="Edit" onAct={() => setEditing(true)} />
			</div>
		);
	return (
		<FormField label="Note">
			<TextArea value={value} onChange={setValue} autoFocus />
		</FormField>
	);
}

// A field that replaces what the viewer was reading takes the focus as it
// mounts, the caret at the end of its text, and typing keeps the caret where
// the viewer puts it.
export const AutoFocusTakesTheFocusAtTheEnd: StoryObj = {
	render: () => <Swap />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Edit" }));
		const field = canvas.getByRole("textbox", { name: "Note" });
		await waitFor(() => expect(document.activeElement).toBe(field));
		if (!(field instanceof HTMLTextAreaElement))
			throw new Error("the field is not a textarea");
		await expect(field.selectionStart).toBe(NOTE.length);
		await expect(field.selectionEnd).toBe(NOTE.length);
		field.setSelectionRange(2, 2);
		await userEvent.keyboard("X");
		await expect(field.value).toBe(`${NOTE.slice(0, 2)}X${NOTE.slice(2)}`);
		await expect(field.selectionStart).toBe(3);
	},
};

// A field on a form that loads with the page leaves the focus where it was.
export const LoadedFieldKeepsTheFocus: StoryObj = {
	render: () => <Page kind="prose" value="One line." />,
	play: async ({ canvas }) => {
		const field = canvas.getByRole("textbox", { name: "Source" });
		await expect(document.activeElement).not.toBe(field);
	},
};
