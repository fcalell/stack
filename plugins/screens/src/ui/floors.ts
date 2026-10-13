import { previewGlobals } from "virtual:stack-screens";
import type { Preview } from "@storybook/react-vite";
import { expect, inject } from "vitest";
import { page } from "vitest/browser";
import { HEIGHT, WIDTHS } from "../widths.ts";
import { overflowError } from "./overflow.ts";
import { findings, format, watchFirstPaint } from "./walk.ts";

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
// (a media query hook, a resize observer) follows it.
const settle = () =>
	new Promise<void>((resolve) =>
		requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
	);

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
// touch set, a laptop the desktop one); returns the pins put back.
function unpin(): () => void {
	const root = document.documentElement;
	const pins = previewGlobals.flatMap((global) =>
		global.byViewport && "attribute" in global.apply
			? [[global.apply.attribute, root.getAttribute(global.apply.attribute)]]
			: [],
	);
	for (const [attribute] of pins) root.removeAttribute(attribute as string);
	return () => {
		for (const [attribute, value] of pins) {
			if (value !== null) root.setAttribute(attribute as string, value);
		}
	};
}

// The screen at each width, back at the size it started with: the horizontal
// overflow, then the walk once the width has settled.
async function visit(): Promise<string[]> {
	const { innerWidth, innerHeight } = window;
	const failures: string[] = [];
	const repin = unpin();
	try {
		for (const [index, width] of widths().entries()) {
			await page.viewport(width, HEIGHT);
			await settle();
			const scrollWidth = Math.max(
				document.documentElement.scrollWidth,
				document.body.scrollWidth,
			);
			const failure = overflowError(width, scrollWidth, window.innerWidth);
			if (failure) failures.push(failure);
			failures.push(
				...format(findings({ fonts: index === 0 })).map(
					(line) => `at ${width}px, ${line}`,
				),
			);
		}
	} finally {
		repin();
		await page.viewport(innerWidth, innerHeight);
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
