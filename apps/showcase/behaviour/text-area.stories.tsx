import { ActionBar } from "@fcalell/plugin-react-ui/components/action-bar";
import { Form } from "@fcalell/plugin-react-ui/components/form";
import { FormField } from "@fcalell/plugin-react-ui/components/form-field";
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
			<Place title="Edit page">
				<Form>
					<Source {...props} />
					<ActionBar acts={[{ label: "Save", onAct: act }]} />
				</Form>
			</Place>
		</div>
	);
}

function Sectioned(props: { value: string }) {
	return (
		<div className="flex flex-col h-dvh">
			<Place title="Edit page">
				<Section title="Source">
					<Form>
						<Source kind="source" value={props.value} />
						<ActionBar acts={[{ label: "Save", onAct: act }]} />
					</Form>
				</Section>
			</Place>
		</div>
	);
}

export default { title: "Behaviour/TextArea" } satisfies Meta;

// A source field in a page's form fills the free height of the page with its
// act in view, and a long value scrolls inside the field, not the page.
export const SourceFillsPage: StoryObj = {
	render: () => <Page kind="source" value={LINES.join("\n")} />,
	play: async ({ canvas }) => {
		const field = canvas.getByRole("textbox", { name: "Source" });
		const save = canvas.getByRole("button", { name: "Save" });
		await waitFor(() =>
			expect(field.getBoundingClientRect().height).toBeGreaterThan(
				innerHeight / 2,
			),
		);
		await expect(save.getBoundingClientRect().bottom).toBeLessThanOrEqual(
			innerHeight,
		);
		await expect(field.scrollHeight).toBeGreaterThan(field.clientHeight);
	},
};

// An empty source field still fills the page.
export const EmptySourceFillsPage: StoryObj = {
	render: () => <Page kind="source" value="" />,
	play: async ({ canvas }) => {
		const field = canvas.getByRole("textbox", { name: "Source" });
		await waitFor(() =>
			expect(field.getBoundingClientRect().height).toBeGreaterThan(
				innerHeight / 2,
			),
		);
	},
};

// Prose, or a field among a page's sections, grows with its value.
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
