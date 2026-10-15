import { combine } from "@fcalell/plugin-api/tanstack-query";
import { Group } from "@fcalell/plugin-react-ui/components/group";
import { MessageInput } from "@fcalell/plugin-react-ui/components/message-input";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Sheet } from "@fcalell/plugin-react-ui/components/sheet";
import { Stage } from "@fcalell/plugin-react-ui/showcase/frames/overlay-stage";
import { readsAt } from "@fcalell/plugin-react-ui/showcase/waiting";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { sectionOf } from "./support.ts";

// A frame holds the reads of its `read` that no enclosing frame holds, so a
// Section over a `combine` draws the failure, the stale line and the paused
// line of any one of its reads, and a Section over a selection of a read its
// Pane already holds draws nothing of that read's: the Pane does. A read is
// held once per surface: the Pane around the regions that share it holds it.
const ROW = { key: (name: string) => name, title: (name: string) => name };
const BODY = (items: ReturnType<typeof readsAt>["ready"]) => (
	<Group list={{ items, row: ROW }} />
);

export default { title: "Behaviour/Frame holds" } satisfies Meta;

const failed = readsAt("frame-holds/failed");
const stale = readsAt("frame-holds/stale");
const paused = readsAt("frame-holds/paused");
const both = (a: typeof failed.ready, b: typeof failed.ready) =>
	combine([a, b], (x, y) => [...x, ...y]);

export const CombineDrawsAnyReadsState: StoryObj = {
	render: () => (
		<div className="flex flex-col gap-sections w-sheet max-w-full">
			<Section title="Failed" read={both(failed.ready, failed.failing)}>
				{BODY(failed.ready)}
			</Section>
			<Section title="Stale" read={both(stale.ready, stale.stale)}>
				{BODY(stale.ready)}
			</Section>
			<Section title="Paused" read={both(paused.ready, paused.paused)}>
				{BODY(paused.ready)}
			</Section>
		</div>
	),
	play: async ({ canvas }) => {
		const region = (name: string) => within(sectionOf(canvas, name));
		// One of its reads failed with no data: the failed form with Retry.
		await region("Failed").findByText("This didn't load.");
		await expect(
			region("Failed").getByRole("button", { name: "Retry" }),
		).toBeVisible();
		// The reads that hold data and could not refresh, or wait for a
		// connection, draw their lines under the heading.
		await region("Stale").findByText("Couldn't refresh.");
		await expect(
			region("Stale").getByRole("button", { name: "Retry" }),
		).toBeVisible();
		await region("Paused").findByText("Waiting for a connection.");
		await expect(
			region("Paused").queryByRole("button", { name: "Retry" }),
		).toBeNull();
	},
};

const above = readsAt("frame-holds/above");
const bare = readsAt("frame-holds/bare");

export const SelectionUnderItsHolderDrawsAsToday: StoryObj = {
	render: () => (
		<div className="flex flex-col gap-sections">
			<div className="h-[20rem]" data-testid="held">
				<Place>
					<Pane title="Held" read={above.stale}>
						<Section title="Inner" read={above.stale.at((rows) => rows)}>
							{BODY(above.stale)}
						</Section>
					</Pane>
				</Place>
			</div>
			<div className="h-[20rem]" data-testid="bare">
				<Place>
					<Pane title="Bare">
						<Section title="Inner" read={both(bare.ready, bare.failing)}>
							{BODY(bare.ready)}
						</Section>
					</Pane>
				</Place>
			</div>
		</div>
	),
	play: async ({ canvas }) => {
		const held = within(await canvas.findByTestId("held"));
		// The Pane holds the read: its line stands once, and the Section under
		// it, holding nothing, says nothing of it.
		await held.findByText("Couldn't refresh.");
		await expect(held.getAllByText("Couldn't refresh.").length).toBe(1);
		await expect(held.getAllByRole("button", { name: "Retry" }).length).toBe(1);
		await expect(sectionOf(held, "Inner")).not.toHaveAttribute("aria-busy");
		// A Pane with no read holds nothing: the Section holds both its reads and
		// draws the failure in its own place, the Pane's title standing.
		const bareBox = within(await canvas.findByTestId("bare"));
		await bareBox.findByText("This didn't load.");
		await expect(bareBox.getByRole("heading", { name: "Bare" })).toBeVisible();
		await expect(
			within(sectionOf(bareBox, "Inner")).getByText("This didn't load."),
		).toBeVisible();
	},
};

const shared = readsAt("frame-holds/shared");
const pausedShared = readsAt("frame-holds/shared-paused");
const around = (a: typeof shared.ready, b: typeof shared.ready) =>
	combine([a, b], (x) => x);

export const SharedReadHeldOnce: StoryObj = {
	render: () => (
		<div className="flex flex-col gap-sections">
			{[
				["Failing", around(shared.failing, shared.ready), shared] as const,
				[
					"Paused",
					around(pausedShared.paused, pausedShared.ready),
					pausedShared,
				] as const,
			].map(([name, read, reads]) => (
				<div key={name} className="h-[20rem]" data-testid={name}>
					<Place>
						<Pane title={name} read={read}>
							<Section title="First" read={reads.ready.at((rows) => rows)}>
								{BODY(reads.ready)}
							</Section>
							<Section title="Second" read={read}>
								{BODY(reads.ready)}
							</Section>
						</Pane>
					</Place>
				</div>
			))}
		</div>
	),
	play: async ({ canvas }) => {
		// `a` fails: the Pane draws one failed form, one Retry.
		const failing = within(await canvas.findByTestId("Failing"));
		await failing.findByText("This didn't load.");
		await expect(failing.getAllByText("This didn't load.").length).toBe(1);
		await expect(failing.getAllByRole("button", { name: "Retry" }).length).toBe(
			1,
		);
		// `a` waits for a connection: one line, under the Pane's title.
		const waiting = within(await canvas.findByTestId("Paused"));
		await waiting.findByText("Waiting for a connection.");
		await expect(waiting.getAllByText("Waiting for a connection.").length).toBe(
			1,
		);
	},
};

const ended = readsAt("frame-holds/ended");

export const FailedPaneDrawsNoFoot: StoryObj = {
	render: () => (
		<div className="h-[20rem]">
			<Place>
				<Pane
					title="Chat"
					read={ended.failing}
					foot={<MessageInput value="" onChange={() => {}} onSend={() => {}} />}
				>
					<Section title="Messages">{BODY(ended.ready)}</Section>
				</Pane>
			</Place>
		</div>
	),
	play: async ({ canvas }) => {
		await canvas.findByText("This didn't load.");
		await expect(canvas.queryByRole("textbox")).toBeNull();
		await expect(canvas.getByRole("button", { name: "Retry" })).toBeVisible();
	},
};

const acts = readsAt("frame-holds/acts");

export const FailedFrameActsPaint: StoryObj = {
	render: () => (
		<div className="flex flex-col gap-sections">
			<div data-testid="section">
				<Section
					title="Members"
					read={acts.failing}
					act={{ label: "Add member", onAct: () => {} }}
				>
					{BODY(acts.ready)}
				</Section>
			</div>
			<Stage contain>
				<Sheet
					open
					onClose={() => {}}
					title="Invite"
					fit="pane"
					read={acts.failing}
					submit={{ label: "Send invite", onAct: () => {} }}
				>
					{BODY(acts.ready)}
				</Sheet>
			</Stage>
		</div>
	),
	play: async ({ canvas }) => {
		const box = await canvas.findByTestId("section");
		await within(box).findByText("This didn't load.");
		// The act stands painted and inert; only Retry presses.
		const live = [...box.querySelectorAll("button:not([inert])")];
		await expect(live.map((b) => b.textContent)).toEqual(["Retry"]);
		await expect(box.querySelector("button[inert]")).not.toBeNull();
		// The sheet's submit is painted, not pressable.
		const send = await canvas.findAllByRole("button", { hidden: true });
		await expect(
			send.some((b) => b.hasAttribute("inert") && b.closest("[role=dialog]")),
		).toBe(true);
	},
};
