import { read } from "@fcalell/plugin-api/tanstack-query";
import { Group } from "@fcalell/plugin-react-ui/components/group";
import { MessageInput } from "@fcalell/plugin-react-ui/components/message-input";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Sheet } from "@fcalell/plugin-react-ui/components/sheet";
import { Stage } from "@fcalell/plugin-react-ui/showcase/frames/overlay-stage";
import { readsAt } from "@fcalell/plugin-react-ui/showcase/waiting";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { sectionOf } from "./support.ts";

// A frame holds the one read of its `read` that no enclosing frame holds, so a
// Section draws the failure, the stale line and the paused line of its read,
// and a Section over a selection of a read its Pane already holds draws
// nothing of that read's: the Pane does. Every frame's form comes from its own
// selection, so sibling Sections over one read each hold it and each fail in
// place.
const ROW = { key: (name: string) => name, title: (name: string) => name };
const BODY = (items: ReturnType<typeof readsAt>["ready"]) => (
	<Group list={{ items, row: ROW }} />
);

export default { title: "Behaviour/Frame holds" } satisfies Meta;

const failed = readsAt("frame-holds/failed");
const stale = readsAt("frame-holds/stale");
const paused = readsAt("frame-holds/paused");

export const HeldReadDrawsItsState: StoryObj = {
	render: () => (
		<div className="flex flex-col gap-sections w-sheet max-w-full">
			<Section title="Failed" read={failed.failing}>
				{BODY(failed.ready)}
			</Section>
			<Section title="Stale" read={stale.stale}>
				{BODY(stale.stale)}
			</Section>
			<Section title="Paused" read={paused.paused}>
				{BODY(paused.paused)}
			</Section>
		</div>
	),
	play: async ({ canvas }) => {
		const region = (name: string) => within(sectionOf(canvas, name));
		// The read failed with no data: the failed form with Retry.
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
						<Section title="Inner" read={bare.failing}>
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
		// A Pane with no read holds nothing: the Section holds its read and draws
		// the failure in its own place, the Pane's title standing.
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

export const SiblingSectionsOverOneReadEachHoldIt: StoryObj = {
	render: () => (
		<div className="flex flex-col gap-sections">
			{[
				["Failing", shared.failing, shared.ready] as const,
				["Paused", pausedShared.paused, pausedShared.ready] as const,
			].map(([name, read, rows]) => (
				<div key={name} className="h-[28rem]" data-testid={name}>
					<Place>
						<Pane title={name}>
							<Section title="First" read={read}>
								{BODY(rows)}
							</Section>
							<Section title="Second" read={read}>
								{BODY(rows)}
							</Section>
						</Pane>
					</Place>
				</div>
			))}
		</div>
	),
	play: async ({ canvas }) => {
		// The read fails: each Section draws its own failed form with its Retry.
		const failing = within(await canvas.findByTestId("Failing"));
		await failing.findAllByText("This didn't load.");
		for (const name of ["First", "Second"]) {
			const section = within(sectionOf(failing, name));
			await expect(section.getByText("This didn't load.")).toBeVisible();
			await expect(
				section.getByRole("button", { name: "Retry" }),
			).toBeVisible();
		}
		await expect(failing.getAllByText("This didn't load.").length).toBe(2);
		// The read waits for a connection: each Section draws the line under its
		// own heading.
		const waiting = within(await canvas.findByTestId("Paused"));
		await waiting.findAllByText("Waiting for a connection.");
		await expect(waiting.getAllByText("Waiting for a connection.").length).toBe(
			2,
		);
	},
};

const ended = readsAt("frame-holds/ended");

export const FailedPaneKeepsItsFoot: StoryObj = {
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
		// The page failed; its foot is not its read's to take away.
		const input = canvas.getByRole("textbox");
		await expect(input).toBeVisible();
		await expect(input.closest("[inert]")).toBeNull();
		await expect(input).not.toBeDisabled();
		await expect(canvas.getByRole("button", { name: "Retry" })).toBeVisible();
	},
};

const acts = readsAt("frame-holds/acts");
const live = {
	Waiting: { frame: acts.waiting, pane: fn(), section: fn() },
	Failed: { frame: acts.failing, pane: fn(), section: fn() },
};

// An act given as a constant is live whatever its frame's read does.
export const ConstantActsStayLive: StoryObj = {
	render: () => (
		<div className="flex flex-col gap-sections">
			{Object.entries(live).map(([name, one]) => (
				<div key={name} data-testid={name}>
					<div className="h-[12rem]">
						<Place>
							<Pane
								title={name}
								read={one.frame}
								actions={[
									{ icon: "Plus", label: `New ${name}`, onAct: one.pane },
								]}
							/>
						</Place>
					</div>
					<Section
						title="Members"
						read={one.frame}
						act={{ label: `Add ${name}`, onAct: one.section }}
					>
						{BODY(acts.ready)}
					</Section>
				</div>
			))}
		</div>
	),
	play: async ({ canvas }) => {
		for (const [name, one] of Object.entries(live)) {
			const box = within(await canvas.findByTestId(name));
			for (const [label, spy] of [
				[`New ${name}`, one.pane],
				[`Add ${name}`, one.section],
			] as const) {
				const act = await box.findByRole("button", { name: label });
				await expect(act.closest("[inert]")).toBeNull();
				await expect(act).not.toHaveAttribute("aria-disabled", "true");
				await userEvent.click(act);
				await expect(spy).toHaveBeenCalledTimes(1);
			}
		}
	},
};

const gated = readsAt("frame-holds/gated");
const idle = read({
	queryKey: ["showcase", "frame-holds", "idle"],
	queryFn: () => Promise.resolve(["x"]),
	enabled: false,
});
const archive = { label: "Archive", onAct: fn() };

// An act given as a selection follows its own read, and only that one: it
// paints while it waits or stands still, and once the read ended it stands
// blocked with the sentence, never a false yes.
export const SelectionActFollowsItsOwnRead: StoryObj = {
	render: () => (
		<div className="flex flex-col gap-sections">
			<div data-testid="failed">
				<Section title="Failed act" act={gated.failing.at(() => archive)} />
			</div>
			<div data-testid="idle">
				<Section title="Idle act" act={idle.at(() => archive)} />
			</div>
		</div>
	),
	play: async ({ canvas }) => {
		const failed = within(await canvas.findByTestId("failed"));
		const blocked = await failed.findByRole("button", {
			name: "This didn't load.",
		});
		await expect(blocked).toHaveAttribute("aria-disabled", "true");
		await expect(blocked.closest("[inert]")).toBeNull();
		await userEvent.click(blocked);
		await expect(archive.onAct).not.toHaveBeenCalled();
		// The press says why, once more under the head.
		await expect(failed.getAllByText("This didn't load.").length).toBe(2);
		// A read nothing asked for paints the act still, with no sentence.
		const still = within(await canvas.findByTestId("idle"));
		await expect(still.queryByText("This didn't load.")).toBeNull();
		await expect(
			still.getByRole("heading", { name: "Idle act" }),
		).toBeVisible();
		await expect(
			canvas.getByTestId("idle").querySelector("button[inert]"),
		).not.toBeNull();
	},
};

// A name that only enriches falls back and never fails the frame around it.
export const OrTitleShowsItsFallback: StoryObj = {
	render: () => (
		<div className="h-[20rem]">
			<Place>
				<Pane
					title={gated.failing.at((rows) => rows[0] ?? "").or("Untitled")}
					read={gated.ready}
				>
					<Section title="Members">{BODY(gated.ready)}</Section>
				</Pane>
			</Place>
		</div>
	),
	play: async ({ canvas }) => {
		await expect(
			await canvas.findByRole("heading", { name: "Untitled" }),
		).toBeVisible();
		await expect(canvas.queryByText("This didn't load.")).toBeNull();
	},
};

const sheeted = readsAt("frame-holds/sheet");
const invite = fn();

// The sheet's submit waits on the sheet's own read alone, and a failed one
// blocks it with the sentence.
export const FailedSheetBlocksItsSubmit: StoryObj = {
	render: () => (
		<Stage contain>
			<Sheet
				open
				onClose={() => {}}
				title="Invite"
				fit="pane"
				read={sheeted.failing}
				submit={{ label: "Send invite", onAct: invite }}
			>
				{BODY(sheeted.ready)}
			</Sheet>
		</Stage>
	),
	play: async ({ canvas }) => {
		const send = await canvas.findByRole("button", {
			name: "Send invite",
			hidden: true,
		});
		await expect(send).toHaveAttribute("aria-disabled", "true");
		await expect(send.closest("[inert]")).toBeNull();
		await userEvent.click(send);
		await expect(invite).not.toHaveBeenCalled();
		await expect(canvas.getAllByText("This didn't load.").length).toBe(2);
	},
};
