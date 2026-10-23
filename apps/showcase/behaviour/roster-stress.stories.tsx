import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { expect } from "storybook/test";
import { report, stress } from "../.storybook/stress.ts";

// The roster stress floor (`stories/RosterStress.stories.ts`, generated) passes
// when it finds nothing, so a probe that finds nothing wrong with everything
// would pass too. These stories hand it markup whose outcome is known, in the
// 320 px column the touch floor draws in: the faults it exists for must be
// found, and the CSS that holds against them must pass.
export default { title: "Behaviour/Roster stress canaries" } satisfies Meta;

// A frame as the floor reads one: a caption first, then the slot.
function Column(props: { children: ReactNode }) {
	return (
		<div data-stress style={{ width: 320 }} className="min-w-0">
			<div data-cell="Canary/rest" className="flex flex-col min-w-0">
				<p>caption</p>
				{props.children}
			</div>
		</div>
	);
}

function canary(
	slot: ReactNode,
	expected: (result: ReturnType<typeof stress>) => void | Promise<void>,
): StoryObj {
	return {
		render: () => <Column>{slot}</Column>,
		play: async ({ canvasElement }) => {
			await document.fonts.ready;
			const pane = canvasElement.querySelector<HTMLElement>("[data-stress]");
			if (!pane) throw new Error("the canary did not draw");
			await expected(stress([...pane.querySelectorAll("[data-cell]")], pane));
		},
	};
}

const faults = (result: ReturnType<typeof stress>) =>
	new Set(result.findings.map((finding) => finding.fault));

// A flex row's nowrap text keeps its whole word: the page grows.
export const CatchesNowrapInAFlexRow = canary(
	<div className="flex">
		<span className="whitespace-nowrap">Label</span>
	</div>,
	async (result) => {
		await expect(result.probed).toBe(1);
		await expect(faults(result).size).toBeGreaterThan(0);
	},
);

// A column that does not stretch its items sizes a `truncate` item at its text
// (the item's minimum content is the whole word), so only `max-w-full` holds it.
export const CatchesTruncateInAColumnThatDoesNotStretch = canary(
	<div className="flex flex-col items-start">
		<span className="truncate">Label</span>
	</div>,
	async (result) => {
		await expect(result.probed).toBe(1);
		await expect(faults(result).size).toBeGreaterThan(0);
	},
);

// A box that clips its text with no ellipsis hides the rest of the word.
export const CatchesAClipWithNoEllipsis = canary(
	<div className="w-24 overflow-hidden whitespace-nowrap">Label</div>,
	async (result) => {
		await expect(faults(result)).toContain("clipped");
	},
);

// A text drawn at no width was never laid out, so it proves nothing.
export const CatchesTextThatLaysOutNothing = canary(
	<div style={{ fontSize: 0 }}>Label</div>,
	async (result) => {
		await expect(result.unlaid.length).toBeGreaterThan(0);
		await expect(report(result).join("\n")).toContain("unlaid");
	},
);

// The cut a row's label takes: an ellipsis, and `min-w-0` so the flex item goes
// under its text.
export const PassesTruncateWithMinWidth = canary(
	<div className="flex">
		<span className="truncate min-w-0">Label</span>
	</div>,
	async (result) => {
		await expect(result.probed).toBe(1);
		await expect(report(result)).toEqual([]);
	},
);

// The same column holds a `truncate` item that is bounded by it.
export const PassesTruncateBoundedByItsColumn = canary(
	<div className="flex flex-col items-start">
		<span className="truncate max-w-full">Label</span>
	</div>,
	async (result) => {
		await expect(result.probed).toBe(1);
		await expect(report(result)).toEqual([]);
	},
);

// A paragraph breaks the word where it must (`overflow-wrap: anywhere` on the
// body), so it grows nothing.
export const PassesAWrappingParagraph = canary(<p>Label</p>, async (result) => {
	await expect(result.probed).toBe(1);
	await expect(report(result)).toEqual([]);
});

// A figure lane that must hold keeps its digits and is left out: the system
// formats them.
export const LeavesAFormattedFigureOut = canary(
	<div className="flex">
		<span className="whitespace-nowrap">1,234.50</span>
	</div>,
	async (result) => {
		await expect(result.probed).toBe(0);
	},
);
