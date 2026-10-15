import { ActionBar } from "@fcalell/plugin-react-ui/components/action-bar";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { onlineManager, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { expect, fn, screen, waitFor } from "storybook/test";

// An act pressed offline is refused at the press: nothing is sent, nothing
// queues for later, and the host says "No connection." under the act with no
// Retry. When the connection returns nothing fires on its own.
export default {
	title: "Behaviour/Act offline",
	parameters: { layout: "fullscreen" },
} satisfies Meta;

const sent = fn();
const other = fn();

function Bar() {
	const [done, setDone] = useState(0);
	const send = useMutation({
		mutationFn: async () => {
			sent();
			setDone((count) => count + 1);
		},
	});
	return (
		<>
			<ActionBar
				acts={[
					{ label: "Other", onAct: other },
					{ label: "Send", onAct: () => send.mutateAsync() },
				]}
			/>
			<output>{`ran ${done}`}</output>
		</>
	);
}

export const APressWhileOfflineIsRefusedAndNothingQueues: StoryObj = {
	render: () => <Bar />,
	play: async ({ canvas, userEvent }) => {
		sent.mockClear();
		other.mockClear();
		onlineManager.setOnline(false);
		try {
			const send = canvas.getByRole("button", { name: "Send" });
			await userEvent.click(send);
			await canvas.findByText("No connection.");
			await expect(canvas.queryByRole("button", { name: "Retry" })).toBeNull();
			await expect(screen.queryByText("That didn't go through.")).toBeNull();
			await expect(sent).not.toHaveBeenCalled();
			// Nothing is held: the sibling takes its press.
			const sibling = canvas.getByRole("button", { name: "Other" });
			await expect(sibling).not.toHaveAttribute("aria-disabled");
			await userEvent.click(sibling);
			await expect(other).toHaveBeenCalledTimes(1);
			// Going online fires nothing: the press was refused, not queued.
			onlineManager.setOnline(true);
			await new Promise((resolve) => setTimeout(resolve, 100));
			await expect(sent).not.toHaveBeenCalled();
			await expect(send).not.toHaveAttribute("aria-busy");
			await userEvent.click(send);
			await waitFor(() => expect(sent).toHaveBeenCalledTimes(1));
			await waitFor(() =>
				expect(canvas.queryByText("No connection.")).toBeNull(),
			);
		} finally {
			onlineManager.setOnline(true);
		}
	},
};
