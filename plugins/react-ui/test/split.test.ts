import assert from "node:assert/strict";
import { test } from "node:test";
import { ROSTER } from "@fcalell/ui-core/roster";
import type { ScreenProps } from "../src/ui/components/screen/index.tsx";
import type { SplitProps } from "../src/ui/components/split/index.tsx";
import { screenLevels } from "../src/ui/lib/heading.ts";

test("a Split takes the record its main opened beside it, a Screen whose back is the main's route", () => {
	const job: ScreenProps = { title: "Job 12", back: "/items/12" };
	const split: SplitProps = { list: null, main: "Item 12", beside: job.title };
	void split;
	assert.ok(ROSTER.layout.Split?.props.includes("beside"));
	assert.ok(ROSTER.layout.Split?.draws.includes("SPLIT_BESIDE"));
});

test("a beside record titles at the level where it stands and its body reads below it, the page's `h1` its alone title's", () => {
	assert.deepEqual(screenLevels(false, 2), { title: 1, body: 2 });
	assert.deepEqual(screenLevels(true, 2), { title: 2, body: 3 });
});
