import { Form } from "@fcalell/plugin-react-ui/components/form";
import { Picker } from "@fcalell/plugin-react-ui/components/picker";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, screen, waitFor } from "storybook/test";
import { orpc } from "../src/app/lib/api.ts";
import { through } from "./support.ts";

const act = () => {};
const placed = through(orpc.forms.place, async () => ({ id: "place-1" }));
const OPTIONS = [
	{ value: "a", label: "Alpha" },
	{ value: "b", label: "Bravo" },
	{ value: "c", label: "Charlie" },
];

// A page tall enough to scroll, so a scrollbar is present, holding each popup.
function Page() {
	const [pick, setPick] = useState("a");
	return (
		<div style={{ minHeight: "250vh" }}>
			<Picker label="Pick" options={OPTIONS} value={pick} onChange={setPick} />
			<Form
				act={placed}
				given={{ workspaceId: "acme", name: "Acme" }}
				values={{ region: "a" }}
				fields={{ region: { label: "Choose", options: OPTIONS } }}
			/>
			<Section title="Team" more={[{ label: "Rename", onAct: act }]} />
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

// Opening and closing a Picker, a form's pick and a Menu leaves the page as it was:
// no scroll lock, no gutter change, no control moved (a layout shift of 0).
export const Opens: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		const controls = [
			...canvas.getAllByRole("combobox"),
			canvas.getByRole("button", { name: "More Team" }),
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
