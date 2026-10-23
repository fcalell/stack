import { Prose } from "@fcalell/plugin-react-ui/components/prose";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

// The headings of a page's Sections share one left edge, a foldable one's
// included: its chevron stands after the title (Stead's critique found a folded
// Section's heading 14 px right of the others', the chevron before it).
export default {
	title: "Behaviour/Section fold",
} satisfies Meta;

function Stack() {
	return (
		<div className="flex flex-col gap-section w-sheet max-w-full">
			<Section title="Plain">
				<Prose markdown="The body." />
			</Section>
			<Section title="Folded" folded>
				<Prose markdown="The body." />
			</Section>
			<Section title="Opened" folded={false}>
				<Prose markdown="The body." />
			</Section>
			<Section
				title="Counted"
				items={[1, 2, 3].map((each) => ({
					key: `${each}`,
					title: `Row ${each}`,
				}))}
				folded
			/>
		</div>
	);
}

const left = (element: Element) => element.getBoundingClientRect().left;

export const HeadingsShareOneLeftEdge: StoryObj = {
	render: () => <Stack />,
	play: async ({ canvas }) => {
		const plain = canvas.getByText("Plain");
		for (const name of ["Folded", "Opened", "Counted"])
			await expect(
				Math.abs(left(canvas.getByText(name)) - left(plain)),
			).toBeLessThan(0.5);
		// The chevron stands after the title, inside the toggle.
		const toggle = canvas.getByRole("button", { name: /^Folded/ });
		const title = canvas.getByText("Folded");
		const chevron = toggle.querySelector("svg");
		if (!chevron) throw new Error("no chevron");
		await expect(chevron.getBoundingClientRect().left).toBeGreaterThanOrEqual(
			title.getBoundingClientRect().right,
		);
		// The toggle still folds and unfolds.
		await expect(toggle).toHaveAttribute("aria-expanded", "false");
	},
};
