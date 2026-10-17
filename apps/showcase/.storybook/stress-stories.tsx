import { showcaseFrames } from "@fcalell/plugin-react-ui/showcase/cells";
import { type Draw, Frame } from "@fcalell/plugin-react-ui/showcase/frame";
import {
	findings,
	format,
	rootMargins,
	settled,
} from "@fcalell/plugin-screens/walk";
import type { StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import { collect, report, stress } from "./stress.ts";

const FRAMES = showcaseFrames();

// The touch column the stress is drawn in: the narrowest phone the rubric
// names, inside the touch project's wider (375 px) page.
const PHONE = 320;

// A component that draws no text a user's string reaches: its stories hold an
// icon, a mark or a drawing, or only text the system formats.
const TEXTLESS = new Set([
	"Avatar",
	"Checkbox",
	"Count",
	"Icon",
	"IconButton",
	"QrCode",
	"Spinner",
	"Switch",
]);

// What each component's frames draw may not shrink to nothing: a floor on the
// slots fed, about half of what the frames hold, so a frame that stops drawing
// its text (or a filter that drops it) fails here and not by passing silently.
// A component left out has the floor of one.
const FLOOR: Record<string, number> = {
	ActionBar: 12,
	Banner: 4,
	BarChart: 6,
	Button: 7,
	Chip: 7,
	DefinitionRow: 5,
	FormField: 120,
	Gate: 7,
	Input: 28,
	ItemHeader: 7,
	ListRow: 120,
	Menu: 3,
	Meter: 10,
	MessageInput: 50,
	Pane: 20,
	Picker: 50,
	Prose: 8,
	Rules: 6,
	Section: 7,
	Sheet: 23,
	StepCount: 7,
	Table: 4,
	Thread: 4,
	Toast: 2,
};

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
		return {
			tags: density === "touch" ? ["touch"] : [],
			globals: { density },
			// Axe judges the drawn states in their own stories; this one only draws
			// them again to measure.
			parameters: { layout: "padded", a11y: { test: "off" } },
			render: () => (
				<div
					data-stress
					style={density === "touch" ? { width: PHONE } : undefined}
					className="flex flex-row flex-wrap gap-pair min-w-0"
				>
					{own.map((frame) => (
						<Frame key={frame.id} frame={frame} draw={draw} />
					))}
				</div>
			),
			play: async ({ canvasElement }) => {
				await document.fonts.ready;
				const pane = canvasElement.querySelector<HTMLElement>("[data-stress]");
				if (!pane) throw new Error("the stress pane did not draw");
				const frames = () => [...pane.querySelectorAll("[data-cell]")];
				// A component that lays itself out after its first paint (its touch
				// tree, a measured list) is read once it has text drawn.
				if (!TEXTLESS.has(component) && own.length > 0)
					await waitFor(() =>
						expect(collect(frames()).length).toBeGreaterThan(0),
					);
				// A popup still opening holds fewer slots than its floor: the stress
				// runs again until it reaches it (each run restores what it fed).
				const floor =
					!TEXTLESS.has(component) && own.length > 0
						? (FLOOR[component] ?? 1)
						: 0;
				let result = stress(frames(), pane);
				if (result.probed < floor)
					await waitFor(() => {
						result = stress(frames(), pane);
						expect(result.probed).toBeGreaterThanOrEqual(floor);
					});
				// The render walk over the component's frames alone (its heights,
				// gaps, insets and radii against the tokens, its clips and figures),
				// and no margin on a component's root: its parent places it.
				await settled();
				const faults = [
					...report(result),
					...format(findings({ roots: frames() })),
					...format(rootMargins(frames())),
				];
				if (faults.length > 0) throw new Error(`\n${faults.join("\n")}`);
			},
		};
	};
}
