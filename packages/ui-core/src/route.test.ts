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
		route: "/playlists",
		children: [
			{
				route: "/playlists/sets",
				children: [{ route: "/playlists/sets/peak" }],
			},
			{ route: "/playlists/warmup" },
		],
	},
];

test("flatPlaces lists each place before its children", () => {
	assert.deepEqual(
		flatPlaces(tree).map((place) => place.route),
		[
			"/library",
			"/playlists",
			"/playlists/sets",
			"/playlists/sets/peak",
			"/playlists/warmup",
		],
	);
});

test("placeTrail runs from the top-level place to the owner", () => {
	assert.deepEqual(placeTrail(tree, "/playlists/sets/peak"), [
		"/playlists",
		"/playlists/sets",
		"/playlists/sets/peak",
	]);
	assert.deepEqual(placeTrail(tree, "/playlists/sets/peak/42"), [
		"/playlists",
		"/playlists/sets",
		"/playlists/sets/peak",
	]);
	assert.deepEqual(placeTrail(tree, "/library"), ["/library"]);
});

test("placeTrail is empty where no place owns the address", () => {
	assert.deepEqual(placeTrail(tree, "/elsewhere"), []);
});

test("placesFolded opens the path and what the viewer chose", () => {
	assert.deepEqual(placesFolded(tree, {}, []), [
		"/playlists",
		"/playlists/sets",
	]);
	assert.deepEqual(
		placesFolded(tree, {}, ["/playlists", "/playlists/sets"]),
		[],
	);
	// A choice beats the path, both ways.
	assert.deepEqual(
		placesFolded(tree, { "/playlists": false, "/playlists/sets": true }, [
			"/playlists",
		]),
		["/playlists"],
	);
});
