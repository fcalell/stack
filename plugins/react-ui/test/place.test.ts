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

// A size container takes no height from its content, so a footed Place or a
// filling Thread in a column of auto height would collapse to its head: the
// regions are measured (`FootRegion`), never size containers.
test("a Place and a Thread region are not size containers", () => {
	for (const file of ["place", "thread"]) {
		const source = readFileSync(
			new URL(`../src/ui/components/${file}/index.tsx`, import.meta.url),
			"utf8",
		);
		assert.doesNotMatch(source, /container-type/);
		assert.match(source, /<FootRegion value=\{region\.height\}>/);
	}
});
