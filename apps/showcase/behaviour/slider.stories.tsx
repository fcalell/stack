import { Slider } from "@fcalell/plugin-react-ui/components/slider";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

const noop = () => {};

function Sliders() {
	return (
		<div className="flex flex-col gap-section">
			{[0, 30, 100].map((value) => (
				<Slider
					key={value}
					label={`At ${value}`}
					value={value}
					onChange={noop}
					min={0}
					max={100}
				/>
			))}
		</div>
	);
}

export default {
	title: "Behaviour/Slider",
	render: () => <Sliders />,
} satisfies Meta;

// The thumb stands where the value puts it from the first frame, never
// measured and moved: its start is the fill's width and the fill is the share
// of the track less the thumb, so it stays inside the track at both ends.
export const ThumbStandsByTheValue: StoryObj = {
	play: async ({ canvas }) => {
		for (const [name, share] of [
			["At 0", 0],
			["At 30", 0.3],
			["At 100", 1],
		] as const) {
			const input = canvas.getByRole("slider", { name });
			const thumb = input.closest<HTMLElement>("[data-index]");
			const track = thumb?.parentElement;
			if (!thumb || !track) throw new Error("the slider is not drawn");
			await expect(getComputedStyle(thumb).visibility).toBe("visible");
			const at = thumb.getBoundingClientRect();
			const along = track.getBoundingClientRect();
			await expect(at.left - along.left).toBeCloseTo(
				(along.width - at.width) * share,
				0,
			);
		}
	},
};

// The thumb carries its label as its own name, so a checker that reads the
// label's element as hidden (a slider scrolled out of a short scroller) still
// finds one.
export const ThumbIsNamedByItsLabel: StoryObj = {
	render: () => (
		<div style={{ height: 120, overflowY: "auto" }}>
			<div className="flex flex-col gap-section">
				{["Reserve", "Ceiling", "Floor"].map((label) => (
					<Slider
						key={label}
						label={label}
						value={30}
						onChange={noop}
						min={0}
						max={100}
					/>
				))}
			</div>
		</div>
	),
	play: async ({ canvas }) => {
		for (const name of ["Reserve", "Ceiling", "Floor"]) {
			const input = canvas.getByRole("slider", { name });
			await expect(input.getAttribute("aria-label")).toBe(name);
		}
	},
};
