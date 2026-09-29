import { test } from "@playwright/test";
import { cellSelector, componentGate, INTERACTIVE } from "./lib/showcase.ts";

const MINIMUM = 24;
const PRIMARY = 44;
const SPACING = 8;

test.describe("target-size", () => {
	// Every target inside a registered frame is 24 px square or larger, 44 for a
	// primary act under touch density, and 8 px clear of its neighbours.
	componentGate(async (page, frames) => {
		const findings: string[] = [];
		for (const frame of frames) {
			const boxes = await page
				.locator(cellSelector(frame.id))
				.evaluate((root, interactive) => {
					return [...root.querySelectorAll(interactive)].flatMap((element) => {
						const { left, top, right, bottom, width, height } =
							element.getBoundingClientRect();
						if (width === 0 || height === 0) return [];
						const name =
							element.textContent?.trim().slice(0, 24) ||
							element.getAttribute("aria-label") ||
							element.tagName.toLowerCase();
						return [{ name, left, top, right, bottom, width, height }];
					});
				}, INTERACTIVE);
			const primary =
				frame.density === "touch" && frame.cell.includes(".act.primary");
			const floor = primary ? PRIMARY : MINIMUM;
			for (const box of boxes) {
				if (box.width < floor || box.height < floor) {
					findings.push(
						`${frame.id}: "${box.name}" ${Math.round(box.width)}×${Math.round(box.height)} < ${floor}×${floor}`,
					);
				}
			}
			for (const [i, a] of boxes.entries()) {
				for (const b of boxes.slice(i + 1)) {
					const nested =
						(a.left <= b.left &&
							a.top <= b.top &&
							a.right >= b.right &&
							a.bottom >= b.bottom) ||
						(b.left <= a.left &&
							b.top <= a.top &&
							b.right >= a.right &&
							b.bottom >= a.bottom);
					if (nested) continue;
					const gap = Math.max(
						b.left - a.right,
						a.left - b.right,
						b.top - a.bottom,
						a.top - b.bottom,
					);
					if (gap < SPACING) {
						findings.push(
							`${frame.id}: "${a.name}" and "${b.name}" ${Math.round(gap)} px apart < ${SPACING}`,
						);
					}
				}
			}
		}
		return findings;
	});
});
