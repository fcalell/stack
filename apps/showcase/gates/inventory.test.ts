import { expect, test } from "@playwright/test";
import { IDS, open, VIEWS } from "./lib/showcase.ts";

test.describe("inventory", () => {
	// Each page draws every id of its density exactly once, and nothing else.
	for (const view of VIEWS) {
		const expected = IDS.filter((id) => id.endsWith(`/${view.density}`));
		test(`${view.url} draws ${expected.length} ids`, async ({ page }) => {
			await open(page, view);
			const drawn = await page
				.locator("[data-cell]")
				.evaluateAll((cells) =>
					cells.map((cell) => cell.getAttribute("data-cell") ?? ""),
				);
			expect(drawn.length).toBe(expected.length);
			expect(new Set(drawn).size).toBe(drawn.length);
			expect([...drawn].sort()).toEqual([...expected].sort());
		});
	}

	test(`the pages together draw all ${IDS.length} ids`, () => {
		const densities = new Set(VIEWS.map((view) => view.density));
		expect(
			IDS.filter((id) => densities.has(id.split("/").at(-1) ?? "")),
		).toEqual(IDS);
	});
});
