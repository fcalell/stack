import { Banner } from "@fcalell/plugin-react-ui/components/banner";
import { Canvas } from "@fcalell/plugin-react-ui/components/canvas";
import { ItemHeader } from "@fcalell/plugin-react-ui/components/item-header";
import { List } from "@fcalell/plugin-react-ui/components/list";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Split } from "@fcalell/plugin-react-ui/components/split";
import {
	ALONE_STAGE,
	type Graph,
	HOLLOW,
	HOLLOW_ALONE,
	LIFT_MS,
	PROBLEM,
	SLOP,
	STAGE,
	STATUSES,
	WORKFLOW,
	WORKFLOW_STAGE,
} from "@fcalell/plugin-react-ui/showcase/frames/canvas";
import type { CanvasPoint } from "@fcalell/ui-core/descriptors";
import { SIZE_PX } from "@fcalell/ui-core/tokens";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, waitFor } from "storybook/test";
import {
	apart,
	around,
	card,
	centre,
	clear,
	glyphs,
	groundPoint,
	hollowHeld,
	LAID,
	left,
	lowestZoom,
	MARKED,
	marksClearTheIcon,
	rect,
	routesFollowTheGlyphs,
	shift,
	top,
	viewport,
} from "./canvas-support.ts";
import { drag, hand, type Point, pinch, tap, wait } from "./touch.ts";

// The canvas in a 375 px phone with touch events on, at the touch density. Input
// is the browser's own fingers (`touch.ts`), so a touch, a move and a lift are
// real touch and pointer events with real hit-testing. Every scenario runs in
// both modes: `FooLight` and `FooDark`.
type Moved = (id: string, at: CanvasPoint) => void;
type Connected = (from: string, to: string | null) => void;
type Selected = (id: string | null) => void;
type Spy<T extends (...args: never[]) => unknown> = ReturnType<typeof fn<T>>;
interface Heard {
	moved: Moved;
	connected: Connected;
	selected: Selected;
}
const heard = (): Heard => ({ moved: fn(), connected: fn(), selected: fn() });
const calls = (spy: unknown) => (spy as Spy<Moved>).mock.calls;

const TOUCH = SIZE_PX.touch.control;
// A hold's real time: the lift plus a margin.
const HOLD = LIFT_MS + 150;

// A page that stores what `onMove` reports, as the canvas expects, and records
// what it hears. `move` and `connect` choose which handlers it passes.
function Touchable(
	props: Heard & {
		move: boolean;
		connect: boolean;
		graph?: Graph;
		stage?: string;
	},
) {
	const graph = props.graph ?? WORKFLOW;
	const [nodes, setNodes] = useState(graph.nodes);
	const [selected, setSelected] = useState<string>();
	return (
		<div className={props.stage ?? STAGE}>
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
				onMove={
					props.move
						? (id, at) => {
								props.moved(id, at);
								setNodes((last) =>
									last.map((node) =>
										node.id === id ? { ...node, position: at } : node,
									),
								);
							}
						: undefined
				}
				onConnect={props.connect ? props.connected : undefined}
				act={{ label: "Add a step", onAct: fn() }}
			/>
		</div>
	);
}

type Story = StoryObj<Heard>;

const phone = (
	move: boolean,
	connect: boolean,
	graph?: Graph,
	stage?: string,
): Pick<Story, "render"> => ({
	render: (args: Heard) => (
		<Touchable
			{...args}
			move={move}
			connect={connect}
			graph={graph}
			stage={stage}
		/>
	),
});

// A scenario runs once in each mode, with spies of its own.
const mode = (name: "light" | "dark", story: Story): Story => ({
	...story,
	args: heard(),
	parameters: { ...story.parameters, mode: name },
});

// The addon's setup sets each story's viewport itself (a story's own
// `viewport` global, else 1200 x 900) over the project's instance, so the phone
// is named here.
export default {
	title: "Behaviour/Canvas touch",
	tags: ["touch"],
	globals: { density: "touch", viewport: { value: "phone", isRotated: false } },
	parameters: {
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
} satisfies Meta;

type Play = NonNullable<Story["play"]>;
type Context = Parameters<Play>[0];

// Waits for the page's first layout: every node reported when the canvas moves
// them, the canvas shown.
async function laidOut(canvas: Context["canvas"], moved?: unknown) {
	const region = await canvas.findByRole("region", { name: "Workflow" });
	if (moved)
		await waitFor(
			() => expect(moved).toHaveBeenCalledTimes(WORKFLOW.nodes.length),
			LAID,
		);
	await waitFor(() => expect(card(region, "plan")).toBeVisible(), LAID);
	return region;
}

// The layer's translate moved by `by` and its scale stayed, to a pixel and a
// half (a drag applies its delta, d3 rounds nothing).
async function panned(
	root: Element,
	before: ReturnType<typeof viewport>,
	by: Point,
) {
	const now = viewport(root);
	await expect(now.scale).toBe(before.scale);
	await expect(around(now.x, before.x + by.x, 1.5)).toBe(true);
	await expect(around(now.y, before.y + by.y, 1.5)).toBe(true);
}

// A node that stands whole in the region and clear of the stack and the act,
// by its id: where a finger can land on it.
function reachable(region: Element, element: Element): boolean {
	const box = rect(element);
	const pane = rect(region);
	const at = centre(box);
	const under = document.elementFromPoint(at.x, at.y);
	return (
		at.x > pane.left + 10 &&
		at.x < pane.right - 10 &&
		at.y > pane.top + 10 &&
		at.y < pane.bottom - 10 &&
		under !== null &&
		element.contains(under)
	);
}

// ── 1 Pan ───────────────────────────────────────────────────────────

// One finger drags the ground and pans it by the drag's delta and not its
// scale; a drag from a node pans too, the node stays where it stands, and
// nothing is heard.
const pan: Story = {
	...phone(true, false),
	play: async ({ args, canvas, canvasElement }) => {
		const region = await laidOut(canvas, args.moved);
		const reports = calls(args.moved).length;
		const ground = groundPoint(region);
		const before = viewport(canvasElement);
		await drag(ground, shift(ground, -60, 40));
		await panned(canvasElement, before, { x: -60, y: 40 });

		const plan = card(region, "plan");
		await expect(reachable(region, plan)).toBe(true);
		const from = centre(rect(plan));
		const stood = { x: left(plan), y: top(plan) };
		const pannedFrom = viewport(canvasElement);
		await drag(from, shift(from, 30, -50));
		await panned(canvasElement, pannedFrom, { x: 30, y: -50 });
		await expect({ x: left(plan), y: top(plan) }).toEqual(stood);
		await expect(calls(args.moved)).toHaveLength(reports);
		await expect(args.selected).not.toHaveBeenCalled();
	},
};
export const PanLight = mode("light", pan);
export const PanDark = mode("dark", pan);

// ── 2 Pinch ─────────────────────────────────────────────────────────

// Two fingers moving apart grow the scale by about the ratio of their
// distances, moving together shrink it; nothing is heard.
const pinching: Story = {
	...phone(true, false),
	play: async ({ args, canvas, canvasElement }) => {
		const region = await laidOut(canvas, args.moved);
		const reports = calls(args.moved).length;
		const middle = centre(rect(region));
		const opened = viewport(canvasElement).scale;
		await pinch(middle, 100, 150);
		const grown = viewport(canvasElement).scale;
		await expect(grown / opened).toBeGreaterThan(1.5 * 0.85);
		await expect(grown / opened).toBeLessThan(1.5 * 1.15);
		await pinch(middle, 200, 100);
		const shrunk = viewport(canvasElement).scale;
		await expect(shrunk / grown).toBeGreaterThan(0.5 * 0.85);
		await expect(shrunk / grown).toBeLessThan(0.5 * 1.15);
		await expect(calls(args.moved)).toHaveLength(reports);
		await expect(args.selected).not.toHaveBeenCalled();
	},
};
export const PinchLight = mode("light", pinching);
export const PinchDark = mode("dark", pinching);

// ── 3 Tap ───────────────────────────────────────────────────────────

// A tap on a node chooses it; a tap on the ground clears the choice.
const tapping: Story = {
	...phone(false, false),
	play: async ({ args, canvas }) => {
		const region = await laidOut(canvas);
		const plan = card(region, "plan");
		await expect(reachable(region, plan)).toBe(true);
		await tap(centre(rect(plan)));
		await waitFor(() => expect(args.selected).toHaveBeenCalledTimes(1));
		await expect(args.selected).toHaveBeenLastCalledWith("plan");
		await tap(groundPoint(region));
		await waitFor(() => expect(args.selected).toHaveBeenCalledTimes(2));
		await expect(args.selected).toHaveBeenLastCalledWith(null);
	},
};
export const TapLight = mode("light", tapping);
export const TapDark = mode("dark", tapping);

// ── 4 Long press ────────────────────────────────────────────────────

// A hold lifts a node, which then follows the finger by the finger's distance
// over the scale, with the selection's outline, while the layer holds still
// (d3-zoom is starved, not overridden). The release reports the position once
// and chooses nothing, and the next drag on the ground pans by its own delta.
const lifting: Story = {
	...phone(true, false),
	play: async ({ args, canvas, canvasElement }) => {
		// A pulse at the lift, where a device has one: the page stands in for it.
		const vibrate = fn(() => true);
		Object.defineProperty(navigator, "vibrate", {
			configurable: true,
			value: vibrate,
		});
		const region = await laidOut(canvas, args.moved);
		const plan = card(region, "plan");
		await expect(reachable(region, plan)).toBe(true);
		const before = {
			x: left(plan),
			y: top(plan),
			view: viewport(canvasElement),
			reports: calls(args.moved).length,
		};
		const from = centre(rect(plan));
		const by = { x: 60, y: 40 };
		await drag(from, shift(from, by.x, by.y), {
			pause: HOLD,
			hold: async () => {
				await expect(
					around(left(plan), before.x + by.x / before.view.scale, 1),
				).toBe(true);
				await expect(
					around(top(plan), before.y + by.y / before.view.scale, 1),
				).toBe(true);
				await expect(viewport(canvasElement)).toEqual(before.view);
				const outline = getComputedStyle(plan);
				await expect(outline.outlineStyle).toBe("solid");
				await expect(outline.outlineWidth).toBe("2px");
				await expect(vibrate).toHaveBeenCalledExactlyOnceWith(10);
				await expect(calls(args.moved)).toHaveLength(before.reports);
			},
		});
		await expect(calls(args.moved)).toHaveLength(before.reports + 1);
		const [id, to] = calls(args.moved).at(-1) ?? [];
		await expect(id).toBe("plan");
		await expect(around(to.x, before.x + by.x / before.view.scale, 1)).toBe(
			true,
		);
		await expect(around(to.y, before.y + by.y / before.view.scale, 1)).toBe(
			true,
		);
		await expect(args.selected).not.toHaveBeenCalled();
		await expect(viewport(canvasElement)).toEqual(before.view);
		await expect(getComputedStyle(card(region, "plan")).outlineStyle).toBe(
			"none",
		);

		// The frozen gesture left no jump: a drag on the ground pans by its delta.
		const ground = groundPoint(region);
		await drag(ground, shift(ground, -50, 30));
		await panned(canvasElement, before.view, { x: -50, y: 30 });
		await expect(calls(args.moved)).toHaveLength(before.reports + 1);
		Reflect.deleteProperty(navigator, "vibrate");
	},
};
export const LongPressLight = mode("light", lifting);
export const LongPressDark = mode("dark", lifting);

// ── 5 No gesture takes another's ────────────────────────────────────

// (a) A drag from a node that starts before the press completes pans and does
// not lift.
const panBeforeTheLift: Story = {
	...phone(true, false),
	play: async ({ args, canvas, canvasElement }) => {
		const region = await laidOut(canvas, args.moved);
		const plan = card(region, "plan");
		const reports = calls(args.moved).length;
		const stood = { x: left(plan), y: top(plan) };
		const before = viewport(canvasElement);
		const from = centre(rect(plan));
		await drag(from, shift(from, 40, 70));
		await panned(canvasElement, before, { x: 40, y: 70 });
		await expect({ x: left(plan), y: top(plan) }).toEqual(stood);
		await expect(calls(args.moved)).toHaveLength(reports);
		await expect(args.selected).not.toHaveBeenCalled();
	},
};
export const PanBeforeTheLiftLight = mode("light", panBeforeTheLift);
export const PanBeforeTheLiftDark = mode("dark", panBeforeTheLift);

// A page that stalls for longer than the press once the next finger is down,
// as a loaded machine does: its lift timer fires before it handles what the
// finger did meanwhile.
function stallsAfterTheTouch() {
	document.addEventListener(
		"pointerdown",
		() =>
			setTimeout(() => {
				for (const end = performance.now() + HOLD; performance.now() < end; );
			}),
		{ once: true },
	);
}

// (a') The same drag on a stalled page: the move's time is inside the press, so
// the node goes back and the drag pans.
const panThroughAStall: Story = {
	...phone(true, false),
	play: async ({ args, canvas, canvasElement }) => {
		const region = await laidOut(canvas, args.moved);
		const plan = card(region, "plan");
		const reports = calls(args.moved).length;
		const stood = { x: left(plan), y: top(plan) };
		const before = viewport(canvasElement);
		const from = centre(rect(plan));
		stallsAfterTheTouch();
		await drag(from, shift(from, 40, 70));
		await panned(canvasElement, before, { x: 40, y: 70 });
		await expect({ x: left(plan), y: top(plan) }).toEqual(stood);
		await expect(getComputedStyle(plan).outlineStyle).toBe("none");
		await expect(calls(args.moved)).toHaveLength(reports);
		await expect(args.selected).not.toHaveBeenCalled();
	},
};
export const PanThroughAStallLight = mode("light", panThroughAStall);
export const PanThroughAStallDark = mode("dark", panThroughAStall);

// (b) A hold then a drift past the slop cancels the lift and pans, and the
// time that would have lifted it passes without one.
const driftCancels: Story = {
	...phone(true, false),
	play: async ({ args, canvas, canvasElement }) => {
		const region = await laidOut(canvas, args.moved);
		const plan = card(region, "plan");
		const reports = calls(args.moved).length;
		const stood = { x: left(plan), y: top(plan) };
		const before = viewport(canvasElement);
		const from = centre(rect(plan));
		const finger = hand();
		await finger.down(0, from, 0);
		try {
			await wait(LIFT_MS / 8);
			await finger.move(0, shift(from, 3 * SLOP, 0), 0);
			await finger.move(0, shift(from, 4 * SLOP, 0));
			await wait(HOLD);
			await finger.move(0, shift(from, 4 * SLOP, 30));
			await panned(canvasElement, before, { x: 4 * SLOP, y: 30 });
			await expect({ x: left(plan), y: top(plan) }).toEqual(stood);
			await expect(getComputedStyle(plan).outlineStyle).toBe("none");
		} finally {
			await finger.lift();
		}
		await expect(calls(args.moved)).toHaveLength(reports);
		await expect(args.selected).not.toHaveBeenCalled();
	},
};
export const DriftCancelsLight = mode("light", driftCancels);
export const DriftCancelsDark = mode("dark", driftCancels);

// (c) A hold on a node, then a second finger on the ground before the lift: the
// press is cancelled, the pinch zooms, and the node never lifts, on a stalled
// page too.
const secondFingerBeforeTheLift = (stalled: boolean): Story => ({
	...phone(true, false),
	play: async ({ args, canvas, canvasElement }) => {
		const region = await laidOut(canvas, args.moved);
		const plan = card(region, "plan");
		const reports = calls(args.moved).length;
		const stood = { x: left(plan), y: top(plan) };
		const opened = viewport(canvasElement).scale;
		const from = centre(rect(plan));
		const ground = groundPoint(region);
		const finger = hand();
		if (stalled) stallsAfterTheTouch();
		await finger.down(0, from, 0);
		try {
			await wait(LIFT_MS / 8);
			await finger.down(1, ground, 0);
			for (let step = 1; step <= 6; step++) {
				const along = 1 + step / 6;
				await finger.move(1, {
					x: from.x + (ground.x - from.x) * along,
					y: from.y + (ground.y - from.y) * along,
				});
			}
			await wait(HOLD);
			await expect(viewport(canvasElement).scale).toBeGreaterThan(opened * 1.3);
			await expect({ x: left(plan), y: top(plan) }).toEqual(stood);
			await expect(getComputedStyle(plan).outlineStyle).toBe("none");
		} finally {
			await finger.lift();
		}
		await expect(calls(args.moved)).toHaveLength(reports);
		await expect(args.selected).not.toHaveBeenCalled();
	},
});
export const SecondFingerBeforeTheLiftLight = mode(
	"light",
	secondFingerBeforeTheLift(false),
);
export const SecondFingerBeforeTheLiftDark = mode(
	"dark",
	secondFingerBeforeTheLift(false),
);
export const SecondFingerThroughAStallLight = mode(
	"light",
	secondFingerBeforeTheLift(true),
);
export const SecondFingerThroughAStallDark = mode(
	"dark",
	secondFingerBeforeTheLift(true),
);

// (d) A lift, then a second finger: the node drops where it is and reports
// once, the scale does not change, the first finger's further moves leave the
// layer where it is, and a new pinch zooms once both fingers are up.
const secondFingerWhileLifted: Story = {
	...phone(true, false),
	play: async ({ args, canvas, canvasElement }) => {
		const region = await laidOut(canvas, args.moved);
		const plan = card(region, "plan");
		const reports = calls(args.moved).length;
		const view = viewport(canvasElement);
		const stoodAt = left(plan);
		const from = centre(rect(plan));
		const ground = groundPoint(region);
		const finger = hand();
		await finger.down(0, from);
		try {
			await wait(HOLD);
			await finger.move(0, shift(from, 10, 10));
			await finger.move(0, shift(from, 20, 20));
			await finger.move(0, shift(from, 30, 30));
			await expect(around(left(plan), stoodAt + 30 / view.scale, 1)).toBe(true);
			await finger.down(1, ground);
			await waitFor(() => expect(calls(args.moved)).toHaveLength(reports + 1));
			const dropped = { x: left(plan), y: top(plan) };
			await finger.move(1, shift(ground, -20, 0));
			await finger.move(0, shift(from, 70, 60));
			await finger.move(1, shift(ground, -40, 10));
			await finger.move(0, shift(from, 90, 80));
			await expect(viewport(canvasElement)).toEqual(view);
			await expect({ x: left(plan), y: top(plan) }).toEqual(dropped);
			await finger.up(1);
			await finger.move(0, shift(from, 100, 90));
			await expect(viewport(canvasElement)).toEqual(view);
		} finally {
			await finger.lift();
		}
		await expect(calls(args.moved)).toHaveLength(reports + 1);
		await expect(args.selected).not.toHaveBeenCalled();
		await expect(viewport(canvasElement)).toEqual(view);
		const scale = viewport(canvasElement).scale;
		await pinch(centre(rect(region)), 100, 160);
		await expect(viewport(canvasElement).scale).toBeGreaterThan(scale * 1.3);
	},
};
export const SecondFingerWhileLiftedLight = mode(
	"light",
	secondFingerWhileLifted,
);
export const SecondFingerWhileLiftedDark = mode(
	"dark",
	secondFingerWhileLifted,
);

// (e) A canvas without `onMove`: a hold then a drag pans, nothing lifts.
const noHandler: Story = {
	...phone(false, false),
	play: async ({ args, canvas, canvasElement }) => {
		const region = await laidOut(canvas);
		const plan = card(region, "plan");
		const stoodAt = { x: left(plan), y: top(plan) };
		const view = viewport(canvasElement);
		const from = centre(rect(plan));
		await drag(from, shift(from, -40, 60), { pause: HOLD });
		await panned(canvasElement, view, { x: -40, y: 60 });
		await expect({ x: left(plan), y: top(plan) }).toEqual(stoodAt);
		await expect(getComputedStyle(plan).outlineStyle).toBe("none");
		await expect(args.selected).not.toHaveBeenCalled();
	},
};
export const NoHandlerLight = mode("light", noHandler);
export const NoHandlerDark = mode("dark", noHandler);

// (f) After a lift or a pan nothing is chosen: every scenario above asserts it.
// A pan that ends on a node and a lift both leave `onSelect` unheard, and a tap
// still chooses.
const panThenTap: Story = {
	...phone(true, false),
	play: async ({ args, canvas }) => {
		const region = await laidOut(canvas, args.moved);
		const plan = card(region, "plan");
		const from = centre(rect(plan));
		await drag(from, shift(from, 20, 20), { pause: HOLD });
		await expect(args.selected).not.toHaveBeenCalled();
		await tap(centre(rect(card(region, "plan"))));
		await waitFor(() => expect(args.selected).toHaveBeenCalledTimes(1));
		await expect(args.selected).toHaveBeenLastCalledWith("plan");
	},
};
export const PanThenTapLight = mode("light", panThenTap);
export const PanThenTapDark = mode("dark", panThenTap);

// ── 6 Below the floor ───────────────────────────────────────────────

// Every node is a glyph button of the touch `control` size, its card draws
// nothing, and no two glyphs overlap.
async function glyphForm(root: Element) {
	const forms = [...glyphs(root)];
	await expect(forms).toHaveLength(WORKFLOW.nodes.length);
	for (const form of forms) {
		await expect(form).toBeVisible();
		await expect(rect(form).width).toBeGreaterThan(TOUCH - 0.5);
		await expect(rect(form).height).toBeGreaterThan(TOUCH - 0.5);
	}
	for (const each of root.querySelectorAll("[data-layer] > button"))
		await expect(each).not.toBeVisible();
	forms.forEach((one, index) => {
		for (const two of forms.slice(index + 1))
			expect(apart(rect(one), rect(two))).toBe(true);
	});
}

// Zoomed out below 1 by a pinch and by the zoom stack, the nodes are glyphs at
// three scales; a glyph never lifts, a pinch past the lowest zoom stops at it,
// and a tap on a glyph zooms to that node at its own size and chooses nothing.
const overview: Story = {
	...phone(true, false),
	play: async ({ args, canvas, canvasElement }) => {
		const region = await laidOut(canvas, args.moved);
		const reports = calls(args.moved).length;
		const middle = centre(rect(region));
		const scale = () => viewport(canvasElement).scale;
		await expect(glyphs(canvasElement)).toHaveLength(0);

		// Just under 1, and half of that.
		await pinch(middle, 200, 180);
		await expect(scale()).toBeLessThan(1);
		await expect(scale()).toBeGreaterThan(0.8);
		await glyphForm(canvasElement);
		const under = scale();
		await pinch(middle, 200, 100);
		await expect(around(scale(), under / 2, under * 0.15)).toBe(true);
		await glyphForm(canvasElement);

		// The lowest zoom: a pinch past it stops at it, and the stack agrees.
		const lowest = lowestZoom(canvasElement, TOUCH);
		await pinch(middle, 240, 24);
		await expect(around(scale(), lowest, 0.005)).toBe(true);
		await glyphForm(canvasElement);
		await expect(
			canvas.getByRole("button", { name: "Zoom out" }),
		).toHaveAttribute("aria-disabled", "true");

		// A glyph does not lift: a hold then a drag on it pans.
		const forms = [...glyphs(canvasElement)].filter((each) =>
			reachable(region, each),
		);
		const first = forms[0];
		if (!first) throw new Error("no glyph a finger can reach");
		const view = viewport(canvasElement);
		const at = centre(rect(first));
		await drag(at, shift(at, -20, 15), { pause: HOLD });
		await panned(canvasElement, view, { x: -20, y: 15 });
		await expect(calls(args.moved)).toHaveLength(reports);
		await expect(args.selected).not.toHaveBeenCalled();

		// A tap on a glyph zooms to its node at scale 1, centred, and the card is
		// back. The node is the one whose glyph was tapped.
		const tapped = [...glyphs(canvasElement)].find((each) =>
			reachable(region, each),
		);
		if (!tapped) throw new Error("no glyph a finger can reach");
		const index = [...glyphs(canvasElement)].indexOf(tapped);
		await tap(centre(rect(tapped)));
		await waitFor(() => expect(scale()).toBeCloseTo(1, 1));
		await expect(around(scale(), 1, 0.01)).toBe(true);
		const shown = [
			...canvasElement.querySelectorAll<HTMLElement>("[data-layer] > button"),
		][index];
		if (!shown) throw new Error("no card for the glyph");
		await expect(shown).toBeVisible();
		await expect(around(centre(rect(shown)).x, middle.x, 1)).toBe(true);
		await expect(around(centre(rect(shown)).y, middle.y, 1)).toBe(true);
		await expect(glyphs(canvasElement)).toHaveLength(0);
		await expect(args.selected).not.toHaveBeenCalled();
	},
};
export const BelowTheFloorLight = mode("light", overview);
export const BelowTheFloorDark = mode("dark", overview);

// ── 7 Once per crossing ─────────────────────────────────────────────

// A node's element changes once when the zoom crosses 1 and not while the zoom
// moves within one side of it.
const crossing: Story = {
	...phone(false, false),
	play: async ({ canvas, canvasElement, userEvent }) => {
		const region = await laidOut(canvas);
		const plan = card(region, "plan");
		const seen: MutationRecord[] = [];
		const watch = new MutationObserver((list) => seen.push(...list));
		watch.observe(plan, { attributes: true, childList: true, subtree: true });
		// What changed since the last read: a microtask delivers each batch.
		const records = () => seen.splice(0).length;
		try {
			const zoomIn = canvas.getByRole("button", { name: "Zoom in" });
			const zoomOut = canvas.getByRole("button", { name: "Zoom out" });
			await userEvent.click(zoomIn);
			await userEvent.click(zoomIn);
			const ground = groundPoint(region);
			await drag(ground, shift(ground, -30, 20));
			await userEvent.click(zoomOut);
			await expect(viewport(canvasElement).scale).toBeGreaterThan(1);
			await expect(records()).toBe(0);
			// Across 1.
			await userEvent.click(zoomOut);
			await expect(viewport(canvasElement).scale).toBeLessThan(1);
			await expect(records()).toBeGreaterThan(0);
			// Within the lower side.
			await userEvent.click(zoomOut);
			await drag(ground, shift(ground, 20, -10));
			await expect(records()).toBe(0);
			// And back.
			await userEvent.click(zoomIn);
			await userEvent.click(zoomIn);
			await expect(viewport(canvasElement).scale).toBeGreaterThan(1);
			await expect(records()).toBeGreaterThan(0);
		} finally {
			watch.disconnect();
		}
	},
};
export const OncePerCrossingLight = mode("light", crossing);
export const OncePerCrossingDark = mode("dark", crossing);

// ── 8 The floor on controls ─────────────────────────────────────────

const atLeast = async (element: Element, size = TOUCH) => {
	await expect(rect(element).width).toBeGreaterThan(size - 0.01);
	await expect(rect(element).height).toBeGreaterThan(size - 0.01);
};

// The zoom stack, Arrange and the act are 44 px square or more.
const controls: Story = {
	...phone(true, true),
	play: async ({ args, canvas }) => {
		await laidOut(canvas, args.moved);
		for (const name of ["Zoom in", "Zoom out", "Fit", "Arrange"])
			await atLeast(canvas.getByRole("button", { name }));
		await atLeast(canvas.getByRole("button", { name: "Add a step" }));
	},
};
export const ControlsFloorLight = mode("light", controls);
export const ControlsFloorDark = mode("dark", controls);

// A port's hit is 44 px at every zoom a node is drawn at (the text floor is
// zoom 1, below which the glyph stands alone and no port is drawn), and a finger
// drag from an out port to an in port connects at the opened zoom and one step
// in, without panning; a release on the ground connects to nothing.
const ports: Story = {
	...phone(true, true),
	play: async ({ args, canvas, canvasElement, userEvent }) => {
		const region = await laidOut(canvas, args.moved);
		const portOf = (id: string, kind: "in" | "out") => {
			const found = card(region, id).querySelector<HTMLElement>(
				`[data-port="${kind}"]`,
			);
			if (!found) throw new Error(`no ${kind} port on ${id}`);
			return found;
		};
		const wired = async () => {
			// Any two nodes whose ports a finger can land on.
			const out = WORKFLOW.nodes
				.map((node) => portOf(node.id, "out"))
				.find((each) => reachable(region, each));
			const target = WORKFLOW.nodes
				.map((node) => portOf(node.id, "in"))
				.find(
					(each) =>
						reachable(region, each) && each.dataset.node !== out?.dataset.node,
				);
			if (!out || !target) throw new Error("no two ports in reach");
			const view = viewport(canvasElement);
			const reports = args.connected as unknown as Spy<Connected>;
			const sent = reports.mock.calls.length;
			await drag(centre(rect(out)), centre(rect(target)));
			await expect(reports.mock.calls).toHaveLength(sent + 1);
			await expect(reports.mock.calls.at(-1)).toEqual([
				out.dataset.node,
				target.dataset.node,
			]);
			await expect(viewport(canvasElement)).toEqual(view);
			const ground = groundPoint(region);
			await drag(centre(rect(out)), ground);
			await expect(reports.mock.calls).toHaveLength(sent + 2);
			await expect(reports.mock.calls.at(-1)).toEqual([out.dataset.node, null]);
			await expect(viewport(canvasElement)).toEqual(view);
		};
		await atLeast(portOf("plan", "out"));
		await atLeast(portOf("plan", "in"));
		await wired();
		await userEvent.click(canvas.getByRole("button", { name: "Zoom in" }));
		await expect(viewport(canvasElement).scale).toBeGreaterThan(1);
		await atLeast(portOf("plan", "out"));
		await atLeast(portOf("plan", "in"));
		await wired();
		await userEvent.click(canvas.getByRole("button", { name: "Zoom in" }));
		await expect(viewport(canvasElement).scale).toBe(2);
		await atLeast(portOf("plan", "out"));
		await atLeast(portOf("plan", "in"));
		// Below the floor no port is drawn.
		for (let step = 0; step < 4; step++)
			await userEvent.click(canvas.getByRole("button", { name: "Zoom out" }));
		await expect(viewport(canvasElement).scale).toBeLessThan(1);
		await expect(canvasElement.querySelectorAll("[data-port]")).toHaveLength(0);
	},
};
export const PortsFloorLight = mode("light", ports);
export const PortsFloorDark = mode("dark", ports);

// ── Fit leaves the canvas's own chrome clear ────────────────────────

// After Fit and after Arrange's fit, no node's box or glyph meets the act or the
// zoom stack, at the touch size of both.
const fits: Story = {
	...phone(true, false),
	play: async ({ args, canvas, canvasElement }) => {
		await laidOut(canvas, args.moved);
		const button = (name: string) => canvas.getByRole("button", { name });
		await tap(centre(rect(button("Fit"))));
		await waitFor(() => expect(viewport(canvasElement).scale).toBeLessThan(1));
		clear(canvasElement);
		const reports = calls(args.moved).length;
		await tap(centre(rect(button("Arrange"))));
		await waitFor(() =>
			expect(calls(args.moved).length).toBeGreaterThan(reports),
		);
		await wait(100);
		clear(canvasElement);
	},
};
export const FitClearsTheChromeLight = mode("light", fits);
export const FitClearsTheChromeDark = mode("dark", fits);

// The first view takes the room a fit does, so no node opens under the zoom
// stack or the act, in a 375 px phone, on a pane that holds the graph in that
// room.
const opens: Story = {
	...phone(true, false, undefined, WORKFLOW_STAGE),
	play: async ({ args, canvas, canvasElement }) => {
		await laidOut(canvas, args.moved);
		await expect(viewport(canvasElement).scale).toBe(1);
		clear(canvasElement);
	},
};
export const OpensClearOfTheChromeLight = mode("light", opens);
export const OpensClearOfTheChromeDark = mode("dark", opens);

// Under the floor an edge ends on its glyphs and a group frame holds its glyphs
// by the padding, just under 1 and at the lowest zoom, where every route still
// has a stretch to read.
const follow: Story = {
	...phone(true, false),
	play: async ({ args, canvas, canvasElement }) => {
		const region = await laidOut(canvas, args.moved);
		const middle = centre(rect(region));
		await pinch(middle, 200, 180);
		await expect(viewport(canvasElement).scale).toBeLessThan(1);
		await waitFor(() => routesFollowTheGlyphs(canvasElement, WORKFLOW));
		await pinch(middle, 240, 24);
		await expect(
			canvas.getByRole("button", { name: "Zoom out" }),
		).toHaveAttribute("aria-disabled", "true");
		await waitFor(() => routesFollowTheGlyphs(canvasElement, WORKFLOW));
	},
};
export const RoutesFollowTheGlyphsLight = mode("light", follow);
export const RoutesFollowTheGlyphsDark = mode("dark", follow);

// ── 9 The glyph's state ─────────────────────────────────────────────

const marks = (glyph: Element) => glyph.querySelectorAll(":scope > span");

// A problem's glyph draws its border in the danger hue and holds the danger
// dot; a status glyph holds a dot.
const problem: Story = {
	...phone(true, false, PROBLEM),
	play: async ({ args, canvas, canvasElement, userEvent }) => {
		await laidOut(canvas, args.moved);
		await userEvent.click(canvas.getByRole("button", { name: "Zoom out" }));
		await expect(viewport(canvasElement).scale).toBeLessThan(1);
		const forms = [...glyphs(canvasElement)];
		const [broken, fine] = ["build", "plan"].map((id) => {
			const found = forms[WORKFLOW.nodes.findIndex((node) => node.id === id)];
			if (!found) throw new Error(`no glyph for ${id}`);
			return found;
		});
		await expect(getComputedStyle(broken as Element).borderColor).not.toBe(
			getComputedStyle(fine as Element).borderColor,
		);
		await expect(marks(broken as Element)).toHaveLength(1);
		await expect(marks(fine as Element)).toHaveLength(0);
	},
};
export const ProblemGlyphLight = mode("light", problem);
export const ProblemGlyphDark = mode("dark", problem);

const statuses: Story = {
	...phone(true, false, STATUSES),
	play: async ({ args, canvas, canvasElement, userEvent }) => {
		await laidOut(canvas, args.moved);
		await userEvent.click(canvas.getByRole("button", { name: "Zoom out" }));
		await expect(viewport(canvasElement).scale).toBeLessThan(1);
		const forms = [...glyphs(canvasElement)];
		await expect(forms).toHaveLength(STATUSES.nodes.length);
		for (const form of forms) await expect(marks(form)).toHaveLength(1);
	},
};
export const StatusGlyphLight = mode("light", statuses);
export const StatusGlyphDark = mode("dark", statuses);

// ── The marks clear the icon ────────────────────────────────────────

// Under the floor a glyph's status dot, spinner and problem dot straddle its
// corner and none meets its icon, at the touch size.
const clearMarks: Story = {
	...phone(true, false, MARKED),
	play: async ({ args, canvas, canvasElement, userEvent }) => {
		await laidOut(canvas, args.moved);
		await userEvent.click(canvas.getByRole("button", { name: "Zoom out" }));
		await expect(viewport(canvasElement).scale).toBeLessThan(1);
		marksClearTheIcon(canvasElement);
	},
};
export const MarksClearTheIconLight = mode("light", clearMarks);
export const MarksClearTheIconDark = mode("dark", clearMarks);

// ── The canvas keeps half its column ────────────────────────────────

// A canvas under a head and two banners in a Split's main: the main is one
// column that scrolls as a page, and the canvas keeps half of it whatever
// stands above it, the head and the banners scrolling away over it.
function Under(props: Heard & { height: number }) {
	return (
		<div
			style={{
				height: props.height,
				display: "flex",
				flexDirection: "column",
			}}
		>
			<Place title="Workflows" bleed>
				<Split
					list={
						<List
							items={["Nightly"]}
							row={{ key: (name) => name, title: (name) => name }}
						/>
					}
					main={
						<>
							<ItemHeader
								title="Nightly release"
								facts={[
									"Ana Ruiz",
									"Saved today at 09:41",
									"Run 4 of 6",
									"Parked on the check step",
									"Owner: Release team",
								]}
							/>
							<Banner
								kind="danger"
								sentence="The save was refused: two steps have no way out, and the check step has no owner. Fix both before the workflow can run again, or restore the last saved version from the history and make the change again from there, one step at a time."
							/>
							<Banner
								kind="warn"
								sentence="The workflow is empty on its third branch, and the run is parked until someone looks at it. The last run stopped at the check step after two retries, and nothing after it has run since the branch was added to the workflow."
							/>
							<Canvas
								label="Workflow"
								nodes={WORKFLOW.nodes}
								edges={WORKFLOW.edges}
								groups={WORKFLOW.groups}
								onSelect={props.selected}
							/>
						</>
					}
				/>
			</Place>
		</div>
	);
}

function screenAt(width: number, height: number): Story {
	const name = `w${width}x${height}`;
	return {
		render: (args: Heard) => <Under {...args} height={height} />,
		globals: { density: "touch", viewport: { value: name, isRotated: false } },
		parameters: {
			layout: "fullscreen",
			viewport: {
				options: {
					[name]: {
						name,
						styles: { width: `${width}px`, height: `${height}px` },
						type: "mobile",
					},
				},
			},
		},
		play: async ({ args, canvas, canvasElement }) => {
			const region = await laidOut(canvas);
			const column =
				canvasElement.querySelector<HTMLElement>("[data-split] > div");
			const inset = region.parentElement;
			if (!column || !inset) throw new Error("no main");
			// The floor: half the room the inset leaves its content, and the column
			// scrolls past it, so the head and the banners are not what the canvas
			// shrinks to make room for.
			const style = getComputedStyle(inset);
			const half =
				(rect(inset).height -
					Number.parseFloat(style.paddingTop) -
					Number.parseFloat(style.paddingBottom)) /
				2;
			await expect(rect(region).height).toBeGreaterThanOrEqual(half - 1);
			await expect(column.scrollHeight).toBeGreaterThan(column.clientHeight);
			await expect(column.scrollTop).toBe(0);

			// A finger on the canvas pans the graph and the page stays.
			const ground = groundPoint(region);
			const before = viewport(canvasElement);
			await drag(ground, shift(ground, -40, 30));
			await panned(canvasElement, before, { x: -40, y: 30 });
			await expect(column.scrollTop).toBe(0);
			await expect(args.selected).not.toHaveBeenCalled();

			// A finger on the head scrolls the page and the graph stays.
			const head = column.querySelector("h1, h2, h3");
			if (!head) throw new Error("no head");
			const from = centre(rect(head));
			const held = viewport(canvasElement);
			await drag(from, shift(from, 0, -60));
			await waitFor(() => expect(column.scrollTop).toBeGreaterThan(30));
			await expect(viewport(canvasElement)).toEqual(held);
			await expect(rect(region).height).toBeGreaterThanOrEqual(half - 1);
		},
	};
}

export const KeepsHalfAt375x667Light = mode("light", screenAt(375, 667));
export const KeepsHalfAt375x667Dark = mode("dark", screenAt(375, 667));
export const KeepsHalfAt390x844Light = mode("light", screenAt(390, 844));
export const KeepsHalfAt390x844Dark = mode("dark", screenAt(390, 844));

// ── A group with an empty body ──────────────────────────────────────

// At 375 an empty group stands between its neighbours with its edges meeting
// it, and alone, at the touch density; a tap on its head chooses it.
const hollow: Story = {
	render: (args: Heard) => (
		<>
			<div className={STAGE}>
				<Canvas
					label="Hollow loop"
					nodes={HOLLOW.nodes}
					edges={HOLLOW.edges}
					groups={HOLLOW.groups}
					onSelect={args.selected}
					onMove={args.moved}
				/>
			</div>
			<div className={ALONE_STAGE}>
				<Canvas
					label="Lone loop"
					nodes={HOLLOW_ALONE.nodes}
					groups={HOLLOW_ALONE.groups}
					onSelect={args.selected}
				/>
			</div>
		</>
	),
	play: async ({ args, canvas }) => {
		const between = await canvas.findByRole("region", { name: "Hollow loop" });
		const alone = await canvas.findByRole("region", { name: "Lone loop" });
		for (const region of [between, alone])
			await waitFor(
				() => expect(getComputedStyle(region).opacity).toBe("1"),
				LAID,
			);
		hollowHeld(between, { id: "loop", into: "plan-loop", out: "loop-handoff" });
		hollowHeld(alone, { id: "loop" });
		await waitFor(() =>
			expect(args.moved).toHaveBeenCalledTimes(HOLLOW.nodes.length),
		);
		await expect(calls(args.moved).map(([id]) => id)).not.toContain("loop");
		const head = between.querySelector("[data-group] > button");
		if (!head) throw new Error("no head");
		await tap(centre(rect(head)));
		await waitFor(() => expect(args.selected).toHaveBeenCalledTimes(1));
		await expect(args.selected).toHaveBeenLastCalledWith("loop");
	},
};
export const HollowGroupLight = mode("light", hollow);
export const HollowGroupDark = mode("dark", hollow);
