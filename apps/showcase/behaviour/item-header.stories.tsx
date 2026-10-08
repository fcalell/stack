import { ActionBar } from "@fcalell/plugin-react-ui/components/action-bar";
import { ItemHeader } from "@fcalell/plugin-react-ui/components/item-header";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Split } from "@fcalell/plugin-react-ui/components/split";
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

// A step's size in px, read off a probe wearing its class.
function step(root: Element, className: string): number {
	const probe = document.createElement("div");
	probe.className = className;
	root.append(probe);
	const size = Number.parseFloat(getComputedStyle(probe).paddingBottom);
	probe.remove();
	return size;
}

function must<T extends Element>(el: T | null | undefined): T {
	if (!el) throw new Error("the element is not drawn");
	return el;
}

const rect = (el: Element) => el.getBoundingClientRect();

// The record's head, among the page's own headers.
const headOf = (root: Element, title: string) =>
	must(
		[...root.querySelectorAll("header")].find((el) =>
			el.textContent?.includes(title),
		),
	);

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

function Job(props: { width: number }) {
	return (
		<Page width={props.width}>
			<Place title="Jobs">
				<ItemHeader
					title="Load covers from the cache first"
					facts={["Ana Ruiz", "Today"]}
				/>
				<ActionBar acts={[{ label: "Stop the job", onAct: noop }]} />
				<Section title="Stages">
					<p>Fetch the covers</p>
				</Section>
			</Place>
		</Page>
	);
}

// An ActionBar directly after an ItemHeader stands a pair under it, and the
// section after them a sections step below the bar.
async function barPairs(canvasElement: HTMLElement, density: string) {
	await expect(document.documentElement.dataset.density).toBe(density);
	const head = headOf(canvasElement, "Load covers");
	const pair = must(head.parentElement);
	const bar = must(head.nextElementSibling);
	const section = must(canvasElement.querySelector("section"));
	await expect(rect(bar).top - rect(head).bottom).toBe(
		step(canvasElement, "pb-pair"),
	);
	await expect(rect(section).top - rect(bar).bottom).toBe(
		step(canvasElement, "pb-sections"),
	);
	await expect(pair.children).toHaveLength(2);
}

export const BarUnderHead: StoryObj = {
	render: () => <Job width={1440} />,
	play: async ({ canvasElement }) => barPairs(canvasElement, "desktop"),
};

export const BarUnderHeadTouch = touch(
	{
		render: () => <Job width={390} />,
		play: async ({ canvasElement }) => barPairs(canvasElement, "touch"),
	},
	390,
);

function Record(props: { facts?: string[] }) {
	return (
		<Page width={1440}>
			<Place title="Rules" bleed>
				<Split
					list={<p>Rules</p>}
					main={
						<>
							<ItemHeader title="Fix invoice rounding" facts={props.facts} />
							<Section title="Activity">
								<p>Opened</p>
							</Section>
						</>
					}
				/>
			</Place>
		</Page>
	);
}

// In a Split's main a head with no facts stands a pair above the first
// Section; a head with facts keeps the sections step.
async function headToSection(canvasElement: HTMLElement) {
	const main = must(canvasElement.querySelector("[data-split]")).children[1];
	const head = headOf(must(main), "Fix invoice");
	const section = must(main?.querySelector("section"));
	return rect(section).top - rect(head).bottom;
}

export const BareHeadInMain: StoryObj = {
	render: () => <Record />,
	play: async ({ canvasElement }) => {
		await expect(await headToSection(canvasElement)).toBe(
			step(canvasElement, "pb-pair"),
		);
	},
};

export const HeadWithFactsInMain: StoryObj = {
	render: () => <Record facts={["Ana Ruiz", "Today"]} />,
	play: async ({ canvasElement }) => {
		await expect(await headToSection(canvasElement)).toBe(
			step(canvasElement, "pb-sections"),
		);
	},
};
