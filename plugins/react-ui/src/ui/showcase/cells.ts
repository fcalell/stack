import {
	type Layer,
	type RosterEntry,
	rosterEntries,
	type State,
} from "@fcalell/ui-core/roster";
import { FAMILIES, matrixCells } from "@fcalell/ui-core/variants";

export const MODES = ["light", "dark"] as const;
export type ShowcaseMode = (typeof MODES)[number];

export const DENSITIES = ["touch", "desktop"] as const;
export type ShowcaseDensity = (typeof DENSITIES)[number];

export interface ShowcaseCell {
	// `BUTTON.act.primary`, or `base` for a component that draws no matrix.
	name: string;
	classes: readonly string[];
}

export interface ShowcaseFrame {
	id: string;
	layer: Layer;
	component: string;
	cell: ShowcaseCell;
	state: State;
	mode: ShowcaseMode;
	density: ShowcaseDensity;
}

const CELLS = matrixCells(FAMILIES);
const BASE: ShowcaseCell = { name: "base", classes: [] };

// A component that draws no matrix shows one `base` cell.
function componentCells(entry: RosterEntry): ShowcaseCell[] {
	const families = entry.draws;
	const cells = [...CELLS]
		.filter(([path]) => families.includes(path.split(".")[0] ?? ""))
		.map(([name, set]) => ({ name, classes: [...set] }));
	return cells.length > 0 ? cells : [BASE];
}

// Every frame the showcase draws, in roster order: each component's cells,
// each in every state its roster entry lists, every mode and density.
export function showcaseFrames(): ShowcaseFrame[] {
	const frames: ShowcaseFrame[] = [];
	for (const [layer, component, entry] of rosterEntries()) {
		for (const cell of componentCells(entry)) {
			for (const state of entry.states) {
				for (const density of DENSITIES) {
					for (const mode of MODES) {
						frames.push({
							id: [component, cell.name, state, mode, density].join("/"),
							layer,
							component,
							cell,
							state,
							mode,
							density,
						});
					}
				}
			}
		}
	}
	return frames;
}

// Every frame's `data-cell` id: `<component>/<cell>/<state>/<mode>/<density>`.
export function showcaseCells(): string[] {
	return showcaseFrames().map((frame) => frame.id);
}
