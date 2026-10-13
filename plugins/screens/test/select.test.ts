import assert from "node:assert/strict";
import { test } from "node:test";
import { renderVitestConfig } from "../src/node/config.ts";
import { SCREEN_STATES } from "../src/node/screens.ts";
import {
	globalExcludes,
	parseWidths,
	selectionEnv,
	selectScreens,
	stateExcludes,
} from "../src/node/select.ts";
import { renderStoryFile } from "../src/node/stories.ts";
import type { PreviewGlobal } from "../src/types.ts";

const mode: PreviewGlobal = {
	name: "mode",
	title: "Mode",
	values: ["light", "dark"],
	default: "light",
	checked: ["light", "dark"],
	apply: { classes: { dark: "dark" } },
};

test("no --width runs every width, and one the run does not visit is an error naming the ones it does", () => {
	assert.deepEqual(parseWidths(undefined), [320, 1280, 1920]);
	assert.deepEqual(parseWidths("1920, 320"), [320, 1920]);
	assert.throws(
		() => parseWidths("320,390"),
		/--width: 390 is not one of 320, 1280, 1920/,
	);
});

test("--mode leaves out the tag of every checked value but the ones asked for", () => {
	assert.deepEqual(globalExcludes([mode], "mode", undefined), []);
	assert.deepEqual(globalExcludes([mode], "mode", "dark"), ["mode:light"]);
	assert.deepEqual(globalExcludes([mode], "mode", "light,dark"), []);
	assert.throws(
		() => globalExcludes([mode], "mode", "sepia"),
		/--mode: sepia is not one of light, dark/,
	);
	assert.throws(
		() => globalExcludes([], "mode", "dark"),
		/the app contributes no mode toolbar global/,
	);
});

test("--state leaves out the other states' tags", () => {
	assert.deepEqual(stateExcludes(undefined), []);
	assert.deepEqual(stateExcludes("loading"), [
		"state:data",
		"state:error",
		"state:empty",
		"state:notFound",
	]);
	assert.throws(
		() => stateExcludes("slow"),
		/--state: slow is not one of data, loading, error, empty, notFound/,
	);
});

const ids = [
	"/_app/deploys",
	"/_app/deploys/$id",
	"/sign-in",
	"/_app/deploys/",
];

test("--screen takes route ids and titles, and a name that is no screen lists the screens", () => {
	assert.deepEqual(selectScreens(ids, "/sign-in"), ["/sign-in"]);
	assert.deepEqual(selectScreens(ids, "deploys,Screens/sign-in"), [
		"/_app/deploys",
		"/sign-in",
	]);
	assert.deepEqual(selectScreens(ids, "deploys/index"), ["/_app/deploys/"]);
	assert.throws(
		() => selectScreens(ids, "settings"),
		/--screen: settings names no screen; screens: \/_app\/deploys \(deploys\)/,
	);
});

// The narrowing is the story files' tags against the run's excluded tags, so
// it is held where both meet: the stories one flag combination leaves.
test("the stories a narrowed run keeps are the ones whose tags none of the exclusions meet", () => {
	const source = renderStoryFile("/sign-in", [], [mode]);
	const stories = [
		...source.matchAll(/^export const (\w+) = .*tags: (\[.*\])/gm),
	].map((m) => ({
		name: m[1] as string,
		tags: JSON.parse(m[2] as string) as string[],
	}));
	assert.equal(stories.length, SCREEN_STATES.length * 2);
	const kept = (exclude: string[]) =>
		stories
			.filter((s) => !s.tags.some((tag) => exclude.includes(tag)))
			.map((s) => s.name);
	assert.equal(kept([]).length, 10);
	assert.deepEqual(
		kept([
			...globalExcludes([mode], "mode", "dark"),
			...stateExcludes("loading"),
		]),
		["LoadingDark"],
	);
	assert.deepEqual(kept(globalExcludes([mode], "mode", "light")).length, 5);
	assert.deepEqual(kept(stateExcludes("error,empty")), [
		"Error",
		"ErrorDark",
		"Empty",
		"EmptyDark",
	]);
});

test("the run's Vitest config reads what the CLI sets, and nothing else narrows it", () => {
	const config = renderVitestConfig();
	for (const key of Object.keys(selectionEnv({ widths: [320], exclude: [] }))) {
		assert.ok(config.includes(`process.env.${key}`), key);
	}
	assert.match(config, /tags: \{ exclude \}/);
	assert.match(config, /provide: \{ screensWidths: widths \}/);
});

test("the narrowing travels as two environment variables", () => {
	assert.deepEqual(
		selectionEnv({ widths: [320, 1920], exclude: ["mode:light"] }),
		{
			STACK_SCREENS_WIDTHS: "320,1920",
			STACK_SCREENS_EXCLUDE: "mode:light",
		},
	);
});
