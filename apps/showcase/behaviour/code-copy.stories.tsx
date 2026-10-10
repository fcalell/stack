import { Code } from "@fcalell/plugin-react-ui/components/code";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { holdClock } from "./clock.ts";
import { focused } from "./support.ts";

// A copy act holds Copied for two seconds from the last copy, and a Code
// folded to its tail unfolds with the focus never leaving the page's
// elements. The copy timing runs on a held test clock.
const TEXT = ["one", "two", "three", "four", "five"].join("\n");

export default {
	title: "Behaviour/Code copy",
	render: () => (
		<div style={{ width: 320 }}>
			<Code text={TEXT} title="Deploy log" copy tail={2} />
		</div>
	),
} satisfies Meta;

// A clipboard that takes every write, so the copy needs no permission.
function takeClipboard() {
	const written: string[] = [];
	Object.defineProperty(navigator, "clipboard", {
		configurable: true,
		value: {
			writeText: async (text: string) => {
				written.push(text);
			},
		},
	});
	return written;
}

// Two copies a second apart keep Copied until two seconds after the second:
// still there at +1.9 s, gone by +2.1 s.
export const CopiedHoldsFromTheLastCopy: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		const written = takeClipboard();
		const clock = holdClock();
		try {
			const copy = () => canvas.getByRole("button", { name: /^Cop/ });
			await userEvent.click(copy());
			await clock.advance(0);
			await expect(copy()).toHaveAccessibleName("Copied");
			await clock.advance(1000);
			await expect(copy()).toHaveAccessibleName("Copied");
			await userEvent.click(copy());
			await clock.advance(0);
			await expect(written).toHaveLength(2);
			// 1.9 s after the second copy, 2.9 s after the first.
			await clock.advance(1900);
			await expect(copy()).toHaveAccessibleName("Copied");
			await clock.advance(200);
			await expect(copy()).toHaveAccessibleName(/^Copy/);
			await expect(copy()).not.toHaveAccessibleName("Copied");
		} finally {
			clock.stop();
		}
	},
};

// A single copy still clears at two seconds, not before.
export const CopiedClearsAfterTwoSeconds: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		takeClipboard();
		const clock = holdClock();
		try {
			const copy = () => canvas.getByRole("button", { name: /^Cop/ });
			await userEvent.click(copy());
			await clock.advance(0);
			await clock.advance(1900);
			await expect(copy()).toHaveAccessibleName("Copied");
			await clock.advance(200);
			await expect(copy()).not.toHaveAccessibleName("Copied");
		} finally {
			clock.stop();
		}
	},
};

// Unfolding with the keyboard moves focus from the fold to the text with
// nothing between: at every DOM change and every frame of the unfold the
// focus is on the fold or on the text, never on the page.
export const UnfoldKeepsFocus: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		const fold = canvas.getByRole("button", { name: /earlier/i });
		fold.focus();
		const text = canvas.getByRole("group", { name: "Deploy log" });
		const seen: Element[] = [];
		const sample = () => {
			if (document.activeElement) seen.push(document.activeElement);
		};
		const watch = new MutationObserver(sample);
		watch.observe(document.body, {
			subtree: true,
			childList: true,
			attributes: true,
		});
		let frames = true;
		const frame = () => {
			sample();
			if (frames) requestAnimationFrame(frame);
		};
		requestAnimationFrame(frame);
		try {
			await userEvent.keyboard("{Enter}");
			await new Promise((done) => setTimeout(done, 100));
		} finally {
			frames = false;
			watch.disconnect();
		}
		await expect(canvas.queryByRole("button", { name: /earlier/i })).toBeNull();
		await expect(focused()).toBe(text);
		await expect(seen.length).toBeGreaterThan(0);
		for (const element of seen) {
			await expect(element === fold || element === text).toBe(true);
		}
	},
};
