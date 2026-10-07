import type { PreviewGlobal } from "../types.ts";

// The root's classes and attributes a global drives: all it needs of the
// document, so a test can hand it a stand-in.
export interface GlobalsRoot {
	setAttribute(name: string, value: string): void;
	classList: { toggle(name: string, force: boolean): unknown };
}

// Storybook's `globalTypes`, one toolbar select per contributed global.
export function globalTypes(globals: PreviewGlobal[]) {
	return Object.fromEntries(
		globals.map((g) => [
			g.name,
			{
				description: g.title,
				toolbar: {
					title: g.title,
					items: g.values,
					dynamicTitle: true,
				},
			},
		]),
	);
}

export function initialGlobals(
	globals: PreviewGlobal[],
): Record<string, string> {
	return Object.fromEntries(globals.map((g) => [g.name, g.default]));
}

// Pins every global's chosen value on the root.
export function applyGlobals(
	root: GlobalsRoot,
	globals: PreviewGlobal[],
	chosen: Record<string, unknown>,
): void {
	for (const g of globals) {
		const value = String(chosen[g.name] ?? g.default);
		if ("attribute" in g.apply) {
			root.setAttribute(g.apply.attribute, value);
			continue;
		}
		for (const [name, className] of Object.entries(g.apply.classes)) {
			root.classList.toggle(className, value === name);
		}
	}
}
