import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Sheet } from "@fcalell/plugin-react-ui/components/sheet";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

const LINES = Array.from({ length: 24 }, (_, at) => `Line ${at + 1}`);

// A footed Place in a column that has no height of its own, with a sibling
// under it: the Place takes its height from its content, and the docked
// sheet's body scrolls past two fifths of the region.
function AutoColumn({
	width,
	mode,
}: {
	width: number;
	mode: "light" | "dark";
}) {
	return (
		<div
			className={mode}
			style={{
				display: "flex",
				flexDirection: "column",
				width,
				background: "var(--color-canvas)",
				color: "var(--color-ink-body)",
			}}
		>
			<div data-column style={{ display: "flex", flexDirection: "column" }}>
				<Place
					title="Publish"
					foot={
						<Sheet
							open
							onClose={() => {}}
							title="Publish"
							submit={{ label: "Publish", onAct: () => {} }}
						>
							{LINES.map((line) => (
								<p key={line}>{line}</p>
							))}
						</Sheet>
					}
				>
					<p>The page.</p>
				</Place>
			</div>
			<p data-below>Below the column</p>
		</div>
	);
}

const frame = () =>
	new Promise<void>((done) => requestAnimationFrame(() => done()));

function story(width: number, mode: "light" | "dark"): StoryObj {
	return {
		parameters: { layout: "fullscreen" },
		render: () => <AutoColumn width={width} mode={mode} />,
		play: async ({ canvas, canvasElement }) => {
			const sheet = await canvas.findByRole("region", { name: "Publish" });
			const column = canvasElement.querySelector("[data-column]");
			const below = canvasElement.querySelector("[data-below]");
			if (!column || !below) throw new Error("the frame is missing");
			const heights = () =>
				[column, sheet, below].map((el) => el.getBoundingClientRect().height);
			// The bound is a fraction of a region that holds the body: it settles
			// within a few frames, then two frames apart give the same heights.
			let settled = heights();
			let still = 0;
			for (let at = 0; at < 200 && still < 10; at++) {
				await frame();
				const next = heights();
				still = next.every((height, i) => height === settled[i])
					? still + 1
					: 0;
				settled = next;
			}
			expect(still).toBe(10);
			await frame();
			await frame();
			expect(heights()).toEqual(settled);
			const box = column.getBoundingClientRect();
			expect(box.height).toBeGreaterThan(0);
			expect(sheet.getBoundingClientRect().height).toBeGreaterThan(0);
			expect(sheet.getBoundingClientRect().bottom).toBeLessThanOrEqual(
				box.bottom + 1,
			);
			expect(below.getBoundingClientRect().top).toBeGreaterThanOrEqual(
				box.bottom - 1,
			);
		},
	};
}

export default {
	title: "Behaviour/Place foot",
} satisfies Meta;

export const FootedPlaceInAutoColumn375Light = story(375, "light");
export const FootedPlaceInAutoColumn375Dark = story(375, "dark");
export const FootedPlaceInAutoColumn768Light = story(768, "light");
export const FootedPlaceInAutoColumn768Dark = story(768, "dark");
export const FootedPlaceInAutoColumn1440Light = story(1440, "light");
export const FootedPlaceInAutoColumn1440Dark = story(1440, "dark");
