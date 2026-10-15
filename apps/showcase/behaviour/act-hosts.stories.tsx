import { ActionBar } from "@fcalell/plugin-react-ui/components/action-bar";
import { Button } from "@fcalell/plugin-react-ui/components/button";
import { Form } from "@fcalell/plugin-react-ui/components/form";
import { FormField } from "@fcalell/plugin-react-ui/components/form-field";
import { Gate } from "@fcalell/plugin-react-ui/components/gate";
import { Input } from "@fcalell/plugin-react-ui/components/input";
import { Sheet } from "@fcalell/plugin-react-ui/components/sheet";
import { confirm } from "@fcalell/plugin-react-ui/lib/confirm";
import { readsAt } from "@fcalell/plugin-react-ui/showcase/waiting";
import { ORPCError } from "@orpc/client";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { onlineManager } from "@tanstack/react-query";
import { useState } from "react";
import { expect, fn, screen, waitFor, within } from "storybook/test";

const noop = () => {};

// A host runs the acts it draws: the act that pends is inert and busy, the
// others stand inert beside it, and a rejection stands in the host's line.
export default {
	title: "Behaviour/Act hosts",
	parameters: { layout: "fullscreen" },
} satisfies Meta;

let release: () => void = () => {};
const slow = () =>
	new Promise<void>((resolve) => {
		release = resolve;
	});

const cancel = fn();

// One act pends at a time: while the filled act runs, the bar's other act takes
// no press, and it is ready again the moment the run settles.
export const ASiblingIsInertWhileOneActPends: StoryObj = {
	render: () => (
		<ActionBar
			acts={[
				{ label: "Cancel", onAct: cancel },
				{ label: "Save", onAct: slow },
			]}
		/>
	),
	play: async ({ canvas, userEvent }) => {
		cancel.mockClear();
		const other = canvas.getByRole("button", { name: "Cancel" });
		const save = canvas.getByRole("button", { name: "Save" });
		await userEvent.click(save);
		await expect(save).toHaveAttribute("aria-busy", "true");
		await expect(other).toHaveAttribute("aria-disabled", "true");
		await userEvent.click(other);
		await expect(cancel).not.toHaveBeenCalled();
		release();
		await waitFor(() => expect(save).not.toHaveAttribute("aria-busy"));
		await expect(other).not.toHaveAttribute("aria-disabled");
		await userEvent.click(other);
		await expect(cancel).toHaveBeenCalledTimes(1);
	},
};

const refuse = () =>
	Promise.reject(
		new ORPCError("BAD_REQUEST", { message: "the name is taken" }),
	);

// A rejection is the bar's own sentence in its kept line under the acts; the
// act stays where it was and is ready again.
export const ARejectionStandsInTheBarsLine: StoryObj = {
	render: () => (
		<ActionBar
			acts={[
				{ label: "Cancel", onAct: noop },
				{ label: "Save", onAct: refuse },
			]}
		/>
	),
	play: async ({ canvas, userEvent }) => {
		const save = canvas.getByRole("button", { name: "Save" });
		const top = save.getBoundingClientRect().top;
		await userEvent.click(save);
		await canvas.findByText("The name is taken.");
		await expect(save).not.toHaveAttribute("aria-busy");
		await expect(save.getBoundingClientRect().top).toBe(top);
	},
};

// A decision whose act rejects stays open: the sentence in the sheet's bar, the
// act ready again. An act that returns nothing closes it at once.
export const ARejectedConfirmStaysOpenWithItsLine: StoryObj = {
	render: () => (
		<Gate title="Workspace">
			<Button
				act="secondary"
				label="Disconnect"
				onAct={() =>
					confirm({
						title: "Disconnect Acme?",
						sentence: "Its deploys stop until you connect it again.",
						act: {
							label: "Disconnect now",
							destructive: true,
							onAct: refuse,
						},
					})
				}
			/>
			<Button
				act="secondary"
				label="Archive"
				onAct={() =>
					confirm({
						title: "Archive Acme?",
						act: { label: "Archive now", onAct: noop },
					})
				}
			/>
		</Gate>
	),
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Disconnect" }));
		const dialog = await screen.findByRole("alertdialog", {
			name: "Disconnect Acme?",
		});
		const act = await screen.findByRole("button", { name: "Disconnect now" });
		await userEvent.click(act);
		await screen.findByText("The name is taken.");
		await expect(dialog).toBeVisible();
		await expect(act).not.toHaveAttribute("aria-busy");
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
		await userEvent.click(canvas.getByRole("button", { name: "Archive" }));
		await userEvent.click(
			await screen.findByRole("button", { name: "Archive now" }),
		);
		await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
	},
};

function Held() {
	const [open, setOpen] = useState(true);
	return (
		<Sheet
			open={open}
			onClose={() => setOpen(false)}
			title="Rename domain"
			submit={{ label: "Save", onAct: slow }}
		>
			<FormField label="Name">
				<Input value="acme" onChange={noop} />
			</FormField>
		</Sheet>
	);
}

// While a sheet's act runs it cannot be dismissed (Escape, its close act): the
// work is not abandoned. Once it settles the sheet closes as usual.
export const ASheetCannotBeDismissedWhilePending: StoryObj = {
	render: () => <Held />,
	play: async ({ userEvent }) => {
		const dialog = await screen.findByRole("dialog", { name: "Rename domain" });
		await userEvent.click(screen.getByRole("button", { name: "Save" }));
		await waitFor(() =>
			expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute(
				"aria-busy",
				"true",
			),
		);
		await userEvent.keyboard("{Escape}");
		await expect(dialog).toBeVisible();
		await expect(screen.getByRole("button", { name: "Close" })).toHaveAttribute(
			"aria-disabled",
			"true",
		);
		release();
		await waitFor(() =>
			expect(screen.getByRole("button", { name: "Save" })).not.toHaveAttribute(
				"aria-busy",
			),
		);
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
	},
};

// An act that waits for a connection holds nothing: the sheet says so in its
// line and can still be dismissed.
export const APausedSheetCanBeDismissed: StoryObj = {
	render: () => <Held />,
	play: async ({ userEvent }) => {
		onlineManager.setOnline(false);
		try {
			await screen.findByRole("dialog", { name: "Rename domain" });
			await userEvent.click(screen.getByRole("button", { name: "Save" }));
			await screen.findByText("Waiting for a connection.");
			await userEvent.keyboard("{Escape}");
			await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		} finally {
			onlineManager.setOnline(true);
		}
	},
};

// A form's bar follows the form's own read and nothing else. It paints, inert,
// while that read waits, and stands blocked with the failed sentence once it
// failed; a group's read is the group's, so a group still to land, or one that
// failed, leaves the bar live.
const own = readsAt("act-hosts/bar/own");
const groups = readsAt("act-hosts/bar/groups");
const saved = fn();

const bar = (label: string) => ({ acts: [{ label, onAct: saved }] });
const name = (
	<FormField label="Name">
		<Input value="Acme" onChange={noop} />
	</FormField>
);

export const AFormsBarPaintsWhileItsOwnReadWaits: StoryObj = {
	render: () => (
		<div className="flex flex-col gap-sections w-sheet max-w-full">
			<Form bar={bar("Save waiting")} read={own.waiting}>
				{name}
			</Form>
			<Form bar={bar("Save loaded")}>{name}</Form>
		</div>
	),
	play: async ({ canvas }) => {
		const waiting = canvas.getByText("Save waiting").closest("button");
		const loaded = canvas.getByText("Save loaded").closest("button");
		await expect(waiting).toHaveAttribute("inert");
		await expect(loaded).not.toHaveAttribute("inert");
	},
};

export const AGroupsReadNeverTouchesTheBar: StoryObj = {
	render: () => (
		<div className="flex flex-col gap-sections w-sheet max-w-full">
			<div data-testid="waiting">
				<Form
					bar={bar("Save waiting group")}
					groups={[
						{ title: "General", fields: name },
						{
							title: "Email",
							read: groups.waiting,
							fields: (
								<FormField label="Contact">
									<Input value="ana@acme.dev" onChange={noop} />
								</FormField>
							),
						},
					]}
				/>
			</div>
			<div data-testid="failed">
				<Form
					bar={bar("Save failed group")}
					groups={[
						{ title: "General", fields: name },
						{
							title: "Devices",
							read: groups.failing,
							fields: (
								<FormField label="Phone">
									<Input value="Pixel" onChange={noop} />
								</FormField>
							),
						},
					]}
				/>
			</div>
		</div>
	),
	play: async ({ canvas, userEvent }) => {
		saved.mockClear();
		const waiting = canvas.getByText("Save waiting group").closest("button");
		await expect(waiting).not.toHaveAttribute("inert");
		// The Devices group fails in its own place; Save stays live.
		const failed = within(await canvas.findByTestId("failed"));
		await failed.findByText("This didn't load.");
		const save = failed.getByRole("button", { name: "Save failed group" });
		await expect(save).not.toHaveAttribute("inert");
		await expect(save).not.toHaveAttribute("aria-disabled", "true");
		await userEvent.click(save);
		await expect(saved).toHaveBeenCalledTimes(1);
	},
};

export const AFormsBarStandsBlockedUnderItsFailedRead: StoryObj = {
	render: () => (
		<div className="w-sheet max-w-full">
			<Form bar={bar("Save failed")} read={own.failing}>
				{name}
			</Form>
		</div>
	),
	play: async ({ canvas, userEvent }) => {
		saved.mockClear();
		const save = await canvas.findByRole("button", { name: "Save failed" });
		await expect(save).toHaveAttribute("aria-disabled", "true");
		await expect(save).not.toHaveAttribute("inert");
		await userEvent.click(save);
		await expect(saved).not.toHaveBeenCalled();
		// The form's failed form, and the bar's reason for the blocked Save.
		await expect(canvas.getAllByText("This didn't load.").length).toBe(2);
	},
};
