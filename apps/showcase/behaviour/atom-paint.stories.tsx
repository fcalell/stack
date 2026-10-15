import { Avatar } from "@fcalell/plugin-react-ui/components/avatar";
import { Banner } from "@fcalell/plugin-react-ui/components/banner";
import { Chip } from "@fcalell/plugin-react-ui/components/chip";
import { Count } from "@fcalell/plugin-react-ui/components/count";
import { Status } from "@fcalell/plugin-react-ui/components/status";
import { readsAt } from "@fcalell/plugin-react-ui/showcase/waiting";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { expect, waitFor } from "storybook/test";

// An atom whose prop is a selection draws its loaded box painted while the
// read waits, inert, then its value once the read lands. Each story draws the
// atom over a read that answers (loaded) and one that never does (painted) and
// measures both boxes, so the screen does not move when the data lands.
export default {
	title: "Behaviour/AtomPaint",
} satisfies Meta;

function Pair(props: { loaded: ReactNode; painted: ReactNode }) {
	return (
		<div className="flex flex-col gap-sections w-sheet max-w-full">
			<div data-testid="loaded" className="w-fit">
				{props.loaded}
			</div>
			<div data-testid="painted" className="w-fit">
				{props.painted}
			</div>
		</div>
	);
}

type Play = NonNullable<StoryObj["play"]>;

const box = (element: Element) => element.getBoundingClientRect();

// The loaded side once its value has landed, the painted side without it and
// holding something inert, and both at one height.
const sides =
	(landed: string | undefined, inert: string): Play =>
	async ({ canvas }) => {
		const loaded = canvas.getByTestId("loaded");
		const painted = canvas.getByTestId("painted");
		if (landed !== undefined) {
			await waitFor(() => expect(loaded).toHaveTextContent(landed));
			await expect(painted).not.toHaveTextContent(landed);
		}
		await expect(loaded.querySelector(inert)).toBeNull();
		await expect(painted.querySelector(inert)).not.toBeNull();
		await expect(
			Math.abs(box(painted).height - box(loaded).height),
		).toBeLessThan(2);
	};

const COUNT = readsAt("atom-paint/count");

export const CountFigure: StoryObj = {
	render: () => (
		<Pair
			loaded={<Count value={COUNT.ready.at(() => 12)} />}
			painted={<Count value={COUNT.waiting.at(() => 12)} />}
		/>
	),
	play: sides("12", "[inert]"),
};

const STATUS = readsAt("atom-paint/status");

export const StatusMark: StoryObj = {
	render: () => (
		<Pair
			loaded={
				<Status
					state={STATUS.ready.at(() => "done" as const)}
					label={STATUS.ready.at(() => "Deployed")}
				/>
			}
			painted={
				<Status
					state={STATUS.waiting.at(() => "done" as const)}
					label={STATUS.waiting.at(() => "Deployed")}
				/>
			}
		/>
	),
	play: sides("Deployed", "[inert]"),
};

const CHIP = readsAt("atom-paint/chip");

export const ChipPill: StoryObj = {
	render: () => (
		<Pair
			loaded={
				<Chip
					label={CHIP.ready.at(() => "Design")}
					family={CHIP.ready.at(() => "violet" as const)}
				/>
			}
			painted={
				<Chip
					label={CHIP.waiting.at(() => "Design")}
					family={CHIP.waiting.at(() => "violet" as const)}
				/>
			}
		/>
	),
	play: sides("Design", "[inert]"),
};

const AVATAR = readsAt("atom-paint/avatar");

export const AvatarCircle: StoryObj = {
	render: () => (
		<Pair
			loaded={<Avatar name={AVATAR.ready.at(() => "Ana Ruiz")} />}
			painted={<Avatar name={AVATAR.waiting.at(() => "Ana Ruiz")} />}
		/>
	),
	play: async (context) => {
		const { canvas } = context;
		const loaded = canvas.getByTestId("loaded");
		await waitFor(() => expect(loaded).toHaveTextContent("AR"));
		const painted = canvas.getByTestId("painted");
		await expect(painted).not.toHaveTextContent("AR");
		await expect(painted.querySelector('[role="img"]')).toBeNull();
		// The circles, not their lines: an empty inline box sits on a different
		// baseline than one holding text.
		const circle = (side: Element) => box(side.firstElementChild as Element);
		await expect(circle(painted).width).toBe(circle(loaded).width);
		await expect(circle(painted).height).toBe(circle(loaded).height);
	},
};

const BANNER = readsAt("atom-paint/banner");

// The kind, the sentence and the act each wait on their own read: the loaded
// banner draws them, the painted one holds the same boxes and takes no press.
export const BannerLine: StoryObj = {
	render: () => (
		<Pair
			loaded={
				<Banner
					kind={BANNER.ready.at(() => "warn" as const)}
					sentence={BANNER.ready.at(() => "Sync is behind.")}
					act={BANNER.ready.at(() => ({
						label: "Retry",
						onAct: () => {},
					}))}
				/>
			}
			painted={
				<Banner
					kind={BANNER.waiting.at(() => "warn" as const)}
					sentence={BANNER.waiting.at(() => "Sync is behind.")}
					act={BANNER.waiting.at(() => ({
						label: "Retry",
						onAct: () => {},
					}))}
				/>
			}
		/>
	),
	play: async ({ canvas }) => {
		const loaded = canvas.getByTestId("loaded");
		const painted = canvas.getByTestId("painted");
		await waitFor(() => expect(loaded).toHaveTextContent("Sync is behind."));
		await expect(canvas.getByRole("button", { name: "Retry" })).toBeVisible();
		await expect(painted).not.toHaveTextContent("Sync is behind.");
		await expect(painted).not.toHaveTextContent("Retry");
		await expect(painted.querySelector("[inert]")).not.toBeNull();
		await expect(painted.querySelector("[data-painted]")).not.toBeNull();
		await expect(
			Math.abs(box(painted).height - box(loaded).height),
		).toBeLessThan(2);
	},
};
