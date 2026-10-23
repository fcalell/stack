import { read } from "@fcalell/plugin-api/tanstack-query";
import { type Row, Section } from "@fcalell/plugin-react-ui/components/section";
import { Stats } from "@fcalell/plugin-react-ui/components/stats";
import { tuned } from "@fcalell/ui-core/paint";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { expect, waitFor } from "storybook/test";

// The wait's motion: a painted fill fades in once `--wait-delay` has run, then
// breathes on its own alpha, every fill in one phase however late it mounted;
// the spinner enters by a fade. Reduced motion stills the breath.
export default {
	title: "Behaviour/Wait motion",
} satisfies Meta;

// A read that never answers, so its parts stay painted.
let reads = 0;
const never = () =>
	read({
		queryKey: ["wait-motion", reads++],
		queryFn: () => new Promise<number>(() => {}),
	});

// Bars that mount one after another, `gap` ms apart: with no shared clock each
// would breathe a step behind the last.
function Staggered(props: { bars: number; gap: number }) {
	const [shown, setShown] = useState(1);
	const [waiting] = useState(() =>
		Array.from({ length: props.bars }, () => never().at((): Row[] => [])),
	);
	useEffect(() => {
		if (shown >= props.bars) return undefined;
		const timer = setTimeout(() => setShown(shown + 1), props.gap);
		return () => clearTimeout(timer);
	}, [shown, props.bars, props.gap]);
	return (
		<div className="flex flex-col gap-section" data-testid="bars">
			{waiting.slice(0, shown).map((items, at) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: the bars are fixed and ordered
				<div key={at} data-testid="bar">
					<Section items={items} />
				</div>
			))}
		</div>
	);
}

const named = (name: string) => (one: Animation) =>
	one instanceof CSSAnimation && one.animationName === name;

const seconds = (ms: number) => `${ms / 1000}s`;

// Every painted fill breathes in the document timeline's phase: bars mounted
// 150 ms apart still stand at one `currentTime`.
export const OnePhase: StoryObj = {
	render: () => <Staggered bars={4} gap={150} />,
	play: async ({ canvas }) => {
		await waitFor(() => expect(canvas.getAllByTestId("bar")).toHaveLength(4), {
			timeout: 3000,
		});
		const breathing = () =>
			document.getAnimations().filter(named("pulse-fill"));
		// The last bar's animation takes the page's phase a frame after it starts.
		await waitFor(() => {
			const at = breathing().map((one) => Number(one.currentTime));
			expect(at.length).toBeGreaterThanOrEqual(8);
			expect(Math.max(...at) - Math.min(...at)).toBeLessThan(1);
		});
		const beats = breathing();
		// The breath moves the fill's alpha, never the box's opacity.
		const keyframes = (beats[0]?.effect as KeyframeEffect).getKeyframes();
		await expect(keyframes.some((frame) => "backgroundColor" in frame)).toBe(
			true,
		);
		await expect(keyframes.some((frame) => "opacity" in frame)).toBe(false);
		await expect(
			getComputedStyle(canvas.getAllByTestId("bar")[0] as HTMLElement).opacity,
		).toBe("1");
	},
};

// A painted fill stands undrawn until `--wait-delay`, then fades in over the
// base rung, then breathes over the pulse; with the breath named `none` (the
// stylesheet's reduced-motion form) the delay and fade hold and nothing
// breathes.
export const FadesThenBreathes: StoryObj = {
	render: () => <Staggered bars={1} gap={0} />,
	play: async ({ canvas }) => {
		const fill = canvas
			.getByTestId("bar")
			.querySelector("[data-painted]") as HTMLElement;
		const style = getComputedStyle(fill);
		await expect(style.animationName).toBe("paint-in, pulse-fill");
		await expect(style.animationDuration).toBe(
			`${seconds(tuned.base)}, ${seconds(tuned.pulse)}`,
		);
		await expect(style.animationDelay).toBe(`${seconds(tuned.waitDelay)}, 0s`);
		await expect(style.opacity).toBe("0");
		await waitFor(() => expect(getComputedStyle(fill).opacity).toBe("1"), {
			timeout: 3000,
		});
		const root = document.documentElement.style;
		root.setProperty("--pulse-name", "none");
		try {
			await expect(getComputedStyle(fill).animationName).toBe("paint-in, none");
			await expect(getComputedStyle(fill).animationDelay).toBe(
				`${seconds(tuned.waitDelay)}, 0s`,
			);
		} finally {
			root.removeProperty("--pulse-name");
		}
	},
};

// A frame whose read is not asked for (idle) draws its painted form still:
// nothing is coming, so nothing breathes, while a waiting frame's fills do.
export const StillStandsStill: StoryObj = {
	render: () => {
		const idle = read({
			queryKey: ["wait-motion", "idle"],
			queryFn: () => new Promise<readonly string[]>(() => {}),
			enabled: false,
		});
		return (
			<Section title="Idle" read={idle}>
				<Stats items={[{ label: "Idle", value: idle.at(() => 1) }]} />
			</Section>
		);
	},
	play: async ({ canvasElement }) => {
		const frame = canvasElement.querySelector("section") as HTMLElement;
		await expect(frame.hasAttribute("data-still")).toBe(true);
		await expect(frame.hasAttribute("aria-busy")).toBe(false);
		const fill = frame.querySelector("[data-painted]") as HTMLElement;
		await expect(getComputedStyle(fill).animationName).toBe("paint-in, none");
	},
};

// A row whose leading is the spinner, a status that is `running`.
const RUNNING = {
	key: "run",
	title: "Running",
	leading: { status: "running" },
} as const;

// The spinner enters by a fade on `fast` and then turns on the loop.
export const SpinnerEnters: StoryObj = {
	render: () => <Section items={[RUNNING]} />,
	play: async ({ canvasElement }) => {
		const ring = canvasElement.querySelector(
			"[aria-hidden] > [aria-hidden]",
		) as HTMLElement;
		const box = getComputedStyle(ring);
		await expect(box.animationName).toBe("paint-in");
		await expect(box.animationDuration).toBe(seconds(tuned.fast));
		const arc = getComputedStyle(ring.lastElementChild as HTMLElement);
		await expect(arc.animationName).toBe("spin");
		await expect(arc.animationDuration).toBe(seconds(tuned.loop));
	},
};

// A painted Stat among the sizes the bench plays: the sample the tuning page
// shows for this unit.
export const Sample: StoryObj = {
	render: () => <Stats items={[{ label: "Waiting", value: never() }]} />,
};
