import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Stats } from "@fcalell/plugin-react-ui/components/stats";
import { Place } from "@fcalell/plugin-react-ui/showcase/frames/place";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

// A strip of six in a narrow measure of a wide page (a record beside it, a
// column of a home): a cell keeps a floor that fits its label whole, and the
// cells that do not fit wrap to a further row instead of breaking a word.
const LABELS = ["New", "Change", "Removal", "Fix", "Support", "Analysis"];

export default {
	title: "Behaviour/Stats",
} satisfies Meta;

function Six(props: { width: number }) {
	return (
		<Place>
			<Pane title="Requests">
				<div
					data-testid="measure"
					className="max-w-full"
					style={{ width: props.width }}
				>
					<Stats
						items={LABELS.map((label, at) => ({ label, value: at * 3 }))}
					/>
				</div>
			</Pane>
		</Place>
	);
}

// Rows of cells, by their top.
function rows(cells: HTMLElement[]) {
	const rows = new Map<number, HTMLElement[]>();
	for (const cell of cells) {
		const top = Math.round(cell.getBoundingClientRect().top);
		rows.set(top, [...(rows.get(top) ?? []), cell]);
	}
	return [...rows.values()];
}

const whole: NonNullable<StoryObj["play"]> = async ({ canvas }) => {
	const strip = canvas.getByTestId("measure");
	const cells = [...strip.querySelectorAll<HTMLElement>("li")];
	await expect(cells).toHaveLength(LABELS.length);
	const lines = new Set<number>();
	for (const [at, cell] of cells.entries()) {
		const name = LABELS[at] as string;
		const label = cell.querySelector("span");
		const text = label?.firstChild;
		if (!label || !text) throw new Error(`${name} has no label`);
		// One line: no break inside the word.
		const range = document.createRange();
		range.selectNodeContents(text);
		await expect(range.getClientRects()).toHaveLength(1);
		lines.add(Math.round(label.getBoundingClientRect().height));
		// The cell holds its label whole beside its padding.
		await expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth);
		await expect(cell.scrollWidth).toBeLessThanOrEqual(cell.clientWidth);
	}
	// Every label stands one line tall.
	await expect(lines.size).toBe(1);
	// Figures share a baseline along a row.
	for (const row of rows(cells)) {
		const tops = row.map((cell) =>
			Math.round(cell.querySelector("p")?.getBoundingClientRect().top ?? 0),
		);
		await expect(new Set(tops).size).toBe(1);
	}
	await expect(strip.scrollWidth).toBeLessThanOrEqual(strip.clientWidth);
};

export const SixAt488: StoryObj = {
	render: () => <Six width={488} />,
	play: whole,
};

export const SixAt320: StoryObj = {
	render: () => <Six width={320} />,
	play: whole,
};

function touch(story: StoryObj, width: number): StoryObj {
	return {
		...story,
		globals: {
			density: "touch",
			viewport: { value: "phone", isRotated: false },
		},
		parameters: {
			viewport: {
				options: {
					phone: {
						name: "Phone",
						styles: { width: `${width}px`, height: "812px" },
						type: "mobile",
					},
				},
			},
		},
	};
}

// The strip's page is wide (the tablet form) with the strip in 488 of it.
export const SixAt488Touch = { ...touch(SixAt488, 1024), tags: ["touch"] };
export const SixAt320Touch = { ...touch(SixAt320, 320), tags: ["touch"] };
