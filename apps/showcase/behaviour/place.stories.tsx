import { Button } from "@fcalell/plugin-react-ui/components/button";
import { List } from "@fcalell/plugin-react-ui/components/list";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Shell } from "@fcalell/plugin-react-ui/components/shell";
import { Split } from "@fcalell/plugin-react-ui/components/split";
import { Toolbar } from "@fcalell/plugin-react-ui/components/toolbar";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

const noop = () => {};
const ACTIONS = [
	{ icon: "ListFilter" as const, label: "Filter", onAct: noop },
	{ icon: "RefreshCw" as const, label: "Refresh", onAct: noop },
];
const MORE = [{ label: "Copy deploy hook", onAct: noop }];
const SWITCHER = {
	label: "Workspaces",
	options: [
		{ value: "acme", label: "Acme", avatar: {} },
		{ value: "globex", label: "Globex", avatar: {} },
	],
	value: "acme",
	onChange: noop,
};

export default { title: "Behaviour/Place" } satisfies Meta;

function Page(props: { title: string }) {
	return (
		<Place title={props.title} actions={ACTIONS} more={MORE}>
			<p>The first section.</p>
		</Place>
	);
}

function viewport(
	width: number,
): Pick<StoryObj, "tags" | "globals" | "parameters"> {
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
						styles: { width: `${width}px`, height: "700px" },
						type: "mobile",
					},
				},
			},
		},
	};
}

const LONG = "A deploy title long enough to wrap before the acts";

// A touch Place with no shell switcher stands its acts on the title's row:
// 44 px targets at the row's end, the title at the page's gutter wrapping
// before them, the first section under a hairline that is no taller than the
// row. The same Place under a shell switcher keeps the bar over the title.
function story(width: number): StoryObj {
	return {
		...viewport(width),
		render: () => (
			<div>
				<Page title={LONG} />
				<Page title="Deploys" />
				<Shell
					places={[{ route: "/x", label: "Deploys", icon: "Rocket" }]}
					switcher={SWITCHER}
				>
					<Page title="Deploys" />
				</Shell>
			</div>
		),
		play: async ({ canvasElement }) => {
			const [single, short, shelled] = [
				...canvasElement.querySelectorAll("header"),
			];
			if (!single || !short || !shelled)
				throw new Error("the heads are not drawn");
			const title = single.querySelector("h1");
			const filter = single.querySelector("[aria-label='Filter']");
			const more = single.querySelector("[aria-label='More']");
			const section = single.nextElementSibling?.querySelector("p");
			if (!title || !filter || !more || !section)
				throw new Error("the Place is not drawn");
			const head = single.getBoundingClientRect();
			const text = title.getBoundingClientRect();
			const end = more.getBoundingClientRect();
			const first = filter.getBoundingClientRect();
			const lines = Math.round(
				text.height / Number.parseFloat(getComputedStyle(title).lineHeight),
			);
			console.log(
				`${width}: head ${head.height}, title ${text.height} (${lines} lines) from ${text.left} to ${text.right}, filter ${first.width}x${first.height} from ${first.left}, more ${end.width}x${end.height} ending ${end.right} of ${head.right}, section ${section.getBoundingClientRect().left}; one-line head ${short.getBoundingClientRect().height}; shelled head ${shelled.getBoundingClientRect().height}`,
			);
			await expect(short.getBoundingClientRect().height).toBeLessThan(
				shelled.getBoundingClientRect().height - 30,
			);
			await expect(text.left).toBeCloseTo(
				section.getBoundingClientRect().left,
				1,
			);
			await expect(text.right).toBeLessThanOrEqual(first.left);
			await expect(first.height).toBeGreaterThanOrEqual(44);
			await expect(first.width).toBeGreaterThanOrEqual(44);
			await expect(end.height).toBeGreaterThanOrEqual(44);
			await expect(end.top).toBeGreaterThanOrEqual(head.top);
			await expect(end.bottom).toBeLessThanOrEqual(head.bottom);
			await expect(lines).toBeGreaterThan(1);
		},
	};
}

export const ActsShareTheTitleRowAt320 = story(320);
export const ActsShareTheTitleRowAt390 = story(390);

// A Place whose list stands at a route deeper than its own names the view
// above it as `up`: its back act leads the strip, or the top bar, at every
// width with its toolbar and actions kept, and gives way to the record's back
// act below `tablet` once a record is open.
function Epic(props: { open: boolean; up?: string }) {
	return (
		<div style={{ height: 700, display: "flex", flexDirection: "column" }}>
			<Place
				title="Code"
				bleed
				up={props.up}
				actions={ACTIONS}
				act={{ label: "New story", onAct: noop }}
			>
				<Split
					back="/work/code/epics/x"
					list={
						<>
							<Toolbar>
								<Button label="Lead" fit="bar" onAct={noop} />
							</Toolbar>
							<List
								items={["Ana", "Ben"]}
								row={{ key: String, title: String }}
							/>
						</>
					}
					main={
						props.open ? (
							<Section title="Card">
								<p>The card.</p>
							</Section>
						) : undefined
					}
				/>
			</Place>
		</div>
	);
}

function shown(el: Element | null | undefined): boolean {
	return el != null && getComputedStyle(el).display !== "none";
}

// The back acts the page shows, in document order.
function shownBacks(root: Element) {
	return [...root.querySelectorAll("a[aria-label='Back']")].filter(
		(el) => shown(el) && shown(el.parentElement),
	);
}

function backs(canvasElement: HTMLElement) {
	return shownBacks(canvasElement).map((el) => el.getAttribute("href"));
}

function must<T extends Element>(el: T | null | undefined): T {
	if (!el) throw new Error("the element is not drawn");
	return el;
}

// The head holds the page's actions and the list its toolbar.
function kept(canvasElement: HTMLElement) {
	const header = must(canvasElement.querySelector("header"));
	must(header.querySelector("[aria-label='Filter']"));
	const lead = [...canvasElement.querySelectorAll("button")].find(
		(button) => button.textContent === "Lead",
	);
	must(lead);
	return header;
}

export const UpLeadsTheStrip: StoryObj = {
	render: () => <Epic open={false} up="/work/code" />,
	play: async ({ canvasElement }) => {
		await expect(backs(canvasElement)).toEqual(["/work/code"]);
		const header = kept(canvasElement);
		const up = must(shownBacks(header)[0]);
		const title = must(header.querySelector("h1"));
		const box = up.getBoundingClientRect();
		console.log(
			`strip: up ${box.width}x${box.height} at ${box.left}, title from ${title.getBoundingClientRect().left}`,
		);
		await expect(box.right).toBeLessThanOrEqual(
			title.getBoundingClientRect().left,
		);
	},
};

export const UpWithARecordBesideTheList: StoryObj = {
	render: () => <Epic open up="/work/code" />,
	play: async ({ canvasElement }) => {
		await expect(backs(canvasElement)).toEqual(["/work/code"]);
	},
};

export const OwnRouteDrawsNoUp: StoryObj = {
	render: () => <Epic open={false} />,
	play: async ({ canvasElement }) => {
		await expect(backs(canvasElement)).toEqual([]);
	},
};

export const UpLeadsTheTopBar390: StoryObj = {
	...viewport(390),
	render: () => <Epic open={false} up="/work/code" />,
	play: async ({ canvasElement }) => {
		await expect(backs(canvasElement)).toEqual(["/work/code"]);
		const header = kept(canvasElement);
		const up = must(shownBacks(header)[0]);
		const box = up.getBoundingClientRect();
		console.log(`top bar: up ${box.width}x${box.height} at ${box.left}`);
		await expect(box.width).toBeGreaterThanOrEqual(44);
		await expect(box.height).toBeGreaterThanOrEqual(44);
		await expect(box.left).toBeLessThanOrEqual(16);
	},
};

export const UpGivesWayToTheRecordBack390: StoryObj = {
	...viewport(390),
	render: () => <Epic open up="/work/code" />,
	play: async ({ canvasElement }) => {
		await expect(backs(canvasElement)).toEqual(["/work/code/epics/x"]);
	},
};

// Under a shell the touch top bar leads with the view above, not the switcher.
export const UpTakesTheSwitcherPlace390: StoryObj = {
	...viewport(390),
	render: () => (
		<Shell
			places={[{ route: "/work", label: "Work", icon: "Rocket" }]}
			switcher={SWITCHER}
		>
			<Epic open={false} up="/work/code" />
		</Shell>
	),
	play: async ({ canvasElement }) => {
		await expect(backs(canvasElement)).toEqual(["/work/code"]);
		await expect(
			canvasElement.querySelector("header [aria-label^='Workspaces']"),
		).toBeNull();
	},
};
