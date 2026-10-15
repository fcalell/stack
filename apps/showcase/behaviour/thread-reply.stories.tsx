import { read, streamedQuery } from "@fcalell/plugin-api/tanstack-query";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Thread } from "@fcalell/plugin-react-ui/components/thread";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, waitFor } from "storybook/test";

// The turn being written is a read the app declares: Thread's `reply`. It
// draws from its own subscription, so a chunk renders it and nothing else; a
// stream that fails keeps what arrived and says it stopped, with Retry; and
// once the history holds its key the reply steps aside.
interface Turn {
	id: string;
	author: "you" | "other";
	body: string;
}

const TURNS: Turn[] = [
	{ id: "t0", author: "you", body: "Why did the last deploy fail?" },
	{ id: "t1", author: "other", body: "Let me look." },
	{ id: "t2", author: "you", body: "And what changed since?" },
];

// A stream the story drives by hand: each run of the stream is one entry, a
// retry making the next.
interface Run {
	push: (word: string) => void;
	end: () => void;
	fail: () => void;
}

function controlled() {
	const runs: Run[] = [];
	async function* words() {
		const pending: string[] = [];
		let wake: (() => void) | undefined;
		let over: "end" | "fail" | undefined;
		const poke = () => wake?.();
		runs.push({
			push: (word) => {
				pending.push(word);
				poke();
			},
			end: () => {
				over = "end";
				poke();
			},
			fail: () => {
				over = "fail";
				poke();
			},
		});
		for (;;) {
			const word = pending.shift();
			if (word !== undefined) yield word;
			else if (over === "end") return;
			else if (over === "fail") throw new Error("The stream broke.");
			else await new Promise<void>((resolve) => (wake = resolve));
		}
	}
	return { runs, words };
}

// What the story counts: each time the thread renders it asks the first item
// for its key; each time that message renders it asks for its body.
const calls = { thread: 0, message: 0 };

let made = 0;
const drive = controlled();

function Replying() {
	const [items, setItems] = useState(TURNS);
	const [reply] = useState(() =>
		read<Turn>(
			{
				queryKey: ["thread-reply", made++],
				queryFn: streamedQuery<string, Turn>({
					streamFn: () => drive.words(),
					reducer: (turn, word) => ({ ...turn, body: turn.body + word }),
					initialValue: { id: "reply", author: "other", body: "" },
				}),
				staleTime: Number.POSITIVE_INFINITY,
				retry: false,
			},
			{ kind: "stream" },
		),
	);
	return (
		<div style={{ display: "flex", flexDirection: "column", height: 480 }}>
			<Place>
				<Pane title="Assistant">
					<Thread
						items={items}
						reply={reply}
						message={{
							key: (turn) => {
								if (turn.id === "t0") calls.thread += 1;
								return turn.id;
							},
							author: (turn) => turn.author,
							body: (turn) => {
								if (turn.id === "t0") calls.message += 1;
								return turn.body;
							},
						}}
					/>
				</Pane>
			</Place>
			<button
				type="button"
				onClick={() =>
					setItems((all) => [
						...all,
						{ id: "reply", author: "other", body: "One two three" },
					])
				}
			>
				History holds it
			</button>
		</div>
	);
}

export default {
	title: "Behaviour/Thread reply",
	parameters: { layout: "fullscreen" },
	render: () => <Replying />,
	beforeEach: () => {
		drive.runs.length = 0;
		calls.thread = 0;
		calls.message = 0;
	},
} satisfies Meta;

const turns = (log: HTMLElement) => log.querySelectorAll("article");
const last = (log: HTMLElement) => [...turns(log)].at(-1);
const run = async (at = 0) => {
	await waitFor(() => expect(drive.runs.length).toBeGreaterThan(at));
	const started = drive.runs[at];
	if (!started) throw new Error("the stream did not start");
	return started;
};

// Waiting for the first chunk the log ends on one waiting message; the first
// chunk replaces it with the reply, and every chunk after it renders the reply
// turn alone: the thread and the messages above it do not render again.
export const AChunkRendersOnlyTheReply: StoryObj = {
	play: async ({ canvas }) => {
		const log = await canvas.findByRole("log");
		await waitFor(() =>
			expect(last(log)?.hasAttribute("aria-busy")).toBe(true),
		);
		const started = await run();
		started.push("One ");
		await canvas.findByText(/One/);
		await expect(log.querySelectorAll("[aria-busy]")).toHaveLength(0);
		const thread = calls.thread;
		const message = calls.message;
		started.push("two ");
		await canvas.findByText(/One two/);
		started.push("three");
		await canvas.findByText(/One two three/);
		await expect(calls.thread).toBe(thread);
		await expect(calls.message).toBe(message);
		// Written once the stream ends: the same turn, no stopped line.
		started.end();
		await waitFor(() =>
			expect(canvas.queryByText("The reply stopped.")).toBeNull(),
		);
		await expect(last(log)?.textContent).toContain("One two three");
	},
};

// A stream that fails keeps the words that arrived, says the reply stopped
// and offers Retry, which runs the stream again from the waiting form.
export const AStoppedStreamDrawsItsLineWithRetry: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		const log = await canvas.findByRole("log");
		const first = await run();
		first.push("One ");
		await canvas.findByText(/One/);
		first.fail();
		await canvas.findByText("The reply stopped.");
		await expect(last(log)?.textContent).toContain("One");
		await userEvent.click(canvas.getByRole("button", { name: "Retry" }));
		const second = await run(1);
		await waitFor(() =>
			expect(last(log)?.hasAttribute("aria-busy")).toBe(true),
		);
		await expect(canvas.queryByText("The reply stopped.")).toBeNull();
		second.push("Again");
		await canvas.findByText(/Again/);
		second.end();
	},
};

// Once the history holds the reply's key, the thread draws that turn alone.
export const NoDoubleTurnWhenHistoryHoldsTheKey: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		const log = await canvas.findByRole("log");
		const started = await run();
		started.push("One two three");
		await canvas.findByText("One two three");
		await expect(turns(log)).toHaveLength(TURNS.length + 1);
		await userEvent.click(
			canvas.getByRole("button", { name: "History holds it" }),
		);
		await waitFor(() => expect(turns(log)).toHaveLength(TURNS.length + 1));
		await expect(canvas.getAllByText("One two three")).toHaveLength(1);
		started.end();
	},
};
