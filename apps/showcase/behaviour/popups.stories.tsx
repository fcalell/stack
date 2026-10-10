import { Field } from "@base-ui/react/field";
import { Menu } from "@fcalell/plugin-react-ui/components/menu";
import { Picker } from "@fcalell/plugin-react-ui/components/picker";
import { Select } from "@fcalell/plugin-react-ui/components/select";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, screen, waitFor } from "storybook/test";

const act = () => {};
const OPTIONS = [
	{ value: "a", label: "Alpha" },
	{ value: "b", label: "Bravo" },
	{ value: "c", label: "Charlie" },
];

// A page tall enough to scroll, so a scrollbar is present, holding each popup.
function Page() {
	const [pick, setPick] = useState("a");
	const [select, setSelect] = useState("a");
	return (
		<div style={{ minHeight: "250vh" }}>
			<Picker label="Pick" options={OPTIONS} value={pick} onChange={setPick} />
			<Field.Root>
				<Field.Label nativeLabel={false} render={<div />}>
					Choose
				</Field.Label>
				<Select value={select} onChange={setSelect} options={OPTIONS} />
			</Field.Root>
			<Menu label="More" items={[{ label: "Rename", onAct: act }]} />
		</div>
	);
}

export default {
	title: "Behaviour/Popups",
	render: () => <Page />,
} satisfies Meta;

// What a popup must not move: the page's scroll box and each control's place.
function layout(controls: readonly Element[]) {
	const root = document.documentElement;
	return {
		width: root.clientWidth,
		gutter: root.style.scrollbarGutter,
		overflow: root.style.overflowY + document.body.style.overflowY,
		places: controls.map((one) => {
			const box = one.getBoundingClientRect();
			return [box.x, box.y, box.width, box.height];
		}),
	};
}

// Opening and closing a Picker, a Select and a Menu leaves the page as it was:
// no scroll lock, no gutter change, no control moved (a layout shift of 0).
export const Opens: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		const controls = [
			...canvas.getAllByRole("combobox"),
			canvas.getByRole("button", { name: "More" }),
		];
		const before = layout(controls);
		for (const control of controls) {
			await userEvent.click(control);
			await screen.findByRole(
				control.getAttribute("aria-haspopup") === "menu" ? "menu" : "listbox",
			);
			await expect(layout(controls)).toEqual(before);
			await userEvent.keyboard("{Escape}");
			await waitFor(() =>
				expect(control.getAttribute("aria-expanded")).not.toBe("true"),
			);
			await expect(layout(controls)).toEqual(before);
		}
	},
};
