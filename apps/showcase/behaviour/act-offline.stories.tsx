import { ActionBar } from "@fcalell/plugin-react-ui/components/action-bar";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { onlineManager, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { expect, fn, screen, waitFor } from "storybook/test";

// An act is never blocked by the connection: a press while offline runs, its
// mutation waits for the network, and the host says so in its line and holds
// nothing. When the connection returns the mutation runs, and the act is ready.
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

export const APressWhileOfflineWaitsAndRunsOnReconnect: StoryObj = {
	render: () => <Bar />,
	play: async ({ canvas, userEvent }) => {
		sent.mockClear();
		other.mockClear();
		onlineManager.setOnline(false);
		try {
			const send = canvas.getByRole("button", { name: "Send" });
			await userEvent.click(send);
			await canvas.findByText("Waiting for a connection.");
			await expect(sent).not.toHaveBeenCalled();
			// Nothing is held: the sibling takes its press while the act waits.
			const sibling = canvas.getByRole("button", { name: "Other" });
			await expect(sibling).not.toHaveAttribute("aria-disabled");
			await userEvent.click(sibling);
			await expect(other).toHaveBeenCalledTimes(1);
			onlineManager.setOnline(true);
			await waitFor(() => expect(sent).toHaveBeenCalledTimes(1));
			await waitFor(() =>
				expect(canvas.queryByText("Waiting for a connection.")).toBeNull(),
			);
			await waitFor(() => expect(send).not.toHaveAttribute("aria-busy"));
			await expect(screen.queryByText("That didn't go through.")).toBeNull();
		} finally {
			onlineManager.setOnline(true);
		}
	},
};
