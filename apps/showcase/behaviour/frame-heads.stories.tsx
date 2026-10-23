import { read, useQueryClient } from "@fcalell/plugin-api/tanstack-query";
import { Card } from "@fcalell/plugin-react-ui/components/card";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Text } from "@fcalell/plugin-react-ui/components/text";
import { Place } from "@fcalell/plugin-react-ui/showcase/frames/place";
import { readsAt } from "@fcalell/plugin-react-ui/showcase/waiting";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Profiler } from "react";
import { expect, fn, within } from "storybook/test";

const pressed = fn();

// A frame's head is a leaf of its own: it subscribes to the title, the acts and
// the description itself, so one of those reads changing renders the head and
// nothing under the frame's body. A head's act given as a selection follows its
// own read: blocked with the sentence once it failed, painted still while the
// read is not asked for.
// The body is a part of the frame (a Card), so the Section draws its children
// arm: a sheet of items would put the rows in the head's own commits.
const BODY = (
	<Card>
		<Text>Ana Ruiz, Ben Kaya, Ema Okafor</Text>
	</Card>
);

export default { title: "Behaviour/Frame heads" } satisfies Meta;

interface Named {
	name: string;
}

// What the story counts: each time the head renders it asks the title (or the
// act) for the text it draws, and each commit that reaches the body's leaf
// is a render under the frame.
const drawn = { title: 0, act: 0, body: 0 };

const titled = read<Named>({
	queryKey: ["frame-heads", "title"],
	queryFn: () => Promise.resolve({ name: "Alpha" }),
	staleTime: Number.POSITIVE_INFINITY,
});
const title = titled.at((record) => ({
	get quoted() {
		drawn.title += 1;
		return record.name;
	},
}));

const acted = read<Named>({
	queryKey: ["frame-heads", "act"],
	queryFn: () => Promise.resolve({ name: "Archive" }),
	staleTime: Number.POSITIVE_INFINITY,
});
const act = acted.at((record) => ({
	icon: "Plus" as const,
	get label() {
		drawn.act += 1;
		return record.name;
	},
	onAct: pressed,
}));

const counted = (
	<Profiler
		id="body"
		onRender={() => {
			drawn.body += 1;
		}}
	>
		{BODY}
	</Profiler>
);

function Rename(props: { to: string; of: typeof titled; label: string }) {
	const client = useQueryClient();
	return (
		<button
			type="button"
			onClick={() =>
				client.setQueryData(props.of.options.queryKey, { name: props.to })
			}
		>
			{props.label}
		</button>
	);
}

// A record's name landing renders the Pane's bar and nothing under its body.
export const ATitleChangeRendersTheHeadOnly: StoryObj = {
	render: () => (
		<>
			<Rename of={titled} to="Beta" label="Rename" />
			<div className="h-[20rem]">
				<Place>
					<Pane title={title}>
						<Section title="Members">{counted}</Section>
					</Pane>
				</Place>
			</div>
		</>
	),
	play: async ({ canvas, userEvent }) => {
		await canvas.findByRole("heading", { name: "“Alpha”" });
		const before = { ...drawn };
		await userEvent.click(canvas.getByRole("button", { name: "Rename" }));
		await canvas.findByRole("heading", { name: "“Beta”" });
		await expect(drawn.title).toBeGreaterThan(before.title);
		await expect(drawn.body).toBe(before.body);
	},
};

// A Section's act landing renders the Section's head and nothing under its body.
export const AnActChangeRendersTheSectionHeadOnly: StoryObj = {
	render: () => (
		<>
			<Rename of={acted} to="Restore" label="Rename act" />
			<Section title="Members" act={act}>
				{counted}
			</Section>
		</>
	),
	play: async ({ canvas, userEvent }) => {
		await canvas.findByRole("button", { name: "Archive" });
		const before = { ...drawn };
		await userEvent.click(canvas.getByRole("button", { name: "Rename act" }));
		await canvas.findByRole("button", { name: "Restore" });
		await expect(drawn.act).toBeGreaterThan(before.act);
		await expect(drawn.body).toBe(before.body);
	},
};

const gated = readsAt("frame-heads/gated");
const idle = read({
	queryKey: ["frame-heads", "idle"],
	queryFn: () => Promise.resolve(["x"]),
	enabled: false,
});
const add = { icon: "Plus" as const, label: "Add", onAct: fn() };

// A Pane's action given as a selection follows its own read and only that one.
export const APaneActionFollowsItsOwnRead: StoryObj = {
	render: () => (
		<div className="flex flex-col gap-section">
			<div className="h-[12rem]" data-testid="failed">
				<Place>
					<Pane title="Failed" actions={[gated.failing.at(() => add)]} />
				</Place>
			</div>
			<div className="h-[12rem]" data-testid="idle">
				<Place>
					<Pane title="Idle" actions={[idle.at(() => add)]} />
				</Place>
			</div>
		</div>
	),
	play: async ({ canvas, userEvent }) => {
		add.onAct.mockClear();
		const failed = within(await canvas.findByTestId("failed"));
		const blocked = await failed.findByRole("button", {
			name: "This didn't load.",
		});
		await expect(blocked).toHaveAttribute("aria-disabled", "true");
		await userEvent.click(blocked);
		await expect(add.onAct).not.toHaveBeenCalled();
		const still = within(await canvas.findByTestId("idle"));
		await expect(still.queryByText("This didn't load.")).toBeNull();
		await expect(
			canvas.getByTestId("idle").querySelector("button[inert]"),
		).not.toBeNull();
	},
};
