import type { Preview } from "@storybook/react-vite";
import { page } from "vitest/browser";
import { HEIGHT, overflowError, WIDTHS } from "./overflow.ts";

// The checks a test run adds to every screen, as preview annotations the test
// run's Storybook config loads and the workbench never does: axe with every
// rule, no horizontal overflow at the rubric's widths, and no console output.

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

// The screen at each width, back at the size it started with.
async function overflow(): Promise<string[]> {
	const { innerWidth, innerHeight } = window;
	const failures: string[] = [];
	try {
		for (const width of WIDTHS) {
			await page.viewport(width, HEIGHT);
			await settle();
			const scrollWidth = Math.max(
				document.documentElement.scrollWidth,
				document.body.scrollWidth,
			);
			const failure = overflowError(width, scrollWidth, window.innerWidth);
			if (failure) failures.push(failure);
		}
	} finally {
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
	beforeEach: capture,
	afterEach: async () => {
		const failures = await overflow();
		failures.push(...logged);
		release();
		if (failures.length > 0) throw new Error(failures.join("\n"));
	},
};

export default floors;
