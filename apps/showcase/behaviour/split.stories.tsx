import { ActionBar } from "@fcalell/plugin-react-ui/components/action-bar";
import { Banner } from "@fcalell/plugin-react-ui/components/banner";
import { Code } from "@fcalell/plugin-react-ui/components/code";
import { DefinitionRow } from "@fcalell/plugin-react-ui/components/definition-row";
import { EmptyState } from "@fcalell/plugin-react-ui/components/empty-state";
import { Group } from "@fcalell/plugin-react-ui/components/group";
import { ItemHeader } from "@fcalell/plugin-react-ui/components/item-header";
import { List } from "@fcalell/plugin-react-ui/components/list";
import { MessageInput } from "@fcalell/plugin-react-ui/components/message-input";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Prose } from "@fcalell/plugin-react-ui/components/prose";
import { Screen } from "@fcalell/plugin-react-ui/components/screen";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Split } from "@fcalell/plugin-react-ui/components/split";
import { Thread } from "@fcalell/plugin-react-ui/components/thread";
import { Toolbar } from "@fcalell/plugin-react-ui/components/toolbar";
import { BREAKPOINT_PX } from "@fcalell/ui-core/tokens";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useState } from "react";
import { expect, screen, waitFor, within } from "storybook/test";

const NAMES = ["Ana Ruiz", "Ben Kaya", "Ema Okafor", "Rui Alves", "Zoe Park"];
const ROWS = {
	key: (name: string) => name,
	title: (name: string) => name,
};
const noop = () => {};

function Rows() {
	return <List items={NAMES} row={ROWS} />;
}

// A page `width` px wide: the container its regions query.
function Page(props: {
	width: number;
	// Never wider than the screen it stands on.
	fluid?: boolean;
	children: ReactNode;
}) {
	return (
		<div
			style={{
				width: props.width,
				maxWidth: props.fluid ? "100%" : undefined,
				height: 700,
				display: "flex",
				flexDirection: "column",
			}}
		>
			{props.children}
		</div>
	);
}

// A token's size in px, read off a probe wearing its class.
function token(
	root: Element,
	className: string,
	property: "paddingLeft" | "paddingBottom",
): number {
	const probe = document.createElement("div");
	probe.className = className;
	root.append(probe);
	const size = Number.parseFloat(getComputedStyle(probe)[property]);
	probe.remove();
	return size;
}

function shown(el: Element | null | undefined): boolean {
	return el != null && getComputedStyle(el).display !== "none";
}

function must<T extends Element>(el: T | null | undefined): T {
	if (!el) throw new Error("the element is not drawn");
	return el;
}

// The Split's regions in order: the list, the main (or its empty form), the
// record beside it or the pane.
function regions(canvasElement: HTMLElement) {
	return [...must(canvasElement.querySelector("[data-split]")).children];
}

export default { title: "Behaviour/Split" } satisfies Meta;

function Foot(props: { foot: boolean }) {
	return (
		<Page width={375}>
			<Place
				title="Now"
				bleed
				foot={
					props.foot ? (
						<MessageInput
							value=""
							onChange={noop}
							placeholder="Ask"
							onSend={noop}
						/>
					) : undefined
				}
			>
				<Split
					list={
						<Section title="Open">
							<Rows />
							<Rows />
							<Rows />
							<Rows />
						</Section>
					}
				/>
			</Place>
		</Page>
	);
}

async function footGap(canvasElement: HTMLElement) {
	const nav = must(canvasElement.querySelector("nav"));
	nav.scrollTop = nav.scrollHeight;
	await waitFor(() => expect(nav.scrollTop).toBeGreaterThan(0));
	const last = must(nav.lastElementChild).getBoundingClientRect();
	return {
		gap: nav.getBoundingClientRect().bottom - last.bottom,
		sections: token(canvasElement, "pb-sections", "paddingBottom"),
	};
}

function touch(story: StoryObj): StoryObj {
	return {
		...story,
		tags: ["touch"],
		globals: {
			density: "touch",
			viewport: { value: "phone", isRotated: false },
		},
		parameters: {
			...story.parameters,
			viewport: {
				options: {
					phone: {
						name: "Phone",
						styles: { width: "375px", height: "812px" },
						type: "mobile",
					},
				},
			},
		},
	};
}

// A Split standing as the list alone, over a docked foot, ends its content a
// sections gap above the foot; with no foot its last row meets the region's end.
export const ListOverFoot: StoryObj = {
	render: () => <Foot foot />,
	play: async ({ canvasElement }) => {
		const { gap, sections } = await footGap(canvasElement);
		await expect(gap).toBe(sections);
	},
};

export const ListWithoutFoot: StoryObj = {
	render: () => <Foot foot={false} />,
	play: async ({ canvasElement }) => {
		const { gap } = await footGap(canvasElement);
		await expect(gap).toBe(0);
	},
};

export const ListOverFootTouch = touch(ListOverFoot);
export const ListWithoutFootTouch = touch(ListWithoutFoot);

// An empty list and an empty main, both EmptyStates, stand on one centre.
export const EmptyCentres: StoryObj = {
	render: () => (
		<Page width={1300}>
			<Place title="Work" bleed>
				<Toolbar>
					<button type="button">Filter</button>
				</Toolbar>
				<Split
					list={
						<EmptyState title="No stories yet" sentence="Add the first one." />
					}
					empty={<EmptyState title="No story open" sentence="Pick a story." />}
				/>
			</Place>
		</Page>
	),
	play: async ({ canvasElement }) => {
		const top = (text: string) =>
			must(
				[...canvasElement.querySelectorAll("h2")].find(
					(el) => el.textContent === text,
				),
			).getBoundingClientRect().top;
		await expect(top("No stories yet")).toBe(top("No story open"));
	},
};

// The list and the main share one top under the head's hairline, and a row's
// wash stays inside a Group's border.
export const TopsAndWash: StoryObj = {
	render: () => (
		<Page width={1300}>
			<Place title="Now" bleed>
				<Split
					list={
						<Section title="Open">
							<Group>
								<List
									items={NAMES}
									row={{
										...ROWS,
										onOpen: noop,
										selected: (name) => name === NAMES[1],
									}}
								/>
							</Group>
						</Section>
					}
					main={
						<Section title="Detail">
							<Rows />
						</Section>
					}
				/>
			</Place>
		</Page>
	),
	play: async ({ canvasElement }) => {
		const [list, main] = regions(canvasElement);
		const top = (el: Element | undefined) =>
			must(el?.querySelector("h3, h2")).getBoundingClientRect().top;
		await expect(top(list)).toBe(top(main));
		const group = must(
			must(list).querySelector("[class*='rounded-card']"),
		).getBoundingClientRect();
		const rows = [...must(list).querySelectorAll("[class*='min-h-row']")];
		// The wash is drawn: the open record's row at rest, the first row under
		// the pointer, the second at rest still clear.
		const wash = (row: Element | undefined) =>
			getComputedStyle(must(row)).backgroundColor;
		const clear = "rgba(0, 0, 0, 0)";
		await expect(wash(rows[0])).toBe(clear);
		await expect(wash(rows[1])).not.toBe(clear);
		await expect(wash(rows[2])).toBe(clear);
		// A synthetic pointer sets no `:hover`, so the hover wash is read off
		// the rule the open rows carry.
		await expect(rows[0]?.className).toContain("hover:bg-wash-hover");
		await expect(rows[1]?.className).toContain("hover:bg-wash-selected-hover");
		for (const row of rows) {
			const box = row.getBoundingClientRect();
			await expect(box.left).toBeGreaterThanOrEqual(group.left + 1);
			await expect(box.right).toBeLessThanOrEqual(group.right - 1);
		}
	},
};

function Opened(props: { width: number; beside: boolean }) {
	return (
		<Page width={props.width}>
			<Place title="Now" bleed>
				<Split
					list={<Rows />}
					main={
						<Section title="Review">
							<Rows />
						</Section>
					}
					pane={
						<Section title="Properties">
							<Rows />
						</Section>
					}
					beside={
						props.beside ? (
							<Screen title="File" back="/review">
								<Rows />
							</Screen>
						) : undefined
					}
				/>
			</Place>
		</Page>
	);
}

// The page's width decides: from `tablet` (768) the list and the main stand
// together, below it one region at a time; from `wide` (1200) the record
// beside the main and the pane stand beside it, below it they take its place.
export const FromTablet: StoryObj = {
	render: () => <Opened width={768} beside={false} />,
	play: async ({ canvasElement }) => {
		const [list, main] = regions(canvasElement);
		await expect(shown(list)).toBe(true);
		await expect(shown(main)).toBe(true);
	},
};

export const BelowTablet: StoryObj = {
	render: () => <Opened width={767} beside={false} />,
	play: async ({ canvasElement }) => {
		const [list, main] = regions(canvasElement);
		await expect(shown(list)).toBe(false);
		await expect(shown(main)).toBe(true);
	},
};

export const BesideFromWide: StoryObj = {
	render: () => <Opened width={1200} beside />,
	play: async ({ canvasElement }) => {
		const [list, main, beside] = regions(canvasElement);
		await expect(shown(list)).toBe(true);
		await expect(shown(main)).toBe(true);
		await expect(shown(beside)).toBe(true);
	},
};

export const BesideBelowWide: StoryObj = {
	render: () => <Opened width={1199} beside />,
	play: async ({ canvasElement }) => {
		const [list, main, beside] = regions(canvasElement);
		await expect(shown(list)).toBe(true);
		await expect(shown(main)).toBe(false);
		await expect(shown(beside)).toBe(true);
	},
};

export const PaneFromWide: StoryObj = {
	render: () => <Opened width={1200} beside={false} />,
	play: async ({ canvasElement }) => {
		await expect(shown(canvasElement.querySelector("aside"))).toBe(true);
	},
};

export const PaneBelowWide: StoryObj = {
	render: () => <Opened width={1199} beside={false} />,
	play: async ({ canvasElement }) => {
		await expect(shown(canvasElement.querySelector("aside"))).toBe(false);
	},
};

// At the phone a record beside the main stands alone with one head, the
// Screen's: the Place draws none, and the Screen's title and body start at the
// page's gutter.
const besideAtThePhone: StoryObj = {
	render: () => (
		<Page width={375}>
			<Place title="System" bleed>
				<Split
					list={<Rows />}
					main={
						<Section title="Page">
							<Rows />
						</Section>
					}
					beside={
						<Screen title="History" back="/page">
							<Rows />
						</Screen>
					}
				/>
			</Place>
		</Page>
	),
	play: async ({ canvasElement }) => {
		const heads = [...canvasElement.querySelectorAll("header")].filter(shown);
		await expect(heads).toHaveLength(1);
		const gutter =
			must(canvasElement.firstElementChild).getBoundingClientRect().left +
			token(canvasElement, "px-page", "paddingLeft");
		const title = must(
			[...canvasElement.querySelectorAll("h1, h2")].find(
				(el) => el.textContent === "History",
			),
		);
		await expect(title.getBoundingClientRect().left).toBe(gutter);
		const name = must(
			[...must(regions(canvasElement)[2]).querySelectorAll("*")].find(
				(el) => el.children.length === 0 && el.textContent === NAMES[0],
			),
		);
		await expect(name.getBoundingClientRect().left).toBe(gutter);
	},
};

export const BesideAtThePhone = touch(besideAtThePhone);

// A record beside the main is a head of its own: its title is an h1 and its
// sections h2 at every width, so below `tablet`, where the Place's head is
// undrawn, the record's h1 is the one visible; from `tablet` the Place's h1
// stands first. The record's regions follow the frame the story stands in, which
// a narrow viewport caps below its nominal width; at `wide` the title stands at
// the sections' gutter, its Close act ending the line.
function headings(width: number): StoryObj {
	return {
		render: () => (
			<Page width={width} fluid>
				<Place title="System" bleed>
					<Split
						list={<Rows />}
						main={
							<Section title="Page">
								<Rows />
							</Section>
						}
						beside={
							<Screen title="History" back="/page">
								<Section title="Entries">
									<Rows />
								</Section>
							</Screen>
						}
					/>
				</Place>
			</Page>
		),
		play: async ({ canvasElement }) => {
			const drawn = [
				...canvasElement.querySelectorAll("h1, h2, h3, h4, h5, h6"),
			].filter((el) => el.getClientRects().length > 0);
			const h1s = drawn.filter((el) => el.tagName === "H1");
			await expect(h1s.length).toBeGreaterThan(0);
			await expect(drawn[0]?.tagName).toBe("H1");
			const title = (el: Element) => el.textContent;
			const frame = must(canvasElement.firstElementChild).clientWidth;
			if (frame < BREAKPOINT_PX.tablet)
				await expect(h1s.map(title)).toEqual(["History"]);
			else await expect(h1s.map(title)).toEqual(["System", "History"]);
			const entries = drawn.find((el) => title(el) === "Entries");
			await expect(entries?.tagName).toBe("H2");
			if (frame < BREAKPOINT_PX.wide) return;
			const record = must(h1s.find((el) => title(el) === "History"));
			await expect(record.getBoundingClientRect().left).toBe(
				must(entries).getBoundingClientRect().left,
			);
			const close = must(
				canvasElement.querySelector<HTMLElement>('a[aria-label="Close"]'),
			);
			await expect(close.getBoundingClientRect().left).toBeGreaterThan(
				record.getBoundingClientRect().left,
			);
		},
	};
}

export const BesideHeadings390 = touch(headings(390));
export const BesideHeadings768 = headings(768);
export const BesideHeadings1440 = headings(1440);

// A list standing alone at a deeper route is a pushed Screen holding
// `<Split back>`: the Screen's back act leads up while the list stands alone,
// and the Split's `back` takes its place once a record is open.
function Tree(props: { open: boolean }) {
	return (
		<Page width={375} fluid>
			<Screen title="Knowledge" back="/repos/x">
				<Split
					back="/repos/x/knowledge"
					list={<Rows />}
					main={
						props.open ? (
							<Section title="Page">
								<Rows />
							</Section>
						) : undefined
					}
				/>
			</Screen>
		</Page>
	);
}

function backs(canvasElement: HTMLElement) {
	return [...canvasElement.querySelectorAll("a[aria-label='Back']")]
		.filter((el) => shown(el) && shown(el.parentElement))
		.map((el) => el.getAttribute("href"));
}

export const TreeAloneGoesUp: StoryObj = {
	render: () => <Tree open={false} />,
	play: async ({ canvasElement }) => {
		await expect(backs(canvasElement)).toEqual(["/repos/x"]);
		const root = document.documentElement;
		await expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);
	},
};

export const TreeRecordGoesToTree: StoryObj = {
	render: () => <Tree open />,
	play: async ({ canvasElement }) => {
		await expect(backs(canvasElement)).toEqual(["/repos/x/knowledge"]);
	},
};

export const TreeAloneGoesUpTouch = touch(TreeAloneGoesUp);
export const TreeRecordGoesToTreeTouch = touch(TreeRecordGoesToTree);

// The open record stands in one column at the measure, at the main's start: a
// Group, a Code and a Prose end at one x, and an end-fit ActionBar's acts end
// there too, not at the main's far edge.
function Record() {
	return (
		<Page width={1440}>
			<Place title="Now" bleed>
				<Split
					list={<Rows />}
					main={
						<>
							<ItemHeader title="Review the deploy" facts={["Ana Ruiz"]} />
							<Section title="Where it goes">
								<Group>
									<DefinitionRow label="From" value="main" />
									<DefinitionRow label="To" value="production" />
								</Group>
							</Section>
							<Code text={"pnpm check\npnpm verify"} />
							<Prose markdown="A paragraph of the record, read at the measure." />
							<ActionBar
								acts={[
									{ label: "Stop", onAct: noop },
									{ label: "Approve", onAct: noop },
								]}
							/>
						</>
					}
				/>
			</Place>
		</Page>
	);
}

// A token's width in px, read off a probe wearing its class.
function width(root: Element, className: string): number {
	const probe = document.createElement("div");
	probe.className = className;
	root.append(probe);
	const size = probe.getBoundingClientRect().width;
	probe.remove();
	return size;
}

export const RecordHoldsTheMeasure: StoryObj = {
	render: () => <Record />,
	play: async ({ canvasElement }) => {
		const main = must(regions(canvasElement)[1]);
		const inset = must(main.firstElementChild);
		const column = inset.getBoundingClientRect();
		const measure = width(canvasElement, "w-measure");
		await expect(column.width).toBe(width(canvasElement, "w-measure-inset"));
		await expect(column.left).toBe(main.getBoundingClientRect().left);
		const end =
			column.left + token(canvasElement, "px-page", "paddingLeft") + measure;
		for (const part of inset.children)
			await expect(part.getBoundingClientRect().right).toBeCloseTo(end, 0);
		const acts = canvasElement.querySelectorAll("button");
		const last = must(acts[acts.length - 1]).getBoundingClientRect();
		await expect(last.right).toBeCloseTo(end, 0);
	},
};

// A Thread filling a Split's main inside a column that has no height of its
// own (the showcase frame's form): the Place takes its height from its
// content, the log keeps room to read and the docked input ends inside it.
const ASKED = [
	{ id: "a", author: "you", body: "Why did the last deploy of api fail?" },
	{
		id: "b",
		author: "other",
		body: "The migration `0042_add_invoices` timed out, so the release stopped before it served traffic.",
	},
	{ id: "c", author: "you", body: "Open it and hold the redeploy." },
] as const;

function Conversation(props: { width: number }) {
	return (
		<div
			data-column
			style={{
				display: "flex",
				flexDirection: "column",
				width: props.width,
			}}
		>
			<Place title="Chats" bleed>
				<Split
					list={<Rows />}
					main={
						<>
							<ItemHeader
								title="Why did the last deploy of api fail?"
								facts={["Ana Ruiz", "Today"]}
							/>
							<Thread
								items={ASKED}
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

const frame = () =>
	new Promise<void>((done) => requestAnimationFrame(() => done()));

function fills(width: number): StoryObj {
	return {
		parameters: { layout: "fullscreen" },
		render: () => <Conversation width={width} />,
		play: async ({ canvas, canvasElement }) => {
			const log = await canvas.findByRole("log");
			const send = await canvas.findByRole("button", { name: "Send" });
			const column = must(canvasElement.querySelector("[data-column]"));
			for (let at = 0; at < 10; at++) await frame();
			const box = column.getBoundingClientRect();
			await expect(box.height).toBeGreaterThanOrEqual(400);
			await expect(log.getBoundingClientRect().height).toBeGreaterThanOrEqual(
				150,
			);
			await expect(send.getBoundingClientRect().bottom).toBeLessThanOrEqual(
				box.bottom,
			);
			const field = canvas.getByRole("textbox", { name: "Message" });
			await expect(field.getBoundingClientRect().width).toBeGreaterThanOrEqual(
				100,
			);
		},
	};
}

export const ThreadFillsMain375 = touch(fills(375));
export const ThreadFillsMain768 = fills(768);
export const ThreadFillsMain1280 = fills(1280);

// A part above the Thread is a sibling of it in the main: the head pairs with
// a Banner after it (facts or not), and the Thread stays the main's direct
// child, so the log scrolls inside the main whose form stays filled.
const LONG = Array.from({ length: 40 }, (_, at) => ({
	id: String(at),
	author: at % 2 ? "other" : "you",
	body: `Message ${at}: the migration timed out, so the release stopped before it served traffic.`,
}));

function Notified(props: { width: number; facts: boolean; banner: boolean }) {
	const [text, setText] = useState("");
	return (
		<Page width={props.width}>
			<Place title="Chats" bleed>
				<Split
					list={<Rows />}
					main={
						<>
							<ItemHeader
								title="Why did the last deploy of api fail?"
								facts={props.facts ? ["Ana Ruiz", "Today"] : undefined}
							/>
							{props.banner ? (
								<Banner kind="warn" sentence="The run is paused." />
							) : null}
							<Thread
								items={LONG}
								message={{
									key: (turn) => turn.id,
									author: (turn) => turn.author,
									body: (turn) => turn.body,
								}}
								foot={
									<MessageInput
										value={text}
										onChange={setText}
										placeholder="Reply"
										onSend={noop}
									/>
								}
							/>
						</>
					}
				/>
			</Place>
		</Page>
	);
}

function notified(width: number, facts: boolean): StoryObj {
	return {
		parameters: { layout: "fullscreen" },
		render: () => <Notified width={width} facts={facts} banner />,
		play: async ({ canvas, canvasElement }) => {
			const log = await canvas.findByRole("log");
			const send = await canvas.findByRole("button", { name: "Send" });
			const main = must(regions(canvasElement)[1]);
			const head = must(main.querySelector("header"));
			const banner = await canvas.findByRole("status");
			for (let at = 0; at < 10; at++) await frame();
			await expect(main.scrollHeight).toBeLessThanOrEqual(main.clientHeight);
			await expect(log.scrollHeight).toBeGreaterThan(log.clientHeight);
			await waitFor(() =>
				expect(
					log.scrollHeight - log.scrollTop - log.clientHeight,
				).toBeLessThan(4),
			);
			const gap =
				banner.getBoundingClientRect().top -
				head.getBoundingClientRect().bottom;
			await expect(gap).toBeCloseTo(
				token(canvasElement, "pb-pair", "paddingBottom"),
				0,
			);
			const before = [head, banner].map((el) => el.getBoundingClientRect().top);
			log.scrollTop = 0;
			await frame();
			await expect(
				[head, banner].map((el) => el.getBoundingClientRect().top),
			).toEqual(before);
			const bounds = main.getBoundingClientRect();
			const sent = send.getBoundingClientRect();
			await expect(sent.bottom).toBeLessThanOrEqual(bounds.bottom);
			const field = canvas.getByRole("textbox", { name: "Message" });
			await expect(field.getBoundingClientRect().width).toBeGreaterThanOrEqual(
				100,
			);
		},
	};
}

export const ThreadUnderBanner375 = touch(notified(375, true));
export const ThreadUnderBanner768 = notified(768, true);
export const ThreadUnderBanner1440 = notified(1440, true);
export const ThreadUnderBannerNoFacts1440 = notified(1440, false);

// The banner coming and going keeps the Thread mounted, so its typed input stays.
export const ThreadKeepsInputAsBannerToggles: StoryObj = {
	parameters: { layout: "fullscreen" },
	render: function Toggle() {
		const [banner, setBanner] = useState(false);
		return (
			<>
				<button type="button" onClick={() => setBanner((on) => !on)}>
					Toggle
				</button>
				<Notified width={768} facts banner={banner} />
			</>
		);
	},
	play: async ({ canvas, userEvent }) => {
		const field = await canvas.findByRole("textbox", { name: "Message" });
		await userEvent.type(field, "kept");
		await userEvent.click(canvas.getByRole("button", { name: "Toggle" }));
		await canvas.findByRole("status");
		await expect(canvas.getByRole("textbox", { name: "Message" })).toBe(field);
		await expect(field).toHaveValue("kept");
	},
};

// A Banner above a Thread in a Place body with no foot keeps the page inset at
// its sides and top and stands the body's gap from the log, which runs the
// body edge to edge, scrolls inside it and stays at its end.
function placeBanner(width: number): StoryObj {
	return {
		parameters: { layout: "fullscreen" },
		render: () => (
			<Page width={width}>
				<Place title="Chats">
					<Banner kind="warn" sentence="The run is paused." />
					<Thread
						items={LONG}
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
				</Place>
			</Page>
		),
		play: async ({ canvas, canvasElement }) => {
			const banner = await canvas.findByRole("status");
			const log = await canvas.findByRole("log");
			const send = await canvas.findByRole("button", { name: "Send" });
			for (let at = 0; at < 10; at++) await frame();
			const body = must(banner.parentElement);
			const edge = body.getBoundingClientRect();
			const b = banner.getBoundingClientRect();
			const l = log.getBoundingClientRect();
			const inset = token(canvasElement, "pl-page", "paddingLeft");
			await expect({
				left: b.left - edge.left,
				right: edge.right - b.right,
				top: b.top - edge.top,
				toLog: l.top - b.bottom,
			}).toEqual({
				left: inset,
				right: inset,
				top: inset,
				toLog: token(canvasElement, "pb-sections", "paddingBottom"),
			});
			await expect([l.left - edge.left, edge.right - l.right]).toEqual([0, 0]);
			await expect(body.scrollHeight).toBeLessThanOrEqual(body.clientHeight);
			await expect(log.scrollHeight).toBeGreaterThan(log.clientHeight);
			await waitFor(() =>
				expect(
					log.scrollHeight - log.scrollTop - log.clientHeight,
				).toBeLessThan(4),
			);
			await expect(send.getBoundingClientRect().bottom).toBeLessThanOrEqual(
				edge.bottom,
			);
		},
	};
}

export const PlaceBodyBanner375 = touch(placeBanner(375));
export const PlaceBodyBanner768 = placeBanner(768);
export const PlaceBodyBanner1440 = placeBanner(1440);

// An app that selects a record asks the pane's sheet open (`open`) and hears
// every close (`onClose`), the Details act's too. `closes` counts them.
function AppOpens(props: { width: number; beside: boolean }) {
	const [open, setOpen] = useState(true);
	const [closes, setCloses] = useState(0);
	return (
		<>
			<output data-closes>{closes}</output>
			<Page width={props.width} fluid>
				<Place title="Now" bleed>
					<Split
						list={<Rows />}
						main={
							<Section title="Review">
								<Rows />
							</Section>
						}
						pane={
							<Section title="Properties">
								<Rows />
							</Section>
						}
						beside={
							props.beside ? (
								<Screen title="File" back="/review">
									<Rows />
								</Screen>
							) : undefined
						}
						open={open}
						onClose={() => {
							setOpen(false);
							setCloses((count) => count + 1);
						}}
					/>
				</Place>
			</Page>
		</>
	);
}

const closesOf = (canvasElement: HTMLElement) =>
	must(canvasElement.querySelector("[data-closes]")).textContent;

// The sheet's box as the viewport sees it, in px.
function sheetBox(dialog: HTMLElement) {
	const box = dialog.getBoundingClientRect();
	return {
		left: box.left,
		right: box.right,
		bottom: box.bottom,
		width: box.width,
		viewport: { width: innerWidth, height: innerHeight },
	};
}

// Asked below `wide`, the pane stands as the sheet at the opening, closes by
// its close act and Escape with `onClose` hearing each, and the Details act
// opens it again with its close heard as well.
function appOpens(width: number, side: boolean): StoryObj {
	return {
		parameters: { layout: "fullscreen" },
		render: () => <AppOpens width={width} beside={false} />,
		play: async ({ canvas, canvasElement, userEvent }) => {
			const dialog = await screen.findByRole("dialog", { name: "Details" });
			await expect(shown(canvasElement.querySelector("aside"))).toBe(false);
			// A side sheet hangs at the viewport's end, a bottom sheet fills its
			// width at the bottom edge.
			await waitFor(() => {
				const box = sheetBox(dialog);
				if (side) {
					expect(box.right).toBe(box.viewport.width);
					expect(box.width).toBeLessThan(box.viewport.width);
				} else {
					expect(box.left).toBe(0);
					expect(box.width).toBe(box.viewport.width);
					expect(box.bottom).toBe(box.viewport.height);
				}
			});
			await userEvent.click(
				within(dialog).getByRole("button", { name: "Close" }),
			);
			await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
			await expect(closesOf(canvasElement)).toBe("1");
			await userEvent.click(canvas.getByRole("button", { name: "Details" }));
			await screen.findByRole("dialog", { name: "Details" });
			await userEvent.keyboard("{Escape}");
			await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
			await expect(closesOf(canvasElement)).toBe("2");
		},
	};
}

export const AppOpensPane375 = touch(appOpens(375, false));
export const AppOpensPane768 = appOpens(768, true);

// From `wide` the pane stands beside the main and the app's ask draws no sheet.
export const AppOpensPaneFromWide: StoryObj = {
	parameters: { layout: "fullscreen" },
	render: () => <AppOpens width={1200} beside={false} />,
	play: async ({ canvasElement }) => {
		const aside = await waitFor(() =>
			must(canvasElement.querySelector("aside")),
		);
		await expect(shown(aside)).toBe(true);
		for (let at = 0; at < 10; at++) await frame();
		await expect(screen.queryByRole("dialog")).toBeNull();
		await expect(closesOf(canvasElement)).toBe("0");
	},
};

// Beside a record the pane is a sheet at every width, so the ask applies from
// `wide` too.
export const AppOpensPaneBesideARecord: StoryObj = {
	parameters: { layout: "fullscreen" },
	render: () => <AppOpens width={1200} beside />,
	play: async ({ canvasElement }) => {
		const dialog = await screen.findByRole("dialog", { name: "Details" });
		await expect(canvasElement.querySelector("aside")).toBeNull();
		await expect(sheetBox(dialog).right).toBe(innerWidth);
	},
};

// A Split that never asks opens its sheet from the Details act alone.
export const PaneStaysClosedUnasked: StoryObj = {
	parameters: { layout: "fullscreen" },
	render: () => <Opened width={768} beside={false} />,
	play: async ({ canvas, userEvent }) => {
		for (let at = 0; at < 10; at++) await frame();
		await expect(screen.queryByRole("dialog")).toBeNull();
		await userEvent.click(canvas.getByRole("button", { name: "Details" }));
		await screen.findByRole("dialog", { name: "Details" });
	},
};
