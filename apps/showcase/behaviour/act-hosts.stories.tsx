import { Button } from "@fcalell/plugin-react-ui/components/button";
import { Form } from "@fcalell/plugin-react-ui/components/form";
import { Gate } from "@fcalell/plugin-react-ui/components/gate";
import { Input } from "@fcalell/plugin-react-ui/components/input";
import { Sheet } from "@fcalell/plugin-react-ui/components/sheet";
import { confirm } from "@fcalell/plugin-react-ui/lib/confirm";
import { readsAt } from "@fcalell/plugin-react-ui/showcase/waiting";
import { ORPCError } from "@orpc/client";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { onlineManager, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { expect, fn, screen, waitFor } from "storybook/test";
import { orpc } from "../src/app/lib/api.ts";
import { through } from "./support.ts";

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

// A decision to disconnect, asked from a button: its bar is the Cancel and the
// act, whose run is `onAct`.
function Ask(props: { onAct: () => unknown }) {
	return (
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
							onAct: props.onAct,
						},
					})
				}
			/>
		</Gate>
	);
}

// One act pends at a time: while the decision's act runs, its Cancel takes no
// press, and the decision closes the moment the run settles.
export const ASiblingIsInertWhileOneActPends: StoryObj = {
	render: () => <Ask onAct={slow} />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Disconnect" }));
		const dialog = await screen.findByRole("alertdialog", {
			name: "Disconnect Acme?",
		});
		const act = await screen.findByRole("button", { name: "Disconnect now" });
		const other = screen.getByRole("button", { name: "Cancel" });
		await userEvent.click(act);
		await expect(act).toHaveAttribute("aria-busy", "true");
		await expect(other).toHaveAttribute("aria-disabled", "true");
		await userEvent.click(other);
		await expect(dialog).toBeVisible();
		release();
		await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
	},
};

const refuse = () =>
	Promise.reject(
		new ORPCError("BAD_REQUEST", { message: "the name is taken" }),
	);

// A rejection is the bar's own sentence in its kept line under the acts; the
// act stays where it was and is ready again.
export const ARejectionStandsInTheBarsLine: StoryObj = {
	render: () => <Ask onAct={refuse} />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Disconnect" }));
		const act = await screen.findByRole("button", { name: "Disconnect now" });
		const top = act.getBoundingClientRect().top;
		await userEvent.click(act);
		await screen.findByText("The name is taken.");
		await expect(act).not.toHaveAttribute("aria-busy");
		await expect(act.getBoundingClientRect().top).toBe(top);
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
						sentence: "Acme leaves the list until you restore it.",
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
			<Input value="acme" onChange={noop} />
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

function HeldMutation() {
	const [open, setOpen] = useState(true);
	const save = useMutation({ mutationFn: async () => {} });
	return (
		<Sheet
			open={open}
			onClose={() => setOpen(false)}
			title="Rename domain"
			submit={{ label: "Save", onAct: () => save.mutateAsync() }}
		>
			<Input value="acme" onChange={noop} />
		</Sheet>
	);
}

// An act refused for the connection holds nothing: the sheet says "That didn't
// go through." in its line and can still be dismissed.
export const AnOfflineSheetCanBeDismissed: StoryObj = {
	render: () => <HeldMutation />,
	play: async ({ userEvent }) => {
		onlineManager.setOnline(false);
		try {
			await screen.findByRole("dialog", { name: "Rename domain" });
			await userEvent.click(screen.getByRole("button", { name: "Save" }));
			await screen.findByText("That didn't go through.");
			await userEvent.keyboard("{Escape}");
			await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		} finally {
			onlineManager.setOnline(true);
		}
	},
};

// A form's bar follows the form's own read and nothing else. It paints, inert,
// while that read waits, and stands blocked with the failed sentence once it
// failed.
const own = readsAt("act-hosts/bar/own");
const saved = fn();
const rename = through(orpc.forms.rename, async (input) => {
	saved(input);
	return { id: "workspace-1" };
});

const name = { name: { label: "Name" } };
const given = { workspaceId: "acme" };

export const AFormsBarPaintsWhileItsOwnReadWaits: StoryObj = {
	render: () => (
		<div className="flex flex-col gap-section w-sheet max-w-full">
			<Form
				act={rename}
				given={given}
				fields={name}
				submit={{ label: "Save waiting" }}
				read={own.waiting}
			/>
			<Form
				act={rename}
				given={given}
				fields={name}
				values={{ name: "Acme" }}
				submit={{ label: "Save loaded" }}
			/>
		</div>
	),
	play: async ({ canvas }) => {
		const waiting = canvas.getByText("Save waiting").closest("button");
		const loaded = canvas.getByText("Save loaded").closest("button");
		await expect(waiting).toHaveAttribute("inert");
		await expect(loaded).not.toHaveAttribute("inert");
	},
};

export const AFormsBarStandsBlockedUnderItsFailedRead: StoryObj = {
	render: () => (
		<div className="w-sheet max-w-full">
			<Form
				act={rename}
				given={given}
				fields={name}
				submit={{ label: "Save failed" }}
				read={own.failing}
			/>
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
