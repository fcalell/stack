import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Place } from "@fcalell/plugin-react-ui/showcase/frames/place";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, waitFor } from "storybook/test";

const noop = () => {};

export default { title: "Behaviour/Pane record facts" } satisfies Meta;

function must<T extends Element>(el: T | null | undefined): T {
	if (!el) throw new Error("the element is not drawn");
	return el;
}

// A head whose second fact joins when the button beside it is pressed: the
// thread is marked and "Read outside content" opens its sheet.
function Joins() {
	const [joined, join] = useState(false);
	return (
		<div
			data-joins=""
			style={{
				width: 390,
				height: 600,
				display: "flex",
				flexDirection: "column",
			}}
		>
			<Place>
				<Pane
					title="Triage the inbox"
					record={{
						within: "Inbox",
						facts: [
							{ status: "running", label: "Working" },
							...(joined
								? [{ label: "Read outside content", onOpen: noop }]
								: []),
						],
					}}
				/>
			</Place>
			<button type="button" onClick={() => join(true)}>
				Join
			</button>
		</div>
	);
}

// The facts line holds the meta line's height whichever kinds of fact it
// carries, so a fact that opens joining it moves nothing under the head.
export const FactJoins: StoryObj = {
	render: () => <Joins />,
	play: async ({ canvas, canvasElement, userEvent }) => {
		const head = must(canvasElement.querySelector(".flex-wrap"));
		const before = head.getBoundingClientRect().height;
		await userEvent.click(canvas.getByRole("button", { name: "Join" }));
		// A fact that arrives fades in on `base`: it is seen once the fade has run.
		await waitFor(() =>
			expect(canvas.getByRole("button", { name: /outside/i })).toBeVisible(),
		);
		await expect(head.getBoundingClientRect().height).toBe(before);
	},
};
