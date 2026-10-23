import { Form } from "@fcalell/plugin-react-ui/components/form";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, waitFor } from "storybook/test";
import { orpc } from "../src/app/lib/api.ts";
import { through } from "./support.ts";

const sent = fn();
const attached = through(orpc.forms.attach, async (input) => {
	sent(input);
	return { id: "attachment-1" };
});

// A `file` field draws the file pick and sends the picked file as the string
// it is read into: text, or base64 where the schema says so.
export default {
	title: "Behaviour/Form file",
	parameters: { layout: "fullscreen" },
	render: () => (
		<div className="w-sheet max-w-full">
			<Form
				act={attached}
				given={{ workspaceId: "acme" }}
				fields={{
					rows: { label: "Rows", control: "file", accept: ["text/csv"] },
					screenshot: {
						label: "Screenshot",
						control: "file",
						accept: ["image/png"],
					},
				}}
			/>
		</div>
	),
} satisfies Meta;

const pick = (box: HTMLElement, file: File) => {
	const input = box.querySelector<HTMLInputElement>("input[type=file]");
	if (!input) throw new Error("no file input");
	const data = new DataTransfer();
	data.items.add(file);
	input.files = data.files;
	input.dispatchEvent(new Event("change", { bubbles: true }));
};

export const TextAndBase64: StoryObj = {
	play: async ({ canvas, canvasElement, userEvent }) => {
		sent.mockClear();
		await canvas.findByText("Rows");
		const inputs =
			canvasElement.querySelectorAll<HTMLElement>("input[type=file]");
		pick(
			inputs[0]?.parentElement as HTMLElement,
			new File(["a,b\n1,2"], "rows.csv", { type: "text/csv" }),
		);
		pick(
			inputs[1]?.parentElement as HTMLElement,
			new File([new Uint8Array([104, 105])], "shot.png", {
				type: "image/png",
			}),
		);
		await userEvent.click(canvas.getByRole("button", { name: "Save" }));
		await waitFor(() =>
			expect(sent).toHaveBeenCalledWith({
				workspaceId: "acme",
				rows: "a,b\n1,2",
				screenshot: "aGk=",
			}),
		);
	},
};
