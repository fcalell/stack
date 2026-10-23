import { Banner } from "@fcalell/plugin-react-ui/components/banner";
import { Sheet } from "@fcalell/plugin-react-ui/components/sheet";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { onlineManager, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { expect, fn, screen, waitFor } from "storybook/test";

// An act pressed offline is refused at the press: nothing is sent, nothing
// queues for later, and the host says the generic "That didn't go through."
// in the sheet's line with no Retry. The connection's own sentence is the offline
// banner's, drawn once. When the connection returns nothing fires on its own.
export default {
	title: "Behaviour/Act offline",
	parameters: { layout: "fullscreen" },
} satisfies Meta;

const sent = fn();
const other = fn();

function Host() {
	const [done, setDone] = useState(0);
	const send = useMutation({
		mutationFn: async () => {
			sent();
			setDone((count) => count + 1);
		},
	});
	return (
		<>
			<Banner tone="attention" sentence="You are offline." />
			<Sheet
				open
				onClose={other}
				title="Send"
				submit={{ label: "Send", onAct: () => send.mutateAsync() }}
			/>
			<output>{`ran ${done}`}</output>
		</>
	);
}

export const APressWhileOfflineIsRefusedAndNothingQueues: StoryObj = {
	render: () => <Host />,
	play: async ({ canvas, userEvent }) => {
		sent.mockClear();
		other.mockClear();
		onlineManager.setOnline(false);
		try {
			const send = await screen.findByRole("button", { name: "Send" });
			await userEvent.click(send);
			await screen.findByText("That didn't go through.");
			await expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
			await expect(screen.queryByText("No connection.")).toBeNull();
			await expect(canvas.getAllByText("You are offline.")).toHaveLength(1);
			await expect(sent).not.toHaveBeenCalled();
			// Nothing is held: the sibling takes its press.
			const sibling = screen.getByRole("button", { name: "Cancel" });
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
				expect(screen.queryByText("That didn't go through.")).toBeNull(),
			);
		} finally {
			onlineManager.setOnline(true);
		}
	},
};
