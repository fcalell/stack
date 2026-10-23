import { Button } from "@fcalell/plugin-react-ui/components/button";
import { Form } from "@fcalell/plugin-react-ui/components/form";
import { Input } from "@fcalell/plugin-react-ui/components/input";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Place } from "@fcalell/plugin-react-ui/showcase/frames/place";
import type { PickedFile } from "@fcalell/ui-core/descriptors";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, waitFor } from "storybook/test";
import { orpc } from "../src/app/lib/api.ts";

const onAdd = fn();

function Add() {
	const [host, setHost] = useState("");
	return (
		<Input
			kind="source"
			value={host}
			onChange={setHost}
			placeholder="Add a host"
			act={{ icon: "Plus", label: "Add", onAct: () => onAdd(host) }}
		/>
	);
}

export default {
	title: "Behaviour/Input",
	render: () => <Add />,
	beforeEach: () => onAdd.mockClear(),
} satisfies Meta;

// An Input with an act presses it on Enter, as the act's own press does, and
// leaving the field presses nothing.
export const ActOnEnter: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		const field = canvas.getByPlaceholderText("Add a host");
		await userEvent.type(field, "api.acme.app");
		await userEvent.tab();
		await expect(onAdd).not.toHaveBeenCalled();
		await userEvent.click(field);
		await userEvent.keyboard("{Enter}");
		await expect(onAdd).toHaveBeenCalledTimes(1);
		await expect(onAdd).toHaveBeenCalledWith("api.acme.app");
		await userEvent.click(canvas.getByRole("button", { name: "Add" }));
		await expect(onAdd).toHaveBeenCalledTimes(2);
	},
};

const NAME = "Deploys";

// The text, then the field the Edit act swaps in for it.
function Rename() {
	const [editing, setEditing] = useState(false);
	const [name, setName] = useState(NAME);
	if (!editing)
		return (
			<div>
				<p>{name}</p>
				<Button label="Edit" onAct={() => setEditing(true)} />
			</div>
		);
	return <Input value={name} onChange={setName} autoFocus />;
}

// A field that replaces what the viewer was reading takes the focus as it
// mounts, the caret at the end of its text.
export const AutoFocusTakesTheFocusAtTheEnd: StoryObj = {
	render: () => <Rename />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Edit" }));
		const field = canvas.getByRole("textbox");
		await waitFor(() => expect(document.activeElement).toBe(field));
		if (!(field instanceof HTMLInputElement))
			throw new Error("the field is not an input");
		await expect(field.selectionStart).toBe(NAME.length);
		await expect(field.selectionEnd).toBe(NAME.length);
	},
};

// A field that mounts with the page leaves the focus where it was.
export const LoadedFieldKeepsTheFocus: StoryObj = {
	render: () => <Input value={NAME} onChange={() => {}} />,
	play: async ({ canvas }) => {
		const field = canvas.getByRole("textbox");
		await expect(document.activeElement).not.toBe(field);
	},
};

// A click on a field draws no ring: the box takes the hover edge and the caret
// carries focus. Tab back to it rings the box on its edge, centred on the 1 px
// hairline (an offset of -1 px), and the hover edge gives way to the ring.
export const ClickIsQuietKeyboardRingsTheEdge: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		const field = canvas.getByPlaceholderText("Add a host");
		const box = field.parentElement as HTMLElement;
		await userEvent.click(field);
		await expect(field).toHaveFocus();
		await expect(document.documentElement.dataset.modality).toBe("pointer");
		await expect(getComputedStyle(box).outlineStyle).toBe("none");
		const hover = getComputedStyle(box).borderTopColor;
		await userEvent.tab();
		await userEvent.tab({ shift: true });
		await expect(field).toHaveFocus();
		await expect(document.documentElement.dataset.modality).toBe("keyboard");
		const ring = getComputedStyle(box);
		await expect(ring.outlineStyle).toBe("solid");
		await expect(ring.outlineWidth).toBe("2px");
		await expect(ring.outlineOffset).toBe("-1px");
		await expect(hover).not.toBe("");
	},
};

// ── Prose ───────────────────────────────────────────────────────────

const LINES = Array.from({ length: 80 }, (_, line) => `line ${line + 1}`);
const source = (value: string, control: "prose" | "source") => (
	<Form
		act={orpc.forms.rename}
		given={{ workspaceId: "acme" }}
		values={{ name: value }}
		fields={{ name: { label: "Source", control } }}
	/>
);

function Page(props: { kind: "prose" | "source"; value: string }) {
	return (
		<div className="flex flex-col h-dvh">
			<Place>
				<Pane title="Edit page">{source(props.value, props.kind)}</Pane>
			</Place>
		</div>
	);
}

function Sectioned(props: { value: string }) {
	return (
		<div className="flex flex-col h-dvh">
			<Place>
				<Pane title="Edit page">
					<Section title="Source">{source(props.value, "source")}</Section>
				</Pane>
			</Place>
		</div>
	);
}

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
	return <Input kind="prose" value={value} onChange={setValue} autoFocus />;
}

// A field that replaces what the viewer was reading takes the focus as it
// mounts, the caret at the end of its text, and typing keeps the caret where
// the viewer puts it.
export const ProseAutoFocusTakesTheFocusAtTheEnd: StoryObj = {
	render: () => <Swap />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Edit" }));
		const field = canvas.getByRole("textbox");
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
export const ProseLoadedFieldKeepsTheFocus: StoryObj = {
	render: () => <Page kind="prose" value="One line." />,
	play: async ({ canvas }) => {
		const field = canvas.getByRole("textbox", { name: "Source" });
		await expect(document.activeElement).not.toBe(field);
	},
};

// ── Code ────────────────────────────────────────────────────────────

const done = fn();

function Code(props: { check?: (code: string) => unknown }) {
	const [code, setCode] = useState("");
	return (
		<Input
			kind="code"
			length={6}
			value={code}
			onChange={setCode}
			onComplete={props.check ?? done}
		/>
	);
}

// One input takes the digits, drops anything else and reports the code
// once its last digit lands.
export const CodeTyping: StoryObj = {
	render: () => <Code />,
	play: async ({ canvas, userEvent }) => {
		const input = canvas.getByRole("textbox");
		await userEvent.tab();
		await expect(input).toHaveFocus();
		await userEvent.keyboard("48x1");
		await expect(input).toHaveValue("481");
		await userEvent.keyboard("902");
		await waitFor(() => expect(done).toHaveBeenCalledWith("481902"));
	},
};

// A code being checked, its promise pending, says so and takes no more digits.
export const CodeChecking: StoryObj = {
	render: () => <Code check={() => new Promise(() => {})} />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.tab();
		await userEvent.keyboard("481902");
		await expect(await canvas.findByRole("status")).toHaveTextContent(
			/checking/i,
		);
		await expect(canvas.getByRole("textbox")).toBeDisabled();
	},
};

// A refused code stands in the control's own line, under the boxes, and the
// next digit clears it.
export const CodeRefused: StoryObj = {
	render: () => (
		<Code check={() => Promise.reject(new Error("That code is not right."))} />
	),
	play: async ({ canvas, userEvent }) => {
		await userEvent.tab();
		await userEvent.keyboard("481902");
		const line = await canvas.findByRole("alert");
		await expect(line).toHaveTextContent("That didn't go through.");
		const boxes = canvas.getByRole("textbox").parentElement;
		await expect(line.getBoundingClientRect().top).toBeGreaterThanOrEqual(
			(boxes as HTMLElement).getBoundingClientRect().bottom,
		);
		// The check disabled the input, which dropped its focus.
		await userEvent.tab();
		await userEvent.keyboard("{Backspace}");
		await waitFor(() => expect(canvas.queryByRole("alert")).toBeNull());
	},
};

// ── File ────────────────────────────────────────────────────────────

// A file of a type the box does not take is refused in the box's own line,
// under it and not in the field's; the next pick clears it, and the refused
// file never reaches `onChange`.

function Import() {
	const [file, setFile] = useState<PickedFile | null>(null);
	return (
		<div className="w-sheet max-w-full">
			<Input
				kind="file"
				value={file}
				onChange={setFile}
				accept={["text/csv"]}
			/>
		</div>
	);
}

const drop = (box: HTMLElement, name: string, type: string) => {
	const dataTransfer = new DataTransfer();
	dataTransfer.items.add(new File(["a,b"], name, { type }));
	box.dispatchEvent(
		new DragEvent("drop", { dataTransfer, bubbles: true, cancelable: true }),
	);
};

async function refusesUnderItsBox(canvas: {
	getByText: (text: string) => HTMLElement;
	findByRole: (role: string) => Promise<HTMLElement>;
	queryByRole: (role: string) => HTMLElement | null;
}) {
	const box = canvas.getByText("Choose file").parentElement as HTMLElement;
	drop(box, "notes.png", "image/png");
	const line = await canvas.findByRole("alert");
	await expect(line).toHaveTextContent(/notes\.png isn't one of/);
	await expect(line.getBoundingClientRect().top).toBeGreaterThanOrEqual(
		box.getBoundingClientRect().bottom,
	);
	await expect(canvas.getByText("Choose file")).toBeVisible();
	drop(box, "rows.csv", "text/csv");
	await waitFor(() => expect(canvas.queryByRole("alert")).toBeNull());
	await expect(canvas.getByText("s.csv")).toBeVisible();
}

export const AWrongTypeIsRefusedUnderItsBox: StoryObj = {
	render: () => <Import />,
	play: async ({ canvas }) => refusesUnderItsBox(canvas),
};

function Chosen(props: { accept: string[]; width: number }) {
	const [file, setFile] = useState<PickedFile | null>(null);
	return (
		<div style={{ width: props.width }} className="max-w-full">
			<Input
				kind="file"
				value={file}
				onChange={setFile}
				accept={props.accept}
			/>
		</div>
	);
}

const dropFile = (box: HTMLElement, file: File) => {
	const dataTransfer = new DataTransfer();
	dataTransfer.items.add(file);
	box.dispatchEvent(
		new DragEvent("drop", { dataTransfer, bubbles: true, cancelable: true }),
	);
};

// A chosen file's size reads in the viewer's units (never "9.1K byte"), and a
// name too long for the box cuts in its middle, its extension whole.
export const ASizeAndALongNameRead: StoryObj = {
	render: () => <Chosen accept={["text/csv"]} width={280} />,
	play: async ({ canvas }) => {
		const box = canvas.getByText("Choose file").parentElement as HTMLElement;
		const name = "quarterly-leads-export-for-the-whole-region-final.csv";
		dropFile(box, new File(["x".repeat(9100)], name, { type: "text/csv" }));
		await waitFor(() => expect(box).toHaveTextContent("9.1 kB"));
		await expect(box).not.toHaveTextContent("byte");
		const end = canvas.getByText(/\.csv$/);
		const stem = end.previousElementSibling as HTMLElement;
		await expect(stem.scrollWidth).toBeGreaterThan(stem.clientWidth);
		await expect(end.scrollWidth).toBeLessThanOrEqual(end.clientWidth);
		await expect(end.getBoundingClientRect().right).toBeLessThanOrEqual(
			box.getBoundingClientRect().right,
		);
		await expect(stem.textContent + (end.textContent ?? "")).toBe(name);
		dropFile(box, new File(["x".repeat(39)], "a.csv", { type: "text/csv" }));
		await waitFor(() => expect(box).toHaveTextContent("39 bytes"));
	},
};

// A refused file's line names the types by their usual names.
export const TypesAreNamedAsUsual: StoryObj = {
	render: () => <Chosen accept={["image/webp"]} width={400} />,
	play: async ({ canvas }) => {
		const box = canvas.getByText("Choose file").parentElement as HTMLElement;
		dropFile(box, new File(["x"], "notes.csv", { type: "text/csv" }));
		const line = await canvas.findByRole("alert");
		await expect(line).toHaveTextContent("WebP");
		await expect(line).not.toHaveTextContent("WEBP");
	},
};

// A name whose end is itself longer than the box (a name that is all extension)
// gives up its end as a last resort, cut with an ellipsis, so the box stays in
// its column at 320; the size reads tabular figures like every figure.
export const AnEndPastTheBoxIsCutNotGrown: StoryObj = {
	render: () => <Chosen accept={["text/csv"]} width={320} />,
	play: async ({ canvas, canvasElement }) => {
		const box = canvas.getByText("Choose file").parentElement as HTMLElement;
		const name = `${"q".repeat(40)}.${"csv".repeat(100)}`;
		dropFile(box, new File(["x".repeat(48_000)], name, { type: "text/csv" }));
		await waitFor(() => expect(box).toHaveTextContent("48 kB"));
		const column = canvasElement.firstElementChild as HTMLElement;
		await expect(box.getBoundingClientRect().right).toBeLessThanOrEqual(
			column.getBoundingClientRect().right + 1,
		);
		await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
			innerWidth,
		);
		await expect(
			getComputedStyle(canvas.getByText("48 kB")).fontVariantNumeric,
		).toContain("tabular-nums");
	},
};

// `kind="date"` is the browser's date field: its value is the day as
// `YYYY-MM-DD`.
export const DateHoldsADay: StoryObj = {
	render: function Day() {
		const [day, setDay] = useState("");
		return (
			<>
				<Input kind="date" value={day} onChange={setDay} />
				<output>{day}</output>
			</>
		);
	},
	play: async ({ canvas, userEvent }) => {
		const field = canvas.getByDisplayValue("");
		await expect(field).toHaveAttribute("type", "date");
		await userEvent.type(field, "2026-03-14");
		await waitFor(() =>
			expect(canvas.getByRole("status")).toHaveTextContent("2026-03-14"),
		);
	},
};
