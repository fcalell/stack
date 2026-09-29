import AxeBuilder from "@axe-core/playwright";
import { registry } from "@fcalell/plugin-react-ui/showcase";
import { expect, type Page, test } from "@playwright/test";
import { capture, contrast, type Pixels, place, round } from "./lib/pixels.ts";
import {
	cellSelector,
	componentGate,
	FRAMES,
	INTERACTIVE,
	open,
	VIEWS,
} from "./lib/showcase.ts";

const FOCUS_FLOOR = 3;
const RING = 4;
const OVERLAYS = ["Sheet", "Menu", "Picker"];
const COMPOSITE =
	"[role=radiogroup], [role=listbox], [role=menu], [role=menubar], [role=tablist], [role=grid], [role=tree], [role=toolbar]";

// The focused target's index when focus is inside the frame.
function activeTab(page: Page, selector: string): Promise<string | null> {
	return page.evaluate((s) => {
		const active = document.activeElement;
		return active?.closest(s) ? active.getAttribute("data-gate-tab") : null;
	}, selector);
}

// Every sticky or fixed element that overlaps the focused element.
function covering(page: Page): Promise<string[]> {
	return page.evaluate(() => {
		const element = document.activeElement;
		if (!element) return [];
		const own = element.getBoundingClientRect();
		return [...document.querySelectorAll("body *")]
			.filter((other) => {
				const position = getComputedStyle(other).position;
				if (position !== "sticky" && position !== "fixed") return false;
				if (other.contains(element) || element.contains(other)) return false;
				const box = other.getBoundingClientRect();
				return (
					box.left < own.right &&
					box.right > own.left &&
					box.top < own.bottom &&
					box.bottom > own.top
				);
			})
			.map((other) => other.tagName.toLowerCase());
	});
}

test.describe("accessibility", () => {
	for (const view of VIEWS) {
		test(`axe ${view.url}`, async ({ page }) => {
			await open(page, view);
			const { violations } = await new AxeBuilder({ page }).analyze();
			expect(
				violations
					.filter((v) => v.impact === "serious" || v.impact === "critical")
					.map(
						(v) =>
							`${v.impact} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
					),
			).toEqual([]);
		});
	}

	// Inside each registered frame Tab reaches every target in order, each
	// shows a focus indicator at 3:1 against its own rest, and no sticky or
	// fixed element covers it.
	test.describe("keyboard", () => {
		componentGate(async (page, frames) => {
			const findings: string[] = [];
			for (const frame of frames) {
				const selector = cellSelector(frame.id);
				const plan = await page.locator(selector).evaluate(
					(root, { interactive, composite }) => {
						const unreachable: string[] = [];
						let count = 0;
						for (const element of root.querySelectorAll<HTMLElement>(
							interactive,
						)) {
							const rect = element.getBoundingClientRect();
							if (rect.width === 0 || rect.height === 0) continue;
							if (element.matches(":disabled")) continue;
							if (element.tabIndex >= 0) {
								element.setAttribute("data-gate-tab", String(count++));
							} else if (!element.closest(composite)) {
								unreachable.push(
									element.textContent?.trim().slice(0, 24) ||
										element.tagName.toLowerCase(),
								);
							}
						}
						// Tab starts from the frame itself.
						root.setAttribute("tabindex", "-1");
						(root as HTMLElement).focus();
						return { count, unreachable };
					},
					{ interactive: INTERACTIVE, composite: COMPOSITE },
				);
				for (const name of plan.unreachable) {
					findings.push(`${frame.id}: "${name}" is not in the Tab order`);
				}
				const focused: Array<Pixels | null> = [];
				for (let i = 0; i < plan.count; i++) {
					await page.keyboard.press("Tab");
					const reached = await activeTab(page, selector);
					if (reached !== String(i)) {
						findings.push(
							`${frame.id}: Tab ${i + 1} reached ${reached ?? "outside the frame"}, not target ${i}`,
						);
						break;
					}
					for (const cover of await covering(page)) {
						findings.push(`${frame.id}: target ${i} is covered by a ${cover}`);
					}
					const box = await place(
						page,
						`${selector} [data-gate-tab="${i}"]`,
						RING,
					);
					focused.push(box ? await capture(page, box) : null);
				}
				await page.evaluate(() =>
					(document.activeElement as HTMLElement | null)?.blur(),
				);
				for (const [i, drawn] of focused.entries()) {
					const box = await place(
						page,
						`${selector} [data-gate-tab="${i}"]`,
						RING,
					);
					if (!drawn || !box) continue;
					const measured = contrast(drawn, await capture(page, box));
					if (measured < FOCUS_FLOOR) {
						findings.push(
							`${frame.id}: target ${i} focus indicator ${round(measured)}:1 < ${FOCUS_FLOOR}:1`,
						);
					}
				}
			}
			return findings;
		});
	});

	// An overlay takes focus when it opens, keeps a dialog's Tab inside it, and
	// hands focus back to its trigger on Escape.
	test.describe("overlays", () => {
		for (const component of OVERLAYS) {
			test(component, async ({ page }) => {
				test.skip(registry[component] === undefined, "not registered");
				const frame = FRAMES.find(
					(candidate) =>
						candidate.component === component && candidate.state === "rest",
				);
				const view = VIEWS.find(
					(candidate) =>
						candidate.mode === frame?.mode &&
						candidate.density === frame?.density,
				);
				if (!frame || !view) throw new Error(`${component} has no rest frame`);
				await open(page, view);
				const trigger = page
					.locator(cellSelector(frame.id))
					.locator("[aria-haspopup], [aria-expanded]")
					.first();
				await trigger.focus();
				await page.keyboard.press("Enter");
				const inside = () =>
					page.evaluate(() =>
						Boolean(
							document.activeElement?.closest(
								"[role=dialog], [role=alertdialog], [role=menu], [role=listbox]",
							),
						),
					);
				expect(await inside(), "focus moves into the overlay").toBe(true);
				const dialog = await page.evaluate(() =>
					Boolean(
						document.activeElement?.closest(
							"[role=dialog], [role=alertdialog]",
						),
					),
				);
				if (dialog) {
					for (let i = 0; i < 12; i++) {
						await page.keyboard.press(i % 3 === 2 ? "Shift+Tab" : "Tab");
						expect(await inside(), "Tab stays inside the dialog").toBe(true);
					}
				}
				await page.keyboard.press("Escape");
				await expect(
					trigger,
					"Escape returns focus to the trigger",
				).toBeFocused();
			});
		}
	});
});
