import { ActionBar } from "@fcalell/plugin-react-ui/components/action-bar";
import { Code } from "@fcalell/plugin-react-ui/components/code";
import { DefinitionRow } from "@fcalell/plugin-react-ui/components/definition-row";
import { Group } from "@fcalell/plugin-react-ui/components/group";
import { ItemHeader } from "@fcalell/plugin-react-ui/components/item-header";
import { List } from "@fcalell/plugin-react-ui/components/list";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Prose } from "@fcalell/plugin-react-ui/components/prose";
import { Screen } from "@fcalell/plugin-react-ui/components/screen";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Split } from "@fcalell/plugin-react-ui/components/split";
import { BREAKPOINT_PX } from "@fcalell/ui-core/tokens";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { expect } from "storybook/test";

// A record in a Split: the column a record beside the main reads in, the list
// and pane sizing to their content, and a record's acts in its own header.

const SHORT = ["Ana", "Ben", "Ema"];
const LONG = [
	"Review the deploy of the billing service before the Friday freeze",
	"Rotate the signing keys for the webhook receiver in production",
];
const noop = () => {};

function Rows(props: { names: string[] }) {
	return (
		<List
			items={props.names}
			row={{ key: (name: string) => name, title: (name: string) => name }}
		/>
	);
}

function Page(props: { width: number; children: ReactNode }) {
	return (
		<div
			style={{
				width: props.width,
				height: 700,
				display: "flex",
				flexDirection: "column",
			}}
		>
			{props.children}
		</div>
	);
}

function must<T extends Element>(el: T | null | undefined): T {
	if (!el) throw new Error("the element is not drawn");
	return el;
}

function regions(canvasElement: HTMLElement) {
	return [...must(canvasElement.querySelector("[data-split]")).children];
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

function pad(root: Element): number {
	const probe = document.createElement("div");
	probe.className = "px-page";
	root.append(probe);
	const size = Number.parseFloat(getComputedStyle(probe).paddingLeft);
	probe.remove();
	return size;
}

export default { title: "Behaviour/Split record" } satisfies Meta;

// The record's parts, which end where a Prose does.
function Parts() {
	return (
		<>
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
	);
}

// A record the main opened (a `Screen` in `beside`) holds the main's column:
// the measure inside the page inset, at its region's start, every block ending
// on one line. The page is wide enough for half of what the list leaves to
// pass the column.
export const BesideRecordHoldsTheMeasure: StoryObj = {
	render: () => (
		<Page width={2000}>
			<Place title="Now" bleed>
				<Split
					list={<Rows names={SHORT} />}
					main={<ItemHeader title="Review the deploy" facts={["Ana Ruiz"]} />}
					beside={
						<Screen title="Add a repo" back="/review">
							<Parts />
						</Screen>
					}
				/>
			</Place>
		</Page>
	),
	play: async ({ canvasElement }) => {
		const beside = must(regions(canvasElement)[2]);
		const column = must(beside.querySelector("[data-page]"));
		const box = column.getBoundingClientRect();
		await expect(box.width).toBe(width(canvasElement, "w-measure-inset"));
		await expect(box.left).toBe(beside.getBoundingClientRect().left);
		const end =
			box.left + pad(canvasElement) + width(canvasElement, "w-measure");
		for (const part of column.children)
			await expect(part.getBoundingClientRect().right).toBeCloseTo(end, 0);
	},
};

function Sized(props: { width: number; names: string[] }) {
	return (
		<Page width={props.width}>
			<Place title="Now" bleed>
				<Split
					list={<Rows names={props.names} />}
					main={<ItemHeader title="Review the deploy" />}
				/>
			</Place>
		</Page>
	);
}

// A list of short rows stands at the floor, one of long rows at the ceiling,
// and the main takes the rest either way.
export const ListSizesToItsContent: StoryObj = {
	render: () => <Sized width={1440} names={SHORT} />,
	play: async ({ canvasElement }) => {
		const [list, main] = regions(canvasElement);
		const floor = width(canvasElement, "w-region-min");
		const box = must(list).getBoundingClientRect();
		await expect(box.width).toBeGreaterThanOrEqual(floor);
		await expect(box.width).toBeLessThan(width(canvasElement, "w-list"));
		await expect(must(main).getBoundingClientRect().left).toBeCloseTo(
			box.right,
			0,
		);
		await expect(must(main).getBoundingClientRect().right).toBeCloseTo(
			must(canvasElement.querySelector("[data-split]")).getBoundingClientRect()
				.right,
			0,
		);
	},
};

export const ListStopsAtTheCeiling: StoryObj = {
	render: () => <Sized width={1440} names={LONG} />,
	play: async ({ canvasElement }) => {
		const [list] = regions(canvasElement);
		await expect(must(list).getBoundingClientRect().width).toBeCloseTo(
			width(canvasElement, "w-list"),
			0,
		);
	},
};

// 003-122's breakpoints hold against the ceiling: at the tablet page the list
// at its ceiling leaves the main the rest, and below it one region stands.
export const ListAtTheCeilingKeepsTheTabletBreakpoint: StoryObj = {
	render: () => <Sized width={BREAKPOINT_PX.tablet} names={LONG} />,
	play: async ({ canvasElement }) => {
		const [list, main] = regions(canvasElement);
		await expect(getComputedStyle(must(list)).display).not.toBe("none");
		const left =
			BREAKPOINT_PX.tablet - must(list).getBoundingClientRect().width;
		await expect(must(main).getBoundingClientRect().width).toBeCloseTo(left, 0);
		await expect(left).toBeGreaterThanOrEqual(
			BREAKPOINT_PX.tablet - width(canvasElement, "w-list"),
		);
	},
};

export const ListBelowTabletStandsAlone: StoryObj = {
	render: () => <Sized width={BREAKPOINT_PX.tablet - 1} names={LONG} />,
	play: async ({ canvasElement }) => {
		const [list, main] = regions(canvasElement);
		await expect(getComputedStyle(must(main)).display).not.toBe("none");
		await expect(getComputedStyle(must(list)).display).toBe("none");
	},
};

function WithActs(props: { width: number; overline: boolean }) {
	return (
		<Page width={props.width}>
			<Place title="Chats" bleed>
				<Split
					list={<Rows names={SHORT} />}
					main={
						<>
							<ItemHeader
								overline={props.overline ? ["Stead", "Thread 12"] : undefined}
								title="Why the last deploy failed"
								facts={["Ana Ruiz"]}
								actions={[
									{ icon: "Square", label: "End the thread", onAct: noop },
								]}
								more={[
									{
										label: "Delete the thread",
										onAct: noop,
										destructive: true,
									},
								]}
							/>
							<Parts />
						</>
					}
				/>
			</Place>
		</Page>
	);
}

// A record's acts stand on its header's first line at the end: the overline's
// when it has one, else the title's.
async function onFirstLine(canvasElement: HTMLElement, overline: boolean) {
	const header = must(canvasElement.querySelector("[data-split] header"));
	const first = must(
		overline ? header.querySelector("p") : header.querySelector("h2, h3"),
	).getBoundingClientRect();
	const buttons = [...header.querySelectorAll("button")];
	await expect(buttons.length).toBe(2);
	for (const button of buttons) {
		const box = button.getBoundingClientRect();
		const middle = box.top + box.height / 2;
		await expect(middle).toBeGreaterThanOrEqual(first.top);
		await expect(middle).toBeLessThanOrEqual(first.bottom);
		await expect(box.left).toBeGreaterThanOrEqual(first.right - 1);
	}
	const last = must(buttons[1]).getBoundingClientRect();
	await expect(last.right).toBeGreaterThanOrEqual(
		header.getBoundingClientRect().right - 1,
	);
}

export const RecordActsOnTheOverlineLine: StoryObj = {
	render: () => <WithActs width={1440} overline />,
	play: ({ canvasElement }) => onFirstLine(canvasElement, true),
};

export const RecordActsOnTheTitleLine: StoryObj = {
	render: () => <WithActs width={1440} overline={false} />,
	play: ({ canvasElement }) => onFirstLine(canvasElement, false),
};

// Below `tablet` the record stands alone under the Place's back act, and its
// acts stay in its head: reachable in that one place, not also in the Place's
// strip or top bar.
export const RecordActsStayInOnePlaceBelowTablet: StoryObj = {
	render: () => <WithActs width={BREAKPOINT_PX.tablet - 1} overline />,
	play: async ({ canvasElement }) => {
		const ends = canvasElement.querySelectorAll(
			'button[aria-label="End the thread"]',
		);
		await expect(ends.length).toBe(1);
		await expect(
			must(ends[0]).closest("header")?.querySelector("h2, h3"),
		).not.toBeNull();
	},
};
