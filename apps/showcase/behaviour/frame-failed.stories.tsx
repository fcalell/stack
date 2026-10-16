import { type Read, read } from "@fcalell/plugin-api/tanstack-query";
import { Form } from "@fcalell/plugin-react-ui/components/form";
import { Group } from "@fcalell/plugin-react-ui/components/group";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Sheet } from "@fcalell/plugin-react-ui/components/sheet";
import { Stage } from "@fcalell/plugin-react-ui/showcase/frames/overlay-stage";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { expect, waitFor } from "storybook/test";

// A frame says no sentence of its own: a failed read draws "This didn't load."
// with Retry in the frame's box, Pane, Section, Sheet, Form and a form's group
// alike, and Retry reads again. Each story's read fails its first answer and
// lands on the second.
export default { title: "Behaviour/Frame failed" } satisfies Meta;

const ROW = { key: (name: string) => name, title: (name: string) => name };

// A read that rejects once, then answers; `calls` counts its fetches.
function onceFailing(name: string) {
	const state = { calls: 0 };
	const items: Read<readonly string[]> = read({
		queryKey: ["frame-failed", name],
		queryFn: () => {
			state.calls += 1;
			return state.calls === 1
				? Promise.reject(new Error("The read fails once."))
				: Promise.resolve(["Landed"]);
		},
		retry: false,
		staleTime: Number.POSITIVE_INFINITY,
	});
	return { state, items };
}

function story(
	name: string,
	frame: (items: Read<readonly string[]>) => ReactNode,
	// A bar's filled act stands blocked under the same sentence, once more.
	said = 1,
): StoryObj {
	const { state, items } = onceFailing(name);
	return {
		render: () => frame(items),
		play: async ({ canvas, userEvent }) => {
			await canvas.findAllByText("This didn't load.");
			await expect(canvas.getAllByText("This didn't load.").length).toBe(said);
			await expect(state.calls).toBe(1);
			await userEvent.click(canvas.getByRole("button", { name: "Retry" }));
			await canvas.findByText("Landed");
			await waitFor(() => expect(state.calls).toBe(2));
			// A bar keeps its line's room, unseen, once the sentence is gone.
			await waitFor(() => {
				for (const line of canvas.queryAllByText("This didn't load.")) {
					expect(line).not.toBeVisible();
				}
			});
		},
	};
}

const body = (items: Read<readonly string[]>) => (
	<Group list={{ items, row: ROW }} />
);

export const PaneFailed = story("pane", (items) => (
	<div className="h-[20rem]">
		<Place>
			<Pane title="Deploys" read={items}>
				{body(items)}
			</Pane>
		</Place>
	</div>
));

export const SectionFailed = story("section", (items) => (
	<Section title="Members" read={items}>
		{body(items)}
	</Section>
));

export const SheetFailed = story("sheet", (items) => (
	<Stage contain>
		<Sheet open onClose={() => {}} title="Details" fit="pane" read={items}>
			{body(items)}
		</Sheet>
	</Stage>
));

export const FormFailed = story(
	"form",
	(items) => (
		<Form read={items} bar={{ acts: [{ label: "Save", onAct: () => {} }] }}>
			{body(items)}
		</Form>
	),
	2,
);

export const FormGroupFailed = story("group", (items) => (
	<Form
		groups={[
			{ title: "General", read: items, fields: body(items) },
			{ title: "Region", fields: <p>Frankfurt</p> },
		]}
	/>
));
