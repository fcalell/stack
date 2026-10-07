import { Slider } from "@fcalell/plugin-react-ui/components/slider";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect } from "storybook/test";

function Timeout() {
	const [value, setValue] = useState(30);
	return (
		<div className="w-popover">
			<Slider
				label="Timeout"
				value={value}
				onChange={setValue}
				min={0}
				max={60}
				step={5}
				unit="minute"
			/>
		</div>
	);
}

export default {
	title: "Behaviour/Slider",
	render: () => <Timeout />,
} satisfies Meta;

// The thumb is a named slider that moves by the arrow keys, by a page and to
// either end, and reports its value.
export const Thumb: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		const thumb = canvas.getByRole("slider", { name: "Timeout" });
		await userEvent.tab();
		await expect(thumb).toHaveFocus();
		await expect(thumb).toHaveAttribute("aria-valuenow", "30");
		await userEvent.keyboard("{ArrowRight}");
		await expect(thumb).toHaveAttribute("aria-valuenow", "35");
		await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
		await expect(thumb).toHaveAttribute("aria-valuenow", "25");
		await userEvent.keyboard("{Home}");
		await expect(thumb).toHaveAttribute("aria-valuenow", "0");
		await userEvent.keyboard("{End}");
		await expect(thumb).toHaveAttribute("aria-valuenow", "60");
	},
};
