import { Canvas } from "@fcalell/plugin-react-ui/components/canvas";
import { showcaseFrames } from "@fcalell/plugin-react-ui/showcase/cells";
import { Frame } from "@fcalell/plugin-react-ui/showcase/frame";
import {
	drawCanvas,
	type Graph,
	STAGE,
	TALL,
	WORKFLOW,
	WORKFLOW_STAGE,
} from "@fcalell/plugin-react-ui/showcase/frames/canvas";
import type { CanvasPoint } from "@fcalell/ui-core/descriptors";
import { SIZE_PX } from "@fcalell/ui-core/tokens";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, waitFor } from "storybook/test";
import { FOCUS_GUARD } from "../.storybook/focus-guard.ts";
import {
	apart,
	around,
	card,
	cards,
	centre,
	clear,
	glyphs,
	groundPoint,
	LAID,
	left,
	lowestZoom,
	MARKED,
	marksClearTheIcon,
	names,
	ORDER,
	rect,
	routesFollowTheGlyphs,
	shift,
	tabKey,
	top,
	viewport,
} from "./canvas-support.ts";
import { click, drag, type Point } from "./mouse.ts";

// The canvas overview on a pointer: below zoom 1 a node is its glyph with its
// name beside it, and below half of that (the graph's overview floor) its glyph
// alone. The desktop density, a mouse, both modes
// (`FooLight` and `FooDark`). The generated frames and the stories of
// `canvas.stories.tsx` run under the same preview.
type Moved = (id: string, at: CanvasPoint) => void;
type Selected = (id: string | null) => void;
interface Heard {
	moved: Moved;
	selected: Selected;
}
type Spy<T extends (...args: never[]) => unknown> = ReturnType<typeof fn<T>>;
const heard = (): Heard => ({ moved: fn(), selected: fn() });
const calls = (spy: unknown) => (spy as Spy<Moved>).mock.calls;

const DESKTOP = SIZE_PX.desktop.control;
// The caption role's size at the desktop body size: the text floor.
const FLOOR = 11;
// The zoom under which a node is its glyph alone, for a graph whose overview
// forms clear each other at it (the workflow does).
const OVERVIEW_FLOOR = 0.5;

function Page(props: Heard & { stage: string; act?: boolean; graph?: Graph }) {
	const graph = props.graph ?? WORKFLOW;
	const [nodes, setNodes] = useState(graph.nodes);
	const [selected, setSelected] = useState<string>();
	return (
		<div className={props.stage}>
			<Canvas
				label="Workflow"
				nodes={nodes}
				edges={graph.edges}
				groups={graph.groups}
				selected={selected}
				onSelect={(id) => {
					props.selected(id);
					setSelected(id ?? undefined);
				}}
				onMove={(id, at) => {
					props.moved(id, at);
					setNodes((last) =>
						last.map((node) =>
							node.id === id ? { ...node, position: at } : node,
						),
					);
				}}
				act={props.act ? { label: "Add a step", onAct: fn() } : undefined}
			/>
		</div>
	);
}

type Story = StoryObj<Heard>;

const page = (
	stage: string,
	act = false,
	graph?: Graph,
): Pick<Story, "render"> => ({
	render: (args: Heard) => (
		<Page {...args} stage={stage} act={act} graph={graph} />
	),
});

const mode = (name: "light" | "dark", story: Story): Story => ({
	...story,
	args: heard(),
	parameters: { ...story.parameters, mode: name },
});

export default {
	title: "Behaviour/Canvas overview",
	globals: { density: "desktop" },
	parameters: {
		viewport: {
			options: {
				wide: {
					name: "Wide",
					styles: { width: "1280px", height: "800px" },
					type: "desktop",
				},
			},
		},
	},
} satisfies Meta;

type Context = Parameters<NonNullable<Story["play"]>>[0];

async function laidOut(canvas: Context["canvas"], moved: unknown) {
	const region = await canvas.findByRole("region", { name: "Workflow" });
	await waitFor(
		() => expect(moved).toHaveBeenCalledTimes(WORKFLOW.nodes.length),
		LAID,
	);
	await waitFor(() => expect(card(region, "plan")).toBeVisible(), LAID);
	return region;
}

const wheel = (target: Element, deltaY: number) =>
	target.dispatchEvent(
		new WheelEvent("wheel", {
			bubbles: true,
			cancelable: true,
			ctrlKey: true,
			deltaY,
		}),
	);

// The text a person can read in the layer, each node's size on screen: the
// computed font size times the layer's scale, for every text node that is not
// hidden. A glyph holds its size at any zoom, so a name beside it is read at its
// own computed size.
function readable(root: Element): number[] {
	const layer = root.querySelector("[data-layer]");
	if (!layer) throw new Error("no layer");
	const { scale } = viewport(root);
	const sizes: number[] = [];
	const walk = document.createTreeWalker(layer, NodeFilter.SHOW_TEXT);
	for (let text = walk.nextNode(); text; text = walk.nextNode()) {
		const parent = text.parentElement;
		if (!parent || !text.textContent?.trim()) continue;
		const style = getComputedStyle(parent);
		if (style.visibility === "hidden") continue;
		const held = parent.closest("[data-layer] > div > button") !== null;
		sizes.push(Number.parseFloat(style.fontSize) * (held ? 1 : scale));
	}
	return sizes;
}

async function glyphForm(root: Element) {
	const forms = [...glyphs(root)];
	await expect(forms).toHaveLength(WORKFLOW.nodes.length);
	for (const form of forms) {
		await expect(form).toBeVisible();
		await expect(rect(form).width).toBeGreaterThan(DESKTOP - 0.5);
		await expect(rect(form).height).toBeGreaterThan(DESKTOP - 0.5);
	}
	for (const each of cards(root)) await expect(each).not.toBeVisible();
	return forms;
}

// The glyph alone: no two overlap and no text is visible at all.
async function bareForm(root: Element) {
	const forms = await glyphForm(root);
	forms.forEach((one, index) => {
		for (const two of forms.slice(index + 1))
			expect(apart(rect(one), rect(two))).toBe(true);
	});
	await expect(names(root)).toHaveLength(0);
	await expect(readable(root)).toHaveLength(0);
}

// The overview: each glyph carries its node's title, one line at the caption
// size (the text floor, whatever the zoom), no wider than the short measure,
// centred on the glyph and starting after it; and no two glyphs with their
// names overlap, so two nodes of one kind read apart.
async function overviewForm(root: Element) {
	const forms = await glyphForm(root);
	const shown = [...names(root)];
	await expect(shown).toHaveLength(WORKFLOW.nodes.length);
	const wholes: DOMRect[] = [];
	forms.forEach((form, index) => {
		const name = shown[index];
		if (!name) throw new Error("a glyph with no name");
		const glyph = rect(form);
		const text = rect(name);
		expect(name.textContent).toBe(
			WORKFLOW.nodes.find((each) => each.id === ORDER[index])?.title,
		);
		expect(text.left).toBeGreaterThanOrEqual(glyph.right - 0.5);
		expect(Math.abs(centre(text).y - centre(glyph).y)).toBeLessThan(1);
		const style = getComputedStyle(name);
		expect(Number.parseFloat(style.fontSize)).toBeGreaterThanOrEqual(
			FLOOR - 0.01,
		);
		expect(style.fontWeight).toBe("500");
		expect(text.height).toBeLessThan(glyph.height);
		wholes.push(
			new DOMRect(glyph.left, glyph.top, text.right - glyph.left, glyph.height),
		);
	});
	wholes.forEach((one, index) => {
		for (const two of wholes.slice(index + 1))
			expect(apart(one, two)).toBe(true);
	});
	await expect(Math.min(...readable(root))).toBeGreaterThanOrEqual(
		FLOOR - 0.01,
	);
}

// ── 1 Overview on a pointer ─────────────────────────────────────────

// At a zoom of 1 or more every node is its card, with no text under the caption
// size; zoomed out below 1 every node is a glyph button of the desktop control
// size with its name beside it at the caption size, down to half; under half it
// is the glyph alone, with no text at all. A zoom step is a fifth.
const overview: Story = {
	...page(TALL),
	play: async ({ args, canvas, canvasElement, userEvent }) => {
		const region = await laidOut(canvas, args.moved);
		const scale = () => viewport(canvasElement).scale;
		await expect(scale()).toBeGreaterThanOrEqual(1);
		await expect(glyphs(canvasElement)).toHaveLength(0);
		for (const each of cards(canvasElement)) await expect(each).toBeVisible();
		await expect(Math.min(...readable(canvasElement))).toBeGreaterThanOrEqual(
			FLOOR - 0.01,
		);

		// Just under 1, by a wheel: the overview.
		wheel(region, 8);
		await waitFor(() => expect(scale()).toBeLessThan(1));
		await expect(scale()).toBeGreaterThan(0.8);
		await overviewForm(canvasElement);

		// A step on the stack is a fifth of the scale.
		const zoomOut = canvas.getByRole("button", { name: "Zoom out" });
		const before = scale();
		await userEvent.click(zoomOut);
		await expect(around(scale(), before / 1.2, 0.002)).toBe(true);

		// Down the stack to the last zoom that names its nodes, which is the
		// overview floor or above it, and the first that does not.
		let named = scale();
		await overviewForm(canvasElement);
		while (scale() / 1.2 >= OVERVIEW_FLOOR) {
			await userEvent.click(zoomOut);
			named = scale();
			await overviewForm(canvasElement);
		}
		await expect(named).toBeGreaterThanOrEqual(OVERVIEW_FLOOR);
		await userEvent.click(zoomOut);
		await expect(scale()).toBeLessThan(OVERVIEW_FLOOR);
		await bareForm(canvasElement);

		// The lowest zoom, by the stack alone.
		for (let step = 0; step < 30; step++) await userEvent.click(zoomOut);
		const lowest = lowestZoom(canvasElement, DESKTOP);
		await expect(around(scale(), lowest, 0.005)).toBe(true);
		await expect(zoomOut).toHaveAttribute("aria-disabled", "true");
		await bareForm(canvasElement);
	},
};
export const OverviewLight = mode("light", overview);
export const OverviewDark = mode("dark", overview);

// ── 2 Click and Enter ───────────────────────────────────────────────

// A click on a glyph zooms to its node at scale 1, centred, shows its card and
// chooses nothing. With the keyboard, Tab walks the glyphs in path order and
// Enter on one does the same, then focus stands on that node's card.
const activate: Story = {
	...page(TALL),
	play: async ({ args, canvas, canvasElement, userEvent }) => {
		const region = await laidOut(canvas, args.moved);
		const scale = () => viewport(canvasElement).scale;
		const zoomOut = canvas.getByRole("button", { name: "Zoom out" });
		await userEvent.click(zoomOut);
		await userEvent.click(zoomOut);
		await expect(scale()).toBeLessThan(1);

		const index = ORDER.indexOf("build");
		const target = glyphs(canvasElement)[index];
		if (!target) throw new Error("no glyph for build");
		await click(centre(rect(target)));
		await waitFor(() => expect(scale()).toBe(1));
		// The page may scroll as a button takes focus, so the pane is read now.
		const middle = centre(rect(region));
		await expect(card(region, "build")).toBeVisible();
		await expect(
			Math.abs(centre(rect(card(region, "build"))).x - middle.x),
		).toBeLessThan(1);
		await expect(
			Math.abs(centre(rect(card(region, "build"))).y - middle.y),
		).toBeLessThan(1);
		await expect(args.selected).not.toHaveBeenCalled();
		await expect(glyphs(canvasElement)).toHaveLength(0);

		await userEvent.click(zoomOut);
		await userEvent.click(zoomOut);
		await expect(scale()).toBeLessThan(1);
		(document.activeElement as HTMLElement | null)?.blur();
		for (const id of ORDER.slice(0, 3)) {
			await userEvent.tab();
			await expect(glyphs(canvasElement)[ORDER.indexOf(id)]).toHaveFocus();
		}
		await userEvent.tab({ shift: true });
		const second = ORDER[1] ?? "";
		await expect(glyphs(canvasElement)[ORDER.indexOf(second)]).toHaveFocus();
		await userEvent.keyboard("{Enter}");
		await waitFor(() => expect(scale()).toBe(1));
		await waitFor(() => expect(card(region, second)).toHaveFocus());
		await expect(args.selected).not.toHaveBeenCalled();
		await userEvent.keyboard("{Enter}");
		await expect(args.selected).toHaveBeenLastCalledWith(second);
	},
};
export const ClickAndEnterLight = mode("light", activate);
export const ClickAndEnterDark = mode("dark", activate);

// ── 3 A drag pans ───────────────────────────────────────────────────

// With `onMove` passed, a mouse drag from a glyph pans by its own delta and
// moves nothing: the node stays, and neither `onMove` nor `onSelect` is heard.
const dragGlyph: Story = {
	...page(TALL),
	play: async ({ args, canvas, canvasElement, userEvent }) => {
		const region = await laidOut(canvas, args.moved);
		const reports = calls(args.moved).length;
		const zoomOut = canvas.getByRole("button", { name: "Zoom out" });
		await userEvent.click(zoomOut);
		await userEvent.click(zoomOut);
		const plan = card(region, "plan");
		const stood = { x: left(plan), y: top(plan) };
		const form = glyphs(canvasElement)[ORDER.indexOf("plan")];
		if (!form) throw new Error("no glyph for plan");
		const before = viewport(canvasElement);
		const from = centre(rect(form));
		const to: Point = shift(from, 70, -45);
		await drag(from, to);
		const now = viewport(canvasElement);
		await expect(now.scale).toBe(before.scale);
		await expect(around(now.x, before.x + 70, 1.5)).toBe(true);
		await expect(around(now.y, before.y - 45, 1.5)).toBe(true);
		await expect({ x: left(plan), y: top(plan) }).toEqual(stood);
		await expect(calls(args.moved)).toHaveLength(reports);
		await expect(args.selected).not.toHaveBeenCalled();
	},
};
export const DragGlyphLight = mode("light", dragGlyph);
export const DragGlyphDark = mode("dark", dragGlyph);

// ── 4 Once per crossing ─────────────────────────────────────────────

// A node's element changes once when the zoom crosses 1 and not while the zoom
// moves within one side of it, by the wheel and the stack.
const crossing: Story = {
	...page(TALL),
	play: async ({ args, canvas, canvasElement, userEvent }) => {
		const region = await laidOut(canvas, args.moved);
		const plan = card(region, "plan");
		const seen: MutationRecord[] = [];
		const watch = new MutationObserver((list) => seen.push(...list));
		watch.observe(plan, { attributes: true, childList: true, subtree: true });
		const records = () => seen.splice(0).length;
		const scale = () => viewport(canvasElement).scale;
		try {
			const zoomIn = canvas.getByRole("button", { name: "Zoom in" });
			const zoomOut = canvas.getByRole("button", { name: "Zoom out" });
			await userEvent.click(zoomIn);
			wheel(region, -10);
			await waitFor(() => expect(scale()).toBeGreaterThan(1.3));
			await userEvent.click(zoomOut);
			await expect(scale()).toBeGreaterThan(1);
			await expect(records()).toBe(0);
			wheel(region, 30);
			await waitFor(() => expect(scale()).toBeLessThan(1));
			await expect(records()).toBeGreaterThan(0);
			wheel(region, 5);
			await userEvent.click(zoomOut);
			await expect(scale()).toBeLessThan(1);
			await expect(records()).toBe(0);
			await userEvent.click(zoomIn);
			await userEvent.click(zoomIn);
			await expect(scale()).toBeGreaterThan(1);
			await expect(records()).toBeGreaterThan(0);
		} finally {
			watch.disconnect();
		}
	},
};
export const OncePerCrossingLight = mode("light", crossing);
export const OncePerCrossingDark = mode("dark", crossing);

// ── Fit leaves the canvas's own chrome clear ────────────────────────

const fits: Story = {
	...page(STAGE, true),
	play: async ({ args, canvas, canvasElement, userEvent }) => {
		const region = await laidOut(canvas, args.moved);
		await userEvent.click(canvas.getByRole("button", { name: "Fit" }));
		await waitFor(() => expect(viewport(canvasElement).scale).toBeLessThan(1));
		clear(canvasElement);
		// Moves the view, then Fit again, then Arrange, which fits afterwards.
		wheel(region, -10);
		await userEvent.click(canvas.getByRole("button", { name: "Fit" }));
		clear(canvasElement);
		const reports = calls(args.moved).length;
		await userEvent.click(canvas.getByRole("button", { name: "Arrange" }));
		await waitFor(() =>
			expect(calls(args.moved).length).toBeGreaterThan(reports),
		);
		await new Promise((done) => requestAnimationFrame(() => done(undefined)));
		clear(canvasElement);
	},
};
export const FitClearsTheChromeLight = mode("light", fits);
export const FitClearsTheChromeDark = mode("dark", fits);

// ── The opening view clears the chrome ──────────────────────────────

// The first view takes the room a fit does, so no node opens under the zoom
// stack or the act, in a 1280 px window, on a pane that holds the graph in that
// room.
const opens: Story = {
	...page(WORKFLOW_STAGE, true),
	globals: { viewport: { value: "wide", isRotated: false } },
	play: async ({ args, canvas, canvasElement }) => {
		await laidOut(canvas, args.moved);
		await expect(viewport(canvasElement).scale).toBe(1);
		clear(canvasElement);
	},
};
export const OpensClearOfTheChromeLight = mode("light", opens);
export const OpensClearOfTheChromeDark = mode("dark", opens);

// ── The routes follow the glyph ─────────────────────────────────────

// Under the floor an edge ends on its glyphs (named or alone) and a group frame
// holds its glyphs by the padding, at a zoom just under 1 and at the lowest
// zoom, where every
// route still has a stretch to read.
const follow: Story = {
	...page(TALL),
	play: async ({ args, canvas, canvasElement, userEvent }) => {
		const region = await laidOut(canvas, args.moved);
		wheel(region, 8);
		await waitFor(() => expect(viewport(canvasElement).scale).toBeLessThan(1));
		await waitFor(() => routesFollowTheGlyphs(canvasElement, WORKFLOW));
		const zoomOut = canvas.getByRole("button", { name: "Zoom out" });
		for (let step = 0; step < 30; step++) await userEvent.click(zoomOut);
		await expect(zoomOut).toHaveAttribute("aria-disabled", "true");
		await waitFor(() => routesFollowTheGlyphs(canvasElement, WORKFLOW));
	},
};
export const RoutesFollowTheGlyphsLight = mode("light", follow);
export const RoutesFollowTheGlyphsDark = mode("dark", follow);

// ── The act's focus ring ────────────────────────────────────────────

// A real Tab key onto the act draws the focus ring, 2 px, and the region's
// overflow does not clip it.
const ring: Story = {
	...page(TALL, true),
	play: async ({ args, canvas }) => {
		const region = await laidOut(canvas, args.moved);
		const act = canvas.getByRole("button", { name: "Add a step" });
		await click(groundPoint(region));
		for (let tabs = 0; tabs < 60 && document.activeElement !== act; tabs++)
			await tabKey();
		await expect(act).toHaveFocus();
		await expect(act.matches(":focus-visible")).toBe(true);
		const style = getComputedStyle(act);
		await expect(style.outlineStyle).toBe("solid");
		await expect(style.outlineWidth).toBe("2px");
		const reach = 2 + Number.parseFloat(style.outlineOffset);
		const box = rect(act);
		const pane = rect(region);
		await expect(
			box.left - reach >= pane.left &&
				box.right + reach <= pane.right &&
				box.top - reach >= pane.top &&
				box.bottom + reach <= pane.bottom,
		).toBe(true);
	},
};
export const ActFocusRingLight = mode("light", ring);
export const ActFocusRingDark = mode("dark", ring);

// ── The marks clear the icon ────────────────────────────────────────

// Under the floor a glyph's status dot, spinner and problem dot straddle its
// corner and none meets its icon, whatever the state.
const marks: Story = {
	...page(TALL, false, MARKED),
	play: async ({ args, canvas, canvasElement, userEvent }) => {
		await laidOut(canvas, args.moved);
		await userEvent.click(canvas.getByRole("button", { name: "Zoom out" }));
		await expect(viewport(canvasElement).scale).toBeLessThan(1);
		marksClearTheIcon(canvasElement);
	},
};
export const MarksClearTheIconLight = mode("light", marks);
export const MarksClearTheIconDark = mode("dark", marks);

// ── The glyph frames ────────────────────────────────────────────────

// Each generated glyph frame holds its whole graph as glyphs inside its pane,
// at both densities.
function glyphFrames(density: "desktop" | "touch"): StoryObj {
	const frames = showcaseFrames().filter(
		(frame) =>
			frame.component === "Canvas" &&
			frame.mode === "light" &&
			frame.density === density &&
			frame.cell.name.startsWith("CANVAS_NODE_GLYPH") &&
			drawCanvas(frame) !== undefined,
	);
	return {
		globals: { density },
		render: () => (
			<div className="flex flex-col gap-pair">
				{frames.map((frame) => (
					<Frame key={frame.id} frame={frame} draw={drawCanvas} />
				))}
			</div>
		),
		play: async ({ canvasElement }) => {
			const drawn = [...canvasElement.querySelectorAll("[data-cell]")];
			await expect(drawn).toHaveLength(frames.length);
			for (const frame of drawn) {
				const region = frame.querySelector("section");
				if (!region) throw new Error(`no canvas in ${frame.id}`);
				await waitFor(
					() => expect(glyphs(frame).length).toBeGreaterThan(0),
					LAID,
				);
				const pane = rect(region);
				await expect(glyphs(frame)).toHaveLength(WORKFLOW.nodes.length);
				for (const form of glyphs(frame)) {
					await expect(form).toBeVisible();
					const box = rect(form);
					await expect(
						box.left >= pane.left &&
							box.right <= pane.right &&
							box.top >= pane.top &&
							box.bottom <= pane.bottom,
					).toBe(true);
				}
			}
		},
	};
}
export const GlyphFramesAtDesktop = glyphFrames("desktop");
export const GlyphFramesAtTouch = glyphFrames("touch");

// ── The name frames ─────────────────────────────────────────────────

// Each generated name frame holds its graph in the overview: every glyph names
// its node, inside the pane, none cut by it.
// A dimmed node's name draws disabled ink on purpose, as its text does, and sits in an enabled
// button: the exclusion `.storybook/state-stories.tsx` gives the state stories.
export const NameFramesAtDesktop: StoryObj = {
	globals: { density: "desktop" },
	parameters: {
		a11y: {
			context: {
				exclude: [
					FOCUS_GUARD,
					'[data-cell^="Canvas/CANVAS_NODE_NAME.tone.dimmed/"] [data-layer] button',
				],
			},
		},
	},
	render: () => {
		const frames = showcaseFrames().filter(
			(frame) =>
				frame.component === "Canvas" &&
				frame.mode === "light" &&
				frame.density === "desktop" &&
				frame.cell.name.startsWith("CANVAS_NODE_NAME") &&
				drawCanvas(frame) !== undefined,
		);
		return (
			<div className="flex flex-col gap-pair">
				{frames.map((frame) => (
					<Frame key={frame.id} frame={frame} draw={drawCanvas} />
				))}
			</div>
		);
	},
	play: async ({ canvasElement }) => {
		const drawn = [...canvasElement.querySelectorAll("[data-cell]")];
		await expect(drawn.length).toBeGreaterThan(0);
		for (const frame of drawn) {
			const region = frame.querySelector("section");
			if (!region) throw new Error(`no canvas in ${frame.id}`);
			await waitFor(() => expect(names(frame).length).toBeGreaterThan(0), LAID);
			const pane = rect(region);
			await expect(names(frame)).toHaveLength(glyphs(frame).length);
			for (const name of names(frame)) {
				await expect(name).toBeVisible();
				const box = rect(name);
				await expect(
					box.left >= pane.left &&
						box.right <= pane.right &&
						box.top >= pane.top &&
						box.bottom <= pane.bottom,
				).toBe(true);
			}
		}
	},
};
