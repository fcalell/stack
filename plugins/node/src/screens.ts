import { channelAnswer, currentStory } from "@fcalell/plugin-screens/channels";
import { ws } from "@fcalell/plugin-screens/msw";
import type { ServerFrame } from "./ws/index.ts";

// What the screens workbench contributes for the app's socket: the server's
// `/ws`, answering each `sub` with the snapshot the story's fixtures give that
// channel, as the frame the client decodes. Lives under its own subpath because
// it imports MSW through the screens package, which only the workbench's
// browser loads.
const socket = ws.link("*/ws");

export default [
	// The error story's server is down: it closes the socket before it opens, as a
	// refused connection does. A socket that opened and closed on the subscribe
	// would resume the paused reads at every backoff retry, so they never settle.
	socket.addEventListener("connection", ({ client }) => {
		if (currentStory().state === "error") return client.close(1011, "error");
		client.addEventListener("message", async (event) => {
			if (typeof event.data !== "string") return;
			let frame: { t?: unknown; ch?: unknown };
			try {
				frame = JSON.parse(event.data);
			} catch {
				return;
			}
			if (frame.t !== "sub" || typeof frame.ch !== "string") return;
			const { channels, params, state } = currentStory();
			const answer = await channelAnswer(frame.ch, channels, params, state);
			if (answer.close) client.close(1011, "error");
			if (!answer.send) return;
			const reply: ServerFrame = answer.send;
			client.send(JSON.stringify(reply));
		});
	}),
];
