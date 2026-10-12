import { PendingBar } from "@fcalell/plugin-react-ui/components/pending-bar";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

// A pending bar's sentence wraps in a narrow column, never clipped: Stead's
// Knowledge page set "Refreshing the knowledge…" in a 311 px bar and lost its
// end to an ellipsis.
const SENTENCE = "Refreshing the knowledge of this repo from its docs";

export default {
	title: "Behaviour/Pending bar",
} satisfies Meta;

function Column(props: { width: number }) {
	return (
		<div style={{ width: props.width }}>
			<PendingBar
				sentence={SENTENCE}
				act={{ label: "Stop", onAct: () => {} }}
			/>
		</div>
	);
}

const box = (element: Element) => element.getBoundingClientRect();

export const WrapsInANarrowColumn: StoryObj = {
	render: () => <Column width={220} />,
	play: async ({ canvas }) => {
		const sentence = canvas.getByRole("status");
		const track = sentence.parentElement;
		if (!track) throw new Error("the sentence has no track");
		// The whole sentence is drawn: no ellipsis, nothing past its box, more than
		// one line, and the track holds it.
		await expect(sentence).toHaveTextContent(SENTENCE);
		await expect(getComputedStyle(sentence).textOverflow).not.toBe("ellipsis");
		await expect(sentence.scrollWidth).toBeLessThanOrEqual(
			sentence.clientWidth,
		);
		await expect(sentence.scrollHeight).toBeLessThanOrEqual(
			sentence.clientHeight + 1,
		);
		const line = Number.parseFloat(getComputedStyle(sentence).lineHeight);
		await expect(box(sentence).height).toBeGreaterThanOrEqual(2 * line - 1);
		await expect(box(sentence).top).toBeGreaterThanOrEqual(box(track).top);
		await expect(box(sentence).bottom).toBeLessThanOrEqual(box(track).bottom);
	},
};

// With room the sentence is one line and the track the control's height.
export const OneLineWithRoom: StoryObj = {
	render: () => <Column width={640} />,
	play: async ({ canvas }) => {
		const sentence = canvas.getByRole("status");
		const track = sentence.parentElement;
		if (!track) throw new Error("the sentence has no track");
		const line = Number.parseFloat(getComputedStyle(sentence).lineHeight);
		await expect(box(sentence).height).toBeLessThan(1.5 * line);
		const probe = document.createElement("div");
		probe.className = "min-h-control";
		document.body.append(probe);
		const control = box(probe).height;
		probe.remove();
		await expect(Math.abs(box(track).height - control)).toBeLessThan(1);
	},
};
