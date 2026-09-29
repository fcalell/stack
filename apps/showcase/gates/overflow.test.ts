import { expect, test } from "@playwright/test";
import { cellSelector, componentGate, open, VIEWS } from "./lib/showcase.ts";

const WIDTHS = [320, 390, 768, 1280, 1440];

// WCAG 1.4.12's text spacing.
const TEXT_SPACING = `* {
	line-height: 1.5 !important;
	letter-spacing: 0.12em !important;
	word-spacing: 0.16em !important;
}
p { margin-bottom: 2em !important; }`;

test.describe("overflow", () => {
	// No page and no frame scrolls sideways at any width.
	for (const width of WIDTHS) {
		test(`${width} px`, async ({ page }) => {
			const findings: string[] = [];
			await page.setViewportSize({ width, height: 800 });
			for (const view of VIEWS) {
				await open(page, view);
				findings.push(
					...(
						await page.evaluate(() => {
							const wide = (element: Element) =>
								element.scrollWidth > element.clientWidth;
							const root = document.documentElement;
							return [
								...(wide(root)
									? [`document ${root.scrollWidth} > ${root.clientWidth}`]
									: []),
								...[...document.querySelectorAll("[data-cell]")]
									.filter(wide)
									.map(
										(frame) => `${frame.getAttribute("data-cell")} overflows`,
									),
							];
						})
					).map((finding) => `${view.url} at ${width}: ${finding}`),
				);
			}
			expect(findings).toEqual([]);
		});
	}

	// Under the text-spacing override no text in a registered frame is cut.
	test.describe("text spacing", () => {
		componentGate(async (page, frames) => {
			await page.addStyleTag({ content: TEXT_SPACING });
			const findings: string[] = [];
			for (const width of WIDTHS) {
				await page.setViewportSize({ width, height: 800 });
				for (const frame of frames) {
					const clipped = await page
						.locator(cellSelector(frame.id))
						.evaluate((root) =>
							[root, ...root.querySelectorAll("*")]
								.filter((element) => {
									const style = getComputedStyle(element);
									if (
										style.display === "inline" ||
										style.display === "contents"
									) {
										return false;
									}
									if (!element.textContent?.trim()) return false;
									return (
										element.scrollWidth > element.clientWidth + 1 ||
										element.scrollHeight > element.clientHeight + 1
									);
								})
								.map(
									(element) =>
										element.textContent?.trim().slice(0, 24) ??
										element.tagName.toLowerCase(),
								),
						);
					for (const text of clipped) {
						findings.push(`${frame.id} at ${width}: "${text}" clips`);
					}
				}
			}
			return findings;
		});
	});
});
