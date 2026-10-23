import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { sheetOf } from "@fcalell/plugin-react-ui/lib/act";
import { Place } from "@fcalell/plugin-react-ui/showcase/frames/place";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { expect, fn, screen, waitFor, within } from "storybook/test";
import { orpc } from "../src/app/lib/api.ts";
import { through } from "./support.ts";

// An act's sheet draws from the act's current props on every render, and its
// form's `onDone` hears the procedure's typed output.
export default {
	title: "Behaviour/Act sheet",
	parameters: { layout: "fullscreen" },
} satisfies Meta;

const heard = fn();
const made = through(orpc.forms.made, async (input) => ({
	id: `made-${input.name}`,
}));

function Keys() {
	// What the sheet's title reads lands after the press, as a read does.
	const [listed, setListed] = useState(false);
	useEffect(() => {
		const timer = setTimeout(() => setListed(true), 400);
		return () => clearTimeout(timer);
	}, []);
	return (
		<Place>
			<Pane
				title="Keys"
				actions={[
					{
						icon: "Plus",
						label: "New key",
						sheet: sheetOf({
							title: listed ? "New key, listed" : "New key, listing",
							form: {
								act: made,
								given: { workspaceId: "acme" },
								fields: { name: { label: "Name" } },
								// `made.id` is typed: the procedure answers `{ id: string }`.
								onDone: (output) => heard(output.id),
							},
						}),
					},
				]}
			/>
		</Place>
	);
}

// The sheet opened at the press follows its act: a render while it is open
// changes its title, with no flag in the screen holding the props of the press.
export const TheSheetReadsItsActLive: StoryObj = {
	render: () => <Keys />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(
			await canvas.findByRole("button", { name: "New key" }),
		);
		const sheet = within(await screen.findByRole("dialog"));
		await sheet.findByText("New key, listing");
		await sheet.findByText("New key, listed");
	},
};

// The form's `onDone` hears the output typed by its procedure.
export const OnDoneHearsTheTypedOutput: StoryObj = {
	render: () => <Keys />,
	play: async ({ canvas, userEvent }) => {
		heard.mockClear();
		await userEvent.click(
			await canvas.findByRole("button", { name: "New key" }),
		);
		const sheet = within(await screen.findByRole("dialog"));
		await userEvent.type(await sheet.findByRole("textbox"), "deploy");
		await userEvent.click(sheet.getByRole("button", { name: "Save" }));
		await waitFor(() => expect(heard).toHaveBeenCalledWith("made-deploy"));
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
	},
};
