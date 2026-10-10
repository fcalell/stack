import { ItemHeader } from "@fcalell/plugin-react-ui/components/item-header";
import { List } from "@fcalell/plugin-react-ui/components/list";
import { MessageInput } from "@fcalell/plugin-react-ui/components/message-input";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Split } from "@fcalell/plugin-react-ui/components/split";
import { Thread } from "@fcalell/plugin-react-ui/components/thread";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

const noop = () => {};

const TURNS = [
	{ id: "a", author: "you", body: "Why did the last deploy of api fail?" },
	{
		id: "b",
		author: "other",
		body: "The migration `0042_add_invoices` timed out, so the release stopped before it served traffic.",
	},
] as const;

const NAMES = ["Deploys", "Invoices", "Billing"];
const ROWS = {
	key: (name: string) => name,
	title: (name: string) => name,
};

export default { title: "Behaviour/Thread fill" } satisfies Meta;

function Conversation() {
	return (
		<div style={{ width: 1280, height: 720, display: "flex" }}>
			<Place title="Chats" bleed>
				<Split
					list={<List items={NAMES} row={ROWS} />}
					main={
						<>
							<ItemHeader title="Why did the last deploy of api fail?" />
							<Thread
								items={TURNS}
								message={{
									key: (turn) => turn.id,
									author: (turn) => turn.author,
									body: (turn) => turn.body,
								}}
								foot={
									<MessageInput
										value=""
										onChange={noop}
										placeholder="Reply"
										onSend={noop}
									/>
								}
							/>
						</>
					}
				/>
			</Place>
		</div>
	);
}

const must = <T,>(value: T | null | undefined): T => {
	if (value === null || value === undefined)
		throw new Error("the element is not drawn");
	return value;
};

// A Thread filling a Split's main: the header and the messages start at the
// log's inset, the messages at the measure, and the input spans the main
// within the same inset.
export const FilledThreadStandsAtStart1280: StoryObj = {
	parameters: { layout: "fullscreen" },
	render: () => <Conversation />,
	play: async ({ canvas }) => {
		const log = await canvas.findByRole("log");
		const field = canvas.getByRole("textbox", { name: "Message" });
		const input = must(field.closest("[class*='w-full']"));
		const heading = canvas.getByRole("heading");
		const inset = log.getBoundingClientRect();
		const probe = document.createElement("div");
		probe.className = "px-page w-measure";
		log.append(probe);
		const { paddingLeft, width } = getComputedStyle(probe);
		probe.remove();
		const page = Number.parseFloat(paddingLeft);
		const start = inset.left + page;
		for (const message of log.querySelectorAll("article")) {
			const box = message.getBoundingClientRect();
			await expect(box.left).toBeCloseTo(start, 0);
			await expect(box.width).toBeLessThanOrEqual(Number.parseFloat(width));
		}
		await expect(heading.getBoundingClientRect().left).toBeCloseTo(start, 0);
		const box = input.getBoundingClientRect();
		await expect(box.left).toBeCloseTo(start, 0);
		await expect(box.right).toBeCloseTo(inset.right - page, 0);
	},
};
