import { read, streamedQuery } from "@fcalell/plugin-api/tanstack-query";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Thread } from "@fcalell/plugin-react-ui/components/thread";
import { OVERSCAN } from "@fcalell/ui-core/window";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Profiler, useState } from "react";
import { expect, waitFor } from "storybook/test";

// A 1000-message thread windows its log: it opens at the newest message with
// no frame of the first ones, follows each arrival and the reply's growth
// while the reader is at the end, keeps a reader who scrolled up steady while
// the rows above are measured, and a token renders the reply turn alone.
interface Turn {
	id: string;
	author: "you" | "other";
	body: string;
}

const COUNT = 1000;

// Every tenth message is longer, so the rows differ in height and the first
// total is an estimate.
const turn = (at: number): Turn => ({
	id: `m${at}`,
	author: at % 2 ? "you" : "other",
	body: `Message ${at}.${at % 10 === 0 ? " A longer message that wraps over more than one line, so its row is taller than the rest in a narrow log of the thread, and the estimate is off." : ""}`,
});

const HISTORY = Array.from({ length: COUNT }, (_, at) => turn(at + 1));

// A stream the story drives by hand.
const drive: {
	push: (word: string) => void;
	end: () => void;
} = { push: () => {}, end: () => {} };

async function* words() {
	const pending: string[] = [];
	let wake: (() => void) | undefined;
	let over = false;
	drive.push = (word) => {
		pending.push(word);
		wake?.();
	};
	drive.end = () => {
		over = true;
		wake?.();
	};
	for (;;) {
		const word = pending.shift();
		if (word !== undefined) yield word;
		else if (over) return;
		else await new Promise<void>((resolve) => (wake = resolve));
	}
}

// What the story counts: each time the thread renders it asks the first item
// for its key; each time the reply renders it asks the slot for its body.
const calls = { thread: 0, reply: 0 };
// Each frame's first message and scroll, from the first render on.
const seen = { first: false, frames: 0, stop: false };
// The most messages the DOM held after any commit of the thread, the first
// included.
const drawn = { max: 0 };

let made = 0;
function Stage() {
	const [items, setItems] = useState(HISTORY);
	const [reply] = useState(() =>
		read<Turn>(
			{
				queryKey: ["long-thread", made++],
				queryFn: streamedQuery<string, Turn>({
					streamFn: () => words(),
					reducer: (each, word) => ({ ...each, body: each.body + word }),
					initialValue: { id: "reply", author: "other", body: "" },
				}),
				staleTime: Number.POSITIVE_INFINITY,
				retry: false,
			},
			{ kind: "stream" },
		),
	);
	return (
		<div style={{ display: "flex", flexDirection: "column", height: 600 }}>
			<Place>
				<Pane title="Assistant">
					<Profiler
						id="thread"
						onRender={() => {
							const log = document.querySelector('[role="log"]');
							drawn.max = Math.max(
								drawn.max,
								log?.querySelectorAll("article").length ?? 0,
							);
						}}
					>
						<Thread
							items={items}
							reply={reply}
							message={{
								key: (each) => {
									if (each.id === "m1") calls.thread += 1;
									return each.id;
								},
								author: (each) => each.author,
								body: (each) => {
									if (each.id === "reply") calls.reply += 1;
									return each.body;
								},
							}}
						/>
					</Profiler>
				</Pane>
			</Place>
			<button
				type="button"
				onClick={() => setItems((all) => [...all, turn(all.length + 1)])}
			>
				Arrive
			</button>
		</div>
	);
}

export default {
	title: "Behaviour/Long thread",
	parameters: { layout: "fullscreen" },
	render: () => <Stage />,
	beforeEach: () => {
		calls.thread = 0;
		calls.reply = 0;
		seen.first = false;
		drawn.max = 0;
		seen.frames = 0;
		seen.stop = false;
		drive.push = () => {};
		drive.end = () => {};
		const watch = () => {
			if (seen.stop) return;
			const log = document.querySelector('[role="log"]');
			if (log?.querySelector("article")) {
				seen.frames += 1;
				if (
					[...log.querySelectorAll("article")].some((one) =>
						/^Message 1\./.test(one.textContent ?? ""),
					)
				) {
					seen.first = true;
				}
			}
			requestAnimationFrame(watch);
		};
		requestAnimationFrame(watch);
		return () => {
			seen.stop = true;
		};
	},
} satisfies Meta;

const frame = () =>
	new Promise<void>((done) => requestAnimationFrame(() => done()));
async function frames(count = 3) {
	for (let at = 0; at < count; at++) await frame();
}

const turns = (log: HTMLElement) => [...log.querySelectorAll("article")];
const atEnd = (log: HTMLElement) =>
	log.scrollHeight - log.scrollTop - log.clientHeight <= 1;
const visible = (log: HTMLElement, node: Element) => {
	const edge = log.getBoundingClientRect();
	const rect = node.getBoundingClientRect();
	return rect.bottom > edge.top && rect.top < edge.bottom;
};
// The mounted message numbered `at`, if any.
const message = (log: HTMLElement, at: number) =>
	turns(log).find((one) =>
		new RegExp(`^Message ${at}\\.`).test(one.textContent ?? ""),
	);
// The first message in the log's view and how far its top is from the log's.
const anchor = (log: HTMLElement) => {
	const node = turns(log).find((one) => visible(log, one));
	if (!node) throw new Error("no message in view");
	return {
		text: node.textContent,
		top: node.getBoundingClientRect().top - log.getBoundingClientRect().top,
	};
};

// Opens at the newest message, never having drawn the first ones in a frame;
// the DOM holds the view and the overscan, not the thousand.
export const OpensAtTheEnd: StoryObj = {
	play: async ({ canvas }) => {
		const log = await canvas.findByRole("log");
		await canvas.findByText(new RegExp(`^Message ${COUNT}\\.`));
		await frames(6);
		await expect(atEnd(log)).toBe(true);
		await expect(seen.frames).toBeGreaterThan(0);
		await expect(seen.first).toBe(false);
		const mounted = turns(log);
		const inView = mounted.filter((one) => visible(log, one)).length;
		await expect(mounted.length).toBeLessThanOrEqual(inView + 2 * OVERSCAN + 2);
		await expect(mounted.length).toBeLessThan(COUNT / 4);
		// No commit, the first included, drew more than the viewport's window.
		await expect(drawn.max).toBeGreaterThan(0);
		await expect(drawn.max).toBeLessThanOrEqual(
			Math.ceil(window.innerHeight / 48) + 2 * OVERSCAN + 2,
		);
	},
};

// An arrival and a reply's growth both keep the reader at the end, and a
// token renders the reply turn alone.
export const FollowsAtTheEnd: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		const log = await canvas.findByRole("log");
		await canvas.findByText(new RegExp(`^Message ${COUNT}\\.`));
		await waitFor(() => expect(atEnd(log)).toBe(true));
		await userEvent.click(canvas.getByRole("button", { name: "Arrive" }));
		const arrived = await canvas.findByText(
			new RegExp(`^Message ${COUNT + 1}\\.`),
		);
		await waitFor(() => expect(atEnd(log)).toBe(true));
		await expect(visible(log, arrived)).toBe(true);

		await waitFor(() => expect(drive.push).not.toBe(undefined));
		drive.push("First");
		await canvas.findByText("First");
		const before = { thread: calls.thread, reply: calls.reply };
		for (const word of [" token", " after", " token", " and", " on"]) {
			drive.push(word);
			await frames(2);
		}
		await canvas.findByText(/First token after token and on/);
		await expect(calls.thread).toBe(before.thread);
		await expect(calls.reply).toBeGreaterThan(before.reply);
		// The reply grows past the line it started on and the log follows.
		for (let at = 0; at < 60; at++) drive.push(" a growing reply");
		await waitFor(() =>
			expect(turns(log).at(-1)?.textContent?.split("growing").length).toBe(61),
		);
		await waitFor(() => expect(atEnd(log)).toBe(true));
		const last = turns(log).at(-1);
		await expect(visible(log, last as Element)).toBe(true);
		await expect(calls.thread).toBe(before.thread);
		drive.end();
	},
};

// A reader scrolled up stays where they are while the rows above are measured
// and a message arrives below; Latest returns to the end.
export const ScrolledUpStaysSteady: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		const log = await canvas.findByRole("log");
		await canvas.findByText(new RegExp(`^Message ${COUNT}\\.`));
		await waitFor(() => expect(atEnd(log)).toBe(true));
		// Into the middle, where nothing above has been measured.
		log.scrollTop = log.scrollHeight / 2;
		await frames(4);
		await expect(atEnd(log)).toBe(false);
		const before = anchor(log);
		// The rows around the view are measured as it settles; a message arrives
		// below and the reply starts to grow.
		await frames(12);
		await userEvent.click(canvas.getByRole("button", { name: "Arrive" }));
		await waitFor(() => expect(drive.push).not.toBe(undefined));
		drive.push("Growing");
		await frames(12);
		const after = anchor(log);
		await expect(after.text).toBe(before.text);
		await expect(Math.abs(after.top - before.top)).toBeLessThanOrEqual(1);
		await expect(atEnd(log)).toBe(false);

		await userEvent.click(
			await canvas.findByRole("button", { name: "Latest" }),
		);
		await waitFor(() => expect(atEnd(log)).toBe(true));
		await expect(visible(log, message(log, COUNT + 1) as Element)).toBe(true);
		await expect(
			canvas.queryByRole("button", { name: "Latest" }),
		).not.toBeInTheDocument();
		drive.end();
	},
};
