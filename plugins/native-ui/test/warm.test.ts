import assert from "node:assert/strict";
import { test } from "node:test";
import { preload } from "@fcalell/plugin-api/preload";
import { type Read, read } from "@fcalell/plugin-api/read";
import { QueryClient } from "@tanstack/react-query";
import { type Matches, warm } from "../src/ui/lib/warm.ts";

// The route tree and the matched state expo-router builds for an app with
// `/`, `/notes` and `/projects/[id]` under a `projects` layout: names and
// nesting as its own matcher returned them for `/projects/12?tab=1`.
function app(opened: string[] = []) {
	const calls: string[] = [];
	const projectRead = (id: string): Read<string> =>
		read({
			queryKey: ["project", id],
			queryFn: async () => {
				calls.push(id);
				return id;
			},
		});
	const file = (name: string, exports: object = {}) => ({
		route: name,
		children: [],
		loadRoute: () => {
			opened.push(name);
			return exports;
		},
	});
	const matches: Matches = {
		routeNode: {
			route: "",
			children: [
				file("index"),
				file("notes"),
				{
					route: "projects",
					loadRoute: () => ({}),
					children: [
						file("index"),
						file("[id]", {
							preload: (client: QueryClient, params: { id: string }) =>
								preload(client, projectRead(params.id)),
						}),
					],
				},
			],
			loadRoute: () => ({}),
		},
		getStateForHref: (href) =>
			href === "/projects/12?tab=1"
				? {
						routes: [
							{
								name: "__root",
								state: {
									routes: [
										{
											name: "projects",
											params: { id: "12" },
											state: {
												routes: [
													{
														name: "[id]",
														params: { id: "12", tab: "1" },
													},
												],
											},
										},
									],
								},
							},
						],
					}
				: href === "/notes"
					? {
							routes: [
								{ name: "__root", state: { routes: [{ name: "notes" }] } },
							],
						}
					: undefined,
	};
	return { calls, matches };
}

const newClient = () =>
	new QueryClient({ defaultOptions: { queries: { retry: false } } });

test("a press-in starts the route's read before the push, once", async () => {
	const { calls, matches } = app();
	const client = newClient();
	const steps: string[] = [];
	// The press: its press-in, then, after the finger lifts, the navigation.
	warm(client, matches, "/projects/12?tab=1");
	steps.push(`fetches: ${calls.length}`);
	warm(client, matches, "/projects/12?tab=1");
	steps.push("navigate");
	await client.getQueryCache().find({ queryKey: ["project", "12"] })?.promise;
	assert.deepEqual(steps, ["fetches: 1", "navigate"]);
	assert.deepEqual(calls, ["12"]);
	assert.equal(client.getQueryData(["project", "12"]), "12");
});

test("the params a layout and a route read both reach preload", () => {
	const { matches } = app();
	const seen: unknown[] = [];
	const leaf = matches.routeNode?.children[2]?.children[1];
	assert.ok(leaf);
	leaf.loadRoute = () => ({
		preload: (_: QueryClient, params: unknown) => seen.push(params),
	});
	warm(newClient(), matches, "/projects/12?tab=1");
	assert.deepEqual(seen, [{ id: "12", tab: "1" }]);
});

test("a route with no preload export starts nothing", () => {
	const opened: string[] = [];
	const { calls, matches } = app(opened);
	const client = newClient();
	warm(client, matches, "/notes");
	assert.deepEqual(opened, ["notes"]);
	assert.deepEqual(calls, []);
	assert.equal(client.getQueryCache().getAll().length, 0);
});

test("an href no route matches, or a tree not yet built, starts nothing", () => {
	const { calls, matches } = app();
	const client = newClient();
	warm(client, matches, "/nowhere");
	warm(client, { ...matches, routeNode: null }, "/projects/12?tab=1");
	assert.deepEqual(calls, []);
	assert.equal(client.getQueryCache().getAll().length, 0);
});

test("a preload that throws is told and never stops the press", () => {
	const { matches } = app();
	const leaf = matches.routeNode?.children[2]?.children[1];
	assert.ok(leaf);
	leaf.loadRoute = () => ({
		preload: () => {
			throw new Error("broken");
		},
	});
	const told: unknown[] = [];
	const was = console.error;
	console.error = (...args: unknown[]) => told.push(args[0]);
	try {
		assert.doesNotThrow(() => warm(newClient(), matches, "/projects/12?tab=1"));
	} finally {
		console.error = was;
	}
	assert.equal((told[0] as Error).message, "broken");
});
