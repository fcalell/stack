import { preload, read } from "@fcalell/plugin-api/tanstack-query";
import { List } from "@fcalell/plugin-react-ui/components/list";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { bindRouter } from "@fcalell/plugin-react-ui/lib/navigate";
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
import { expect, waitFor } from "storybook/test";

// An app's list and record routes as the generated entry mounts them: the
// record's route preloads its read through a loader, and the component builds
// its handle through the same function. The router gets the options the mount
// writes, and the page's intent listener is bound to it.
const DEPLOYS = [
	{ id: "d1", message: "Fix the cache key" },
	{ id: "d2", message: "Add the usage page" },
];

// The procedure's calls, each answered after `ANSWER` ms: slow enough that a
// read met cold is seen waiting, quick enough that a hover's lands before the
// click.
const ANSWER = 300;
let calls: string[] = [];

const deployRead = (id: string) =>
	read({
		queryKey: ["preload-intent", "deploys.get", id],
		queryFn: async () => {
			calls.push(id);
			await new Promise((done) => setTimeout(done, ANSWER));
			return DEPLOYS.find((each) => each.id === id) ?? DEPLOYS[0];
		},
	});

function Deploys() {
	return (
		<Place>
			<List
				items={DEPLOYS}
				row={{
					key: (each) => each.id,
					title: (each) => each.message,
					href: (each) => `/deploys/${each.id}`,
				}}
			/>
			<Outlet />
		</Place>
	);
}

function Deploy(props: { id: string }) {
	const deploy = deployRead(props.id);
	return <Pane read={deploy} title={deploy.at((each) => each.message)} />;
}

function makeRouter() {
	const root = createRootRoute({ component: Outlet });
	const list = createRoute({
		getParentRoute: () => root,
		path: "/deploys",
		component: Deploys,
	});
	const open = createRoute({
		getParentRoute: () => list,
		path: "$deployId",
		loader: ({ params }) => preload(deployRead(params.deployId)),
		component: () => <Deploy id={open.useParams().deployId} />,
	});
	const router = createRouter({
		routeTree: root.addChildren([list.addChildren([open])]),
		history: createMemoryHistory({ initialEntries: ["/deploys"] }),
		defaultPreloadStaleTime: 0,
	});
	bindRouter(router);
	return router;
}

let router: ReturnType<typeof makeRouter>;

function Page() {
	const [own] = useState(() => {
		calls = [];
		router = makeRouter();
		return router;
	});
	return <RouterProvider router={own} />;
}

const painted = (root: ParentNode) => root.querySelector("[data-painted]");

export default {
	title: "Behaviour/Preload intent",
	parameters: { layout: "fullscreen" },
	render: () => <Page />,
} satisfies Meta;

// Pointing at a row asks for its record before the click, and the click draws
// the record on its first frame: its title stands and no slot is painted.
export const Hover: StoryObj = {
	play: async ({ canvas, canvasElement, userEvent }) => {
		const row = await canvas.findByRole("link", { name: /Fix the cache key/ });
		await expect(calls).toEqual([]);
		await userEvent.hover(row);
		await waitFor(() => expect(calls).toEqual(["d1"]));
		await new Promise((done) => setTimeout(done, ANSWER + 100));
		await userEvent.click(row);
		await waitFor(() =>
			expect(router.state.location.pathname).toBe("/deploys/d1"),
		);
		await expect(
			canvas.getByRole("heading", { name: "Fix the cache key", level: 1 }),
		).toBeVisible();
		await expect(painted(canvasElement)).toBeNull();
		await expect(calls).toEqual(["d1"]);
	},
};

// A record opened with no pointer first (a deep link, a key) starts its read
// as the route commits: the Pane paints its slot, then settles on the record.
export const Cold: StoryObj = {
	play: async ({ canvas, canvasElement }) => {
		await canvas.findByRole("link", { name: /Add the usage page/ });
		void router.navigate({ href: "/deploys/d2" });
		await waitFor(() => expect(painted(canvasElement)).not.toBeNull());
		await canvas.findByRole("heading", {
			name: "Add the usage page",
			level: 1,
		});
		await waitFor(() => expect(painted(canvasElement)).toBeNull());
		await expect(calls).toEqual(["d2"]);
	},
};
