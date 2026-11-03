import assert from "node:assert/strict";
import { test } from "node:test";
import {
	flatPlaces,
	type PlaceNode,
	placesFolded,
	placeTrail,
} from "./route.ts";

const tree: PlaceNode[] = [
	{ route: "/library" },
	{
		route: "/projects",
		children: [
			{
				route: "/projects/archive",
				children: [{ route: "/projects/archive/active" }],
			},
			{ route: "/projects/draft" },
		],
	},
];

test("flatPlaces lists each place before its children", () => {
	assert.deepEqual(
		flatPlaces(tree).map((place) => place.route),
		[
			"/library",
			"/projects",
			"/projects/archive",
			"/projects/archive/active",
			"/projects/draft",
		],
	);
});

test("placeTrail runs from the top-level place to the owner", () => {
	assert.deepEqual(placeTrail(tree, "/projects/archive/active"), [
		"/projects",
		"/projects/archive",
		"/projects/archive/active",
	]);
	assert.deepEqual(placeTrail(tree, "/projects/archive/active/42"), [
		"/projects",
		"/projects/archive",
		"/projects/archive/active",
	]);
	assert.deepEqual(placeTrail(tree, "/library"), ["/library"]);
});

test("placeTrail is empty where no place owns the address", () => {
	assert.deepEqual(placeTrail(tree, "/elsewhere"), []);
});

test("placesFolded opens the path and what the viewer chose", () => {
	assert.deepEqual(placesFolded(tree, {}, []), [
		"/projects",
		"/projects/archive",
	]);
	assert.deepEqual(
		placesFolded(tree, {}, ["/projects", "/projects/archive"]),
		[],
	);
	// A choice beats the path, both ways.
	assert.deepEqual(
		placesFolded(tree, { "/projects": false, "/projects/archive": true }, [
			"/projects",
		]),
		["/projects"],
	);
});
