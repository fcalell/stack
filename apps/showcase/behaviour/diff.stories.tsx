import { Diff } from "@fcalell/plugin-react-ui/components/diff";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

export default {
	title: "Behaviour/Diff",
	render: () => (
		<div className="w-popover max-w-full">
			<Diff
				label="src/terms.ts"
				before=""
				after={
					"export const DAYS = 30;\nexport const LABEL = 'Net thirty days after the invoice is issued, to the cent';\n"
				}
			/>
		</div>
	),
} satisfies Meta;

// A diff that only adds draws one number column: its rows hold the number,
// the marker and the code, and the hunk header spans all three.
export const OnlyAddedHasOneNumberColumn: StoryObj = {
	play: async ({ canvas }) => {
		const table = canvas.getByRole("table", { name: "src/terms.ts" });
		for (const row of table.querySelectorAll("tr"))
			await expect(row.querySelectorAll("td").length).toBe(
				row.querySelector("[colspan]") ? 1 : 3,
			);
		await expect(table.querySelector("[colspan]")).toHaveAttribute(
			"colspan",
			"3",
		);
	},
};

// A wrapped line continues one fixed inset (the control's) in from where its
// first line starts, which is its cell's start whatever the gutter's width.
export const WrappedLineHangsOneInset: StoryObj = {
	play: async ({ canvas }) => {
		const table = canvas.getByRole("table", { name: "src/terms.ts" });
		const cell = [...table.querySelectorAll("td")].find((td) =>
			td.textContent?.includes("Net thirty"),
		);
		if (!cell) throw new Error("no long line");
		const range = document.createRange();
		range.selectNodeContents(cell);
		const lines = [...range.getClientRects()].filter((rect) => rect.width > 0);
		const first = lines[0];
		const second = lines.find((rect) => rect.top > (first?.top ?? 0) + 1);
		if (!first || !second) throw new Error("the line did not wrap");
		const inset = Number.parseFloat(
			getComputedStyle(document.documentElement).getPropertyValue(
				"--spacing-control-x",
			),
		);
		await expect(
			Math.abs(first.left - cell.getBoundingClientRect().left),
		).toBeLessThan(1);
		await expect(Math.abs(second.left - first.left - inset)).toBeLessThan(1);
	},
};
