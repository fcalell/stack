import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { type Row, Section } from "@fcalell/plugin-react-ui/components/section";
import { Toolbar } from "@fcalell/plugin-react-ui/components/toolbar";
import { Place } from "@fcalell/plugin-react-ui/showcase/frames/place";
import { VIRTUAL_FROM } from "@fcalell/ui-core/window";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useLayoutEffect, useRef } from "react";
import { expect } from "storybook/test";

// A windowed collection opens where the page opens: a list of `VIRTUAL_FROM`
// rows or more under a toolbar leaves its scroller at the top, the toolbar in
// view, and a scroll the scroller already held when the list mounted is kept.
export default {
	title: "Behaviour/Window landing",
	parameters: { layout: "fullscreen" },
} satisfies Meta;

type Story = StoryObj;

const ROWS = Array.from({ length: VIRTUAL_FROM + 3 }, (_, at) => ({
	id: `r${at + 1}`,
	name: `Row ${at + 1}`,
}));
const toRow = (each: (typeof ROWS)[number]): Row => ({
	key: each.id,
	title: each.name,
	onOpen: () => {},
});

// The page: a toolbar over a list. `tall` puts a tall block between them, and
// `restore` sets the Pane body's scroll in the commit that mounts it, as a
// router restoring a scroll does, before the list's window has read it.
function Page(props: { tall?: boolean; restore?: number }) {
	const root = useRef<HTMLDivElement>(null);
	useLayoutEffect(() => {
		const input = root.current?.querySelector("input");
		if (props.restore && input) bodyOf(input).scrollTop = props.restore;
	}, [props.restore]);
	return (
		<div
			ref={root}
			style={{ width: "100%", height: 700, display: "flex" }}
			className="flex-col"
		>
			<Place>
				<Pane title="Tests">
					<Toolbar
						search={{ value: "", onChange: () => {}, placeholder: "Search" }}
					/>
					{props.tall ? <div style={{ height: 1200, flex: "none" }} /> : null}
					<Section title="Objects" items={ROWS.map(toRow)} />
				</Pane>
			</Place>
		</div>
	);
}

const frame = () =>
	new Promise<void>((done) => requestAnimationFrame(() => done()));
async function frames(count = 6) {
	for (let at = 0; at < count; at++) await frame();
}

// The Pane's body: the nearest ancestor of the toolbar that scrolls.
function bodyOf(node: HTMLElement): HTMLElement {
	for (let up = node.parentElement; up; up = up.parentElement) {
		if (getComputedStyle(up).overflowY === "auto") return up;
	}
	throw new Error("nothing scrolls around the toolbar");
}

const lands: Story = {
	render: () => <Page />,
	play: async ({ canvas }) => {
		const search = await canvas.findByPlaceholderText("Search");
		const body = bodyOf(search);
		await canvas.findByText("Row 1");
		await frames();
		await expect(body.scrollTop).toBe(0);
		// The toolbar stays in view.
		const edge = body.getBoundingClientRect();
		await expect(search.getBoundingClientRect().top >= edge.top).toBe(true);
	},
};

export const AWindowedListLandsAtTheTop = lands;

// The same page on a phone.
export const AWindowedListLandsAtTheTopTouch: Story = {
	...lands,
	tags: ["touch"],
	globals: {
		density: "touch",
		viewport: { value: "phone", isRotated: false },
	},
	parameters: {
		viewport: {
			options: {
				phone: {
					name: "Phone",
					styles: { width: "390px", height: "812px" },
					type: "mobile",
				},
			},
		},
	},
};

// The scroller held a place when the list mounted (a restored scroll): the
// window reads it and moves nothing.
export const AWindowedListKeepsARestoredScroll: Story = {
	render: () => <Page tall restore={600} />,
	play: async ({ canvas }) => {
		const search = await canvas.findByPlaceholderText("Search");
		const body = bodyOf(search);
		await canvas.findAllByText(/^Row \d+$/);
		await frames();
		await expect(body.scrollTop).toBe(600);
		// The rows in the view are the window's, so a scroll on from here still
		// draws rows.
		body.scrollTop = 1400;
		await frames();
		await expect(body.scrollTop).toBe(1400);
		await canvas.findAllByText(/^Row \d+$/);
	},
};
