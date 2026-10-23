import { read, type Selection } from "@fcalell/plugin-api/tanstack-query";
import { Banner } from "@fcalell/plugin-react-ui/components/banner";
import { Input } from "@fcalell/plugin-react-ui/components/input";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { type Row, Section } from "@fcalell/plugin-react-ui/components/section";
import { Sheet } from "@fcalell/plugin-react-ui/components/sheet";
import { Stage } from "@fcalell/plugin-react-ui/showcase/frames/overlay-stage";
import { Place } from "@fcalell/plugin-react-ui/showcase/frames/place";
import { readsAt } from "@fcalell/plugin-react-ui/showcase/waiting";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useEffect, useState } from "react";
import { expect, fn, spyOn, userEvent, waitFor, within } from "storybook/test";
import { over, sectionOf } from "./support.ts";

// A frame holds the one read of its `read` that no enclosing frame holds, so a
// Section draws the failure, the stale line and the paused line of its read,
// and a Section over a selection of a read its Pane already holds draws
// nothing of that read's: the Pane does. Every frame's form comes from its own
// selection, so sibling Sections over one read each hold it and each fail in
// place.
const toRow = (name: string): Row => ({ key: name, title: name });
const rows = (items: Selection<readonly string[]>) =>
	items.at((names) => names.map(toRow));
const BODY = (items: Selection<readonly string[]>) => (
	<Section items={rows(items)} />
);

export default { title: "Behaviour/Frame holds" } satisfies Meta;

const failed = readsAt("frame-holds/failed");
const stale = readsAt("frame-holds/stale");
const paused = readsAt("frame-holds/paused");

export const HeldReadDrawsItsState: StoryObj = {
	render: () => (
		<div className="flex flex-col gap-section w-sheet max-w-full">
			<Section title="Failed" items={rows(failed.failing)} />
			<Section title="Stale" items={rows(stale.stale)} />
			<Section title="Paused" items={rows(paused.paused)} />
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
		<div className="flex flex-col gap-section">
			<div className="h-[20rem]" data-testid="held">
				<Place>
					<Pane title="Held" read={above.stale}>
						<Section
							title="Inner"
							items={rows(above.stale.at((rows) => rows))}
						/>
					</Pane>
				</Place>
			</div>
			<div className="h-[20rem]" data-testid="bare">
				<Place>
					<Pane title="Bare">
						<Section title="Inner" items={rows(bare.failing)} />
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
		<div className="flex flex-col gap-section">
			{[
				["Failing", shared.failing] as const,
				["Paused", pausedShared.paused] as const,
			].map(([name, read]) => (
				<div key={name} className="h-[28rem]" data-testid={name}>
					<Place>
						<Pane title={name}>
							<Section title="First" items={rows(read)} />
							<Section title="Second" items={rows(read)} />
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
					foot={<Input value="" onChange={() => {}} />}
				>
					<Section title="Messages" items={rows(ended.ready)} />
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
		<div className="flex flex-col gap-section">
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
						items={rows(one.frame)}
						act={{ icon: "Plus", label: `Add ${name}`, onAct: one.section }}
					/>
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
const archive = { icon: "Plus", label: "Archive", onAct: fn() } as const;

// An act given as a selection follows its own read, and only that one: it
// paints while it waits or stands still, and once the read ended it stands
// blocked with the sentence, never a false yes.
export const SelectionActFollowsItsOwnRead: StoryObj = {
	render: () => (
		<div className="flex flex-col gap-section">
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

// The dev check that names a read nobody draws the failure of stays quiet for
// an act over a failing read with no frame above it: the act draws that
// failure itself. A plain leaf painting an unheld read is still named.
const UNHELD = /no frame holds it/;
const unheld = (logged: ReturnType<typeof spyOn>) =>
	logged.mock.calls.filter(
		(args: unknown[]) => typeof args[0] === "string" && UNHELD.test(args[0]),
	);
let logged: ReturnType<typeof spyOn>;
const watch = () => {
	logged = spyOn(console, "error");
	return () => logged.mockRestore();
};
const actOnly = readsAt("frame-holds/act-only");
const plain = readsAt("frame-holds/plain-leaf");

export const AnActOverAFailingReadLogsNoDevError: StoryObj = {
	beforeEach: watch,
	render: () => (
		<div className="flex flex-col gap-section">
			<Section title="Section act" act={actOnly.failing.at(() => archive)} />
			<Banner sentence="Heads up." act={actOnly.failing.at(() => archive)} />
			<Section
				items={[
					{
						key: "a",
						title: "a",
						act: actOnly.failing.at(() => archive),
						more: actOnly.failing.at(() => []),
					},
				]}
			/>
		</div>
	),
	play: async ({ canvas }) => {
		await waitFor(() =>
			expect(
				canvas.getAllByRole("button", { name: "This didn't load." }).length,
			).toBeGreaterThanOrEqual(3),
		);
		await expect(unheld(logged)).toHaveLength(0);
	},
};

export const APlainLeafOverAnUnheldReadStillLogs: StoryObj = {
	beforeEach: watch,
	render: () => <Banner sentence={plain.failing.at(() => "Heads up.")} />,
	play: async () => {
		await waitFor(() => expect(unheld(logged)).toHaveLength(1));
	},
};

// A leaf that arrives after its read has already failed. A quiet leaf (`or`)
// fetches the read from the start and paints nothing; the late block mounts
// once the failure is in, so only the level check can see it.
function Late(props: {
	read: ReturnType<typeof lateRead>;
	children: ReactNode;
}) {
	const [shown, setShown] = useState(false);
	useEffect(() => {
		const timer = setTimeout(() => setShown(true), 2500);
		return () => clearTimeout(timer);
	}, []);
	return (
		<>
			<Banner sentence={props.read.at(() => "Quiet.").or("")} />
			{shown ? props.children : <p>Not yet.</p>}
		</>
	);
}
// Its failure stays: a failed read refetches when an observer mounts, which
// would name it afresh, so the late leaf is judged by the cache's level alone.
const lateRead = (name: string) =>
	read({
		queryKey: ["showcase", "frame-holds", name],
		queryFn: () => Promise.reject(new Error("The showcase read fails.")),
		retry: false,
		retryOnMount: false,
	});
const lateUnheld = lateRead("late-unheld");
const lateHeld = lateRead("late-held");
const lateAct = lateRead("late-act");
const LATE_WAIT = { timeout: 8000 };

export const ALeafMountedAfterItsUnheldReadFailedLogsOnce: StoryObj = {
	beforeEach: watch,
	render: () => (
		<Late read={lateUnheld}>
			<Banner sentence={lateUnheld.at(() => "Late.")} />
		</Late>
	),
	play: async ({ canvas }) => {
		await expect(unheld(logged)).toHaveLength(0);
		await waitFor(
			() => expect(canvas.queryByText("Not yet.")).toBeNull(),
			LATE_WAIT,
		);
		await new Promise((done) => setTimeout(done, 800));
		await expect(unheld(logged)).toHaveLength(1);
	},
};

export const ALeafWhoseReadAFrameHoldsInTheSameCommitLogsNothing: StoryObj = {
	beforeEach: watch,
	render: () => (
		<Late read={lateHeld}>
			<Banner sentence={lateHeld.at(() => "Sibling.")} />
			<Section title="Holder" read={lateHeld}>
				<Banner sentence={lateHeld.at(() => "Descendant.")} />
			</Section>
		</Late>
	),
	play: async ({ canvas }) => {
		await waitFor(
			() => expect(canvas.queryByText("Not yet.")).toBeNull(),
			LATE_WAIT,
		);
		await canvas.findByText("This didn't load.");
		await new Promise((done) => setTimeout(done, 300));
		await expect(unheld(logged)).toHaveLength(0);
	},
};

export const AnActMountedAfterItsReadFailedLogsNothing: StoryObj = {
	beforeEach: watch,
	render: () => (
		<Late read={lateAct}>
			<Section title="Late act" act={lateAct.at(() => archive)} />
		</Late>
	),
	play: async ({ canvas }) => {
		await waitFor(
			() => expect(canvas.queryByText("Not yet.")).toBeNull(),
			LATE_WAIT,
		);
		await canvas.findByRole("button", { name: "This didn't load." });
		await new Promise((done) => setTimeout(done, 300));
		await expect(unheld(logged)).toHaveLength(0);
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
					<Section title="Members" items={rows(gated.ready)} />
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

// The sheet's read paints its form's bar too, the form standing in the body.
export const AWaitingSheetPaintsItsFormsBar: StoryObj = {
	render: () => (
		<Stage contain>
			<Sheet
				open
				onClose={() => {}}
				title="Invite"
				fit="pane"
				read={sheeted.waiting}
				form={{
					act: over(async (input) => {
						invite(input);
						return { id: "request-1" };
					}),
					given: {
						workspaceId: "acme",
						kind: "change",
						seats: 3,
						urgent: false,
					},
					fields: { title: { label: "Title" } },
					submit: { label: "Send form" },
				}}
			>
				{BODY(sheeted.ready)}
			</Sheet>
		</Stage>
	),
	play: async ({ canvas }) => {
		const send = (await canvas.findByText("Send form")).closest("button");
		await expect(send).toHaveAttribute("inert");
	},
};
