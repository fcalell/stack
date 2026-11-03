import { SHOT_MAX_HEIGHT } from "../widths.ts";
import { overflowError } from "./overflow.ts";
import { findings, format } from "./walk.ts";

// What the test run's floors and `stack screens shoot` and `drive` share about
// a drawn page: what a read holds busy, how far its scrollers hide content,
// the judgement at a width, and where a control is.

// What a read holds busy: not a button, whose busy is its own action in
// flight (a demo of one stays so), only a region or a list waiting for data.
export const READ_BUSY = '[aria-busy="true"]:not(button, [role="button"])';

export { SHOT_MAX_HEIGHT };

// How far the page's scrollers run past what they show: the document, and any
// element that scrolls on its own (a shell's pane holds the page in a fixed
// height, so the document alone never overflows).
export function hiddenHeight(): number {
	const root = document.documentElement;
	let hidden = root.scrollHeight - root.clientHeight;
	for (const element of document.body.getElementsByTagName("*")) {
		const { overflowY } = getComputedStyle(element);
		if (overflowY !== "auto" && overflowY !== "scroll") continue;
		hidden = Math.max(hidden, element.scrollHeight - element.clientHeight);
	}
	return Math.max(hidden, 0);
}

// The screen at one width: the horizontal overflow and the walk's findings.
export function floorsAt(width: number, fonts: boolean): string[] {
	const failures: string[] = [];
	const scrollWidth = Math.max(
		document.documentElement.scrollWidth,
		document.body.scrollWidth,
	);
	const failure = overflowError(width, scrollWidth, window.innerWidth);
	if (failure) failures.push(failure);
	failures.push(
		...format(findings({ fonts })).map((line) => `at ${width}px, ${line}`),
	);
	return failures;
}

const CONTROLS =
	"button, a[href], summary, input:not([type=hidden]), select, textarea, [role], [tabindex]";

const words = (text: string | null | undefined): string =>
	(text ?? "").replace(/\s+/g, " ").trim().toLowerCase();

function nameOf(element: HTMLElement): string {
	const label = element.getAttribute("aria-label");
	if (label) return words(label);
	const by = element.getAttribute("aria-labelledby");
	if (by)
		return words(
			by
				.split(" ")
				.map((id) => document.getElementById(id)?.textContent)
				.join(" "),
		);
	return words(element.innerText || element.getAttribute("title"));
}

export interface ControlPoint {
	x: number;
	y: number;
	label: string;
	ok: boolean;
	hit: string;
}

// Where to press the control whose visible text or accessible name is `text`:
// the first visible, enabled match, scrolled into view, with a hit test of
// what is drawn at its centre. Null when none matches.
export function controlPoint(text: string): ControlPoint | null {
	const want = words(text);
	const matches = [...document.querySelectorAll<HTMLElement>(CONTROLS)].filter(
		(element) => {
			const box = element.getBoundingClientRect();
			return (
				box.width > 0 &&
				box.height > 0 &&
				getComputedStyle(element).visibility !== "hidden" &&
				!(element as HTMLButtonElement).disabled &&
				(nameOf(element) === want || words(element.innerText) === want)
			);
		},
	);
	// A wrapper that holds a match is not the control: the innermost one is.
	const element = matches.find(
		(candidate) =>
			!matches.some((m) => m !== candidate && candidate.contains(m)),
	);
	if (!element) return null;
	element.scrollIntoView({ block: "center", inline: "center" });
	const box = element.getBoundingClientRect();
	const x = box.left + box.width / 2;
	const y = box.top + box.height / 2;
	const hit = document.elementFromPoint(x, y);
	return {
		x,
		y,
		label: nameOf(element),
		ok: hit !== null && (element.contains(hit) || hit.contains(element)),
		hit: hit
			? `${hit.tagName.toLowerCase()}.${String(hit.className).slice(0, 40)}`
			: "nothing",
	};
}
