import { previewGlobals } from "virtual:stack-screens";
import type { Preview } from "@storybook/react-vite";
import { expect, inject } from "vitest";
import { commands, page } from "vitest/browser";
import { HEIGHT, SHOT_MAX_HEIGHT, WIDTHS } from "../widths.ts";
import {
	called,
	failing,
	fixtureGaps,
	heldReads,
	holdCalls,
	release as releaseHold,
} from "./answer.ts";
import { fetchingReads } from "./busy.ts";
import { storyClient } from "./client.tsx";
import { unpinned } from "./globals.ts";
import { controlPoint, floorsAt, hiddenHeight, READ_BUSY } from "./page.ts";
import { compare, measure, type SectionBox } from "./shift.ts";
import { densityMark, settled, watchFirstPaint } from "./walk.ts";

// The checks a test run adds to every screen, as preview annotations the test
// run's Storybook config loads and the workbench never does: axe with every
// rule, no horizontal overflow at the rubric's widths, the render walk
// (`walk.ts`) at each, and no console output.

declare module "vitest" {
	interface ProvidedContext {
		// The widths the run visits, from the CLI's `--width`; none means all.
		screensWidths: number[];
		// The absolute directory `--shots` names; empty saves no screenshot.
		screensShots: string;
		// `--full`: a shot grows the page to all it holds, not the viewport.
		screensFull: boolean;
		// `--open`: the text of a control pressed once the story has drawn.
		screensOpen: string;
	}
}

// The input commands the screens browser provider adds (`src/node/provider.ts`).
declare module "vitest/browser" {
	interface BrowserCommands {
		press(x: number, y: number): Promise<void>;
		key(name: string): Promise<void>;
	}
}

const widths = (): number[] => {
	const asked = inject("screensWidths");
	return asked?.length ? asked : [...WIDTHS];
};

const slug = (text: string): string =>
	text
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.filter(Boolean)
		.join("-");

// Where a story's screenshot at a width goes, or null when the run saves none:
// `<dir>/<screen>/<story>-<width>.png`, the screen its title without
// `Screens/` and the story its name in kebab case (`Data, dark` is
// `data-dark`); the open pass adds `-open-<control>`.
function shotPath(
	title: string,
	name: string,
	width: number,
	opened?: string,
): string | null {
	const dir = inject("screensShots");
	if (!dir) return null;
	const screen = title.replace(/^Screens\//, "");
	return `${dir}/${screen}/${slug(name)}-${width}${opened ? `-open-${slug(opened)}` : ""}.png`;
}

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

// Storybook's test run pauses every animation once the story's play ends
// (`pauseAnimations`, which holds the ones running at their end), so an
// animation a part starts after that (a Canvas fading in once its layout has
// run) stays paused at its first frame, and a shot of it draws the part
// hidden. A finite paused animation is played forward to its end.
function finishPaused(): void {
	for (const animation of document.getAnimations()) {
		const end = animation.effect?.getComputedTiming().endTime ?? 0;
		// An endless one (a spinner, a shimmer) has no end to go to.
		if (animation.playState !== "paused" || !Number.isFinite(end)) continue;
		// The pause also reverses every animation, which would end it at its
		// first frame.
		animation.effect?.updateTiming({ direction: "normal" });
		animation.finish();
	}
}

async function settle(animations: boolean): Promise<void> {
	let last = "";
	let held = 0;
	for (let frames = 0; frames < MAX_FRAMES && held < STABLE_FRAMES; frames++) {
		await frame();
		const now = shape();
		held = now === last ? held + 1 : 0;
		last = now;
	}
	finishPaused();
	if (animations) await settled();
}

// Whether a read is still in flight or a region waits for one (a stream, which
// stays fetching while subscribed, is no wait). A failed read
// stays fetching through the client's retry and its delay, so a screen whose
// reads fail draws its failed form only once none is fetching.
const waiting = (): boolean =>
	document.querySelector(READ_BUSY) !== null ||
	fetchingReads(storyClient()) > 0;

// Once the reads are answered (held ones released): no read fetching, nothing
// busy, and the page settled. Holds for a few frames running, since a read can
// start the frame after another lands.
async function loaded(animations = true): Promise<string | undefined> {
	const end = performance.now() + LOAD_TIMEOUT;
	for (let held = 0; held < STABLE_FRAMES; ) {
		if (performance.now() > end)
			return `still busy: ${[...document.querySelectorAll(READ_BUSY)].map((e) => e.outerHTML.slice(0, 160)).join(" | ") || "a read still fetching"}`;
		await frame();
		held = waiting() ? 0 : held + 1;
	}
	await settle(animations);
	return undefined;
}

// Whether a read is still on its way that the run does not hold: a mutation, a
// frame route and a plugin's fixture answer at once, and what they bring draws
// a frame or several later. A query fetching is held on the story's state or
// it is on its way, so a count above the held calls is a read not yet landed.
const answering = (): boolean => fetchingReads(storyClient()) > heldReads();

// The waiting form of a loading story, once the reads the run does not hold
// have landed and drawn: the page the held ones leave waiting, never one
// caught between its first paint and what answers at once. Holds for a few
// frames running, since an answer that lands can start a read the frame after.
async function answered(): Promise<string | undefined> {
	const end = performance.now() + LOAD_TIMEOUT;
	for (let quiet = 0; quiet < STABLE_FRAMES; ) {
		if (performance.now() > end)
			return "a read the run does not hold is still fetching";
		await frame();
		quiet = answering() ? 0 : quiet + 1;
	}
	await settle(false);
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

// The shot at a width: the viewport, or with `--full` the whole screen, the
// viewport growing until no scroller hides anything (a taller viewport can
// reflow what it holds, so it is measured again). The next resize puts the
// height back.
async function shoot(
	pins: ReturnType<typeof unpin>,
	width: number,
	path: string,
): Promise<void> {
	let height = HEIGHT;
	let hidden = inject("screensFull") ? hiddenHeight() : 0;
	while (hidden > 0 && height < SHOT_MAX_HEIGHT) {
		height = Math.min(height + hidden, SHOT_MAX_HEIGHT);
		await page.viewport(width, height);
		pins.reread();
		await settle(false);
		hidden = hiddenHeight();
	}
	finishPaused();
	await page.screenshot({ path });
}

// `--open`: presses the control named `text` with real input, waits for what
// it opens to settle, judges and shoots the screen at `width` with it open,
// then closes it with Escape. The control must be there: a screen that does
// not draw it fails the run.
async function opened(
	pins: ReturnType<typeof unpin>,
	title: string,
	width: number,
	text: string,
	path: string | null,
): Promise<string[]> {
	const point = controlPoint(text);
	const at = `on ${title} at ${width}px`;
	if (!point) return [`--open: no control named "${text}" ${at}`];
	if (!point.ok)
		return [`--open: "${point.label}" is covered by ${point.hit} ${at}`];
	// The point is in this frame; the press is in the page that holds it.
	const frame = window.frameElement?.getBoundingClientRect();
	await commands.press(
		point.x + (frame?.left ?? 0),
		point.y + (frame?.top ?? 0),
	);
	await settle(true);
	const found = floorsAt(width, false).map(
		(line) => `with "${text}" open: ${line}`,
	);
	if (path) await shoot(pins, width, path);
	await commands.key("Escape");
	await settle(false);
	return found;
}

// The screen at each width, back at the size it started with: the horizontal
// overflow, then the walk once the width has settled. A loading story also
// has each width's Sections measured, its held calls answered, and the
// Sections measured again: they must not have moved (`shift.ts`). A
// screenshot at a width is taken once the floors there ran, so a loading
// story's shows its waiting form.
async function visit(
	loading: boolean,
	title: string,
	shot: (width: number, opened?: string) => string | null,
): Promise<string[]> {
	const failures: string[] = [];
	const shifts: string[] = [];
	const reports: string[] = [];
	const marks = new Map<number, string>();
	const waiting = new Map<number, SectionBox[]>();
	// A story that holds no calls judges and shoots the screen once its reads
	// have answered, a failed one after the client's retry.
	if (!loading) {
		const busy = await loaded();
		if (busy) failures.push(`settle: ${busy}`);
	}
	const pins = await withUnpinned(async (pins) => {
		for (const [index, width] of widths().entries()) {
			await resize(pins, width);
			if (loading) {
				const busy = await answered();
				if (busy) failures.push(`settle: ${busy}`);
				waiting.set(width, measure());
			}
			marks.set(width, densityMark());
			failures.push(...floorsAt(width, index === 0));
			const path = shot(width);
			if (path) await shoot(pins, width, path);
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
		const press = inject("screensOpen");
		if (press) {
			for (const width of widths()) {
				await resize(pins, width);
				failures.push(
					...(await opened(pins, title, width, press, shot(width, press))),
				);
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
	afterEach: async ({ tags, title, name }) => {
		const failures = await visit(
			tags.includes("state:loading"),
			title,
			(width, open) => shotPath(title, name, width, open),
		);
		// Read before the per-read run, whose resets fetch every read again.
		failures.push(...fixtureGaps());
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
