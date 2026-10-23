import { read } from "@fcalell/plugin-api/tanstack-query";
import { Form } from "@fcalell/plugin-react-ui/components/form";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen, waitFor } from "storybook/test";
import { orpc } from "../src/app/lib/api.ts";
import { through } from "./support.ts";

const sent = fn();
const assigned = through(orpc.forms.assign, async (input) => {
	sent(input);
	return { id: "member-1" };
});
const uploaded = through(orpc.forms.upload, async (input) => {
	sent(input);
	return { id: "upload-1" };
});
const paired = through(orpc.forms.pair, async (input) => {
	sent(input);
	return { id: "pair-1" };
});
const described = through(orpc.forms.describe, async (input) => {
	sent(input);
	return { id: "description-1" };
});

const PROJECTS = [
	{ value: "site", label: "Marketing site" },
	{ value: "app", label: "Product app" },
] as const;

const EVENTS: Record<string, { value: string; label: string }[]> = {
	web: [
		{ value: "page_view", label: "Page view" },
		{ value: "scroll", label: "Scroll" },
	],
	app: [{ value: "screen_view", label: "Screen view" }],
};

// Field behaviours a schema cannot say: a list of strings with `options` is a
// pick of several, a file field names its file, a pick's options narrow by the
// fields before it, and the bar's filled act can be destructive.
export default {
	title: "Behaviour/Form fields",
	parameters: { layout: "fullscreen" },
} satisfies Meta;

// A list of strings the schema does not enumerate draws a pick of several
// over the `options` the field gives, and sends the values picked.
export const AListOfStringsWithOptionsIsAMultiPick: StoryObj = {
	render: () => (
		<div className="w-sheet max-w-full">
			<Form
				act={assigned}
				given={{ workspaceId: "acme" }}
				fields={{ projects: { label: "Projects", options: PROJECTS } }}
			/>
		</div>
	),
	play: async ({ canvas, userEvent }) => {
		sent.mockClear();
		await userEvent.click(
			await canvas.findByRole("combobox", { name: "Projects" }),
		);
		await userEvent.click(
			await screen.findByRole("option", { name: "Marketing site" }),
		);
		await userEvent.click(
			await screen.findByRole("option", { name: "Product app" }),
		);
		await userEvent.keyboard("{Escape}");
		await userEvent.click(canvas.getByRole("button", { name: "Save" }));
		await waitFor(() =>
			expect(sent).toHaveBeenCalledWith({
				workspaceId: "acme",
				projects: ["site", "app"],
			}),
		);
	},
};

const pick = (box: HTMLElement, file: File) => {
	const input = box.querySelector<HTMLInputElement>("input[type=file]");
	if (!input) throw new Error("no file input");
	const data = new DataTransfer();
	data.items.add(file);
	input.files = data.files;
	input.dispatchEvent(new Event("change", { bubbles: true }));
};

// A file field's `name` is the input's string key that receives the picked
// file's name, so `{ file, fileName }` sends both.
export const AFileFieldNamesItsFile: StoryObj = {
	render: () => (
		<div className="w-sheet max-w-full">
			<Form
				act={uploaded}
				given={{ workspaceId: "acme" }}
				fields={{
					file: {
						label: "Rows",
						control: "file",
						accept: ["text/csv"],
						name: "fileName",
					},
				}}
			/>
		</div>
	),
	play: async ({ canvas, canvasElement, userEvent }) => {
		sent.mockClear();
		await canvas.findByText("Rows");
		const input = canvasElement.querySelector<HTMLElement>("input[type=file]");
		pick(
			input?.parentElement as HTMLElement,
			new File(["a,b\n1,2"], "rows.csv", { type: "text/csv" }),
		);
		await userEvent.click(canvas.getByRole("button", { name: "Save" }));
		await waitFor(() =>
			expect(sent).toHaveBeenCalledWith({
				workspaceId: "acme",
				file: "a,b\n1,2",
				fileName: "rows.csv",
			}),
		);
	},
};

// A `lines` field is a text area of one item per line: blank lines are
// dropped, each line is read as the item type the schema allows, and the
// array is sent.
export const LinesSendTheItemsAsTheirTypes: StoryObj = {
	render: () => (
		<div className="w-sheet max-w-full">
			<Form
				act={described}
				given={{ workspaceId: "acme" }}
				values={{ keywords: ["a", "b"] }}
				fields={{
					keywords: { label: "Keywords", control: "lines" },
					examples: { label: "Examples", control: "lines" },
				}}
			/>
		</div>
	),
	play: async ({ canvas, userEvent }) => {
		sent.mockClear();
		const keywords = await canvas.findByRole("textbox", { name: "Keywords" });
		await expect(keywords).toHaveValue("a\nb");
		await userEvent.clear(keywords);
		await userEvent.type(keywords, "first{Enter}{Enter}second");
		await userEvent.type(
			canvas.getByRole("textbox", { name: "Examples" }),
			"hello{Enter}42{Enter}true{Enter}null",
		);
		await userEvent.click(canvas.getByRole("button", { name: "Save" }));
		await waitFor(() =>
			expect(sent).toHaveBeenCalledWith({
				workspaceId: "acme",
				keywords: ["first", "second"],
				examples: ["hello", 42, true, null],
			}),
		);
	},
};

// A line that is no item of the list's type is the field's issue, and the
// submit stays blocked until it is mended.
export const ABadLineIsTheFieldsIssue: StoryObj = {
	render: () => (
		<div className="w-sheet max-w-full">
			<Form
				act={described}
				given={{ workspaceId: "acme" }}
				fields={{ ports: { label: "Ports", control: "lines" } }}
			/>
		</div>
	),
	play: async ({ canvas, userEvent }) => {
		sent.mockClear();
		const ports = await canvas.findByRole("textbox", { name: "Ports" });
		await userEvent.type(ports, "80{Enter}http{Enter}4.5");
		await expect(
			await canvas.findByText("Line 2 isn't a value this list takes."),
		).toBeVisible();
		await expect(canvas.getByRole("button", { name: "Save" })).toBeDisabled();
		await userEvent.clear(ports);
		await userEvent.type(ports, "80{Enter}443");
		await userEvent.click(canvas.getByRole("button", { name: "Save" }));
		await waitFor(() =>
			expect(sent).toHaveBeenCalledWith({
				workspaceId: "acme",
				ports: [80, 443],
			}),
		);
	},
};

// A `json` field holds the JSON text in mono source: `values` are pretty
// printed, and the parsed value is sent.
export const JsonSendsTheParsedValue: StoryObj = {
	render: () => (
		<div className="w-sheet max-w-full">
			<Form
				act={described}
				given={{ workspaceId: "acme" }}
				values={{ settings: { retries: 3, tags: ["a"] } }}
				fields={{ settings: { label: "Settings", control: "json" } }}
			/>
		</div>
	),
	play: async ({ canvas, userEvent }) => {
		sent.mockClear();
		const box = await canvas.findByRole("textbox", { name: "Settings" });
		await expect(box).toHaveValue(
			JSON.stringify({ retries: 3, tags: ["a"] }, null, 2),
		);
		await userEvent.clear(box);
		await userEvent.type(box, '{{ "retries": 5 }');
		await userEvent.click(canvas.getByRole("button", { name: "Save" }));
		await waitFor(() =>
			expect(sent).toHaveBeenCalledWith({
				workspaceId: "acme",
				settings: { retries: 5 },
			}),
		);
	},
};

// JSON that does not parse is the field's issue: the parser's message under
// the field, the submit blocked.
export const AParseErrorIsTheFieldsIssue: StoryObj = {
	render: () => (
		<div className="w-sheet max-w-full">
			<Form
				act={described}
				given={{ workspaceId: "acme" }}
				fields={{ settings: { label: "Settings", control: "json" } }}
			/>
		</div>
	),
	play: async ({ canvas, userEvent }) => {
		sent.mockClear();
		const box = await canvas.findByRole("textbox", { name: "Settings" });
		await userEvent.type(box, '{{ "retries": ');
		await expect(await canvas.findByText(/JSON/)).toBeVisible();
		await expect(canvas.getByRole("button", { name: "Save" })).toBeDisabled();
		await expect(sent).not.toHaveBeenCalled();
	},
};

// The bar's filled act draws destructive where the form rejects, abandons or
// closes something.
export const ADestructiveSubmitDrawsDestructive: StoryObj = {
	render: () => (
		<div className="w-sheet max-w-full">
			<Form
				act={assigned}
				given={{ workspaceId: "acme", projects: [] }}
				fields={{}}
				submit={{ label: "Abandon", destructive: true }}
			/>
		</div>
	),
	play: async ({ canvas }) => {
		const abandon = await canvas.findByRole("button", { name: "Abandon" });
		await expect(abandon.className).toContain("danger");
	},
};

function Narrowed() {
	return (
		<div className="w-sheet max-w-full">
			<Form
				act={paired}
				given={{ workspaceId: "acme" }}
				fields={{
					type: {
						label: "Type",
						options: [
							{ value: "web", label: "Web" },
							{ value: "app", label: "App" },
						],
					},
					event: {
						label: "Event",
						options: (draft) => EVENTS[draft.type ?? ""] ?? [],
					},
				}}
			/>
		</div>
	);
}

// A pick's `options` as a function of the draft narrow by the field before
// it, and a chosen value no longer among them is cleared, so the submit stays
// blocked until the viewer picks again.
export const OptionsNarrowByAnotherFieldAndClear: StoryObj = {
	render: () => <Narrowed />,
	play: async ({ canvas, userEvent }) => {
		sent.mockClear();
		await userEvent.click(
			await canvas.findByRole("combobox", { name: "Type" }),
		);
		await userEvent.click(await screen.findByRole("option", { name: "Web" }));
		await userEvent.click(canvas.getByRole("combobox", { name: "Event" }));
		await expect(
			await screen.findByRole("option", { name: "Scroll" }),
		).toBeVisible();
		await userEvent.click(
			await screen.findByRole("option", { name: "Page view" }),
		);
		await userEvent.click(canvas.getByRole("combobox", { name: "Type" }));
		await userEvent.click(await screen.findByRole("option", { name: "App" }));
		await userEvent.click(canvas.getByRole("button", { name: "Save" }));
		await expect(sent).not.toHaveBeenCalled();
		await userEvent.click(canvas.getByRole("combobox", { name: "Event" }));
		await expect(screen.queryByRole("option", { name: "Scroll" })).toBeNull();
		await userEvent.click(
			await screen.findByRole("option", { name: "Screen view" }),
		);
		await userEvent.click(canvas.getByRole("button", { name: "Save" }));
		await waitFor(() =>
			expect(sent).toHaveBeenCalledWith({
				workspaceId: "acme",
				type: "app",
				event: "screen_view",
			}),
		);
	},
};

const slowEvents = (type: string | undefined) =>
	read({
		queryKey: ["form-fields", "events", type],
		queryFn: async () => {
			await new Promise((resolve) => setTimeout(resolve, 400));
			return EVENTS[type ?? ""] ?? [];
		},
	});

// A pick's `options` function may answer a read: the dependent pick paints,
// inert, while it waits, then opens on the rows.
export const OptionsOfADraftMayBeARead: StoryObj = {
	render: () => (
		<div className="w-sheet max-w-full">
			<Form
				act={paired}
				given={{ workspaceId: "acme" }}
				fields={{
					type: {
						label: "Type",
						options: [
							{ value: "web", label: "Web" },
							{ value: "app", label: "App" },
						],
					},
					event: {
						label: "Event",
						options: (draft) => slowEvents(draft.type),
					},
				}}
			/>
		</div>
	),
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(
			await canvas.findByRole("combobox", { name: "Type" }),
		);
		await userEvent.click(await screen.findByRole("option", { name: "Web" }));
		await expect(
			canvas.getByRole("combobox", { name: "Event" }).closest("[inert]"),
		).not.toBeNull();
		await waitFor(() =>
			expect(
				canvas.getByRole("combobox", { name: "Event" }).closest("[inert]"),
			).toBeNull(),
		);
		await userEvent.click(canvas.getByRole("combobox", { name: "Event" }));
		await userEvent.click(
			await screen.findByRole("option", { name: "Scroll" }),
		);
	},
};
