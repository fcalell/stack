import { Button } from "@fcalell/plugin-react-ui/components/button";
import { FormField } from "@fcalell/plugin-react-ui/components/form-field";
import { Gate } from "@fcalell/plugin-react-ui/components/gate";
import { Input } from "@fcalell/plugin-react-ui/components/input";
import { MessageInput } from "@fcalell/plugin-react-ui/components/message-input";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Sheet } from "@fcalell/plugin-react-ui/components/sheet";
import { confirm } from "@fcalell/plugin-react-ui/lib/confirm";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, screen, waitFor } from "storybook/test";

function Page() {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	return (
		<>
			<button type="button" onClick={() => setOpen(true)}>
				Rename domain
			</button>
			<Sheet
				open={open}
				onClose={() => setOpen(false)}
				title="Rename domain"
				submit={{ label: "Save", onAct: () => setOpen(false) }}
			>
				<FormField label="Name">
					<Input value={name} onChange={setName} />
				</FormField>
			</Sheet>
		</>
	);
}

export default {
	title: "Behaviour/Sheet",
	render: () => <Page />,
} satisfies Meta;

// A modal sheet: focus moves into it on open, Escape closes it, and focus returns
// to its trigger.
export const Modal: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		const trigger = canvas.getByRole("button", { name: "Rename domain" });
		await userEvent.click(trigger);
		const dialog = await screen.findByRole("dialog", { name: "Rename domain" });
		await waitFor(() =>
			expect(dialog).toContainElement(document.activeElement as HTMLElement),
		);
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		await waitFor(() => expect(trigger).toHaveFocus());
	},
};

// A decision (`confirm()`, drawn as a sheet by the Gate or Shell hosting it)
// takes focus when it asks, Escape dismisses it, and focus returns to the act that
// asked.
export const Decision: StoryObj = {
	parameters: { layout: "fullscreen" },
	render: () => (
		<Gate title="Workspace">
			<Button
				act="secondary"
				label="Disconnect"
				onAct={() =>
					confirm({
						title: "Disconnect Acme?",
						sentence: "Its deploys stop until you connect it again.",
						act: { label: "Disconnect", destructive: true, onAct: () => {} },
					})
				}
			/>
		</Gate>
	),
	play: async ({ canvas, userEvent }) => {
		const trigger = canvas.getByRole("button", { name: "Disconnect" });
		await userEvent.click(trigger);
		const dialog = await screen.findByRole("alertdialog", {
			name: "Disconnect Acme?",
		});
		await waitFor(() =>
			expect(dialog).toContainElement(document.activeElement as HTMLElement),
		);
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
		await waitFor(() => expect(trigger).toHaveFocus());
	},
};

function Docked() {
	const [open, setOpen] = useState(true);
	const [text, setText] = useState("");
	return (
		<Place
			title="Assistant"
			foot={
				open ? (
					<Sheet
						open
						onClose={() => setOpen(false)}
						title="Question 1 of 1"
						submit={{ label: "Send", onAct: () => setOpen(false) }}
					>
						<p>Who hears about it?</p>
					</Sheet>
				) : (
					<MessageInput value={text} onChange={setText} onSend={() => {}} />
				)
			}
		/>
	);
}

// A Sheet docked in a Place's foot: Escape closes it and hands focus to the
// input that returns in its place.
export const DockedInFoot: StoryObj = {
	parameters: { layout: "fullscreen" },
	render: () => <Docked />,
	play: async ({ canvas, userEvent }) => {
		await canvas.findByRole("region", { name: "Question 1 of 1" });
		canvas.getByRole("button", { name: "Send" }).focus();
		await userEvent.keyboard("{Escape}");
		await waitFor(() =>
			expect(
				canvas.queryByRole("region", { name: "Question 1 of 1" }),
			).toBeNull(),
		);
		await waitFor(() => expect(canvas.getByRole("textbox")).toHaveFocus());
	},
};
