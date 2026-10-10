import { showcaseFrames } from "@fcalell/plugin-react-ui/showcase/cells";
import { type Draw, Frame } from "@fcalell/plugin-react-ui/showcase/frame";
import type { StoryObj } from "@storybook/react-vite";
import { FOCUS_GUARD } from "./focus-guard.ts";

const FRAMES = showcaseFrames();

interface Args {
	cell: string;
}

// A node off a run's path draws disabled ink on purpose (the pattern page's rule: the rest of a
// run in disabled ink), about 3:1. Axe exempts only a disabled control, and these are enabled
// buttons, so their text is left out of the check. Only the dimmed frames (a node's text, a glyph's name), only Canvas. The
// exclusion is the whole node, not `color-contrast` alone: a per-story `config.rules` entry
// replaces the preview's document-rule list (arrays do not merge), so scoping the rule would copy it.
const UNCHECKED: Record<string, string[]> = {
	Canvas: [
		'[data-cell^="Canvas/CANVAS_NODE_TEXT.tone.dimmed/"] [data-layer] button',
		'[data-cell^="Canvas/CANVAS_NODE_NAME.tone.dimmed/"] [data-layer] button',
	],
};

// One story per component and state: every cell the component draws in that
// state, light and dark side by side, at the toolbar's density. The `rest`
// story takes a `cell` arg to browse one cell.
export function stateStories(component: string, draw?: Draw) {
	const own = FRAMES.filter((frame) => frame.component === component);
	return (state: string): StoryObj<Args> => {
		const cells = [
			...new Set(
				own.filter((frame) => frame.state === state).map((f) => f.cell.name),
			),
		];
		return {
			args: { cell: "all" },
			argTypes: {
				cell:
					state === "rest"
						? { control: "select", options: ["all", ...cells] }
						: { table: { disable: true } },
			},
			parameters: {
				layout: "padded",
				...(UNCHECKED[component] && {
					a11y: {
						context: { exclude: [FOCUS_GUARD, ...UNCHECKED[component]] },
					},
				}),
			},
			render: (args, context) => {
				const density = String(context.globals.density);
				return (
					<div key={density} className="flex flex-col gap-inside">
						{cells
							.filter((cell) => args.cell === "all" || args.cell === cell)
							.map((cell) => (
								<div
									key={cell}
									className="flex flex-row flex-wrap gap-pair min-w-0"
								>
									{own
										.filter(
											(frame) =>
												frame.cell.name === cell &&
												frame.state === state &&
												frame.density === density,
										)
										.map((frame) => (
											<Frame key={frame.id} frame={frame} draw={draw} />
										))}
								</div>
							))}
					</div>
				);
			},
		};
	};
}
