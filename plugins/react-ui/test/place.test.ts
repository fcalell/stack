import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { ROSTER } from "@fcalell/ui-core/roster";
import type { PlaceProps } from "../src/ui/components/place/index.tsx";

const act = () => {};

test("a Place docks a field as its `foot`", () => {
	const home: PlaceProps = { title: "Home", foot: "an ask field" };
	void home;
	assert.ok(ROSTER.layout.Place?.props.includes("foot"));
});

test("a Place takes its filled act or a foot, never both", () => {
	const acting: PlaceProps = {
		title: "Deploys",
		act: { label: "Deploy", onAct: act },
	};
	// @ts-expect-error: the foot's send is the screen's one filled act
	const both: PlaceProps = {
		title: "Home",
		act: { label: "New", onAct: act },
		foot: "an ask field",
	};
	void [acting, both];
});

test("a Place read from across a room holds nothing that opens a layer", () => {
	const room: PlaceProps = { title: "Deploys", distance: "room" };
	// @ts-expect-error: a context's picker opens outside the room scope
	const picked: PlaceProps = {
		title: "Deploys",
		distance: "room",
		context: { label: "Set", options: [], onChange: act },
	};
	void [room, picked];
	assert.ok(ROSTER.layout.Place?.props.includes("distance"));
});

// A size container sizes by its flex height, never its content: a footless
// Place in a column of auto height would collapse to its head and its content
// would overflow onto what stands below.
test("a Place region is a size container only while a foot docks", () => {
	const source = readFileSync(
		new URL("../src/ui/components/place/index.tsx", import.meta.url),
		"utf8",
	);
	assert.doesNotMatch(source, /const REGION = "[^"]*container-type/);
	assert.match(source, /cn\(REGION, foot && REGION_FOOTED\)/);
});
