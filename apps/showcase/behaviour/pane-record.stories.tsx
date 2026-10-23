import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Place } from "@fcalell/plugin-react-ui/showcase/frames/place";
import { readsAt } from "@fcalell/plugin-react-ui/showcase/waiting";
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

export default { title: "Behaviour/Pane record" } satisfies Meta;

function touch(story: StoryObj, width: number): StoryObj {
	return {
		...story,
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
				<Pane
					title="Triage the inbox"
					record={{
						within: "Inbox",
						facts: [
							{ label: "Outside content", onOpen: noop },
							{ label: "Open the run", href: "/runs/42" },
						],
					}}
				/>
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

export const FactToARouteTouch = {
	...touch(
		{
			render: () => <Facts width={390} />,
			play: async ({ canvasElement }) => factsGo(canvasElement, "touch"),
		},
		390,
	),
	tags: ["touch"],
};

// A loaded part with no text draws nothing, so the overline's separator never
// dangles after the part before it, nor leads the part after it.
export const OverlineDropsEmptyParts: StoryObj = {
	render: () => (
		<Page width={1280}>
			<Place>
				<Pane
					title="Triage the inbox"
					record={{
						within: "Inbox",
						overline: ["Outfitters web", "", "CR-12", ""],
					}}
				/>
			</Place>
		</Page>
	),
	play: async ({ canvasElement }) => {
		const overline = must(
			[...canvasElement.querySelectorAll("p")].find((el) =>
				el.textContent?.includes("Outfitters web"),
			),
		);
		await expect(overline.textContent).toBe("Outfitters web · CR-12");
	},
};

export const OverlineOfEmptyPartsDrawsNone: StoryObj = {
	render: () => (
		<Page width={1280}>
			<Place>
				<Pane
					title="Triage the inbox"
					record={{
						within: "Inbox",
						overline: ["", ""],
						facts: [{ label: "Outside content", onOpen: noop }],
					}}
				/>
			</Place>
		</Page>
	),
	play: async ({ canvasElement }) => {
		await expect(
			[...canvasElement.querySelectorAll("p")].filter((el) =>
				el.textContent?.includes("·"),
			),
		).toHaveLength(0);
		await expect(
			[...canvasElement.querySelectorAll("p")].filter(
				(el) => el.textContent === "",
			),
		).toHaveLength(0);
	},
};

const KEEP =
	"Keep the shelf in the shop's window clear of the sun, the dust and every other thing that fades what stands in it, all season";

function Named(props: { width: number }) {
	return (
		<Page width={props.width}>
			<Place>
				<Pane
					title={KEEP}
					record={{ within: "Work · Code", overline: ["Shop", "SHP-4"] }}
				/>
			</Place>
		</Page>
	);
}

// A record's Pane: the bar holds where the record lives, and the name stands
// once, whole and wrapping, between the overline and the facts, as the page's
// one `h1`, which names the Pane.
async function nameStandsOnce(canvasElement: HTMLElement) {
	await expect(canvasElement.querySelectorAll("h1")).toHaveLength(1);
	const name = must(canvasElement.querySelector("h1"));
	await expect(name.textContent).toBe(KEEP);
	await expect(name.scrollWidth).toBeLessThanOrEqual(name.clientWidth);
	const line = Number.parseFloat(getComputedStyle(name).lineHeight);
	await expect(rect(name).height).toBeGreaterThan(line * 1.5);
	const bar = must(canvasElement.querySelector("header"));
	await expect(bar.contains(name)).toBe(false);
	await expect(bar.textContent).toBe("Work · Code");
	// The name is read once: no other element draws it.
	await expect(
		[...canvasElement.querySelectorAll("*")].filter(
			(el) => el.children.length === 0 && el.textContent === KEEP,
		),
	).toHaveLength(1);
	const region = must(canvasElement.querySelector("section[data-page]"));
	await expect(region.getAttribute("aria-labelledby")).toBe(name.id);
	const overline = must(
		[...canvasElement.querySelectorAll("p")].find((el) =>
			el.textContent?.includes("SHP-4"),
		),
	);
	await expect(rect(overline).bottom).toBeLessThanOrEqual(rect(name).top);
}

export const NameStandsOnce: StoryObj = {
	render: () => <Named width={1280} />,
	play: async ({ canvasElement }) => nameStandsOnce(canvasElement),
};

export const NameStandsOnceTouch = {
	...touch(
		{
			render: () => <Named width={320} />,
			play: async ({ canvasElement }) => nameStandsOnce(canvasElement),
		},
		320,
	),
	tags: ["touch"],
};

const WAITING = readsAt("pane-record/name");

// While the record's read waits the name paints in the head's place, a
// paragraph and no heading, and the bar's place stands.
export const NamePaintsWhileItsReadWaits: StoryObj = {
	render: () => (
		<Page width={1280}>
			<Place>
				<Pane
					title={WAITING.waiting.at(() => KEEP)}
					read={WAITING.waiting}
					record={{ within: "Work · Code", overline: ["Shop", "SHP-4"] }}
				/>
			</Place>
		</Page>
	),
	play: async ({ canvasElement }) => {
		await expect(canvasElement.querySelectorAll("h1")).toHaveLength(0);
		const bar = must(canvasElement.querySelector("header"));
		await expect(bar.textContent).toBe("Work · Code");
		const region = must(canvasElement.querySelector("section[data-page]"));
		await expect(region.hasAttribute("aria-labelledby")).toBe(false);
		const head = must(
			[...region.querySelectorAll("p")].find(
				(el) => !bar.contains(el) && !el.textContent?.includes("SHP-4"),
			),
		);
		await expect(rect(head).height).toBeGreaterThan(0);
	},
};
