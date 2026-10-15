import { FileInput } from "@fcalell/plugin-react-ui/components/file-input";
import { FormField } from "@fcalell/plugin-react-ui/components/form-field";
import type { PickedFile } from "@fcalell/ui-core/descriptors";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, waitFor } from "storybook/test";

// A file of a type the box does not take is refused in the box's own line,
// under it and not in the field's; the next pick clears it, and the refused
// file never reaches `onChange`.
export default { title: "Behaviour/FileInput" } satisfies Meta;

function Import() {
	const [file, setFile] = useState<PickedFile | null>(null);
	const box = (
		<FileInput value={file} onChange={setFile} accept={["text/csv"]} />
	);
	return (
		<div className="w-sheet max-w-full">
			<FormField label="Rows" description="A CSV of the rows to import.">
				{box}
			</FormField>
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
	await expect(canvas.getByText("rows.csv")).toBeVisible();
}

export const AWrongTypeIsRefusedUnderItsBox: StoryObj = {
	render: () => <Import />,
	play: async ({ canvas }) => refusesUnderItsBox(canvas),
};
