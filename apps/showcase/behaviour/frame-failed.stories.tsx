import { type Read, read } from "@fcalell/plugin-api/tanstack-query";
import { Form } from "@fcalell/plugin-react-ui/components/form";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { type Row, Section } from "@fcalell/plugin-react-ui/components/section";
import { Sheet } from "@fcalell/plugin-react-ui/components/sheet";
import { Stage } from "@fcalell/plugin-react-ui/showcase/frames/overlay-stage";
import { Place } from "@fcalell/plugin-react-ui/showcase/frames/place";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { expect, fn, waitFor } from "storybook/test";
import { orpc } from "../src/app/lib/api.ts";

const pressed = fn();

// A frame says no sentence of its own: a failed read draws "This didn't load."
// with Retry in the frame's box, Pane, Section, Sheet and Form alike, and Retry reads again. Each story's read fails its first answer and
// lands on the second. A bar's filled act over the failed read stands blocked
// and says why on a press only, never under the bar beside the body's line.
export default { title: "Behaviour/Frame failed" } satisfies Meta;

const toRow = (name: string): Row => ({ key: name, title: name });

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

const SENTENCE = "This didn't load.";

// The sentences standing in view: a bar keeps its line unseen, which stays in
// the tree.
const seen = (canvas: { queryAllByText: (text: string) => HTMLElement[] }) =>
	canvas
		.queryAllByText(SENTENCE)
		.filter((line) => getComputedStyle(line).visibility !== "hidden");

function story(
	name: string,
	frame: (items: Read<readonly string[]>) => ReactNode,
	// The name of a bar's filled act, which says the sentence once more on a press.
	bar?: string,
	// The name of the field a form's landed read fills, where no text shows it.
	field?: string,
): StoryObj {
	const { state, items } = onceFailing(name);
	return {
		render: () => <>{frame(items)}</>,
		play: async ({ canvas, userEvent }) => {
			await canvas.findAllByText("This didn't load.");
			await expect(seen(canvas)).toHaveLength(1);
			await expect(state.calls).toBe(1);
			if (bar) {
				await userEvent.click(canvas.getByRole("button", { name: bar }));
				await waitFor(() => expect(seen(canvas)).toHaveLength(2));
				await expect(state.calls).toBe(1);
			}
			await userEvent.click(canvas.getByRole("button", { name: "Retry" }));
			if (field) await canvas.findByDisplayValue("Landed");
			else await canvas.findByText("Landed");
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

const rows = (items: Read<readonly string[]>) =>
	items.at((names) => names.map(toRow));

const body = (items: Read<readonly string[]>) => (
	<Section items={rows(items)} />
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
	<Section title="Members" items={rows(items)} />
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
		<Form
			act={orpc.forms.rename}
			given={{ workspaceId: "acme" }}
			values={items.at((names) => ({ name: names[0] }))}
			fields={{ name: { label: "Name" } }}
		/>
	),
	"Save",
	"Name",
);

export const SheetBarFailed = story(
	"sheet-bar",
	(items) => (
		<Stage contain>
			<Sheet
				open
				onClose={() => {}}
				title="Details"
				fit="pane"
				read={items}
				submit={{ label: "Save", onAct: pressed }}
			>
				{body(items)}
			</Sheet>
		</Stage>
	),
	"Save",
);
