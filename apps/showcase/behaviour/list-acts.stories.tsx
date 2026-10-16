import { List } from "@fcalell/plugin-react-ui/components/list";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

interface Version {
	id: string;
	name: string;
	age: string;
	current: boolean;
}

const VERSIONS: Version[] = [
	{ id: "v3", name: "Current", age: "2m", current: true },
	{ id: "v2", name: "Second", age: "3h", current: false },
	{ id: "v1", name: "First", age: "5d", current: false },
];

const noop = () => {};

export default {
	title: "Behaviour/List acts",
	render: () => (
		<List
			items={VERSIONS}
			row={{
				key: (version) => version.id,
				title: (version) => version.name,
				trailing: (version) => ({ value: version.age }),
				more: (version) =>
					version.current ? undefined : [{ label: "Revert", onAct: noop }],
			}}
		/>
	),
} satisfies Meta;

// A list where only some rows carry a more act reserves nothing for it on the
// rest: the actless row's trailing value ends at the row's inset, the rows with
// a menu end theirs before it, and no empty box stands where the menu would.
export const TrailingEndsAtItsRow: StoryObj = {
	play: async ({ canvasElement }) => {
		const values = [...canvasElement.querySelectorAll("span")].filter(
			(el) =>
				["2m", "3h", "5d"].includes(el.textContent ?? "") &&
				!el.querySelector("span"),
		);
		await expect(values).toHaveLength(3);
		const [bare, ...acted] = values;
		const row = bare.closest(".relative.flex");
		if (!row) throw new Error("the row has no box");
		const inset = Number.parseFloat(getComputedStyle(row).paddingRight);
		await expect(
			Math.abs(
				row.getBoundingClientRect().right -
					inset -
					bare.getBoundingClientRect().right,
			),
		).toBeLessThan(0.5);
		for (const value of acted)
			await expect(value.getBoundingClientRect().right).toBeLessThan(
				bare.getBoundingClientRect().right - 20,
			);
		await expect(canvasElement.querySelector("[aria-hidden]:empty")).toBeNull();
	},
};
