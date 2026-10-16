import { ActionBar } from "@fcalell/plugin-react-ui/components/action-bar";
import { Banner } from "@fcalell/plugin-react-ui/components/banner";
import { Code } from "@fcalell/plugin-react-ui/components/code";
import { DefinitionRow } from "@fcalell/plugin-react-ui/components/definition-row";
import { Diff } from "@fcalell/plugin-react-ui/components/diff";
import { Group } from "@fcalell/plugin-react-ui/components/group";
import { Image } from "@fcalell/plugin-react-ui/components/image";
import { ItemHeader } from "@fcalell/plugin-react-ui/components/item-header";
import { List } from "@fcalell/plugin-react-ui/components/list";
import { Message } from "@fcalell/plugin-react-ui/components/message";
import { MessageInput } from "@fcalell/plugin-react-ui/components/message-input";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Prose } from "@fcalell/plugin-react-ui/components/prose";
import { ProseDiff } from "@fcalell/plugin-react-ui/components/prose-diff";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Stats } from "@fcalell/plugin-react-ui/components/stats";
import { Thread } from "@fcalell/plugin-react-ui/components/thread";
import { SCREEN } from "@fcalell/plugin-react-ui/showcase/frames/image";
import { readsAt } from "@fcalell/plugin-react-ui/showcase/waiting";
import { BREAKPOINT_PX } from "@fcalell/ui-core/tokens";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useState } from "react";
import { expect, waitFor } from "storybook/test";

const NAMES = ["Ana Ruiz", "Ben Kaya", "Ema Okafor", "Rui Alves", "Zoe Park"];
const ROWS = {
	key: (name: string) => name,
	title: (name: string) => name,
};
const noop = () => {};

function Rows() {
	return <List items={NAMES} row={ROWS} />;
}

// A page `width` px wide: the container its Panes query.
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

// A token's width in px, read off a probe wearing its class.
function width(root: Element, className: string): number {
	const probe = document.createElement("div");
	probe.className = className;
	root.append(probe);
	const size = probe.getBoundingClientRect().width;
	probe.remove();
	return size;
}

function must<T extends Element>(el: T | null | undefined): T {
	if (!el) throw new Error("the element is not drawn");
	return el;
}

// The Panes of the place, in order.
function panes(canvasElement: HTMLElement): HTMLElement[] {
	return [...canvasElement.querySelectorAll<HTMLElement>("section[data-page]")];
}

// A Pane's body: the scrolling column under its bar.
function bodyOf(pane: Element): HTMLElement {
	return must(pane.querySelector<HTMLElement>(":scope > div > div"));
}

const frame = () =>
	new Promise<void>((done) => requestAnimationFrame(() => done()));

export default { title: "Behaviour/Pane" } satisfies Meta;

function viewport(width: number, height = 700) {
	return {
		tags: ["touch"],
		globals: {
			density: "touch",
			viewport: { value: `w${width}`, isRotated: false },
		},
		parameters: {
			layout: "fullscreen",
			viewport: {
				options: {
					[`w${width}`]: {
						name: `${width}`,
						styles: { width: `${width}px`, height: `${height}px` },
						type: "mobile",
					},
				},
			},
		},
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

// ── The bar ─────────────────────────────────────────────────────────

const LINES = Array.from({ length: 40 }, (_, at) => `Line ${at + 1}`);

// A Pane whose body scrolls with nothing tabbable inside takes the tab stop
// itself, so a keyboard reaches the text; the back act is the one stop before
// it.
export const BodyTakesTheTabStop: StoryObj = {
	render: () => (
		<div
			style={{
				width: 375,
				height: 300,
				display: "flex",
				flexDirection: "column",
			}}
		>
			<Place>
				<Pane title="Sink" back="/system">
					{LINES.map((line) => (
						<p key={line}>{line}</p>
					))}
				</Pane>
			</Place>
		</div>
	),
	play: async ({ canvasElement, userEvent }) => {
		const stop = () =>
			canvasElement.querySelector<HTMLElement>("div[tabindex='0']");
		await waitFor(() => expect(stop()).not.toBeNull());
		const body = stop();
		// The head's acts take their stops first; the body is the last.
		for (let at = 0; at < 5 && document.activeElement !== body; at++)
			await userEvent.tab();
		await expect(document.activeElement).toBe(body);
	},
};

const TOOLS = [
	{ icon: "ListFilter" as const, label: "Filter", onAct: noop },
	{ icon: "RefreshCw" as const, label: "Refresh", onAct: noop },
	{ icon: "Download" as const, label: "Export", onAct: noop },
	{ icon: "Share2" as const, label: "Share", onAct: noop },
];
const MORE = [{ label: "Copy deploy hook", onAct: noop }];

// The bar is one line at every width. The title truncates and keeps two fifths
// of the row; the acts that do not fit beside it fold into the more menu, the
// last first, every target at 44 px on touch.
const ROW_TITLE = "Deploy history";

// The labels of the acts standing in the head, and of the more menu's items.
function standing(head: Element): string[] {
	return TOOLS.map((act) => act.label).filter((label) =>
		head.querySelector(`[aria-label='${label}']`),
	);
}

async function menuLabels(head: Element): Promise<string[]> {
	const more = must(head.querySelector<HTMLElement>("[aria-label='More']"));
	more.click();
	await waitFor(() =>
		expect(document.querySelectorAll("[role=menuitem]").length).toBeGreaterThan(
			0,
		),
	);
	const labels = [...document.querySelectorAll("[role=menuitem]")].map(
		(item) => item.textContent ?? "",
	);
	document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
	return labels;
}

// A bar with `count` acts at `width`, `shown` of which stand beside the title.
function row(width: number, count: number, shown: number): StoryObj {
	return {
		...viewport(width),
		render: () => (
			<Place>
				<Pane title={ROW_TITLE} back="/system" actions={TOOLS.slice(0, count)}>
					<p>The first section.</p>
				</Pane>
			</Place>
		),
		play: async ({ canvasElement }) => {
			const head = must(canvasElement.querySelector("header"));
			const title = must(head.querySelector("h1"));
			const bar = must(head.firstElementChild);
			await waitFor(() => expect(standing(head).length).toBe(shown));
			const box = head.getBoundingClientRect();
			const line = bar.getBoundingClientRect();
			const text = title.getBoundingClientRect();
			const back = must(
				head.querySelector("[aria-label='Back']"),
			).getBoundingClientRect();
			const labels = standing(head);
			console.log(
				`${width} x ${count}: head ${box.height}, row ${line.width}, title ${text.width}x${text.height}, standing ${labels.join(",")}`,
			);
			// One line: the title is a single line, and every target stands on its centre.
			await expect(text.height).toBeLessThanOrEqual(
				Number.parseFloat(getComputedStyle(title).lineHeight) + 1,
			);
			await expect(text.width).toBeGreaterThanOrEqual(line.width * 0.4 - 1);
			await expect(back.width).toBeGreaterThanOrEqual(44);
			for (const label of labels) {
				const at = must(
					head.querySelector(`[aria-label='${label}']`),
				).getBoundingClientRect();
				await expect(at.width).toBeGreaterThanOrEqual(44);
				await expect(at.height).toBeGreaterThanOrEqual(44);
				await expect(at.top + at.height / 2).toBeCloseTo(
					back.top + back.height / 2,
					0,
				);
				await expect(at.right).toBeLessThanOrEqual(box.right);
			}
			// The last fold first: the acts standing are the first ones.
			await expect(labels).toEqual(
				TOOLS.slice(0, shown).map((act) => act.label),
			);
			if (shown < count) {
				await expect(await menuLabels(head)).toEqual(
					TOOLS.slice(shown, count).map((act) => act.label),
				);
			} else await expect(head.querySelector("[aria-label='More']")).toBeNull();
		},
	};
}

export const ActsShareTheTitleRow1At320 = row(320, 1, 1);
export const ActsShareTheTitleRow1At390 = row(390, 1, 1);
export const ActsShareTheTitleRow3At320 = row(320, 3, 1);
export const ActsShareTheTitleRow3At390 = row(390, 3, 3);
export const ActsShareTheTitleRow4At320 = row(320, 4, 1);
export const ActsShareTheTitleRow4At390 = row(390, 4, 2);

// ── A failed title ───────────────────────────────────────────────────

const TITLES = readsAt("pane/title");

// A title whose read failed, with no fallback, draws nothing: the head keeps
// the height a loaded title gives it, its back act and its acts, and the body
// line speaks.
function failedTitle(width: number): StoryObj {
	return {
		...viewport(width),
		render: () => (
			<div>
				<Place>
					<Pane
						title={TITLES.failing.at(() => "Never drawn")}
						back="/system"
						actions={TOOLS.slice(0, 1)}
						read={TITLES.failing}
					>
						<p>The first section.</p>
					</Pane>
				</Place>
				<Place>
					<Pane title="Deploys" back="/system" actions={TOOLS.slice(0, 1)}>
						<p>The first section.</p>
					</Pane>
				</Place>
			</div>
		),
		play: async ({ canvasElement }) => {
			const [failed, loaded] = [...canvasElement.querySelectorAll("header")];
			if (!failed || !loaded) throw new Error("the heads are not drawn");
			await waitFor(() =>
				expect(failed.parentElement?.textContent).toContain("didn't load"),
			);
			await expect(failed.querySelector("[data-painted]")).toBeNull();
			await expect(failed.querySelector("h1")).toBeNull();
			await expect(failed.textContent?.trim()).toBe("");
			await expect(failed.querySelector("[aria-label='Back']")).not.toBeNull();
			await expect(
				failed.querySelector("[aria-label='Filter']"),
			).not.toBeNull();
			await expect(failed.getBoundingClientRect().height).toBeCloseTo(
				loaded.getBoundingClientRect().height,
				0,
			);
		},
	};
}

export const FailedTitleIsBlankAt320 = failedTitle(320);
export const FailedTitleIsBlankAt1280 = failedTitle(1280);

// Widening the row returns the folded acts, narrowing it folds them again,
// last first, with no reload.
export const WideningReturnsTheActs: StoryObj = {
	...viewport(700),
	render: () => (
		<div data-box="" style={{ width: 320 }}>
			<Place>
				<Pane title={ROW_TITLE} back="/system" actions={TOOLS}>
					<p>The first section.</p>
				</Pane>
			</Place>
		</div>
	),
	play: async ({ canvasElement }) => {
		const head = must(canvasElement.querySelector("header"));
		const box = must(canvasElement.querySelector<HTMLElement>("[data-box]"));
		await waitFor(() => expect(standing(head).length).toBeLessThan(4));
		const folded = standing(head).length;
		await expect(standing(head)).toEqual(
			TOOLS.slice(0, folded).map((act) => act.label),
		);
		box.style.width = "700px";
		await waitFor(() => expect(standing(head).length).toBe(4));
		await expect(head.querySelector("[aria-label='More']")).toBeNull();
		box.style.width = "320px";
		await waitFor(() => expect(standing(head).length).toBe(folded));
	},
};

// With no back act the title stands at the page's gutter, the acts and the
// more act (the head's own) at the row's end, one line.
function gutter(width: number): StoryObj {
	return {
		...viewport(width),
		render: () => (
			<Place>
				<Pane title="Deploys" actions={TOOLS.slice(0, 2)} more={MORE}>
					<p>The first section.</p>
				</Pane>
			</Place>
		),
		play: async ({ canvasElement }) => {
			const head = must(canvasElement.querySelector("header"));
			const title = must(head.querySelector("h1")).getBoundingClientRect();
			const filter = must(
				head.querySelector("[aria-label='Filter']"),
			).getBoundingClientRect();
			const more = must(
				head.querySelector("[aria-label='More']"),
			).getBoundingClientRect();
			const box = head.getBoundingClientRect();
			const section = must(
				head.nextElementSibling?.querySelector("p"),
			).getBoundingClientRect();
			console.log(
				`${width}: head ${box.height}, title ${title.left} to ${title.right}, filter ${filter.left}, more ${more.right} of ${box.right}`,
			);
			await expect(title.left).toBeCloseTo(section.left, 1);
			await expect(title.right).toBeLessThanOrEqual(filter.left);
			await expect(more.right).toBeLessThanOrEqual(box.right);
			await expect(filter.height).toBeGreaterThanOrEqual(44);
			await expect(more.height).toBeGreaterThanOrEqual(44);
			// The strip's 45 under the head's step above and below.
			await expect(box.height).toBeCloseTo(45 + 16, 0);
			await expect(filter.top + filter.height / 2).toBeCloseTo(
				title.top + title.height / 2,
				0,
			);
		},
	};
}

export const TitleStandsAtTheGutterAt320 = gutter(320);
export const TitleStandsAtTheGutterAt390 = gutter(390);

// The same fold rule on the desktop: a narrow Pane's head folds its acts into
// the more menu beside the back act, and a wide one holds them all.
function desktop(width: number, folds: boolean): StoryObj {
	return {
		render: () => (
			<Page width={width} fluid>
				<Place>
					<Pane title={ROW_TITLE} back="/system" actions={TOOLS}>
						<p>The first section.</p>
					</Pane>
				</Place>
			</Page>
		),
		play: async ({ canvasElement }) => {
			const head = must(canvasElement.querySelector("header"));
			const title = must(head.querySelector("h1"));
			const bar = must(head.firstElementChild).getBoundingClientRect();
			const text = title.getBoundingClientRect();
			const shown = standing(head).length;
			console.log(
				`${width}: row ${bar.width}, title ${text.width}, standing ${shown}`,
			);
			await expect(shown < 4).toBe(folds);
			await expect(text.width).toBeGreaterThanOrEqual(bar.width * 0.4 - 1);
			await expect(text.height).toBeLessThanOrEqual(
				Number.parseFloat(getComputedStyle(title).lineHeight) + 1,
			);
			await expect(standing(head)).toEqual(
				TOOLS.slice(0, shown).map((act) => act.label),
			);
			if (folds)
				await expect(await menuLabels(head)).toEqual(
					TOOLS.slice(shown).map((act) => act.label),
				);
		},
	};
}

export const NarrowPaneFoldsItsActs = desktop(260, true);
export const WidePaneHoldsItsActs = desktop(900, false);

// ── The title and its sections ──────────────────────────────────────

// Each Pane's title is an h1 and its sections h2 at every width, so below
// `tablet`, where only the last Pane stands, its h1 is the one visible; from
// `tablet` the list's h1 stands first, and the record's title stands at the
// sections' gutter, its Close act ending the line.
function headings(width: number): StoryObj {
	return {
		render: () => (
			<Page width={width} fluid>
				<Place>
					<Pane title="System">
						<Rows />
					</Pane>
					<Pane title="History" back="/system">
						<Section title="Entries">
							<Rows />
						</Section>
					</Pane>
				</Place>
			</Page>
		),
		play: async ({ canvasElement }) => {
			const drawn = [
				...canvasElement.querySelectorAll("h1, h2, h3, h4, h5, h6"),
			].filter((el) => el.getClientRects().length > 0);
			const h1s = drawn.filter((el) => el.tagName === "H1");
			await expect(drawn[0]?.tagName).toBe("H1");
			const title = (el: Element) => el.textContent;
			const frame = must(canvasElement.firstElementChild).clientWidth;
			if (frame < BREAKPOINT_PX.tablet)
				await expect(h1s.map(title)).toEqual(["History"]);
			else await expect(h1s.map(title)).toEqual(["System", "History"]);
			const entries = drawn.find((el) => title(el) === "Entries");
			await expect(entries?.tagName).toBe("H2");
			if (frame < BREAKPOINT_PX.tablet) return;
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

export const HeadingsAt390 = touch(headings(390));
export const HeadingsAt768 = headings(768);
export const HeadingsAt1440 = headings(1440);

// ── The body ────────────────────────────────────────────────────────

function Foot(props: { foot: boolean }) {
	return (
		<Page width={375}>
			<Place>
				<Pane
					title="Now"
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
					<Section title="Open">
						<Rows />
						<Rows />
						<Rows />
						<Rows />
					</Section>
				</Pane>
			</Place>
		</Page>
	);
}

async function footGap(canvasElement: HTMLElement) {
	const body = bodyOf(must(panes(canvasElement)[0]));
	body.scrollTop = body.scrollHeight;
	await waitFor(() => expect(body.scrollTop).toBeGreaterThan(0));
	const last = must(body.lastElementChild).getBoundingClientRect();
	return {
		gap: body.getBoundingClientRect().bottom - last.bottom,
		sections: token(canvasElement, "pb-sections", "paddingBottom"),
		page: token(canvasElement, "pb-page", "paddingBottom"),
	};
}

// A Pane over a docked foot ends its content a sections gap above the foot;
// with no foot its last child ends a page inset above the body's end.
export const BodyOverFoot: StoryObj = {
	render: () => <Foot foot />,
	play: async ({ canvasElement }) => {
		const { gap, sections } = await footGap(canvasElement);
		await expect(gap).toBe(sections);
	},
};

export const BodyWithoutFoot: StoryObj = {
	render: () => <Foot foot={false} />,
	play: async ({ canvasElement }) => {
		const { gap, page } = await footGap(canvasElement);
		await expect(gap).toBe(page);
	},
};

export const BodyOverFootTouch = touch(BodyOverFoot);
export const BodyWithoutFootTouch = touch(BodyWithoutFoot);

// The list and the record share one top under the bars' hairline, and a row's
// wash stays inside a Group's border.
export const TopsAndWash: StoryObj = {
	render: () => (
		<Page width={1300}>
			<Place>
				<Pane title="Now">
					<Section title="Open">
						<Group
							list={{
								items: NAMES,
								row: {
									...ROWS,
									onOpen: noop,
									selected: (name) => name === NAMES[1],
								},
							}}
						/>
					</Section>
				</Pane>
				<Pane title="Review" back="/now">
					<Section title="Detail">
						<Rows />
					</Section>
				</Pane>
			</Place>
		</Page>
	),
	play: async ({ canvasElement }) => {
		const [list, record] = panes(canvasElement);
		const top = (el: Element | undefined) =>
			must(el?.querySelector("h2")).getBoundingClientRect().top;
		await expect(top(list)).toBe(top(record));
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

// The parts of a record: each ends where a Prose does.
function Parts() {
	return (
		<>
			<ItemHeader facts={["Ana Ruiz"]} />
			<Section title="Where it goes">
				<Group
					items={[
						{ key: "from", row: <DefinitionRow label="From" value="main" /> },
						{ key: "to", row: <DefinitionRow label="To" value="production" /> },
					]}
				/>
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
	);
}

// The open record stands in one column at the measure, at the Pane's start: a
// Group, a Code and a Prose end at one x, and an end-fit ActionBar's acts end
// there too, not at the Pane's far edge. A `wide` Pane lifts the measure: its
// content ends at the page inset of the Pane's far edge.
function record(wide: boolean): StoryObj {
	return {
		render: () => (
			<Page width={1440}>
				<Place>
					<Pane title="Now">
						<Rows />
					</Pane>
					<Pane title="Review the deploy" back="/now" wide={wide}>
						<Parts />
					</Pane>
				</Place>
			</Page>
		),
		play: async ({ canvasElement }) => {
			const body = bodyOf(must(panes(canvasElement)[1]));
			const box = body.getBoundingClientRect();
			const inset = token(canvasElement, "px-page", "paddingLeft");
			const start = box.left + inset;
			const end = wide
				? box.right - inset - (body.offsetWidth - body.clientWidth)
				: start + width(canvasElement, "w-measure");
			// A Prose holds the measure itself, so the lift shows in the Section.
			for (const part of body.children) {
				await expect(part.getBoundingClientRect().left).toBeCloseTo(start, 0);
				if (wide && part.tagName !== "SECTION") continue;
				await expect(part.getBoundingClientRect().right).toBeCloseTo(end, 0);
			}
			const acts = canvasElement.querySelectorAll("button");
			const last = must(acts[acts.length - 1]).getBoundingClientRect();
			await expect(last.right).toBeCloseTo(end, 0);
		},
	};
}

export const RecordHoldsTheMeasure = record(false);
export const WidePaneLiftsTheMeasure = record(true);

const CHECK = Array.from({ length: 10 }, (_, line) => `line ${line + 1}`).join(
	"\n",
);

// Blocks that stand in a column with a frame that hides its overflow: three
// Groups and the frames of Code, Diff, ProseDiff, Message, Image and Stats.
function Blocks() {
	return (
		<>
			{[0, 1, 2].map((key) => (
				<Group key={key} list={{ items: NAMES, row: ROWS }} />
			))}
			<Code text={CHECK} />
			<Diff
				label="a.ts"
				before={CHECK}
				after={CHECK.replace("line 5", "five")}
			/>
			<ProseDiff
				before="The deploy ships on Friday after the freeze lifts, with the migration first."
				after="The deploy ships on Monday after the freeze lifts, with the migration first."
			/>
			<Message
				author="system"
				body="Deployed"
				detail={{ row: { title: "Deploy 41", meta: ["main", "2 min ago"] } }}
			/>
			<Image src={SCREEN} alt="A page" aspect={16 / 10} />
			<Stats
				items={[
					{ label: "Deploys", value: 41 },
					{ label: "Failed", value: 3 },
				]}
			/>
		</>
	);
}

// A Pane shorter than the blocks in it scrolls, and no block gives up height
// to the scroll: each keeps its content's height.
const keepsItsRows: StoryObj = {
	render: () => (
		<div
			style={{
				width: 390,
				maxWidth: "100%",
				height: 420,
				display: "flex",
				flexDirection: "column",
			}}
		>
			<Place>
				<Pane title="Blocks">
					<Blocks />
				</Pane>
			</Place>
		</div>
	),
	play: async ({ canvasElement }) => {
		const body = bodyOf(must(panes(canvasElement)[0]));
		await waitFor(() =>
			expect(body.scrollHeight).toBeGreaterThan(body.clientHeight),
		);
		const clipped = [...body.children]
			.map((block, at) => ({ at, block }))
			.filter(({ block }) => block.scrollHeight > block.clientHeight + 1)
			.map(
				({ at, block }) => `${at}: ${block.clientHeight}/${block.scrollHeight}`,
			);
		await expect(clipped).toEqual([]);
	},
};

export const BlocksKeepTheirRows = keepsItsRows;
export const BlocksKeepTheirRowsTouch = touch(keepsItsRows);

// ── A Thread or a Canvas fills the Pane ─────────────────────────────

const ASKED = [
	{ id: "a", author: "you", body: "Why did the last deploy of api fail?" },
	{
		id: "b",
		author: "other",
		body: "The migration `0042_add_invoices` timed out, so the release stopped before it served traffic.",
	},
	{ id: "c", author: "you", body: "Open it and hold the redeploy." },
] as const;

const LONG = Array.from({ length: 40 }, (_, at) => ({
	id: String(at),
	author: at % 2 ? ("other" as const) : ("you" as const),
	body: `Message ${at}: the migration timed out, so the release stopped before it served traffic.`,
}));

const turn = {
	key: (each: { id: string }) => each.id,
	author: (each: { author: "you" | "other" }) => each.author,
	body: (each: { body: string }) => each.body,
};

// A Thread in a Pane's body takes the free height by plain flex: its log keeps
// room to read, scrolls past it, and the docked input ends inside the Pane.
function Conversation(props: { width: number }) {
	return (
		<Page width={props.width}>
			<Place>
				<Pane title="Chats">
					<Rows />
				</Pane>
				<Pane title="Why did the last deploy of api fail?" back="/chats">
					<Thread
						items={ASKED}
						message={turn}
						foot={
							<MessageInput
								value=""
								onChange={noop}
								placeholder="Reply"
								onSend={noop}
							/>
						}
					/>
				</Pane>
			</Place>
		</Page>
	);
}

function fills(width: number): StoryObj {
	return {
		parameters: { layout: "fullscreen" },
		render: () => <Conversation width={width} />,
		play: async ({ canvas, canvasElement }) => {
			const log = await canvas.findByRole("log");
			const send = await canvas.findByRole("button", { name: "Send" });
			for (let at = 0; at < 10; at++) await frame();
			const pane = must(panes(canvasElement)[1]).getBoundingClientRect();
			await expect(log.getBoundingClientRect().height).toBeGreaterThanOrEqual(
				150,
			);
			await expect(send.getBoundingClientRect().bottom).toBeLessThanOrEqual(
				pane.bottom,
			);
			const field = canvas.getByRole("textbox", { name: "Message" });
			await expect(field.getBoundingClientRect().width).toBeGreaterThanOrEqual(
				100,
			);
			// The body does not scroll: the Thread takes what the body has.
			const body = bodyOf(must(panes(canvasElement)[1]));
			await expect(body.scrollHeight).toBeLessThanOrEqual(body.clientHeight);
		},
	};
}

export const ThreadFillsPane375 = touch(fills(375));
export const ThreadFillsPane768 = fills(768);
export const ThreadFillsPane1280 = fills(1280);

function Notified(props: { width: number; banner: boolean }) {
	const [text, setText] = useState("");
	return (
		<Page width={props.width}>
			<Place>
				<Pane title="Chats">
					<Rows />
				</Pane>
				<Pane title="Why did the last deploy of api fail?" back="/chats">
					<ItemHeader facts={["Ana Ruiz", "Today"]} />
					{props.banner ? (
						<Banner kind="warn" sentence="The run is paused." />
					) : null}
					<Thread
						items={LONG}
						message={turn}
						foot={
							<MessageInput
								value={text}
								onChange={setText}
								placeholder="Reply"
								onSend={noop}
							/>
						}
					/>
				</Pane>
			</Place>
		</Page>
	);
}

// A part above the Thread is a sibling of it in the body, a sections gap from
// it, and the Thread stays the body's direct child, so the log scrolls inside
// the body whose form stays filled.
function notified(width: number): StoryObj {
	return {
		parameters: { layout: "fullscreen" },
		render: () => <Notified width={width} banner />,
		play: async ({ canvas, canvasElement }) => {
			const log = await canvas.findByRole("log");
			const send = await canvas.findByRole("button", { name: "Send" });
			const record = must(panes(canvasElement)[1]);
			const body = bodyOf(record);
			const head = must(body.firstElementChild);
			const banner = await canvas.findByRole("status");
			for (let at = 0; at < 10; at++) await frame();
			await expect(body.scrollHeight).toBeLessThanOrEqual(body.clientHeight);
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
				token(canvasElement, "pb-sections", "paddingBottom"),
				0,
			);
			const before = [head, banner].map((el) => el.getBoundingClientRect().top);
			log.scrollTop = 0;
			await frame();
			await expect(
				[head, banner].map((el) => el.getBoundingClientRect().top),
			).toEqual(before);
			const bounds = record.getBoundingClientRect();
			const sent = send.getBoundingClientRect();
			await expect(sent.bottom).toBeLessThanOrEqual(bounds.bottom);
			const field = canvas.getByRole("textbox", { name: "Message" });
			await expect(field.getBoundingClientRect().width).toBeGreaterThanOrEqual(
				100,
			);
		},
	};
}

export const ThreadUnderBanner375 = touch(notified(375));
export const ThreadUnderBanner768 = notified(768);
export const ThreadUnderBanner1440 = notified(1440);

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
				<Notified width={768} banner={banner} />
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

// A Banner above a Thread in a Pane with no foot keeps the page inset at its
// sides and top and stands the body's gap from the log, which scrolls inside
// the body and stays at its end.
function paneBanner(width: number): StoryObj {
	return {
		parameters: { layout: "fullscreen" },
		render: () => (
			<Page width={width}>
				<Place>
					<Pane title="Chats">
						<Banner kind="warn" sentence="The run is paused." />
						<Thread
							items={LONG}
							message={turn}
							foot={
								<MessageInput
									value=""
									onChange={noop}
									placeholder="Reply"
									onSend={noop}
								/>
							}
						/>
					</Pane>
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
				top: b.top - edge.top,
				toLog: l.top - b.bottom,
			}).toEqual({
				left: inset,
				top: inset,
				toLog: token(canvasElement, "pb-sections", "paddingBottom"),
			});
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

export const PaneBanner375 = touch(paneBanner(375));
export const PaneBanner768 = paneBanner(768);
export const PaneBanner1440 = paneBanner(1440);
