import { createClient } from "@fcalell/plugin-api/client";
import {
	createApiQueryUtils,
	QueryClient,
	QueryClientProvider,
	useQuery,
} from "@fcalell/plugin-api/tanstack-query";
import type { Procedure } from "@fcalell/plugin-api/types";
import { Gate } from "@fcalell/plugin-react-ui/components/gate";
import { ItemHeader } from "@fcalell/plugin-react-ui/components/item-header";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { QueryBoundary } from "@fcalell/plugin-react-ui/components/query-boundary";
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
import { expect, fn, spyOn, waitFor, within } from "storybook/test";

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

type Api = { record: { get: Procedure<{ id: string }, { name: string }> } };

// The error JSON a worker writes for a procedure that throws.
const errorBody = (code: string, status: number, message: string) =>
	JSON.stringify({ json: { defined: false, code, status, message } });

const requests = fn();
let logged: ReturnType<typeof spyOn>;

// A Place over a read through `createClient`, its fetch answering as the
// worker does. A fetch stub cannot show the browser's own network line, so the
// check is the status the stub is given: a read's not found is a 200 here, as
// on the wire, and the console stays clean.
function RecordPlace({ answer }: { answer: () => Response }) {
	const [orpc] = useState(() =>
		createApiQueryUtils(
			createClient<Api>({
				url: "http://stack.test/rpc",
				fetch: () => {
					requests();
					return Promise.resolve(answer());
				},
			}),
		),
	);
	const [queries] = useState(
		() => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
	);
	return (
		<QueryClientProvider client={queries}>
			<Place title="Record">
				<RecordBody orpc={orpc} />
			</Place>
		</QueryClientProvider>
	);
}

function RecordBody({
	orpc,
}: {
	orpc: ReturnType<typeof createApiQueryUtils<Api>>;
}) {
	const record = useQuery(
		orpc.record.get.queryOptions({ input: { id: "zzz" } }),
	);
	return (
		<QueryBoundary
			query={record}
			sentence="The record did not load."
			loading={<ItemHeader title="" loading />}
		>
			{(data) => <p>{data.name}</p>}
		</QueryBoundary>
	);
}

const watch = () => {
	requests.mockClear();
	logged = spyOn(console, "error");
	return () => logged.mockRestore();
};

// A read the server answers not found, sent as a 200 with the stack header,
// draws the Missing form with no Retry, and logs nothing to the console.
export const Read: StoryObj = {
	beforeEach: watch,
	render: () => (
		<RecordPlace
			answer={() =>
				new Response(errorBody("NOT_FOUND", 404, "Not Found"), {
					status: 200,
					headers: {
						"content-type": "application/json",
						"x-stack-not-found": "1",
					},
				})
			}
		/>
	),
	play: async ({ canvas }) => {
		await expect(
			await canvas.findByText("This no longer exists."),
		).toBeVisible();
		await expect(
			canvas.queryByRole("button", { name: "Retry" }),
		).not.toBeInTheDocument();
		await expect(requests).toHaveBeenCalledTimes(1);
		await expect(logged).not.toHaveBeenCalled();
	},
};

// A real failure carries no header: it draws the failed form with Retry, and
// Retry reads again.
export const Failure: StoryObj = {
	beforeEach: watch,
	render: () => (
		<RecordPlace
			answer={() =>
				new Response(
					errorBody("INTERNAL_SERVER_ERROR", 500, "Internal Server Error"),
					{
						status: 500,
						headers: { "content-type": "application/json" },
					},
				)
			}
		/>
	),
	play: async ({ canvas, userEvent }) => {
		await expect(
			await canvas.findByText("The record did not load."),
		).toBeVisible();
		await expect(canvas.queryByText("This no longer exists.")).toBeNull();
		await userEvent.click(canvas.getByRole("button", { name: "Retry" }));
		await waitFor(() => expect(requests).toHaveBeenCalledTimes(2));
	},
};
