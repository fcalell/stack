import { previewGlobals } from "virtual:stack-screens";
import type { Preview } from "@storybook/react-vite";
import { expect, inject } from "vitest";
import { page } from "vitest/browser";
import { HEIGHT, WIDTHS } from "../widths.ts";
import {
	called,
	failing,
	holdCalls,
	release as releaseHold,
} from "./answer.ts";
import { storyClient } from "./client.tsx";
import { unpinned } from "./globals.ts";
import { overflowError } from "./overflow.ts";
import { compare, measure, type SectionBox } from "./shift.ts";
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
const LOAD_TIMEOUT = 5000;

// Whether a shift fails the screen: the waiting forms are the painted ones, so
// a Section heading that moves when its data lands is a finding.
const SHIFT_FAILS = true;

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

// What a read holds busy: not a button, whose busy is its own action in
// flight (a demo of one stays so), only a region or a list waiting for data.
const READ_BUSY = '[aria-busy="true"]:not(button, [role="button"])';

// Once the held reads are answered: nothing busy, and the page settled.
async function loaded(animations = true): Promise<string | undefined> {
	const end = performance.now() + LOAD_TIMEOUT;
	while (document.querySelector(READ_BUSY)) {
		if (performance.now() > end)
			return `still busy: ${[...document.querySelectorAll(READ_BUSY)].map((e) => e.outerHTML.slice(0, 160)).join(" | ")}`;
		await frame();
	}
	await settle(animations);
	return undefined;
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

// Runs `body` with the density pins off, then puts the viewport and the pins
// back as they were: the screen at each width, as a phone and a laptop draw it.
async function withUnpinned<T>(
	body: (pins: ReturnType<typeof unpin>) => Promise<T>,
): Promise<T> {
	const { innerWidth, innerHeight } = window;
	// The screen first finishes mounting at the size it has: a store that
	// watches the viewport (the density's media query) is wired as it mounts.
	await settle(true);
	const pins = unpin();
	try {
		return await body(pins);
	} finally {
		pins.restore();
		await page.viewport(innerWidth, innerHeight);
	}
}

// The screen at one width: resized and settled, then the horizontal overflow
// and the walk's findings.
function floorsAt(width: number, fonts: boolean): string[] {
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

// The screen at each width, back at the size it started with: the horizontal
// overflow, then the walk once the width has settled. A loading story also
// has each width's Sections measured, its held calls answered, and the
// Sections measured again: they must not have moved (`shift.ts`).
async function visit(loading: boolean): Promise<string[]> {
	const failures: string[] = [];
	const shifts: string[] = [];
	const reports: string[] = [];
	const marks = new Map<number, string>();
	const waiting = new Map<number, SectionBox[]>();
	const pins = await withUnpinned(async (pins) => {
		for (const [index, width] of widths().entries()) {
			await resize(pins, width);
			if (loading) waiting.set(width, measure());
			marks.set(width, densityMark());
			failures.push(...floorsAt(width, index === 0));
		}
		if (loading) {
			releaseHold();
			const busy = await loaded();
			if (busy) shifts.push(`shift: ${busy}`);
			for (const [width, before] of waiting) {
				await resize(pins, width);
				const found = compare(before, measure());
				const at = (line: string) => `at ${width}px, shift: ${line}`;
				shifts.push(...found.fails.map(at));
				reports.push(...found.reports.map(at));
			}
		}
		return pins;
	});
	if (SHIFT_FAILS) failures.push(...shifts);
	else for (const line of shifts) console.info(line);
	// A move a data-only block caused is told, not failed.
	for (const line of reports) console.info(line);
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

async function resize(
	pins: ReturnType<typeof unpin>,
	width: number,
): Promise<void> {
	await page.viewport(width, HEIGHT);
	pins.reread();
	await settle(false);
}

// A data story's screen with one of its reads failed at a time. The reads are
// the procedures the story called, found by watching (`called`); the run
// answers one with an error and every other with data, resets those queries
// so they fetch again, waits for the page to settle, and applies the width
// floors and the console capture to it. A failed read draws in its frame, and
// the dev error for a read no frame holds is a console line here. Fewer than
// two procedures is the error story's case already (it fails them all), so it
// runs only when a read can fail while another holds data.
async function perRead(): Promise<string[]> {
	const paths = called();
	const client = storyClient();
	if (paths.length < 2 || !client) return [];
	const reset = (path: readonly string[]) =>
		client.resetQueries({ queryKey: [path] });
	const out: string[] = [];
	await withUnpinned(async (pins) => {
		let previous: readonly string[] | undefined;
		for (const path of paths) {
			const name = path.join(".");
			const from = logged.length;
			failing(path);
			await Promise.all([reset(path), previous && reset(previous)]);
			previous = path;
			// Waiting for every animation to end costs about 2 s a read (one outlasts
			// the wait's limit), so the page is judged settled by its size, as at
			// each width.
			const busy = await loaded(false);
			const found = busy ? [`shift: ${busy}`] : [];
			for (const width of widths()) {
				await resize(pins, width);
				found.push(...floorsAt(width, false));
			}
			// The console lines this read's failure wrote belong to it alone.
			found.push(...logged.splice(from));
			out.push(...found.map((line) => `with ${name} failed: ${line}`));
		}
		failing(undefined);
		if (previous) await reset(previous);
	});
	return out;
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
		holdCalls();
		capture();
		watchFirstPaint(document.getElementById("storybook-root") ?? document.body);
	},
	afterEach: async ({ tags }) => {
		const failures = await visit(tags.includes("state:loading"));
		// The sidebar's Data story alone: its hidden variants (`!dev`) are the
		// other modes and densities of the same reads.
		if (tags.includes("state:data") && tags.includes("dev"))
			failures.push(...(await perRead()));
		failures.push(...logged);
		release();
		// Soft: the test fails but the hooks after this one still run, so the a11y
		// addon's axe result lands in the same run. Hooks run last-listed first and
		// the addon throws, so the floors are listed after it and run before it.
		expect.soft(failures, "floors").toEqual([]);
	},
};

export default floors;
