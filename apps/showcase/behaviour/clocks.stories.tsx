import { PendingBar } from "@fcalell/plugin-react-ui/components/pending-bar";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Table } from "@fcalell/plugin-react-ui/components/table";
import type { TableColumn } from "@fcalell/ui-core/descriptors";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { expect } from "storybook/test";
import { holdClock } from "./clock.ts";

// The pending bar and an age read one coarse clock. Each story mounts what it
// draws from a button inside its play, after the test clock is held, so every
// timer the parts start is the clock's: seconds pass in milliseconds of test
// time and nothing waits in real time.
const SECONDS = 30;

// A parent that renders ten times a second, as a busy page does, and hands the
// bar a fresh Date object of the same moment on every render.
function Busy() {
	const [mounted, setMounted] = useState(false);
	const [end, setEnd] = useState<number>();
	const [, render] = useState(0);
	useEffect(() => {
		if (!mounted) return;
		const timer = setInterval(() => render((count) => count + 1), 100);
		return () => clearInterval(timer);
	}, [mounted]);
	return (
		<div style={{ width: 375 }}>
			<button type="button" onClick={() => setMounted(true)}>
				Mount
			</button>
			<button type="button" onClick={() => setEnd(Date.now() + SECONDS * 1000)}>
				Set until
			</button>
			{mounted ? (
				<PendingBar
					sentence="Restoring the backup"
					until={end === undefined ? undefined : new Date(end)}
				/>
			) : null}
		</div>
	);
}

interface Log {
	id: string;
	at: string;
}

const COLUMNS: TableColumn<Log>[] = [
	{ key: "id", label: "Run", cell: (log) => log.id },
	{ key: "at", label: "Started", kind: "age", cell: (log) => log.at },
];

function Ages() {
	const [at, setAt] = useState<string>();
	return (
		<div style={{ width: 900, height: 400 }}>
			<button
				type="button"
				onClick={() => setAt(new Date(Date.now()).toISOString())}
			>
				Mount
			</button>
			{at === undefined ? null : (
				<Place title="Runs">
					<Table
						columns={COLUMNS}
						items={[{ id: "build", at }]}
						row={{ id: (log) => log.id }}
					/>
				</Place>
			)}
		</div>
	);
}

export default {
	title: "Behaviour/Clocks",
	parameters: { layout: "fullscreen" },
} satisfies Meta;

const LEFT = /^\d+:\d\d$/;

// With `until` set after mount: the clock reads right from the first moment,
// counts down a second at a time however often the parent renders, and the
// fill moves from nothing to the full track by itself, never back.
export const BarCountsDownWhateverTheParent: StoryObj = {
	render: () => <Busy />,
	play: async ({ canvas, userEvent }) => {
		const clock = holdClock();
		try {
			await userEvent.click(canvas.getByRole("button", { name: "Mount" }));
			await clock.advance(0);
			await expect(canvas.getByRole("status")).toHaveTextContent(
				"Restoring the backup",
			);
			await expect(canvas.queryByText(LEFT)).toBeNull();
			await userEvent.click(canvas.getByRole("button", { name: "Set until" }));
			await clock.advance(0);
			// The first moment: the whole span, not the time since mount.
			await expect(canvas.getByText(LEFT)).toHaveTextContent("0:30");
			// One interval for the bar's clock, not restarted by the renders.
			await expect(clock.intervals(1000)).toBe(1);
			const fills = canvas
				.getByRole("status")
				.parentElement?.getAnimations({ subtree: true })
				.filter((motion) => motion.effect?.getComputedTiming().duration);
			await expect(fills).toHaveLength(1);
			const motion = fills?.[0] as Animation;
			await expect(motion.effect?.getComputedTiming().duration).toBe(
				SECONDS * 1000,
			);
			const fill = (motion.effect as KeyframeEffect).target as HTMLElement;
			const track = fill.parentElement as HTMLElement;
			// The fill is monotonic from empty to the full track.
			motion.pause();
			const widths: number[] = [];
			for (const at of [0, 7500, 15000, 22500, SECONDS * 1000 - 1]) {
				motion.currentTime = at;
				widths.push(fill.getBoundingClientRect().width);
			}
			motion.play();
			await expect(widths[0]).toBeLessThan(2);
			for (let i = 1; i < widths.length; i++)
				await expect(widths[i]).toBeGreaterThan(widths[i - 1] as number);
			await expect(
				Math.abs((widths.at(-1) as number) - track.clientWidth),
			).toBeLessThan(2);
			// The clock counts down by the second, however fast the parent renders.
			for (let left = SECONDS - 1; left >= 0; left--) {
				await clock.advance(1000);
				const text = `0:${String(left).padStart(2, "0")}`;
				await expect(canvas.getByText(LEFT)).toHaveTextContent(text);
			}
			// The same animation ran throughout: no render restarted it.
			await expect(motion.playState).not.toBe("idle");
			// Past its end the clock stops: it stays at 0:00 and no interval runs.
			await expect(clock.intervals(1000)).toBe(0);
			await clock.advance(5000);
			await expect(canvas.getByText(LEFT)).toHaveTextContent("0:00");
			await expect(clock.intervals(1000)).toBe(0);
		} finally {
			clock.stop();
		}
	},
};

// An age at "now" turns to "1 minute ago" on its own once the clock has moved
// a minute, with nothing else rendering it.
export const AgeTurnsOnItsOwn: StoryObj = {
	render: () => <Ages />,
	play: async ({ canvas, userEvent }) => {
		const clock = holdClock();
		try {
			await userEvent.click(canvas.getByRole("button", { name: "Mount" }));
			await clock.advance(0);
			const cell = canvas.getByText("build").closest("tr") as HTMLElement;
			await expect(cell).not.toHaveTextContent(/minute/);
			await expect(cell).toHaveTextContent(/now|second/i);
			await clock.advance(30_000);
			await expect(cell).not.toHaveTextContent(/minute/);
			await clock.advance(30_000);
			await expect(cell).toHaveTextContent("1 minute ago");
		} finally {
			clock.stop();
		}
	},
};
