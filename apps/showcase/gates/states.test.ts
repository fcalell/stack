import { type Page, test } from "@playwright/test";
import { capture, difference, type Pixels } from "./lib/pixels.ts";
import { cellSelector, componentGate } from "./lib/showcase.ts";

// A frame drawn alone at the viewport's origin with a fixed label, so two
// frames differ only by what their component draws: the label names the
// state, and a frame's place in the page moves its pixels by a fraction.
async function shot(page: Page, id: string): Promise<Pixels> {
	const box = await page.locator(cellSelector(id)).evaluate((frame) => {
		window.scrollTo(0, 0);
		const label = frame.firstElementChild;
		if (label) {
			label.setAttribute("data-gate-label", label.textContent ?? "");
			label.textContent = "state";
		}
		Object.assign((frame as HTMLElement).style, {
			position: "fixed",
			left: "0",
			top: "0",
			zIndex: "2147483647",
		});
		const { width, height } = frame.getBoundingClientRect();
		return { x: 0, y: 0, width: Math.ceil(width), height: Math.ceil(height) };
	});
	const pixels = await capture(page, box);
	await page.locator(cellSelector(id)).evaluate((frame) => {
		const label = frame.firstElementChild;
		if (label) label.textContent = label.getAttribute("data-gate-label");
		(frame as HTMLElement).removeAttribute("style");
	});
	return pixels;
}

test.describe("states", () => {
	// Every declared state draws differently from its rest sibling, with and
	// without reduced motion.
	for (const reducedMotion of ["no-preference", "reduce"] as const) {
		test.describe(`reduced motion ${reducedMotion}`, () => {
			test.use({ contextOptions: { reducedMotion } });
			componentGate(async (page, frames) => {
				const findings: string[] = [];
				const rests = new Map<string, Pixels>();
				for (const frame of frames) {
					if (frame.state === "rest") continue;
					const rest = frames.find(
						(other) => other.cell === frame.cell && other.state === "rest",
					);
					if (!rest) {
						findings.push(`${frame.id}: no rest sibling`);
						continue;
					}
					const resting = rests.get(rest.id) ?? (await shot(page, rest.id));
					rests.set(rest.id, resting);
					if (difference(await shot(page, frame.id), resting) === 0) {
						findings.push(`${frame.id}: draws the same as rest`);
					}
				}
				return findings;
			});
		});
	}
});
