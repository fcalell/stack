import assert from "node:assert/strict";
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
