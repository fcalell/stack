import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Thread } from "@fcalell/plugin-react-ui/components/thread";
import { Place } from "@fcalell/plugin-react-ui/showcase/frames/place";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, waitFor } from "storybook/test";

// A message that arrives at the end of a log rises a pair as it fades in on
// `base`, whoever sent it; what the log held when it was first drawn does not,
// and the Latest act fades in rising on `fast` as the reader scrolls away and
// leaves the same way back (`motion.md` §3, stream).
interface Turn {
	id: string;
	author: "you" | "other";
	body: string;
}

const turn = (at: number): Turn => ({
	id: `m${at}`,
	author: at % 2 ? "you" : "other",
	body: `Message ${at} of the log, long enough to be a line of its own in the thread.`,
});

const HISTORY = Array.from({ length: 30 }, (_, at) => turn(at + 1));

const send: { add: () => void } = { add: () => {} };

function Chat() {
	const [items, setItems] = useState(HISTORY);
	send.add = () => setItems((now) => [...now, turn(now.length + 1)]);
	return (
		<div style={{ display: "flex", flexDirection: "column", height: 600 }}>
			<Place>
				<Pane fill title="Chat">
					<Thread
						items={items}
						message={{
							key: (each) => each.id,
							author: (each) => each.author,
							body: (each) => each.body,
						}}
					/>
				</Pane>
			</Place>
		</div>
	);
}

export default {
	title: "Behaviour/Stream motion",
	parameters: { layout: "fullscreen" },
	render: () => <Chat />,
} satisfies Meta;

const articleOf = (canvas: HTMLElement, text: string) =>
	canvas.querySelector(`article:has(p, div)`)
		? ([...canvas.querySelectorAll("article")].find((each) =>
				each.textContent?.includes(text),
			) as HTMLElement)
		: undefined;

// A message that arrives rises in on `base`, and one the log held at its first
// draw stands with no animation.
export const ArrivalRises: StoryObj = {
	play: async ({ canvasElement }) => {
		await waitFor(() =>
			expect(articleOf(canvasElement, "Message 30 ")).toBeTruthy(),
		);
		await expect(
			articleOf(canvasElement, "Message 30 ")?.getAnimations(),
		).toHaveLength(0);
		send.add();
		await waitFor(() =>
			expect(articleOf(canvasElement, "Message 31 ")).toBeTruthy(),
		);
		const rising = articleOf(canvasElement, "Message 31 ");
		const animation = rising?.getAnimations()[0] as CSSAnimation;
		await expect(animation.animationName).toBe("stream-in");
		await expect(Number(animation.effect?.getTiming().duration)).toBe(200);
	},
};

// The Latest act is absent while the reader is at the end, comes in rising on
// `fast` once they scroll away, and stays through its leaving fade.
export const LatestFadesAndRises: StoryObj = {
	play: async ({ canvasElement, canvas, userEvent }) => {
		await waitFor(() =>
			expect(articleOf(canvasElement, "Message 30 ")).toBeTruthy(),
		);
		await expect(canvas.queryByRole("button", { name: "Latest" })).toBeNull();
		const log = canvasElement.querySelector('[role="log"]') as HTMLElement;
		log.scrollTop = log.scrollHeight / 2;
		const act = await canvas.findByRole("button", { name: "Latest" });
		// The act, its line's stack, the hit, then the box that fades.
		const box = act.parentElement?.parentElement?.parentElement as HTMLElement;
		await waitFor(() => expect(getComputedStyle(box).opacity).toBe("1"));
		await userEvent.click(act);
		// It leaves: inert at once, still drawn while it fades, then gone.
		await waitFor(() => expect(box.inert).toBe(true));
		await waitFor(() => expect(canvasElement.contains(box)).toBe(false));
	},
};
