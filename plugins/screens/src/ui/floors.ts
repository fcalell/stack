import { previewGlobals } from "virtual:stack-screens";
import type { Preview } from "@storybook/react-vite";
import { expect, inject } from "vitest";
import { page } from "vitest/browser";
import { HEIGHT, WIDTHS } from "../widths.ts";
import { unpinned } from "./globals.ts";
import { overflowError } from "./overflow.ts";
import {
	densityMark,
	findings,
	format,
	settled,
	watchFirstPaint,
} from "./walk.ts";

// The checks a test run adds to every screen, as preview annotations the test
// run's Storybook config loads and the workbench never does: axe with every
// rule, no horizontal overflow at the rubric's widths, the render walk
// (`walk.ts`) at each, and no console output.

declare module "vitest" {
	interface ProvidedContext {
		// The widths the run visits, from the CLI's `--width`; none means all.
		screensWidths: number[];
	}
}

const widths = (): number[] => {
	const asked = inject("screensWidths");
	return asked?.length ? asked : [...WIDTHS];
};

// A resize settles over frames: layout that reads the viewport in script
// (a media query hook, a resize observer, a container query's restyle, a
// tree swapped for the width) follows it a frame or several later. The page is
// settled once its size and element count hold for a few frames running; the
// first time, the animations the mount started have ended too.
const STABLE_FRAMES = 3;
const MAX_FRAMES = 90;

const frame = () =>
	new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

const shape = () =>
	[
		document.documentElement.scrollWidth,
		document.documentElement.scrollHeight,
		document.body.getElementsByTagName("*").length,
		document.documentElement.dataset.density,
	].join("|");

async function settle(animations: boolean): Promise<void> {
	let last = "";
	let held = 0;
	for (let frames = 0; frames < MAX_FRAMES && held < STABLE_FRAMES; frames++) {
		await frame();
		const now = shape();
		held = now === last ? held + 1 : 0;
		last = now;
	}
	if (animations) await settled();
}

let logged: string[] = [];
let release = () => {};

// Records what the story logs from here on, still passing it on. A story that
// threw never reached `afterEach`, so the next one releases the last one's.
function capture(): void {
	release();
	logged = [];
	const { error, warn } = console;
	const record =
		(level: "error" | "warn", pass: typeof error) =>
		(...args: unknown[]) => {
			logged.push(`console.${level}: ${args.map(String).join(" ")}`);
			pass(...args);
		};
	console.error = record("error", error);
	console.warn = record("warn", warn);
	const onError = (event: ErrorEvent) => logged.push(`error: ${event.message}`);
	window.addEventListener("error", onError);
	release = () => {
		console.error = error;
		console.warn = warn;
		window.removeEventListener("error", onError);
		release = () => {};
	};
}

// Takes the pin off the globals the viewport decides (the density), so each
// width draws the value its root's own rules give it there (a phone width the
// touch set, a laptop the desktop one). The preview's decorator pins the rest
// whenever the story renders again, so it is told to leave these alone
// meanwhile. `reread` has whatever watches the attribute (the density's store)
// read the viewport again, for a change of the media query it was never told
// of; `restore` puts the pins back.
function unpin(): { any: boolean; reread: () => void; restore: () => void } {
	const root = document.documentElement;
	const pins = previewGlobals.flatMap((global) =>
		global.byViewport && "attribute" in global.apply
			? [{ name: global.name, attribute: global.apply.attribute }]
			: [],
	);
	const values = pins.map((pin) => root.getAttribute(pin.attribute));
	for (const pin of pins) {
		unpinned.add(pin.name);
		root.removeAttribute(pin.attribute);
	}
	return {
		any: pins.length > 0,
		reread: () => {
			for (const pin of pins) {
				root.setAttribute(pin.attribute, "");
				root.removeAttribute(pin.attribute);
			}
		},
		restore: () => {
			for (const [i, pin] of pins.entries()) {
				unpinned.delete(pin.name);
				const value = values[i];
				if (value != null) root.setAttribute(pin.attribute, value);
			}
		},
	};
}

// The screen at each width, back at the size it started with: the horizontal
// overflow, then the walk once the width has settled.
async function visit(): Promise<string[]> {
	const { innerWidth, innerHeight } = window;
	const failures: string[] = [];
	// The screen first finishes mounting at the size it has: a store that
	// watches the viewport (the density's media query) is wired as it mounts.
	await settle(true);
	const pins = unpin();
	const marks = new Map<number, string>();
	try {
		for (const [index, width] of widths().entries()) {
			await page.viewport(width, HEIGHT);
			pins.reread();
			await settle(false);
			const scrollWidth = Math.max(
				document.documentElement.scrollWidth,
				document.body.scrollWidth,
			);
			marks.set(width, densityMark());
			const failure = overflowError(width, scrollWidth, window.innerWidth);
			if (failure) failures.push(failure);
			failures.push(
				...format(findings({ fonts: index === 0 })).map(
					(line) => `at ${width}px, ${line}`,
				),
			);
		}
	} finally {
		pins.restore();
		await page.viewport(innerWidth, innerHeight);
	}
	// The phone width draws the touch set and the wider ones the desktop one: a
	// run that visits both and draws one set at all of them did not unpin.
	const wide = [...marks].filter(([width]) => width >= WIDTHS[1]);
	const phone = marks.get(WIDTHS[0]);
	if (
		pins.any &&
		phone !== undefined &&
		wide.some(([, mark]) => mark === phone)
	) {
		failures.push(
			`density: the token set at ${WIDTHS[0]}px is the one at ${wide[0]?.[0]}px (${phone}); expected the touch set at ${WIDTHS[0]}px and the desktop set at the wider widths; fix: the density global must follow the viewport (byViewport)`,
		);
	}
	return failures;
}

const floors: Preview = {
	parameters: {
		a11y: {
			test: "error",
			// A screen is a page, so the document-level rules judge it. The a11y
			// addon turns `region` off for components, and axe leaves `target-size`
			// off.
			config: {
				rules: [
					{ id: "region", enabled: true },
					{ id: "target-size", enabled: true },
				],
			},
		},
	},
	beforeEach: () => {
		capture();
		watchFirstPaint(document.getElementById("storybook-root") ?? document.body);
	},
	afterEach: async () => {
		const failures = await visit();
		failures.push(...logged);
		release();
		// Soft: the test fails but the hooks after this one still run, so the a11y
		// addon's axe result lands in the same run. Hooks run last-listed first and
		// the addon throws, so the floors are listed after it and run before it.
		expect.soft(failures, "floors").toEqual([]);
	},
};

export default floors;
