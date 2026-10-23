import { Banner } from "@fcalell/plugin-react-ui/components/banner";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { readsAt } from "@fcalell/plugin-react-ui/showcase/waiting";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { expect, fn, waitFor } from "storybook/test";

const pressed = fn();

// An atom whose prop is a selection draws its loaded box painted while the
// read waits, inert, then its value once the read lands. Each story draws the
// atom over a read that answers (loaded) and one that never does (painted) and
// measures both boxes, so the screen does not move when the data lands.
export default {
	title: "Behaviour/AtomPaint",
} satisfies Meta;

function Pair(props: { loaded: ReactNode; painted: ReactNode }) {
	return (
		<div className="flex flex-col gap-section w-sheet max-w-full">
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

// A side's text but the scramble's generated glyphs (`aria-hidden`), which may
// draw the value's own digits by chance.
const own = (element: Element) => {
	const copy = element.cloneNode(true) as Element;
	for (const glyphs of copy.querySelectorAll("[data-scrambling]"))
		glyphs.remove();
	return copy.textContent ?? "";
};

// The loaded side once its value has landed, the painted side without it and
// holding something inert, and both at one height.
const sides =
	(landed: string | undefined, inert: string): Play =>
	async ({ canvas }) => {
		const loaded = canvas.getByTestId("loaded");
		const painted = canvas.getByTestId("painted");
		if (landed !== undefined) {
			await waitFor(() => expect(own(loaded)).toContain(landed));
			await expect(own(painted)).not.toContain(landed);
		}
		await expect(loaded.querySelector(inert)).toBeNull();
		await expect(painted.querySelector(inert)).not.toBeNull();
		await expect(
			Math.abs(box(painted).height - box(loaded).height),
		).toBeLessThan(2);
	};

const STATUS = readsAt("atom-paint/status");

export const StatusMark: StoryObj = {
	render: () => (
		<Pair
			loaded={
				<Section
					items={[
						{
							label: "Deploy",
							title: STATUS.ready.at(() => ({
								status: "done" as const,
								label: "Deployed",
							})),
						},
					]}
				/>
			}
			painted={
				<Section
					items={[
						{
							label: "Deploy",
							title: STATUS.waiting.at(() => ({
								status: "done" as const,
								label: "Deployed",
							})),
						},
					]}
				/>
			}
		/>
	),
	play: sides("Deployed", "[inert]"),
};

const BANNER = readsAt("atom-paint/banner");

// The tone, the sentence and the act each wait on their own read: the loaded
// banner draws them, the painted one holds the same boxes and takes no press.
export const BannerLine: StoryObj = {
	render: () => (
		<Pair
			loaded={
				<Banner
					tone={BANNER.ready.at(() => "attention" as const)}
					sentence={BANNER.ready.at(() => "Sync is behind.")}
					act={BANNER.ready.at(() => ({
						label: "Retry",
						onAct: pressed,
					}))}
				/>
			}
			painted={
				<Banner
					tone={BANNER.waiting.at(() => "attention" as const)}
					sentence={BANNER.waiting.at(() => "Sync is behind.")}
					act={BANNER.waiting.at(() => ({
						label: "Retry",
						onAct: pressed,
					}))}
				/>
			}
		/>
	),
	play: async ({ canvas }) => {
		const loaded = canvas.getByTestId("loaded");
		const painted = canvas.getByTestId("painted");
		await waitFor(() => expect(loaded).toHaveTextContent("Sync is behind."));
		// The banner is a block: it fades in on `base` as it mounts.
		await waitFor(() =>
			expect(canvas.getByRole("button", { name: "Retry" })).toBeVisible(),
		);
		await expect(painted).not.toHaveTextContent("Sync is behind.");
		await expect(painted).not.toHaveTextContent("Retry");
		await expect(painted.querySelector("[inert]")).not.toBeNull();
		await expect(painted.querySelector("[data-painted]")).not.toBeNull();
		await expect(
			Math.abs(box(painted).height - box(loaded).height),
		).toBeLessThan(2);
	},
};
