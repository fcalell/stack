import { BarChart } from "@fcalell/plugin-react-ui/components/bar-chart";
import { Gate } from "@fcalell/plugin-react-ui/components/gate";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Stats } from "@fcalell/plugin-react-ui/components/stats";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, waitFor } from "storybook/test";

// The value move (`motion.md` §3): a fill is its full track scaled by
// transform, never a width or a height, and a figure or a mark that changes
// while shown swaps old for new. Read back as the browser resolves them.
export default {
	title: "Behaviour/Value",
} satisfies Meta;

const seconds = (value: string) => Number.parseFloat(value) * 1000;
const first = (list: string) => list.split(",")[0]?.trim() ?? "";

function rung(name: string): number {
	return Number.parseFloat(
		getComputedStyle(document.documentElement).getPropertyValue(
			`--transition-duration-${name}`,
		),
	);
}

// The elements whose style sets `--fill`, in document order.
const fills = (root: ParentNode) =>
	Array.from(root.querySelectorAll<HTMLElement>('[style*="--fill"]'));

// The swap animations running in `root` by name.
const swaps = (root: ParentNode, name: "swap-in" | "swap-out") =>
	(root as Element)
		.getAnimations({ subtree: true })
		.filter((one) => one instanceof CSSAnimation && one.animationName === name);

function Meters() {
	const [used, setUsed] = useState(40);
	return (
		<>
			<button type="button" onClick={() => setUsed(95)}>
				Fill
			</button>
			<div style={{ width: 240 }}>
				<Stats items={[{ label: "Quota", value: used, bound: 100 }]} />
			</div>
		</>
	);
}

export const MeterFill: StoryObj = {
	name: "A Stats meter's fill is the full track scaled from its start",
	render: () => <Meters />,
	play: async ({ canvas, canvasElement }) => {
		const [fill] = fills(canvasElement);
		await expect(fill).toBeTruthy();
		if (!fill) return;
		const track = fill.parentElement as HTMLElement;
		// The fill is the track's whole box; only its scale is the data.
		await expect(fill.offsetWidth).toBe(track.offsetWidth);
		await expect(fill.offsetHeight).toBe(track.offsetHeight);
		await waitFor(() => expect(getComputedStyle(fill).scale).toBe("0.4 1"));
		const style = getComputedStyle(fill);
		await expect(style.transformOrigin.split(" ")[0]).toBe("0px");
		// It moves on `slow`, its colour on `base`, and never through layout.
		await expect(style.transitionProperty).toContain("scale");
		await expect(style.transitionProperty).toContain("background-color");
		await expect(style.transitionProperty).not.toMatch(
			/width|height|margin|padding|all/,
		);
		await expect(seconds(first(style.transitionDuration))).toBe(rung("slow"));
		await expect(seconds(style.transitionDuration.split(",")[1] ?? "")).toBe(
			rung("base"),
		);
		// A new value moves the scale, the box stays.
		await userEvent.click(canvas.getByRole("button", { name: "Fill" }));
		await waitFor(() => expect(getComputedStyle(fill).scale).toBe("0.95 1"));
		await expect(fill.offsetWidth).toBe(track.offsetWidth);
		// The tick-less meter says its share by rolling it.
		await expect(canvas.getByText("95%")).toBeTruthy();
	},
};

export const MeterReduced: StoryObj = {
	name: "A Stats meter's fill snaps under reduced motion",
	render: () => <Meters />,
	play: async ({ canvasElement }) => {
		const root = document.documentElement.style;
		root.setProperty("--transition-duration-slow", "0ms");
		root.setProperty("--transition-duration-base", "0ms");
		try {
			const [fill] = fills(canvasElement);
			await expect(
				seconds(
					first(getComputedStyle(fill as HTMLElement).transitionDuration),
				),
			).toBe(0);
		} finally {
			root.removeProperty("--transition-duration-slow");
			root.removeProperty("--transition-duration-base");
		}
	},
};

export const Bars: StoryObj = {
	name: "A BarChart's bars are the full column scaled from the baseline",
	render: () => (
		<div style={{ width: 280 }}>
			<BarChart
				label="Requests"
				keys={["ok", "failed"]}
				items={[
					{ at: "a", ok: 2, failed: 1 },
					{ at: "b", ok: 4, failed: 0 },
				]}
				bar={{
					key: (one) => one.at,
					value: (one) => one.ok + one.failed,
					parts: (one) => ({ ok: one.ok, failed: one.failed }),
				}}
			/>
		</div>
	),
	play: async ({ canvasElement }) => {
		const bars = fills(canvasElement);
		await expect(bars).toHaveLength(4);
		const [ok, failed] = bars;
		if (!ok || !failed) return;
		const column = ok.parentElement as HTMLElement;
		await expect(ok.offsetHeight).toBe(column.offsetHeight);
		await expect(failed.offsetHeight).toBe(column.offsetHeight);
		// Axis top 4 (four bands of 1): 2 of 4 and, over it, 1 of 4.
		await waitFor(() => expect(getComputedStyle(ok).scale).toBe("1 0.5"));
		await expect(getComputedStyle(failed).scale).toBe("1 0.25");
		// The second part stands over the first and one clear line.
		const lifted = failed.getBoundingClientRect();
		const under = ok.getBoundingClientRect();
		await expect(Math.round(under.bottom - lifted.bottom)).toBeGreaterThan(0);
		const style = getComputedStyle(ok);
		await expect(style.transformOrigin.split(" ")[1]).toBe(
			`${ok.offsetHeight}px`,
		);
		await expect(style.transitionProperty).not.toMatch(
			/\bheight\b|\bwidth\b|\ball\b/,
		);
	},
};

export const Steps: StoryObj = {
	name: "A StepCount segment that turns done cross-fades its fill",
	render: () => <Gate title="Setup" step={{ at: 2, of: 3 }} />,
	play: async ({ canvasElement }) => {
		const segment = canvasElement.querySelector<HTMLElement>(
			'[class*="bg-fill-neutral"]',
		);
		await expect(segment).toBeTruthy();
		const style = getComputedStyle(segment as HTMLElement);
		await expect(style.transitionProperty).toBe("background-color");
		await expect(seconds(style.transitionDuration)).toBe(rung("base"));
	},
};

function Figure() {
	const [figure, setFigure] = useState(10);
	return (
		<>
			<button type="button" onClick={() => setFigure(figure + 4)}>
				Up
			</button>
			<button type="button" onClick={() => setFigure(figure - 6)}>
				Down
			</button>
			<Stats items={[{ label: "Open", value: figure }]} />
		</>
	);
}

// The translate a swap animation starts or ends at.
function keyframe(animation: Animation, at: 0 | 1): string {
	const frames = (animation.effect as KeyframeEffect).getKeyframes();
	return String(frames[at === 0 ? 0 : frames.length - 1]?.translate ?? "");
}

export const Roll: StoryObj = {
	name: "A figure rolls by the sign of its change",
	render: () => <Figure />,
	play: async ({ canvas, canvasElement }) => {
		await expect(canvas.getByText("10")).toBeTruthy();
		// It mounted at rest: nothing swaps.
		await expect(swaps(canvasElement, "swap-in")).toHaveLength(0);
		await userEvent.click(canvas.getByRole("button", { name: "Up" }));
		await expect(canvas.getByText("14")).toBeTruthy();
		// A rise: the new one comes from below and the old leaves upward.
		const entering = swaps(canvasElement, "swap-in");
		const leaving = swaps(canvasElement, "swap-out");
		await expect(entering).toHaveLength(1);
		await expect(leaving).toHaveLength(1);
		await expect(keyframe(entering[0] as Animation, 0)).toContain("100%");
		await expect(canvas.getByText("10")).toBeTruthy();
		await expect(
			(entering[0]?.effect as KeyframeEffect).getTiming().duration,
		).toBe(rung("fast"));
		// The old one is gone once it has left.
		await waitFor(() => expect(canvas.queryByText("10")).toBeNull());
		// A fall rolls the other way.
		await userEvent.click(canvas.getByRole("button", { name: "Down" }));
		await expect(canvas.getByText("8")).toBeTruthy();
		const falling = swaps(canvasElement, "swap-in");
		await expect(keyframe(falling[0] as Animation, 0)).toContain("-100%");
		// The figure's box clips the roll.
		await expect(
			getComputedStyle(canvas.getByText("8").parentElement as Element)
				.overflowX,
		).toBe("clip");
	},
};

function Marks() {
	const [state, setState] = useState<"done" | "failed">("done");
	return (
		<>
			<button type="button" onClick={() => setState("failed")}>
				Fail
			</button>
			<Section
				items={[{ key: "deploy", title: "Deploy", status: { tone: state } }]}
			/>
		</>
	);
}

export const MarkChange: StoryObj = {
	name: "A status mark that changes cross-fades with a scale from 0.6",
	render: () => <Marks />,
	play: async ({ canvas, canvasElement }) => {
		await expect(swaps(canvasElement, "swap-in")).toHaveLength(0);
		await userEvent.click(canvas.getByRole("button", { name: "Fail" }));
		const entering = swaps(canvasElement, "swap-in");
		await expect(entering).toHaveLength(1);
		await expect(swaps(canvasElement, "swap-out")).toHaveLength(1);
		const frames = (entering[0]?.effect as KeyframeEffect).getKeyframes();
		await expect(String(frames[0]?.scale)).toBe("0.6");
		await expect(String(frames[0]?.opacity)).toBe("0");
		await waitFor(() =>
			expect(swaps(canvasElement, "swap-out")).toHaveLength(0),
		);
	},
};
