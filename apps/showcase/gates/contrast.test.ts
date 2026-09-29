import { test } from "@playwright/test";
import { type Box, capture, contrast, place, round } from "./lib/pixels.ts";
import { cellSelector, componentGate, INTERACTIVE } from "./lib/showcase.ts";

type Kind = "text" | "large" | "graphic" | "control";

const FLOOR: Record<Kind, number> = {
	text: 4.5,
	large: 3,
	graphic: 3,
	control: 3,
};

// A form field is drawn by its boundary whatever its label says.
const FIELD =
	"input, textarea, select, [role=textbox], [role=combobox], [role=slider], [role=switch], [role=checkbox], [role=radio], [role=spinbutton]";

// Each step removes one kind of foreground from a frame: `ink` every text,
// `graphic` every icon, `bare` every text and icon inside a control (leaving
// its fill, border and shadow), `hollow` the bare controls themselves.
const STEPS = `[data-gate-step=ink] :is([data-gate-kind=text], [data-gate-kind=large]) {
	color: transparent !important;
	-webkit-text-fill-color: transparent !important;
}
[data-gate-step=graphic] [data-gate-kind=graphic] { visibility: hidden !important; }
:is([data-gate-step=bare], [data-gate-step=hollow]) [data-gate-kind~=control],
:is([data-gate-step=bare], [data-gate-step=hollow]) [data-gate-kind~=control] *,
:is([data-gate-step=bare], [data-gate-step=hollow]) [data-gate-kind~=control]::placeholder {
	color: transparent !important;
	-webkit-text-fill-color: transparent !important;
}
:is([data-gate-step=bare], [data-gate-step=hollow]) [data-gate-kind~=control] svg { visibility: hidden !important; }
[data-gate-step=hollow] [data-gate-kind~=control] { visibility: hidden !important; }`;

const MARGIN = 2;

test.describe("contrast", () => {
	// Every text, icon, and field or unlabelled control inside a registered
	// frame, measured on the composited render: each pixel drawn against the
	// same pixel with that foreground removed.
	componentGate(async (page, frames) => {
		await page.addStyleTag({ content: STEPS });
		const findings: string[] = [];
		for (const frame of frames) {
			const selector = cellSelector(frame.id);
			const clip = await place(page, selector, MARGIN);
			if (!clip) continue;
			const targets = await page.evaluate(
				({ selector, interactive, field }) => {
					const root = document.querySelector(selector);
					if (!root) return [];
					// Colours that follow `currentColor` are pinned, so hiding a text
					// hides only the text.
					const pin = (element: Element) => {
						for (const node of [element, ...element.querySelectorAll("*")]) {
							const style = getComputedStyle(node);
							const inline = (node as HTMLElement).style;
							inline.setProperty("border-color", style.borderColor);
							inline.setProperty("outline-color", style.outlineColor);
							inline.setProperty(
								"text-decoration-color",
								style.textDecorationColor,
							);
							if (node !== element) inline.setProperty("color", style.color);
						}
					};
					const found: Array<{
						kind: Kind;
						field: boolean;
						name: string;
						box: Box;
					}> = [];
					const mark = (element: Element, kind: Kind) => {
						const kinds = element.getAttribute("data-gate-kind");
						element.setAttribute(
							"data-gate-kind",
							kinds ? `${kinds} ${kind}` : kind,
						);
						const { x, y, width, height } = element.getBoundingClientRect();
						const name =
							element.textContent?.trim().slice(0, 24) ||
							element.getAttribute("aria-label") ||
							element.tagName.toLowerCase();
						found.push({
							kind,
							field: element.matches(field),
							name,
							box: { x, y, width, height },
						});
					};
					for (const element of root.querySelectorAll("*")) {
						const rect = element.getBoundingClientRect();
						if (rect.width === 0 || rect.height === 0) continue;
						if (getComputedStyle(element).visibility !== "visible") continue;
						if (element instanceof SVGSVGElement) {
							mark(element, "graphic");
							continue;
						}
						if (element instanceof SVGElement) continue;
						const own = [...element.childNodes].some(
							(node) =>
								node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
						);
						if (own) {
							const style = getComputedStyle(element);
							const size = Number.parseFloat(style.fontSize);
							const weight = Number.parseInt(style.fontWeight, 10);
							pin(element);
							mark(
								element,
								size >= 24 || (size >= 18.66 && weight >= 700)
									? "large"
									: "text",
							);
						}
						if (
							element.matches(interactive) &&
							(!element.textContent?.trim() || element.matches(field))
						) {
							pin(element);
							mark(element, "control");
						}
					}
					return found;
				},
				{ selector, interactive: INTERACTIVE, field: FIELD },
			);
			if (targets.length === 0) continue;
			const shot = async (step: string | null) => {
				await page.locator(selector).evaluate((root, value) => {
					if (value) root.setAttribute("data-gate-step", value);
					else root.removeAttribute("data-gate-step");
				}, step);
				return capture(page, clip);
			};
			const drawn = await shot(null);
			const inked = await shot("ink");
			const renders = {
				text: [drawn, inked],
				large: [drawn, inked],
				graphic: [drawn, await shot("graphic")],
				control: [await shot("bare"), await shot("hollow")],
			};
			await shot(null);
			for (const target of targets) {
				const [on, off] = renders[target.kind];
				if (!on || !off) continue;
				const grow = target.kind === "control" ? MARGIN : 0;
				const measured = contrast(on, off, {
					x: target.box.x - clip.x - grow,
					y: target.box.y - clip.y - grow,
					width: target.box.width + 2 * grow,
					height: target.box.height + 2 * grow,
				});
				// A control that is not a field and draws nothing around its content
				// is named by its label, which the text rule measures.
				if (target.kind === "control" && !target.field && measured < 1.1)
					continue;
				if (measured < FLOOR[target.kind]) {
					findings.push(
						`${frame.id}: ${target.kind} "${target.name}" ${round(measured)}:1 < ${FLOOR[target.kind]}:1`,
					);
				}
			}
		}
		return findings;
	});
});
