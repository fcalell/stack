import {
	preload,
	read,
	useQueryClient,
} from "@fcalell/plugin-api/tanstack-query";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Place } from "@fcalell/plugin-react-ui/showcase/frames/place";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { QueryClient } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRootRouteWithContext,
	createRoute,
	createRouter,
	Outlet,
	RouterProvider,
	useParams,
} from "@tanstack/react-router";
import { useState } from "react";
import { expect, waitFor } from "storybook/test";
import { bind } from "./bind.ts";

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
			const found = DEPLOYS.find((each) => each.id === id);
			if (!found) throw new Error(`no deploy ${id}`);
			return found;
		},
	});

function Deploys() {
	return (
		<Place>
			<Section
				items={DEPLOYS.map((each) => ({
					key: each.id,
					title: each.message,
					href: `/deploys/${each.id}`,
				}))}
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
	const root = createRootRouteWithContext<{ queryClient: QueryClient }>()({
		component: Outlet,
	});
	const list = createRoute({
		getParentRoute: () => root,
		path: "/deploys",
		component: Deploys,
	});
	const open = createRoute({
		getParentRoute: () => list,
		path: "$deployId",
		loader: ({ context, params }) =>
			preload(context.queryClient, deployRead(params.deployId)),
		component: () => {
			const { deployId = "" } = useParams({ strict: false });
			return <Deploy id={deployId} />;
		},
	});
	const router = createRouter({
		routeTree: root.addChildren([list.addChildren([open])]),
		history: createMemoryHistory({ initialEntries: ["/deploys"] }),
		defaultPreloadStaleTime: 0,
		context: { queryClient: undefined as never },
	});
	bind(router);
	return router;
}

let router: ReturnType<typeof makeRouter>;

function Page() {
	const [own] = useState(() => {
		calls = [];
		router = makeRouter();
		return router;
	});
	const queryClient = useQueryClient();
	return <RouterProvider router={own} context={{ queryClient }} />;
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
		// The route commits inside the navigation's view transition, a frame on.
		await expect(
			await canvas.findByRole("heading", {
				name: "Fix the cache key",
				level: 1,
			}),
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
