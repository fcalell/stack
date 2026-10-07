import { Gate } from "@fcalell/plugin-react-ui/components/gate";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Shell } from "@fcalell/plugin-react-ui/components/shell";
import { bindRouter } from "@fcalell/plugin-react-ui/lib/navigate";
import { bindNotFound } from "@fcalell/plugin-react-ui/lib/not-found";
import type { PlaceSpec } from "@fcalell/ui-core/descriptors";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
	RouterProvider,
} from "@tanstack/react-router";
import { useState } from "react";
import { expect, waitFor, within } from "storybook/test";

// An app's routes as the generated entry mounts them: the root, a page outside
// the shell, and a pathless layout drawing a Shell around two places. The
// router is handed to the same two bindings the entry calls, so the page for
// an unknown address is the one every app gets, with nothing passed to it.
const PLACES: PlaceSpec[] = [
	{ label: "Overview", icon: "House", route: "/overview" },
	{ label: "Members", icon: "Users", route: "/members" },
];

function routerAt(address: string) {
	const root = createRootRoute({ component: Outlet });
	const landing = createRoute({
		getParentRoute: () => root,
		path: "/",
		component: () => <Gate title="Landing" />,
	});
	const layout = createRoute({
		getParentRoute: () => root,
		id: "_app",
		component: () => (
			<Shell places={PLACES}>
				<Outlet />
			</Shell>
		),
	});
	const overview = createRoute({
		getParentRoute: () => layout,
		path: "/overview",
		component: () => <Place title="Overview" />,
	});
	const members = createRoute({
		getParentRoute: () => layout,
		path: "/members",
		component: () => <Place title="Members" />,
	});
	const router = createRouter({
		routeTree: root.addChildren([
			landing,
			layout.addChildren([overview, members]),
		]),
		history: createMemoryHistory({ initialEntries: [address] }),
	});
	bindRouter(router);
	bindNotFound(router);
	return router;
}

function App({ at }: { at: string }) {
	const [router] = useState(() => routerAt(at));
	return <RouterProvider router={router} />;
}

export default {
	title: "Behaviour/Not found",
	parameters: { layout: "fullscreen" },
} satisfies Meta;

// An address no route is under stands at the root, outside the shell: a Gate
// with the title, the sentence and a way back to the root.
export const Root: StoryObj = {
	render: () => <App at="/nowhere" />,
	play: async ({ canvas, userEvent }) => {
		await expect(
			await canvas.findByRole("heading", { level: 1, name: "Not found" }),
		).toBeVisible();
		await expect(canvas.getByText("Nothing is at this address.")).toBeVisible();
		await userEvent.click(canvas.getByRole("link", { name: "Back" }));
		await waitFor(() =>
			expect(
				canvas.getByRole("heading", { level: 1, name: "Landing" }),
			).toBeVisible(),
		);
	},
};

// An address under a route of the app (a record that is not there) stands in
// that route's layout: a Place in the Shell, its act to the Shell's first place.
export const UnderTheShell: StoryObj = {
	render: () => <App at="/members/zzz" />,
	play: async ({ canvas, userEvent }) => {
		await expect(
			await canvas.findByRole("heading", { level: 1, name: "Not found" }),
		).toBeVisible();
		await expect(canvas.getByText("Nothing is at this address.")).toBeVisible();
		await expect(
			canvas.getByRole("navigation", { name: "Places" }),
		).toBeVisible();
		// The Shell's own row names the same place, so the act is the one in the page.
		const page = within(canvas.getByRole("main"));
		await userEvent.click(page.getByRole("link", { name: "Overview" }));
		await waitFor(() =>
			expect(
				canvas.getByRole("heading", { level: 1, name: "Overview" }),
			).toBeVisible(),
		);
	},
};
