import { Canvas } from "@fcalell/plugin-react-ui/components/canvas";
import {
	WORKFLOW,
	WORKFLOW_STAGE,
} from "@fcalell/plugin-react-ui/showcase/frames/canvas";
import { tuned } from "@fcalell/ui-core/paint";
import { EASING } from "@fcalell/ui-core/tokens";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import { card, glyphs, LAID, viewport } from "./canvas-support.ts";

// The canvas moves (`motion.md` §3, §5): its viewport travels on `base`
// `in-out` for a zoom act, Fit and a reveal, and is the pointer's the moment it
// takes over; a node answers on `fast`, lifts to the lift scale with its float
// shadow fading in, and crosses the text floor by a crossfade; a path's tone
// cross-fades on `base`.
export default {
	title: "Behaviour/Canvas motion",
} satisfies Meta;

const seconds = (ms: number) => `${ms / 1000}s`;

function Workflow() {
	return (
		<div className={WORKFLOW_STAGE}>
			<Canvas
				label="Workflow"
				nodes={WORKFLOW.nodes}
				edges={WORKFLOW.edges}
				groups={WORKFLOW.groups}
				onSelect={() => {}}
			/>
		</div>
	);
}

type Context = Parameters<NonNullable<StoryObj["play"]>>[0];

// The canvas, laid out with its nodes drawn whole.
async function laid(canvas: Context["canvas"]): Promise<HTMLElement> {
	const region = await canvas.findByRole("region", { name: "Workflow" });
	await waitFor(() => expect(getComputedStyle(region).opacity).toBe("1"), LAID);
	await waitFor(() => expect(card(region, "plan")).toBeVisible(), LAID);
	return region;
}

// The scales the layer shows, one a frame, until `stop` is called.
function watched(region: Element) {
	const scales: number[] = [];
	let on = true;
	const sample = () => {
		scales.push(viewport(region).scale);
		if (on) requestAnimationFrame(sample);
	};
	sample();
	return {
		scales,
		stop: () => {
			on = false;
		},
	};
}

// The root's base rung, held long so a story can look inside the move.
async function slowly<T>(run: () => Promise<T>): Promise<T> {
	const root = document.documentElement.style;
	root.setProperty("--transition-duration-base", "1200ms");
	try {
		return await run();
	} finally {
		root.removeProperty("--transition-duration-base");
	}
}

// A zoom act travels: the scale passes through values between its two ends,
// one way, and lands on the step.
export const ZoomTravels: StoryObj = {
	render: () => <Workflow />,
	play: async ({ canvas, userEvent }) => {
		const region = await laid(canvas);
		// The rung held long, so a busy page still shows frames inside the move.
		await slowly(async () => {
			const before = viewport(region).scale;
			const seen = watched(region);
			await userEvent.click(canvas.getByRole("button", { name: "Zoom in" }));
			await waitFor(
				() => expect(viewport(region).scale).toBeCloseTo(before * 1.2, 3),
				{ timeout: 5000 },
			);
			seen.stop();
			const between = seen.scales.filter(
				(scale) => scale > before + 1e-4 && scale < before * 1.2 - 1e-4,
			);
			await expect(between.length).toBeGreaterThan(0);
			await expect(seen.scales).toEqual([...seen.scales].sort((a, b) => a - b));
		});
	},
};

// Quick presses add up: each step is taken from where the last was headed.
export const QuickStepsAddUp: StoryObj = {
	render: () => <Workflow />,
	play: async ({ canvas, userEvent }) => {
		const region = await laid(canvas);
		const before = viewport(region).scale;
		const zoomIn = canvas.getByRole("button", { name: "Zoom in" });
		for (let step = 0; step < 3; step++) await userEvent.click(zoomIn);
		await waitFor(() =>
			expect(viewport(region).scale).toBeCloseTo(before * 1.2 ** 3, 3),
		);
	},
};

// The pointer taking over ends a travel where it got to.
export const ThePointerEndsATravel: StoryObj = {
	render: () => <Workflow />,
	play: async ({ canvas }) => {
		const region = await laid(canvas);
		await slowly(async () => {
			const before = viewport(region).scale;
			canvas.getByRole("button", { name: "Zoom in" }).click();
			await waitFor(() =>
				expect(viewport(region).scale).toBeGreaterThan(before),
			);
			region.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
			const stopped = viewport(region).scale;
			await new Promise((done) => setTimeout(done, 400));
			await expect(viewport(region).scale).toBe(stopped);
			await expect(stopped).toBeLessThan(before * 1.2 - 1e-4);
		});
	},
};

// Reduced motion lands a step at once.
export const ReducedMotionLandsAtOnce: StoryObj = {
	render: () => <Workflow />,
	play: async ({ canvas }) => {
		const region = await laid(canvas);
		const root = document.documentElement.style;
		root.setProperty("--transition-duration-base", "0ms");
		try {
			const before = viewport(region).scale;
			canvas.getByRole("button", { name: "Zoom in" }).click();
			await new Promise((done) => requestAnimationFrame(() => done(undefined)));
			await expect(viewport(region).scale).toBeCloseTo(before * 1.2, 3);
		} finally {
			root.removeProperty("--transition-duration-base");
		}
	},
};

// A node answers on `fast`, and a lift scales it to the lift scale while its
// float shadow fades in on `fast`.
export const NodeAnswersAndLifts: StoryObj = {
	render: () => <Workflow />,
	play: async ({ canvas }) => {
		const region = await laid(canvas);
		const node = card(region, "plan");
		const style = getComputedStyle(node);
		await expect(style.transitionProperty).toContain("border-color");
		await expect(style.transitionProperty).toContain("scale");
		await expect(style.transitionDuration).toBe(seconds(tuned.fast));
		const shadow = getComputedStyle(node, "::after");
		await expect(shadow.transitionProperty).toBe("opacity");
		await expect(shadow.transitionDuration).toBe(seconds(tuned.fast));
		// Read with the transition held off, so the computed style is the target.
		node.style.transition = "none";
		const rest = {
			scale: style.scale,
			shadow: getComputedStyle(node, "::after").opacity,
		};
		node.dataset.lifted = "";
		const lifted = { scale: style.scale };
		// The shadow is the pseudo-element's own transition, so it is waited for.
		await waitFor(() =>
			expect(getComputedStyle(node, "::after").opacity).toBe("1"),
		);
		const cast = getComputedStyle(node, "::after").boxShadow;
		delete node.dataset.lifted;
		node.style.transition = "";
		await expect(rest.scale).toBe("none");
		await expect(rest.shadow).toBe("0");
		await expect(Number(lifted.scale)).toBeCloseTo(tuned.lift, 3);
		await expect(cast).not.toBe("none");
	},
};

// A taken path's tone cross-fades on `base`: the edges and the words.
export const PathTonesFade: StoryObj = {
	render: () => <Workflow />,
	play: async ({ canvas }) => {
		const region = await laid(canvas);
		const edge = region.querySelector<SVGElement>("[data-edge]");
		if (!edge) throw new Error("no edge");
		const line = getComputedStyle(edge);
		await expect(line.transitionProperty).toContain("color");
		await expect(line.transitionDuration).toBe(seconds(tuned.base));
		await expect(line.transitionTimingFunction).toBe(
			`cubic-bezier(${EASING.out.join(", ")})`,
		);
		const words = card(region, "plan").querySelector("span span");
		if (!words) throw new Error("no words");
		await expect(getComputedStyle(words).transitionDuration).toBe(
			seconds(tuned.base),
		);
	},
};

// The graph fades in on `base` once laid out.
export const TheGraphFadesIn: StoryObj = {
	render: () => <Workflow />,
	play: async ({ canvas }) => {
		const region = await canvas.findByRole("region", { name: "Workflow" });
		await waitFor(
			() => expect(getComputedStyle(region).animationName).toBe("paint-in"),
			LAID,
		);
		await expect(getComputedStyle(region).animationDuration).toBe(
			seconds(tuned.base),
		);
	},
};

// Under the text floor the card fades out and its glyph fades in on `fast`;
// the card keeps its box and, inert, takes no pointer and no key.
export const CardAndGlyphCrossfade: StoryObj = {
	render: () => <Workflow />,
	play: async ({ canvas, userEvent }) => {
		const region = await laid(canvas);
		const zoomOut = canvas.getByRole("button", { name: "Zoom out" });
		for (let step = 0; step < 12; step++) {
			if (zoomOut.hasAttribute("disabled")) break;
			await userEvent.click(zoomOut);
		}
		await waitFor(() => expect(glyphs(region).length).toBeGreaterThan(0));
		const node = card(region, "plan");
		await waitFor(() => expect(getComputedStyle(node).opacity).toBe("0"));
		await expect(node.hasAttribute("inert")).toBe(true);
		await expect(getComputedStyle(node).pointerEvents).toBe("none");
		const glyph = glyphs(region)[0]?.parentElement;
		if (!glyph) throw new Error("no glyph");
		await expect(getComputedStyle(glyph).animationName).toBe("paint-in");
		await expect(getComputedStyle(glyph).animationDuration).toBe(
			seconds(tuned.fast),
		);
	},
};
