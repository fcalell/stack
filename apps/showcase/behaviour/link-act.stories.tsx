import { read } from "@fcalell/plugin-api/tanstack-query";
import { Banner } from "@fcalell/plugin-react-ui/components/banner";
import { Button } from "@fcalell/plugin-react-ui/components/button";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Shell } from "@fcalell/plugin-react-ui/components/shell";
import { toast, toasts } from "@fcalell/plugin-react-ui/lib/toast";
import { Place } from "@fcalell/plugin-react-ui/showcase/frames/place";
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
import { expect, fn, screen, waitFor } from "storybook/test";
import { bind } from "./bind.ts";

const pressed = fn();

// An act that goes to a route is an anchor to it: a Section's, a Banner's, a
// row's, a toast's and an empty state's, and a menu's entry,
// each in the look of the Button that runs an act, taking a new tab and a
// copied link, and routing in place through the app's router (with the intent
// preload of every anchor) on a plain click.
const OLDEST = "/requests/oldest";
const LAST = "/requests/last";

const QUEUE = [
	{ id: "a", title: "Rename the flag" },
	{ id: "b", title: "Add the usage page" },
];

function Requests() {
	return (
		<Place>
			<Pane title="Requests">
				<Banner
					sentence="Two requests wait on you."
					act={{ icon: "ArrowRight", label: "Open requests", href: OLDEST }}
				/>
				<Section
					title="Queue"
					act={{
						icon: "ArrowRight",
						label: "Open oldest unclaimed",
						href: OLDEST,
					}}
					more={[
						{ label: "Open the last", href: LAST },
						{ label: "Run the sweep", onAct: pressed },
					]}
					items={QUEUE.map((each) => ({
						key: each.id,
						title: each.title,
						act: { label: "Open", href: `/requests/${each.id}` },
					}))}
				/>
				<Button label="Run the sweep" act="secondary" onAct={pressed} />
			</Pane>
			<Outlet />
		</Place>
	);
}

let router: ReturnType<typeof makeRouter>;

function makeRouter() {
	const root = createRootRoute({ component: Outlet });
	const list = createRoute({
		getParentRoute: () => root,
		path: "/requests",
		component: Requests,
	});
	const open = createRoute({
		getParentRoute: () => list,
		path: "$requestId",
		component: () => <Pane title="A request" />,
	});
	const built = createRouter({
		routeTree: root.addChildren([list.addChildren([open])]),
		history: createMemoryHistory({ initialEntries: ["/requests"] }),
	});
	bind(built);
	return built;
}

function Page() {
	const [own] = useState(() => {
		router = makeRouter();
		return router;
	});
	return <RouterProvider router={own} />;
}

export default {
	title: "Behaviour/Link act",
	parameters: { layout: "fullscreen" },
} satisfies Meta;

const anchor = (element: HTMLElement) => {
	if (!(element instanceof HTMLAnchorElement))
		throw new Error("the act is not an anchor");
	return element;
};

// Each host draws the act as an anchor with the route as its `href`, at the
// height of the Button that runs an act, announced as a link.
export const HostsDrawAnAnchor: StoryObj = {
	render: () => <Page />,
	play: async ({ canvas }) => {
		const control = await canvas.findByRole("button", {
			name: "Run the sweep",
		});
		const height = control.getBoundingClientRect().height;
		for (const [name, href] of [
			["Open requests", OLDEST],
			["Open oldest unclaimed", OLDEST],
		] as const) {
			const link = anchor(await canvas.findByRole("link", { name }));
			await expect(link.getAttribute("href")).toBe(href);
		}
		const section = anchor(
			await canvas.findByRole("link", { name: "Open oldest unclaimed" }),
		);
		await expect(section.getBoundingClientRect().height).toBe(height);
		const rows = await canvas.findAllByRole("link", { name: "Open" });
		await expect(rows.map((each) => each.getAttribute("href"))).toEqual([
			"/requests/a",
			"/requests/b",
		]);
		for (const row of rows) anchor(row);
	},
};

// A plain click opens the route in the router with no document load, and a
// rest on the anchor preloads it like any other.
export const AClickRoutesInPlace: StoryObj = {
	render: () => <Page />,
	play: async ({ canvas, userEvent }) => {
		const preload = router.preloadRoute.bind(router);
		const asked: string[] = [];
		router.preloadRoute = ((options: Parameters<typeof preload>[0]) => {
			asked.push(String(options.to ?? (options as { href?: string }).href));
			return preload(options);
		}) as typeof router.preloadRoute;
		const link = await canvas.findByRole("link", {
			name: "Open oldest unclaimed",
		});
		await userEvent.hover(link);
		await waitFor(() => expect(asked).toEqual([OLDEST]));
		const before = document.body;
		await userEvent.click(link);
		await waitFor(() => expect(router.state.location.pathname).toBe(OLDEST));
		await expect(document.body).toBe(before);
	},
};

// A menu holds a link entry as an anchor, beside the acts that run; the head's
// act folds into it as one when the head has no room.
export const AMenuEntryIsAnAnchor: StoryObj = {
	render: () => <Page />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(
			await canvas.findByRole("button", { name: "More Queue" }),
		);
		const link = anchor(
			await screen.findByRole("menuitem", { name: "Open the last" }),
		);
		await expect(link.getAttribute("href")).toBe(LAST);
		const run = await screen.findByRole("menuitem", { name: "Run the sweep" });
		await expect(run instanceof HTMLAnchorElement).toBe(false);
		await userEvent.click(link);
		await waitFor(() => expect(router.state.location.pathname).toBe(LAST));
	},
};

const PLACES: PlaceSpec[] = [
	{ route: "/overview", label: "Overview", icon: "House" },
];

// A toast's act that is a route is an anchor too.
export const AToastActIsAnAnchor: StoryObj = {
	render: () => (
		<Shell places={PLACES}>
			<Pane title="Requests" />
		</Shell>
	),
	play: async () => {
		toasts.close();
		toast("Request filed.", {
			act: { label: "View the request", href: OLDEST },
		});
		const link = anchor(
			await screen.findByRole("link", {
				name: "View the request",
				hidden: true,
			}),
		);
		await expect(link.getAttribute("href")).toBe(OLDEST);
	},
};

const none = read({ queryKey: ["link-act", "none"], queryFn: async () => [] });

// An empty state's create act that navigates keeps the plus and is an anchor.
export const AnEmptyStateActCanGo: StoryObj = {
	render: () => (
		<Place>
			<Pane
				title="Repos"
				read={none}
				empty={{
					sentence: "A repo holds the deploys of one app.",
					act: { label: "Add a repo", href: "/repos/new" },
				}}
			/>
		</Place>
	),
	play: async ({ canvas }) => {
		const link = anchor(
			await canvas.findByRole("link", { name: "Add a repo" }),
		);
		await expect(link.getAttribute("href")).toBe("/repos/new");
		await expect(link.querySelector(".lucide-plus")).not.toBeNull();
	},
};

const TITLE = "Operating principles for the agent";
const LONG = "Open the oldest unclaimed principle";

function Narrow(props: { width: number }) {
	return (
		<div style={{ width: props.width }} className="max-w-full">
			<Section
				title={TITLE}
				act={{ icon: "ArrowRight", label: LONG, href: OLDEST }}
			>
				<p>Prose.</p>
			</Section>
		</div>
	);
}

// A link act that does not fit beside the title's floor folds into the head's
// more menu as a link entry, the first item, going to its route; with room it
// stands as the anchor.
export const AFoldedLinkActIsALinkEntry: StoryObj = {
	render: () => <Narrow width={320} />,
	play: async ({ canvas, userEvent }) => {
		await canvas.findByText(TITLE);
		await expect(
			canvas
				.queryAllByRole("link", { name: LONG })
				.filter((each) => !each.closest("[inert]")),
		).toHaveLength(0);
		await userEvent.click(canvas.getByRole("button", { name: /^more/i }));
		const [first] = await screen.findAllByRole("menuitem");
		if (!first) throw new Error("the menu holds no item");
		await expect(first).toHaveTextContent(LONG);
		await expect(anchor(first).getAttribute("href")).toBe(OLDEST);
	},
};

export const ALinkActWithRoomStands: StoryObj = {
	render: () => <Narrow width={720} />,
	play: async ({ canvas }) => {
		const link = await canvas.findByRole("link", { name: LONG });
		await expect(link.closest("[inert]")).toBeNull();
		await expect(canvas.queryByRole("button", { name: /^more/i })).toBeNull();
	},
};
