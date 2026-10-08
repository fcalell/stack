import { MessageInput } from "@fcalell/plugin-react-ui/components/message-input";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn } from "storybook/test";

const onSend = fn();

function Compose() {
	const [value, setValue] = useState("Why did the deploy fail");
	return (
		<MessageInput
			value={value}
			onChange={setValue}
			onAttach={() => {}}
			placeholder="Reply"
			onSend={onSend}
		/>
	);
}

export default {
	title: "Behaviour/MessageInput",
	render: () => <Compose />,
	beforeEach: () => onSend.mockClear(),
} satisfies Meta;

// A press anywhere in the box that is no act (its padding, the foot row's
// empty part) puts the focus in the text, the caret at its end; a press on an
// act does what it did.
export const BoxFocusesText: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		const text = canvas.getByRole("textbox");
		if (!(text instanceof HTMLTextAreaElement))
			throw new Error("the text is not drawn");
		const box = text.closest("div[class*='border']");
		if (!(box instanceof HTMLElement)) throw new Error("the box is not drawn");
		const edge = box.getBoundingClientRect();
		const press = async (x: number, y: number) => {
			const target = document.elementFromPoint(x, y);
			if (!target) throw new Error("nothing at the point");
			await userEvent.click(target);
		};
		await press(edge.left + 2, edge.top + 2);
		await expect(text).toHaveFocus();
		await expect(text.selectionStart).toBe("Why did the deploy fail".length);
		text.blur();
		const foot = canvas.getByRole("button", { name: "Send" }).parentElement;
		const gap = foot?.parentElement?.getBoundingClientRect();
		if (!gap) throw new Error("the foot is not drawn");
		await press(gap.left + gap.width / 2, gap.top + gap.height / 2);
		await expect(text).toHaveFocus();
		await userEvent.click(canvas.getByRole("button", { name: "Send" }));
		await expect(onSend).toHaveBeenCalledOnce();
	},
};

// On touch Attach, Stop and Send are three icon acts, so the field keeps the
// rest of a 292 px frame beside them (a labelled Send left it 77 px).
export const FieldKeepsRoomAtANarrowPhone: StoryObj = {
	tags: ["touch"],
	globals: { density: "touch" },
	render: () => (
		<div style={{ width: 292 }}>
			<MessageInput
				value=""
				onChange={() => {}}
				onAttach={() => {}}
				placeholder="Reply"
				working
				onSend={onSend}
				onStop={() => {}}
				notice={{ sentence: "A message sent now waits for the answer." }}
			/>
		</div>
	),
	play: async ({ canvas }) => {
		const field = await canvas.findByRole("textbox", { name: "Message" });
		const [attach, stop, send] = ["Attach", "Stop", "Send"].map((name) =>
			canvas.getByRole("button", { name }).getBoundingClientRect(),
		);
		await expect(stop?.width).toBe(attach?.width);
		await expect(send?.width).toBe(attach?.width);
		const box = field.closest("div[class*='border']");
		if (!(box instanceof HTMLElement))
			throw new Error("the field is not drawn");
		await expect(box.getBoundingClientRect().width).toBeGreaterThanOrEqual(120);
	},
};
