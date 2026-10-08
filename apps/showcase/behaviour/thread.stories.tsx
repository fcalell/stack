import { MessageInput } from "@fcalell/plugin-react-ui/components/message-input";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Thread } from "@fcalell/plugin-react-ui/components/thread";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, waitFor } from "storybook/test";

interface Turn {
	id: string;
	author: "you" | "other";
	body: string;
}

const TURNS: Turn[] = Array.from({ length: 14 }, (_, at) => ({
	id: `t${at}`,
	author: at % 2 === 0 ? "you" : "other",
	body: `Turn ${at + 1}: the deploy of api failed on the migration, and the log says why.`,
}));

const REPLY: Turn = {
	id: "reply",
	author: "other",
	body: "The streamed reply, standing where the waiting one stood.",
};

// A conversation whose last turn is the operator's, a reply on its way.
function Replying({ height }: { height: number }) {
	const [items, setItems] = useState(TURNS);
	const [replying, setReplying] = useState(true);
	const [text, setText] = useState("");
	return (
		<div style={{ display: "flex", flexDirection: "column", height }}>
			<Place title="Assistant">
				<Thread
					items={items}
					replying={replying}
					message={{
						key: (turn) => turn.id,
						author: (turn) => turn.author,
						body: (turn) => turn.body,
					}}
					foot={
						<MessageInput value={text} onChange={setText} onSend={() => {}} />
					}
				/>
			</Place>
			<button
				type="button"
				onClick={() => {
					setItems((last) => [...last, REPLY]);
					setReplying(false);
				}}
			>
				Stream the reply
			</button>
		</div>
	);
}

export default {
	title: "Behaviour/Thread",
} satisfies Meta;

const waiting = (log: HTMLElement) => log.querySelectorAll("[aria-busy]");

function atEnd(log: HTMLElement) {
	return log.scrollHeight - log.scrollTop - log.clientHeight <= 1;
}

// The log ends on one waiting message of the other author, inside the log and
// pinned to: the reader at the end sees it.
const endsOnWaiting: NonNullable<StoryObj["play"]> = async ({ canvas }) => {
	const log = await canvas.findByRole("log");
	await waitFor(() => expect(waiting(log)).toHaveLength(1));
	const last = log.querySelectorAll("article");
	const reply = last[last.length - 1];
	expect(reply?.hasAttribute("aria-busy")).toBe(true);
	expect(log.scrollHeight).toBeGreaterThan(log.clientHeight);
	await waitFor(() => expect(atEnd(log)).toBe(true));
	const box = reply?.getBoundingClientRect();
	expect(box?.bottom).toBeLessThanOrEqual(
		log.getBoundingClientRect().bottom + 1,
	);
	// The docked foot is a region of the page: a hairline over the log, no shadow.
	const foot = log.parentElement?.nextElementSibling;
	if (!foot) throw new Error("the log has no foot");
	expect(getComputedStyle(foot).boxShadow).toBe("none");
	expect(
		Number.parseFloat(getComputedStyle(foot).borderTopWidth),
	).toBeGreaterThan(0);
};

export const EndsOnWaitingReply1280: StoryObj = {
	parameters: { layout: "fullscreen" },
	render: () => <Replying height={720} />,
	play: endsOnWaiting,
};

export const EndsOnWaitingReply390: StoryObj = {
	tags: ["touch"],
	globals: { density: "touch" },
	parameters: { layout: "fullscreen" },
	render: () => (
		<div style={{ width: 390 }}>
			<Replying height={844} />
		</div>
	),
	play: endsOnWaiting,
};

// The streamed reply replaces the waiting one in place, and the log stays at
// its end.
export const StreamedReplyReplacesIt: StoryObj = {
	parameters: { layout: "fullscreen" },
	render: () => <Replying height={720} />,
	play: async (context) => {
		await endsOnWaiting(context);
		const { canvas, userEvent } = context;
		const log = canvas.getByRole("log");
		await userEvent.click(
			canvas.getByRole("button", { name: "Stream the reply" }),
		);
		await canvas.findByText(REPLY.body);
		expect(waiting(log)).toHaveLength(0);
		const turns = log.querySelectorAll("article");
		expect(turns[turns.length - 1]?.textContent).toContain(REPLY.body);
		await waitFor(() => expect(atEnd(log)).toBe(true));
	},
};
