import { ActionBar } from "@fcalell/plugin-react-ui/components/action-bar";
import { Form } from "@fcalell/plugin-react-ui/components/form";
import { FormField } from "@fcalell/plugin-react-ui/components/form-field";
import { Input } from "@fcalell/plugin-react-ui/components/input";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Shell } from "@fcalell/plugin-react-ui/components/shell";
import type { PlaceSpec } from "@fcalell/ui-core/descriptors";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, waitFor } from "storybook/test";

const noop = () => {};
const PLACES: PlaceSpec[] = [
	{ route: "/overview", label: "Overview", icon: "House" },
	{ route: "/members", label: "Members", icon: "Users" },
];
const FIELDS = Array.from({ length: 12 }, (_, at) => `Field ${at + 1}`);

export default { title: "Behaviour/Shell" } satisfies Meta;

function Field(props: { label: string }) {
	const [value, setValue] = useState("");
	return (
		<FormField label={props.label}>
			<Input value={value} onChange={setValue} />
		</FormField>
	);
}

function Editing() {
	return (
		<Shell places={PLACES}>
			<Place title="Edit page">
				<Form>
					{FIELDS.map((label) => (
						<Field key={label} label={label} />
					))}
					<ActionBar
						acts={[
							{ label: "Save", onAct: noop },
							{ label: "Discard", onAct: noop },
						]}
					/>
				</Form>
			</Place>
		</Shell>
	);
}

// On touch a page whose body scrolls ends above the tab bar: at the end of the
// scroll its last act stands fully above the bar, the page inset under it.
export const BodyEndsAboveTheTabBar: StoryObj = {
	render: () => <Editing />,
	tags: ["touch"],
	globals: {
		density: "touch",
		viewport: { value: "phone", isRotated: false },
	},
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
	play: async ({ canvas, canvasElement }) => {
		const body = canvasElement.querySelector("form")?.parentElement;
		if (!body) throw new Error("the page body is not drawn");
		body.scrollTop = body.scrollHeight;
		await waitFor(() => expect(body.scrollTop).toBeGreaterThan(0));
		const bar = canvas
			.getByRole("navigation", { name: "Places" })
			.getBoundingClientRect();
		const discard = canvas
			.getByRole("button", { name: "Discard" })
			.getBoundingClientRect();
		await expect(discard.bottom).toBeLessThanOrEqual(bar.top);
	},
};
