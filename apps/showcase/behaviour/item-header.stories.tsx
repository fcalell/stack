import { ItemHeader } from "@fcalell/plugin-react-ui/components/item-header";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { BREAKPOINT_PX } from "@fcalell/ui-core/tokens";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { expect } from "storybook/test";

const noop = () => {};

// A page `width` px wide: the container its regions query.
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

const rect = (el: Element) => el.getBoundingClientRect();

export default { title: "Behaviour/ItemHeader" } satisfies Meta;

function touch(story: StoryObj, width: number): StoryObj {
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
						styles: { width: `${width}px`, height: "812px" },
						type: "mobile",
					},
				},
			},
		},
	};
}

function Facts(props: { width: number }) {
	return (
		<Page width={props.width}>
			<Place>
				<Pane title="Workflows">
					<ItemHeader
						title="Triage the inbox"
						facts={[
							{ label: "Outside content", onOpen: noop },
							{ label: "Open the run", href: "/runs/42" },
						]}
					/>
				</Pane>
			</Place>
		</Page>
	);
}

// A fact that goes to a route is an anchor to it, announced as a link, with
// the chevron and the box of the fact that opens a sheet beside it, which
// stays a button that marks a dialog.
async function factsGo(canvasElement: HTMLElement, density: string) {
	await expect(document.documentElement.dataset.density).toBe(density);
	const link = must(
		[...canvasElement.querySelectorAll("a")].find((el) =>
			el.textContent?.includes("Open the run"),
		),
	);
	const sheet = must(
		[...canvasElement.querySelectorAll("button")].find((el) =>
			el.textContent?.includes("Outside content"),
		),
	);
	await expect(link.getAttribute("href")).toBe("/runs/42");
	await expect(link.hasAttribute("aria-haspopup")).toBe(false);
	await expect(link.querySelector("svg")).not.toBeNull();
	await expect(sheet.getAttribute("aria-haspopup")).toBe("dialog");
	await expect(getComputedStyle(link).borderRadius).toBe(
		getComputedStyle(sheet).borderRadius,
	);
	await expect(rect(link).height).toBe(rect(sheet).height);
}

export const FactToARoute: StoryObj = {
	render: () => <Facts width={1280} />,
	play: async ({ canvasElement }) => factsGo(canvasElement, "desktop"),
};

export const FactToARouteTouch = touch(
	{
		render: () => <Facts width={390} />,
		play: async ({ canvasElement }) => factsGo(canvasElement, "touch"),
	},
	390,
);

function WithActs(props: { width: number; overline: boolean }) {
	return (
		<Page width={props.width}>
			<Place>
				<Pane title="Chats">
					<ItemHeader
						overline={props.overline ? ["Stead", "Thread 12"] : undefined}
						title="Why the last deploy failed"
						facts={["Ana Ruiz"]}
						actions={[{ icon: "Square", label: "End the thread", onAct: noop }]}
						more={[
							{
								label: "Delete the thread",
								onAct: noop,
								destructive: true,
							},
						]}
					/>
				</Pane>
			</Place>
		</Page>
	);
}

// A record's acts stand on its header's first line at the end: the overline's
// when it has one, else the title's.
async function onFirstLine(canvasElement: HTMLElement, overline: boolean) {
	const header = must(
		[...canvasElement.querySelectorAll("header")].find((el) =>
			el.textContent?.includes("Why the last deploy failed"),
		),
	);
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

export const ActsOnTheOverlineLine: StoryObj = {
	render: () => <WithActs width={1440} overline />,
	play: ({ canvasElement }) => onFirstLine(canvasElement, true),
};

export const ActsOnTheTitleLine: StoryObj = {
	render: () => <WithActs width={1440} overline={false} />,
	play: ({ canvasElement }) => onFirstLine(canvasElement, false),
};

// Below `tablet` the record's acts stay in its head: one set, reachable in that
// one place.
export const ActsStayInOnePlaceBelowTablet: StoryObj = {
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
