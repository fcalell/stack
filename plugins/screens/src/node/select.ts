import type { PreviewGlobal } from "../types.ts";
import { WIDTHS } from "../widths.ts";
import { SCREEN_STATES, screenTitle } from "./screens.ts";

// What `stack screens test` narrows a run by. A story carries a tag per
// checked global (`mode:dark`) and one for its state (`state:loading`); the
// run excludes the tags of every value it was not asked for, so the narrowing
// across globals and states multiplies where an include list would add.

export const globalTag = (name: string, value: string): string =>
	`${name}:${value}`;
export const stateTag = (state: string): string => `state:${state}`;

// A comma list as its items, trimmed; empty when the flag is absent.
export function parseList(value: unknown): string[] {
	if (typeof value !== "string") return [];
	return value
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

// The items of `value` that `allowed` names, each once; an item it does not
// name is an error that lists the ones it does.
function pick(flag: string, value: unknown, allowed: readonly string[]) {
	const items = parseList(value);
	const unknown = items.filter((item) => !allowed.includes(item));
	if (unknown.length > 0) {
		throw new Error(
			`--${flag}: ${unknown.join(", ")} is not one of ${allowed.join(", ")}`,
		);
	}
	return allowed.filter((item) => items.length === 0 || items.includes(item));
}

// The widths a run visits, in the order the walk visits them.
export function parseWidths(value: unknown): number[] {
	return pick("width", value, WIDTHS.map(String)).map(Number);
}

// The tags to leave out for `--mode` (or any global's flag): every checked
// value of the global but the ones asked for. A global the app does not
// contribute, or a value it does not check, is an error.
export function globalExcludes(
	globals: PreviewGlobal[],
	name: string,
	value: unknown,
): string[] {
	const requested = parseList(value);
	if (requested.length === 0) return [];
	const global = globals.find((g) => g.name === name);
	if (!global) {
		throw new Error(`--${name}: the app contributes no ${name} toolbar global`);
	}
	const checked = global.checked ?? [global.default];
	const kept = pick(name, value, checked);
	return checked
		.filter((v) => !kept.includes(v))
		.map((v) => globalTag(name, v));
}

// The tags to leave out for `--state`.
export function stateExcludes(value: unknown): string[] {
	const states = SCREEN_STATES.map(({ state }) => state);
	const kept = pick("state", value, states);
	return states.filter((s) => !kept.includes(s)).map(stateTag);
}

// The route ids that `--screen` names, each a route id (`/_app/deploys`) or a
// screen's title (`deploys`, `Screens/deploys`); one that names no screen is
// an error that lists the titles.
export function selectScreens(routeIds: string[], value: unknown): string[] {
	const wanted = parseList(value);
	const chosen = new Set<string>();
	const unknown: string[] = [];
	for (const want of wanted) {
		const found = routeIds.filter(
			(id) =>
				id === want ||
				[want, `Screens/${want}`].some(
					(title) => screenTitle(id).toLowerCase() === title.toLowerCase(),
				),
		);
		if (found.length === 0) unknown.push(want);
		for (const id of found) chosen.add(id);
	}
	if (unknown.length > 0) {
		throw new Error(
			`--screen: ${unknown.join(", ")} names no screen; screens: ${routeIds.map((id) => `${id} (${screenTitle(id).replace(/^Screens\//, "")})`).join(", ")}`,
		);
	}
	return [...chosen];
}

// What a run narrows by, as the environment the generated Vitest config reads.
export interface RunSelection {
	widths: number[];
	// Tags the storybook plugin leaves out.
	exclude: string[];
}

export const WIDTHS_ENV = "STACK_SCREENS_WIDTHS";
export const EXCLUDE_ENV = "STACK_SCREENS_EXCLUDE";

export function selectionEnv(selection: RunSelection): Record<string, string> {
	return {
		[WIDTHS_ENV]: selection.widths.join(","),
		[EXCLUDE_ENV]: selection.exclude.join(","),
	};
}
