import type { ShowcaseFrame } from "@fcalell/plugin-react-ui/showcase/cells";
import { showcaseFrames } from "@fcalell/plugin-react-ui/showcase/cells";
import { type Draw, Frame } from "@fcalell/plugin-react-ui/showcase/frame";
import {
	findings,
	format,
	rootMargins,
	settled,
} from "@fcalell/plugin-screens/walk";
import type { StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { expect, waitFor } from "storybook/test";
import { collect, report, stress } from "./stress.ts";

const FRAMES = showcaseFrames();

// The touch column the stress is drawn in: the narrowest phone the rubric
// names, inside the touch project's wider (375 px) page.
const PHONE = 320;

// A component that draws no text a user's string reaches: its stories hold an
// icon, a mark or a drawing, or only text the system formats.
const TEXTLESS = new Set(["Switch"]);

// What each component's frames draw may not shrink to nothing: a floor on the
// slots fed, about half of what the frames hold, so a frame that stops drawing
// its text (or a filter that drops it) fails here and not by passing silently.
// A component left out has the floor of one.
const FLOOR: Record<string, number> = {
	ActionBar: 12,
	Banner: 4,
	BarChart: 6,
	Button: 7,
	FormField: 120,
	Gate: 7,
	Input: 28,
	Pane: 20,
	Picker: 50,
	Prose: 8,
	Rules: 6,
	Section: 130,
	Sheet: 23,
	Stats: 6,
	Table: 4,
	Thread: 30,
	Toast: 2,
};

// A cell's frames: every state of it, in both modes.
type Cell = ShowcaseFrame[];

// One cell's frames at a time. A popup's float watches the page it floats over
// (its position, its animations) and every frame that opens one adds to that,
// so the cells drawn together cost each other: all of a Picker's 108 open
// frames on one page made 108 popups each reading a 23,000-node page. A cell is
// also the unit a slot is probed by (`collect` keys a slot by its cell), so
// drawing the cells in turn probes the same slots as one page of all of them.
function Cells(props: {
	cells: Cell[];
	density: "desktop" | "touch";
	at: { set: (index: number) => void };
	draw?: Draw;
}) {
	const [index, setIndex] = useState(0);
	useEffect(() => {
		props.at.set = setIndex;
	}, [props.at]);
	return (
		<div
			data-stress
			style={props.density === "touch" ? { width: PHONE } : undefined}
			className="flex flex-row flex-wrap gap-pair min-w-0"
		>
			{(props.cells[index] ?? []).map((frame) => (
				<Frame key={frame.id} frame={frame} draw={props.draw} />
			))}
		</div>
	);
}

// Every state of a component, in both modes, drawn at one density in a column
// of the width the density is held to, then every text slot of it fed a word
// and a URL no line can break (`stress`). The loading forms are skeletons with
// no text.
export function stressStories(component: string, draw?: Draw) {
	return (density: "desktop" | "touch"): StoryObj => {
		const own = FRAMES.filter(
			(frame) =>
				frame.component === component &&
				frame.density === density &&
				frame.state !== "loading",
		);
		const cells = [
			...Map.groupBy(own, (frame) => frame.cell.name).values(),
		] satisfies Cell[];
		const at = { set: (_index: number) => {} };
		return {
			globals: { density },
			// Axe judges the drawn states in their own stories; this one only draws
			// them again to measure.
			parameters: { layout: "padded", a11y: { test: "off" } },
			render: () => (
				<Cells cells={cells} density={density} at={at} draw={draw} />
			),
			play: async ({ canvasElement }) => {
				await document.fonts.ready;
				const pane = canvasElement.querySelector<HTMLElement>("[data-stress]");
				if (!pane) throw new Error("the stress pane did not draw");
				const frames = () => [...pane.querySelectorAll("[data-cell]")];
				const faults: string[] = [];
				let probed = 0;
				// A slot is probed once by its place in its component, whichever cell
				// draws it first.
				const seen = new Set<string>();
				for (const [index, cell] of cells.entries()) {
					at.set(index);
					await waitFor(() =>
						expect(
							frames().map((frame) => frame.getAttribute("data-cell")),
						).toEqual(cell.map((frame) => frame.id)),
					);
					// A component that lays itself out after its first paint (its touch
					// tree, a measured list) is read once it has text drawn. A cell may
					// draw none (a field's only slot is its value), so the wait ends at
					// a second and the floor below judges the component's total.
					if (!TEXTLESS.has(component) && probed === 0)
						await waitFor(
							() => expect(collect(frames()).length).toBeGreaterThan(0),
							{
								timeout: 1000,
							},
						).catch(() => {});
					// The render walk over the cell's frames alone (its heights, gaps,
					// insets and radii against the tokens, its clips and figures), and no
					// margin on a component's root: its parent places it. A popup the
					// frame opens has opened and stopped moving by then.
					await settled();
					const result = stress(frames(), pane, seen);
					probed += result.probed;
					faults.push(
						...report(result),
						...format(findings({ roots: frames() })),
						...format(rootMargins(frames())),
					);
				}
				// What each component's frames draw may not shrink to nothing: a
				// frame that stops drawing its text (or a filter that drops it)
				// fails here and not by passing silently.
				const floor = TEXTLESS.has(component) ? 0 : (FLOOR[component] ?? 1);
				if (cells.length > 0 && probed < floor)
					faults.push(`probed ${probed} slots, expected at least ${floor}`);
				if (faults.length > 0) throw new Error(`\n${faults.join("\n")}`);
			},
		};
	};
}
