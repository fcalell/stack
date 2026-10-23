import { Button } from "@fcalell/plugin-react-ui/components/button";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Sheet } from "@fcalell/plugin-react-ui/components/sheet";
import { Shell } from "@fcalell/plugin-react-ui/components/shell";
import type { PlaceSpec } from "@fcalell/ui-core/descriptors";
import { ORPCError } from "@orpc/client";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
	RouterProvider,
} from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import { expect, fn, screen, waitFor, within } from "storybook/test";
import { bind } from "./bind.ts";

const pressed = fn();

// An act carries what happens around its run as data, and the host that draws
// it sequences it: its `confirm` asked (declined, nothing runs), its `onAct`,
// its `done` toasted, its `to` followed; a `sheet` opens in place of the run
// and closes once its submit resolves. A rejection toasts the sentence as a
// failed toast, as without the wiring.
const PLACES: PlaceSpec[] = [{ route: "/", label: "Home", icon: "House" }];
const GONE = "/gone";

let router: ReturnType<typeof makeRouter>;

function makeRouter(page: ReactNode) {
	const root = createRootRoute({
		component: () => (
			<Shell places={PLACES}>
				<Outlet />
			</Shell>
		),
	});
	const home = createRoute({
		getParentRoute: () => root,
		path: "/",
		component: () => <Pane title="Keys">{page}</Pane>,
	});
	const gone = createRoute({
		getParentRoute: () => root,
		path: GONE,
		component: () => <Pane title="Gone" />,
	});
	const built = createRouter({
		routeTree: root.addChildren([home, gone]),
		history: createMemoryHistory({ initialEntries: ["/"] }),
	});
	bind(built);
	return built;
}

function Page(props: { children: ReactNode }) {
	const [own] = useState(() => {
		router = makeRouter(props.children);
		return router;
	});
	return <RouterProvider router={own} />;
}

export default {
	title: "Behaviour/Act wiring",
	parameters: { layout: "fullscreen" },
} satisfies Meta;

const CONFIRM = {
	title: "Remove the key?",
	sentence: "Its deploys stop until you add another.",
};

// The toast also reads its sentence to a screen reader, so the sentence is in
// the page twice.
const drawn = (sentence: string) => screen.findAllByText(sentence);
const decision = async () => within(await screen.findByRole("alertdialog"));
const sheetOf = async () => within(await screen.findByRole("dialog"));
const refuse = () =>
	Promise.reject(
		new ORPCError("BAD_REQUEST", { message: "the name is taken" }),
	);

const removed = fn(() => Promise.resolve());

// The decision is asked first and nothing runs; its act, worded by the act's
// own label, runs the work and the `done` sentence is toasted after it.
export const ButtonConfirmAskedThenRun: StoryObj = {
	render: () => (
		<Page>
			<Button
				act="secondary"
				label="Remove"
				onAct={removed}
				confirm={CONFIRM}
				done="Key removed"
			/>
		</Page>
	),
	play: async ({ canvas, userEvent }) => {
		removed.mockClear();
		await userEvent.click(
			await canvas.findByRole("button", { name: "Remove" }),
		);
		const asked = await decision();
		await asked.findByText(CONFIRM.sentence);
		await expect(removed).not.toHaveBeenCalled();
		await userEvent.click(asked.getByRole("button", { name: "Remove" }));
		await waitFor(() => expect(removed).toHaveBeenCalledTimes(1));
		await drawn("Key removed");
	},
};

// Declining runs nothing and toasts nothing.
export const ButtonConfirmDeclinedDoesNotRun: StoryObj = {
	render: () => (
		<Page>
			<Button
				act="secondary"
				label="Remove"
				onAct={removed}
				confirm={CONFIRM}
				done="Key removed"
			/>
		</Page>
	),
	play: async ({ canvas, userEvent }) => {
		removed.mockClear();
		await userEvent.click(
			await canvas.findByRole("button", { name: "Remove" }),
		);
		const asked = await decision();
		await userEvent.click(asked.getByRole("button", { name: "Cancel" }));
		await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
		await expect(removed).not.toHaveBeenCalled();
		await expect(screen.queryByText("Key removed")).toBeNull();
	},
};

// With no confirm the run starts at the press and the sentence is toasted once
// it resolves.
export const ButtonDoneIsToasted: StoryObj = {
	render: () => (
		<Page>
			<Button label="Save" onAct={removed} done="Saved" />
		</Page>
	),
	play: async ({ canvas, userEvent }) => {
		removed.mockClear();
		await userEvent.click(await canvas.findByRole("button", { name: "Save" }));
		await drawn("Saved");
		await expect(removed).toHaveBeenCalledTimes(1);
	},
};

// `to` is followed through the router once the run resolved.
export const ButtonToIsFollowed: StoryObj = {
	render: () => (
		<Page>
			<Button label="Remove" onAct={removed} to={GONE} />
		</Page>
	),
	play: async ({ canvas, userEvent }) => {
		removed.mockClear();
		await userEvent.click(
			await canvas.findByRole("button", { name: "Remove" }),
		);
		await waitFor(() => expect(router.state.location.pathname).toBe(GONE));
		await expect(removed).toHaveBeenCalledTimes(1);
	},
};

const renamed = fn(() => Promise.resolve());

// A `sheet` opens at the press, in place of a run; its submit runs and, once it
// resolved, closes the sheet.
export const ButtonSheetOpensAndItsSubmitCloses: StoryObj = {
	render: () => (
		<Page>
			<Button
				label="Rename"
				sheet={{
					title: "Rename the key",
					submit: { label: "Save name", onAct: renamed },
				}}
			/>
		</Page>
	),
	play: async ({ canvas, userEvent }) => {
		renamed.mockClear();
		await userEvent.click(
			await canvas.findByRole("button", { name: "Rename" }),
		);
		const sheet = await sheetOf();
		await expect(renamed).not.toHaveBeenCalled();
		await userEvent.click(sheet.getByRole("button", { name: "Save name" }));
		await waitFor(() => expect(renamed).toHaveBeenCalledTimes(1));
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
	},
};

// A rejection draws the server's sentence as a failed toast, and neither the
// `done` sentence nor the `to` route is reached.
export const ButtonRejectionToastsFailed: StoryObj = {
	render: () => (
		<Page>
			<Button label="Save" onAct={refuse} done="Saved" to={GONE} />
		</Page>
	),
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(await canvas.findByRole("button", { name: "Save" }));
		await drawn("The name is taken.");
		await expect(screen.queryByText("Saved")).toBeNull();
		await expect(router.state.location.pathname).toBe("/");
	},
};

const archived = fn(() => Promise.resolve());

// A sheet's submit is asked, run and toasted through the sheet's one holder;
// declined, it runs nothing and the sheet stays.
export const SheetSubmitConfirmAskedThenRun: StoryObj = {
	render: () => (
		<Page>
			<Sheet
				open
				onClose={pressed}
				title="Archive the key"
				submit={{
					label: "Archive",
					destructive: true,
					onAct: archived,
					confirm: {
						title: "Archive the key?",
						sentence: "It stops answering.",
					},
					done: "Key archived",
				}}
			/>
		</Page>
	),
	play: async ({ userEvent }) => {
		archived.mockClear();
		await userEvent.click(
			await screen.findByRole("button", { name: "Archive" }),
		);
		const declined = await decision();
		await userEvent.click(declined.getByRole("button", { name: "Cancel" }));
		await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
		await expect(archived).not.toHaveBeenCalled();
		await userEvent.click(
			await screen.findByRole("button", { name: "Archive" }),
		);
		const asked = await decision();
		await userEvent.click(asked.getByRole("button", { name: "Archive" }));
		await waitFor(() => expect(archived).toHaveBeenCalledTimes(1));
		await drawn("Key archived");
	},
};

// A Section's head act with a `sheet` opens it, and its submit closes it.
export const SectionActSheetOpensAndItsSubmitCloses: StoryObj = {
	render: () => (
		<Page>
			<Section
				title="Members"
				act={{
					icon: "Plus",
					label: "Invite",
					sheet: {
						title: "Invite a member",
						submit: { label: "Send invite", onAct: renamed },
					},
				}}
				items={[{ key: "a", title: "Ana Ruiz" }]}
			/>
		</Page>
	),
	play: async ({ canvas, userEvent }) => {
		renamed.mockClear();
		await userEvent.click(
			await canvas.findByRole("button", { name: "Invite" }),
		);
		const sheet = await sheetOf();
		await userEvent.click(sheet.getByRole("button", { name: "Send invite" }));
		await waitFor(() => expect(renamed).toHaveBeenCalledTimes(1));
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
	},
};

// A Section's head act carries all of it: asked, run, toasted, followed.
export const SectionActConfirmDoneAndTo: StoryObj = {
	render: () => (
		<Page>
			<Section
				title="Keys"
				act={{
					icon: "Trash2",
					label: "Revoke all",
					destructive: true,
					onAct: removed,
					confirm: {
						title: "Revoke every key?",
						sentence: "Every deploy using one stops.",
					},
					done: "Keys revoked",
					to: GONE,
				}}
				items={[{ key: "a", title: "Deploy key" }]}
			/>
		</Page>
	),
	play: async ({ canvas, userEvent }) => {
		removed.mockClear();
		await userEvent.click(
			await canvas.findByRole("button", { name: "Revoke all" }),
		);
		const asked = await decision();
		await expect(removed).not.toHaveBeenCalled();
		await userEvent.click(asked.getByRole("button", { name: "Revoke all" }));
		await waitFor(() => expect(removed).toHaveBeenCalledTimes(1));
		await waitFor(() => expect(router.state.location.pathname).toBe(GONE));
		await drawn("Keys revoked");
	},
};
