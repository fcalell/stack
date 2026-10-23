import { Gate } from "@fcalell/plugin-react-ui/components/gate";
import { Sheet } from "@fcalell/plugin-react-ui/components/sheet";
import { toast, toasts } from "@fcalell/plugin-react-ui/lib/toast";
import { tuned } from "@fcalell/ui-core/paint";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, screen, waitFor } from "storybook/test";
import { centre, rect } from "./canvas-support.ts";
import { hand, type Point, wait } from "./touch.ts";

// A gesture follows the finger (`motion.md` §3, follow): what it carries moves
// 1:1 toward the way it leaves and never against it, with no transition, and
// only the release eases: past the reach or flung it leaves, else it settles
// back. The pure decision is `@fcalell/ui-core/follow`'s; these read the page
// it moves. A touch drag is real touch events (`touch.ts`), so the page hears
// pointer events with real hit-testing.
export default {
	title: "Behaviour/Follow",
	tags: ["touch"],
	globals: { density: "touch" },
} satisfies Meta;

const shifted = (found: HTMLElement) =>
	/translate[XY]\((-?[\d.]+)px\)/.exec(found.style.transform)?.[1];

const by = (from: Point, x: number, y: number): Point => ({
	x: from.x + x,
	y: from.y + y,
});

// A toast stands in the Shell's layer, a dialog of Base UI's.
async function toasted(
	sentence: string,
	options?: Parameters<typeof toast>[1],
): Promise<HTMLElement> {
	// The queue is the app's, so a toast a story left stands over the next one.
	toasts.close();
	toast(sentence, options);
	const found = (await screen.findByText(sentence)).closest<HTMLElement>(
		'[role="dialog"]',
	);
	if (!found) throw new Error("no toast");
	// The toast has entered: its own first frames are not the gesture's.
	await waitFor(() => expect(getComputedStyle(found).opacity).toBe("1"));
	await wait(tuned.base + 150);
	return found;
}

function Page() {
	return (
		<Gate title="Toast">
			<p>The page.</p>
		</Gate>
	);
}

// A finger on a toast carries it 1:1 toward the inline end with no transition,
// the way it came is the finger's alone, and let go short and slow it settles
// back where it stood.
export const ToastFollowsTheFinger: StoryObj = {
	render: () => <Page />,
	play: async () => {
		const found = await toasted("Saved once");
		const from = centre(rect(found));
		const finger = hand();
		await finger.down(0, from);
		try {
			// Along the line first, past the slop.
			await finger.move(0, by(from, 24, 0));
			await finger.move(0, by(from, 60, 0));
			await expect(Number(shifted(found))).toBeCloseTo(60, 0);
			await expect(found.style.transition).toBe("none");
			// Against the way it leaves, nothing follows.
			await finger.move(0, by(from, -30, 0));
			await expect(Number(shifted(found))).toBe(0);
			await finger.move(0, by(from, 60, 0));
			await wait(250);
		} finally {
			await finger.lift();
		}
		// Slow and short: it settles back, and stays.
		await waitFor(() => expect(found.style.transform).toBe(""));
		await waitFor(() => expect(found.style.transition).toBe(""));
		await expect(screen.queryByText("Saved once")).not.toBeNull();
	},
};

// Past the reach (40% of its width) a release leaves.
export const ToastLeavesPastTheReach: StoryObj = {
	render: () => <Page />,
	play: async () => {
		const found = await toasted("Saved far");
		const from = centre(rect(found));
		const finger = hand();
		await finger.down(0, from);
		try {
			for (const x of [30, 80, 160, 220]) await finger.move(0, by(from, x, 0));
			await wait(250);
		} finally {
			await finger.lift();
		}
		await waitFor(() => expect(screen.queryByText("Saved far")).toBeNull());
	},
};

// A short, quick flick leaves too: the speed past the fling carries it on.
export const ToastLeavesFlung: StoryObj = {
	render: () => <Page />,
	play: async () => {
		const found = await toasted("Saved flung");
		const from = centre(rect(found));
		const finger = hand();
		await finger.down(0, from);
		try {
			// Three moves a frame apart: 25 px each is well past 0.5 px a ms.
			for (const x of [25, 50, 75]) await finger.move(0, by(from, x, 0), 0);
		} finally {
			await finger.lift();
		}
		await waitFor(() => expect(screen.queryByText("Saved flung")).toBeNull());
	},
};

// A toast's act and its dismiss stay presses: a tap on the act still runs it.
export const ToastActStaysAPress: StoryObj = {
	render: () => <Page />,
	play: async () => {
		const onAct = fn();
		await toasted("Saved act", { act: { label: "Open", onAct } });
		const open = await screen.findByRole("button", { name: "Open" });
		const finger = hand();
		await finger.down(0, centre(rect(open)));
		await finger.lift();
		await waitFor(() => expect(onAct).toHaveBeenCalledTimes(1));
	},
};

function Pulled(props: { onClose: () => void }) {
	const [open, setOpen] = useState(true);
	return (
		<Sheet
			open={open}
			onClose={() => {
				props.onClose();
				setOpen(false);
			}}
			title="Rename domain"
		>
			<p>A body.</p>
		</Sheet>
	);
}

// A bottom sheet follows a finger down on its head 1:1, and goes back when
// let go short.
export const SheetFollowsTheFinger: StoryObj<{ onClose: () => void }> = {
	args: { onClose: fn() },
	render: (args) => <Pulled onClose={args.onClose} />,
	play: async ({ args }) => {
		const dialog = await screen.findByRole("dialog", { name: "Rename domain" });
		await waitFor(() => expect(getComputedStyle(dialog).opacity).toBe("1"));
		await new Promise((done) => setTimeout(done, 400));
		const title = screen.getByRole("heading", { name: "Rename domain" });
		const from = centre(rect(title));
		const finger = hand();
		await finger.down(0, from);
		try {
			// Short of the reach: a sheet this short leaves at 40% of its height.
			await finger.move(0, by(from, 0, 12));
			await finger.move(0, by(from, 0, 30));
			await expect(Number(shifted(dialog))).toBeCloseTo(30, 0);
			await expect(dialog.style.transition).toBe("none");
			// Up is the sheet's own: it does not rise above its rest.
			await finger.move(0, by(from, 0, -40));
			await expect(Number(shifted(dialog))).toBe(0);
			await finger.move(0, by(from, 0, 30));
			await wait(250);
		} finally {
			await finger.lift();
		}
		await waitFor(() => expect(dialog.style.transform).toBe(""));
		await expect(args.onClose).not.toHaveBeenCalled();
	},
};

// Pulled past the reach it closes.
export const SheetClosesPastTheReach: StoryObj<{ onClose: () => void }> = {
	args: { onClose: fn() },
	render: (args) => <Pulled onClose={args.onClose} />,
	play: async ({ args }) => {
		const dialog = await screen.findByRole("dialog", { name: "Rename domain" });
		await new Promise((done) => setTimeout(done, 400));
		const title = screen.getByRole("heading", { name: "Rename domain" });
		const from = centre(rect(title));
		const finger = hand();
		await finger.down(0, from);
		try {
			const down = rect(dialog).height;
			for (const y of [30, down / 3, down / 2])
				await finger.move(0, by(from, 0, y));
			await wait(250);
		} finally {
			await finger.lift();
		}
		await waitFor(() => expect(args.onClose).toHaveBeenCalledTimes(1));
		await waitFor(() =>
			expect(
				screen.queryByRole("dialog", { name: "Rename domain" }),
			).toBeNull(),
		);
	},
};

// Reduced motion still lets the finger lead and only snaps the release.
export const ReducedMotionSnapsTheRelease: StoryObj = {
	render: () => <Page />,
	play: async () => {
		const root = document.documentElement.style;
		root.setProperty("--transition-duration-base", "0ms");
		try {
			const found = await toasted("Saved reduced");
			const from = centre(rect(found));
			const finger = hand();
			await finger.down(0, from);
			try {
				await finger.move(0, by(from, 24, 0));
				await finger.move(0, by(from, 50, 0));
				await expect(Number(shifted(found))).toBeCloseTo(50, 0);
				await wait(250);
			} finally {
				await finger.lift();
			}
			await waitFor(() => expect(found.style.transform).toBe(""));
			await waitFor(() => expect(found.style.transition).toBe(""));
		} finally {
			root.removeProperty("--transition-duration-base");
		}
	},
};
