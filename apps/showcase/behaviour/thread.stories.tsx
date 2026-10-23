import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import {
	type ComposerProps,
	type MessageSlots,
	Thread,
} from "@fcalell/plugin-react-ui/components/thread";
import { Place } from "@fcalell/plugin-react-ui/showcase/frames/place";
import type { Message } from "@fcalell/ui-core/descriptors";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, waitFor } from "storybook/test";

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
function Replying({ height, reply = REPLY }: { height: number; reply?: Turn }) {
	const [items, setItems] = useState(TURNS);
	const [replying, setReplying] = useState(true);
	const [text, setText] = useState("");
	return (
		<div style={{ display: "flex", flexDirection: "column", height }}>
			<Place>
				<Pane fill title="Assistant">
					<Thread
						items={items}
						replying={replying}
						message={{
							key: (turn) => turn.id,
							author: (turn) => turn.author,
							body: (turn) => turn.body,
						}}
						composer={{ value: text, onChange: setText, onSend: () => {} }}
					/>
				</Pane>
			</Place>
			<button
				type="button"
				onClick={() => {
					setItems((last) => [...last, reply]);
					setReplying(false);
				}}
			>
				Stream the reply
			</button>
		</div>
	);
}

const onSend = fn();

export default {
	title: "Behaviour/Thread",
	beforeEach: () => onSend.mockClear(),
} satisfies Meta;

// A message is a Thread's data: the slots that read one from an item that is
// the message itself.
type One = Message & { key: string };
const ONE: MessageSlots<One> = {
	key: (one) => one.key,
	author: (one) => one.author,
	name: (one) => one.name,
	body: (one) => one.body,
	at: (one) => one.at,
	attachments: (one) => one.attachments,
	meta: (one) => one.meta,
	streaming: (one) => one.streaming,
	onOpen: (one) => one.onOpen,
	detail: (one) => one.detail,
};

// A thread of these messages alone, in a column of their width.
function Messages({ items }: { items: One[] }) {
	return (
		<div style={{ width: 480, maxWidth: "100%" }}>
			<Thread items={items} message={ONE} />
		</div>
	);
}

// A thread with no messages, over its composer.
function Compose(props: Partial<ComposerProps> & { width?: number }) {
	const { width, ...composer } = props;
	const [value, setValue] = useState("Why did the deploy fail");
	return (
		<div style={{ width, display: "flex", flexDirection: "column" }}>
			<Thread
				items={[]}
				message={ONE}
				composer={{
					value,
					onChange: setValue,
					onAttach: () => {},
					placeholder: "Reply",
					onSend,
					...composer,
				}}
			/>
		</div>
	);
}

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
	// The docked foot stands a sections gap under the log: no hairline, no shadow.
	const region = log.parentElement;
	const foot = region?.nextElementSibling;
	if (!region || !foot) throw new Error("the log has no foot");
	expect(getComputedStyle(foot).boxShadow).toBe("none");
	const probe = document.createElement("div");
	probe.className = "pb-section";
	foot.append(probe);
	const sections = Number.parseFloat(getComputedStyle(probe).paddingBottom);
	probe.remove();
	expect(
		foot.getBoundingClientRect().top - region.getBoundingClientRect().bottom,
	).toBe(sections);
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

// The waiting message draws as the reply it becomes: no author line, one line at
// the body line height, the same left edge and top, so the swap moves nothing;
// a longer reply only adds its extra lines.
const ONE_LINE: Turn = { id: "reply", author: "other", body: "Done." };
const LONG_REPLY: Turn = {
	id: "reply",
	author: "other",
	body: "First line of a longer answer.\n\nSecond paragraph of the same answer, which runs on to a further line because it says a great deal more than the first.",
};
const slot = (log: HTMLElement) => {
	const turns = log.querySelectorAll("article");
	const last = turns[turns.length - 1] as HTMLElement;
	const box = last.getBoundingClientRect();
	const at = log.getBoundingClientRect();
	return {
		top: box.top - at.top + log.scrollTop,
		left: box.left - at.left,
		height: box.height,
	};
};
const settled = (log: HTMLElement) =>
	Promise.all(
		log.getAnimations({ subtree: true }).map((each) => each.finished),
	);
function swapsInPlace(reply: Turn, grows: boolean): StoryObj {
	return {
		parameters: { layout: "fullscreen" },
		render: () => <Replying height={720} reply={reply} />,
		play: async ({ canvas, userEvent }) => {
			const log = await canvas.findByRole("log");
			await waitFor(() => expect(waiting(log)).toHaveLength(1));
			const last = log.querySelectorAll("article");
			// No author line: the waiting entry holds a single line.
			expect(last[last.length - 1]?.children).toHaveLength(1);
			// The waiting message rose in as it mounted; its box is read at rest.
			await settled(log);
			const before = slot(log);
			await userEvent.click(
				canvas.getByRole("button", { name: "Stream the reply" }),
			);
			await canvas.findByText(reply.body.split("\n")[0] ?? "");
			const after = slot(log);
			expect(after.top).toBeCloseTo(before.top, 0);
			expect(after.left).toBeCloseTo(before.left, 0);
			if (grows) expect(after.height).toBeGreaterThan(before.height);
			else expect(after.height).toBeCloseTo(before.height, 0);
			await waitFor(() => expect(atEnd(log)).toBe(true));
		},
	};
}
export const WaitingHoldsTheOneLineReplysBox1280: StoryObj = swapsInPlace(
	ONE_LINE,
	false,
);
export const WaitingOnlyGrowsByALongerRepliesLines1280: StoryObj = swapsInPlace(
	LONG_REPLY,
	true,
);
export const WaitingHoldsTheOneLineReplysBox390: StoryObj = {
	...swapsInPlace(ONE_LINE, false),
	tags: ["touch"],
	globals: { density: "touch" },
	render: () => (
		<div style={{ width: 390 }}>
			<Replying height={844} reply={ONE_LINE} />
		</div>
	),
};
export const WaitingOnlyGrowsByALongerRepliesLines390: StoryObj = {
	...swapsInPlace(LONG_REPLY, true),
	tags: ["touch"],
	globals: { density: "touch" },
	render: () => (
		<div style={{ width: 390 }}>
			<Replying height={844} reply={LONG_REPLY} />
		</div>
	),
};

// A system line stands a pair step above its card, the label over its content,
// as a Section's title stands over its body.
export const SystemLineStandsAPairStepAboveItsCard: StoryObj = {
	render: () => (
		<Messages
			items={[
				{
					key: "proposed",
					author: "system",
					body: "Proposed a redeploy",
					detail: {
						row: {
							leading: { icon: "Rocket" },
							title: "Redeploy api to production",
							onOpen: () => {},
						},
					},
				},
			]}
		/>
	),
	play: async ({ canvas }) => {
		const card = canvas.getByRole("button").closest("div.rounded-card");
		const line = card?.previousElementSibling;
		if (!(card instanceof HTMLElement) || !line)
			throw new Error("the line and its card are not drawn");
		const probe = document.createElement("div");
		probe.className = "pb-gap";
		card.parentElement?.append(probe);
		const pair = Number.parseFloat(getComputedStyle(probe).paddingBottom);
		probe.remove();
		await expect(pair).toBeGreaterThan(0);
		await expect(
			card.getBoundingClientRect().top - line.getBoundingClientRect().bottom,
		).toBeCloseTo(pair, 0);
	},
};

// A reply still arriving draws its open emphasis, strong run and code span in
// their own forms; a finished one leaves the same unmatched marker as text.
export const OpenMarkersDrawTheirForm: StoryObj = {
	render: () => (
		<Messages
			items={[
				{
					key: "streamed",
					author: "other",
					name: "Lead",
					streaming: true,
					body: "Open **the *redeploy and run `npm test",
				},
				{
					key: "finished",
					author: "other",
					name: "Lead",
					body: "A *finished reply",
				},
			]}
		/>
	),
	play: async ({ canvas, canvasElement }) => {
		const [streamed, finished] = canvasElement.querySelectorAll("article");
		await expect(streamed?.querySelector("strong")?.textContent).toContain(
			"the",
		);
		await expect(streamed?.querySelector("em")?.textContent).toContain(
			"redeploy",
		);
		await expect(streamed?.querySelector("code")?.textContent).toBe("npm test");
		await expect(finished?.querySelector("em")).toBeNull();
		await expect(canvas.getByText(/A \*finished reply/)).toBeVisible();
	},
};

// A press anywhere in the box that is no act (its padding, the foot row's
// empty part) puts the focus in the text, the caret at its end; a press on an
// act does what it did.
export const ComposerBoxFocusesText: StoryObj = {
	render: () => <Compose />,
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

// The text area is the textarea itself: it spans the box's inside from edge to
// edge and stands at least a target tall, so a press on any of it, its padding
// included, lands on the textarea; the box's handler is for the rest.
const fillsTheBox: StoryObj["play"] = async ({ canvas }) => {
	const text = await canvas.findByRole("textbox", { name: "Message" });
	const box = text.closest("div[class*='border']");
	if (!(box instanceof HTMLElement)) throw new Error("the box is not drawn");
	const inner = box.getBoundingClientRect();
	const area = text.getBoundingClientRect();
	const style = getComputedStyle(box);
	const inset = (side: "Left" | "Right") =>
		Number.parseFloat(style[`padding${side}`]) +
		Number.parseFloat(style[`border${side}Width`]);
	const target = Number.parseFloat(
		getComputedStyle(document.documentElement).getPropertyValue(
			"--spacing-target",
		),
	);
	await expect(area.left).toBeCloseTo(inner.left + inset("Left"), 0);
	await expect(area.right).toBeCloseTo(inner.right - inset("Right"), 0);
	await expect(area.height).toBeGreaterThanOrEqual(target - 2);
	for (const [x, y] of [
		[area.left + 1, area.top + 1],
		[area.right - 1, area.top + 1],
		[area.left + 1, area.bottom - 1],
		[area.right - 1, area.bottom - 1],
	] as const)
		await expect(document.elementFromPoint(x, y)).toBe(text);
};

export const ComposerTextAreaIsTheTextarea: StoryObj = {
	render: () => <Compose />,
	play: fillsTheBox,
};

export const ComposerTextAreaIsTheTextareaOnTouch: StoryObj = {
	render: () => <Compose />,
	tags: ["touch"],
	globals: { density: "touch" },
	play: async (context) => {
		await fillsTheBox?.(context);
		// The touch field is the bar fit tall, and the textarea fills it above and
		// below the line, leaving only the field's sides outside it.
		const text = await context.canvas.findByRole("textbox", {
			name: "Message",
		});
		const box = text.closest("div[class*='border']");
		if (!(box instanceof HTMLElement)) throw new Error("the box is not drawn");
		const inner = box.getBoundingClientRect();
		const area = text.getBoundingClientRect();
		await expect(area.top).toBeCloseTo(inner.top + 1, 0);
		await expect(area.bottom).toBeCloseTo(inner.bottom - 1, 0);
	},
};

// On touch Attach, Stop and Send are three icon acts, so the field keeps the
// rest of a 292 px frame beside them (a labelled Send left it 77 px).
export const ComposerFieldKeepsRoomAtANarrowPhone: StoryObj = {
	tags: ["touch"],
	globals: { density: "touch" },
	render: () => (
		<Compose
			width={292}
			value=""
			working
			onStop={() => {}}
			notice={{ sentence: "A message sent now waits for the answer." }}
		/>
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
