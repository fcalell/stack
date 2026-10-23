import { Toolbar } from "@fcalell/plugin-react-ui/components/toolbar";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

// A run of removable chips that wraps keeps its lines far enough apart that the
// remove acts' hit boxes (the target's size, taller than the chip) of one line
// stand clear of the next line's: on touch the gap between the lines widens to
// the target less the chip, and the desktop's inside gap already does.
export default {
	title: "Behaviour/Chip lines",
} satisfies Meta;

const NAMES = [
	"Production",
	"Staging",
	"Preview deployments",
	"Needs review",
	"Blocked",
	"Archived",
	"Mine",
	"Last week",
	"Billing",
	"Security",
];

const render = () => (
	<div style={{ width: 320 }} className="max-w-none">
		<Toolbar
			chips={NAMES.map((label) => ({
				label,
				family: "neutral" as const,
				onRemove: () => {},
			}))}
		/>
	</div>
);

const play: NonNullable<StoryObj["play"]> = async ({ canvas }) => {
	const removes = canvas
		.getAllByRole("button", { name: /^Remove / })
		.map((button) => button.getBoundingClientRect());
	const lines = new Set(removes.map((box) => Math.round(box.top / 4)));
	// The row wraps: the case is only worth anything with more than one line.
	await expect(lines.size).toBeGreaterThan(1);
	for (const [at, a] of removes.entries()) {
		for (const b of removes.slice(at + 1)) {
			const across = Math.min(a.right, b.right) - Math.max(a.left, b.left);
			const down = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
			await expect(across > 0.5 && down > 0.5).toBe(false);
		}
	}
};

export const DesktopRemoveBoxesStandClear: StoryObj = { render, play };

export const TouchRemoveBoxesStandClear: StoryObj = {
	render,
	play,
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
};
