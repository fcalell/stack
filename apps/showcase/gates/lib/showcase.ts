import { registry, showcaseCells } from "@fcalell/plugin-react-ui/showcase";
import { expect, type Page, test } from "@playwright/test";

export interface Frame {
	id: string;
	component: string;
	cell: string;
	state: string;
	mode: string;
	density: string;
}

export interface View {
	mode: string;
	density: string;
	url: string;
}

export const IDS = showcaseCells();

export const FRAMES: Frame[] = IDS.map((id) => {
	const [component = "", cell = "", state = "", mode = "", density = ""] =
		id.split("/");
	return { id, component, cell, state, mode, density };
});

export const COMPONENTS = [...new Set(FRAMES.map((frame) => frame.component))];

// One page per mode and density the ids name, addressed by its URL.
export const VIEWS: View[] = [
	...new Set(FRAMES.map((frame) => `${frame.mode}/${frame.density}`)),
].map((key) => {
	const [mode = "", density = ""] = key.split("/");
	return { mode, density, url: `/?mode=${mode}&density=${density}` };
});

export function framesOn(view: View, frames: readonly Frame[]): Frame[] {
	return frames.filter(
		(frame) => frame.mode === view.mode && frame.density === view.density,
	);
}

export function cellSelector(id: string): string {
	return `[data-cell="${id}"]`;
}

// Every element a pointer or keyboard can act on.
export const INTERACTIVE = [
	"a[href]",
	"button",
	"input:not([type=hidden])",
	"select",
	"textarea",
	"summary",
	"[tabindex]",
	"[contenteditable=true]",
	...[
		"button",
		"link",
		"checkbox",
		"radio",
		"switch",
		"slider",
		"spinbutton",
		"tab",
		"menuitem",
		"menuitemcheckbox",
		"menuitemradio",
		"option",
		"combobox",
		"textbox",
	].map((role) => `[role=${role}]`),
].join(",");

// Transitions and animations off and the caret hidden, for every gate that
// is not about motion.
const FREEZE = `*, *::before, *::after {
	transition: none !important;
	animation: none !important;
	caret-color: transparent !important;
}`;

export async function open(
	page: Page,
	view: View,
	options: { freeze?: boolean } = {},
): Promise<void> {
	await page.goto(view.url);
	await page.locator("[data-cell]").first().waitFor();
	await page.evaluate(() => document.fonts.ready.then(() => undefined));
	if (options.freeze ?? true) await page.addStyleTag({ content: FREEZE });
	// The pointer parked off the page, so nothing draws hovered.
	await page.mouse.move(-1, -1);
}

// One test per roster component: an unregistered component is skipped with
// its reason, a registered one runs `measure` on each page that draws its
// frames and fails on every finding it returns.
export function componentGate(
	measure: (page: Page, frames: Frame[], view: View) => Promise<string[]>,
	options: { freeze?: boolean } = {},
): void {
	for (const component of COMPONENTS) {
		test(component, async ({ page }) => {
			test.skip(registry[component] === undefined, "not registered");
			const own = FRAMES.filter((frame) => frame.component === component);
			test.setTimeout(30_000 + own.length * 1_000);
			const findings: string[] = [];
			for (const view of VIEWS) {
				const frames = framesOn(view, own);
				if (frames.length === 0) continue;
				await open(page, view, options);
				findings.push(...(await measure(page, frames, view)));
			}
			expect(findings).toEqual([]);
		});
	}
}
