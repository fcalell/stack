import { ActionBar } from "@fcalell/plugin-react-ui/components/action-bar";
import { Form } from "@fcalell/plugin-react-ui/components/form";
import { FormField } from "@fcalell/plugin-react-ui/components/form-field";
import { Gate } from "@fcalell/plugin-react-ui/components/gate";
import { Input } from "@fcalell/plugin-react-ui/components/input";
import { bindRouter } from "@fcalell/plugin-react-ui/lib/navigate";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { useState } from "react";
import { expect, screen, waitFor } from "storybook/test";

// The page's router, bound the way the generated entry binds the app's: a
// router navigation reaches the form through the router's own history.
// Each story draws a router of its own at "/", so none starts where the last
// one left it.
function makeRouter() {
	const root = createRootRoute();
	const edit = createRoute({
		getParentRoute: () => root,
		path: "/",
		component: Edit,
	});
	const other = createRoute({
		getParentRoute: () => root,
		path: "/other",
		component: () => <Gate title="Elsewhere" />,
	});
	const saved = createRoute({
		getParentRoute: () => root,
		path: "/saved",
		component: () => <Gate title="Saved" />,
	});
	const router = createRouter({
		routeTree: root.addChildren([edit, other, saved]),
		history: createMemoryHistory({ initialEntries: ["/"] }),
	});
	bindRouter(router);
	return router;
}

let router: ReturnType<typeof makeRouter>;

function Edit() {
	const [name, setName] = useState("Acme");
	return (
		<Gate title="Rename domain">
			<Form>
				<FormField label="Name">
					<Input value={name} onChange={setName} />
				</FormField>
				<ActionBar
					acts={[
						{
							label: "Save",
							onAct: () => {
								void router.navigate({ href: "/saved" });
							},
						},
					]}
				/>
			</Form>
		</Gate>
	);
}

function Page() {
	const [own] = useState(() => {
		router = makeRouter();
		return router;
	});
	return <RouterProvider router={own} />;
}

export default {
	title: "Behaviour/FormLeave",
	parameters: { layout: "fullscreen" },
	render: () => <Page />,
} satisfies Meta;

const none = () => expect(screen.queryByRole("alertdialog")).toBeNull();

// An edited form asks once when its page is left through the router: Keep
// editing stays with the edit intact, Discard leaves.
export const AsksOnce: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		const field = await canvas.findByRole("textbox", { name: "Name" });
		await userEvent.type(field, " Inc");
		void router.navigate({ href: "/other" });
		const dialog = await screen.findByRole("alertdialog", {
			name: "Discard your edit?",
		});
		await userEvent.click(
			await screen.findByRole("button", { name: "Keep editing" }),
		);
		await waitFor(() => expect(dialog).not.toBeInTheDocument());
		await expect(router.state.location.pathname).toBe("/");
		await expect(canvas.getByRole("textbox", { name: "Name" })).toHaveValue(
			"Acme Inc",
		);
		void router.navigate({ href: "/other" });
		await userEvent.click(
			await screen.findByRole("button", { name: "Discard" }),
		);
		await canvas.findByRole("heading", { name: "Elsewhere" });
		await expect(router.state.location.pathname).toBe("/other");
		await none();
	},
};

// A form no field has taken input in is left without a question.
export const Unedited: StoryObj = {
	play: async ({ canvas }) => {
		await canvas.findByRole("textbox", { name: "Name" });
		void router.navigate({ href: "/other" });
		await canvas.findByRole("heading", { name: "Elsewhere" });
		await none();
	},
};

// Pressing the filled act ends the edit: the act that navigates is not asked.
export const SavedLeaves: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		const field = await canvas.findByRole("textbox", { name: "Name" });
		await userEvent.type(field, " Inc");
		await userEvent.click(canvas.getByRole("button", { name: "Save" }));
		await canvas.findByRole("heading", { name: "Saved" });
		await none();
	},
};
