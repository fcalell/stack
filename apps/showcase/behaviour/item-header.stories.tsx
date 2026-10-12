import { ItemHeader } from "@fcalell/plugin-react-ui/components/item-header";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Place } from "@fcalell/plugin-react-ui/components/place";
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
				<Pane title="Triage the inbox">
					<ItemHeader
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
