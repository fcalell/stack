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

// A list where only some rows carry a more act ends every row's trailing value
// at one x: the actless row keeps the act's square blank.
export const TrailingKeepsItsColumn: StoryObj = {
	play: async ({ canvasElement }) => {
		const values = [...canvasElement.querySelectorAll("span")].filter((el) =>
			["2m", "3h", "5d"].includes(el.textContent ?? ""),
		);
		await expect(values).toHaveLength(3);
		const ends = values.map((el) => el.getBoundingClientRect().right);
		await expect(Math.max(...ends) - Math.min(...ends)).toBeLessThan(0.5);
	},
};
