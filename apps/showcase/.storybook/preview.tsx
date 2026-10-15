import "../.stack/app.css";
import Providers from "virtual:stack-providers";
import type { Preview } from "@storybook/react-vite";

// Axe runs every rule on every story except the ones that judge a document as
// a whole (its landmarks, heading order, bypass blocks): a story is a frame,
// never the app's one document, and screen readers are not a target.
const DOCUMENT_RULES = [
	"bypass",
	"heading-order",
	"landmark-no-duplicate-banner",
	"landmark-no-duplicate-contentinfo",
	"landmark-no-duplicate-main",
	"landmark-one-main",
	"landmark-unique",
	"page-has-heading-one",
	"region",
	"skip-link",
];

// Axe judges a frame the viewer sees: a play that ends on a press has its
// state committed but not yet laid out and painted, and what a layout read
// decides (a scrolling region's tab stop) lands with the paint. The project's
// hook runs before the addon's, which run last-listed first.
const painted = () =>
	new Promise<void>((resolve) =>
		requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
	);

// The dev checks of plugin-api's acts (a mutation an act started without
// returning its promise, a failure nothing drew) log to `console.error`; a
// story that trips one fails, so a route or a story that wires an act wrong
// cannot pass.
const DEV_CHECK = /returned no promise|nothing drew its failure/;
const tripped: string[] = [];
const logged = console.error;

const preview: Preview = {
	beforeEach: () => {
		tripped.length = 0;
		console.error = (...args: unknown[]) => {
			if (typeof args[0] === "string" && DEV_CHECK.test(args[0]))
				tripped.push(args[0]);
			logged(...args);
		};
	},
	afterEach: async () => {
		await painted();
		console.error = logged;
		if (tripped.length) throw new Error(tripped.join("\n"));
	},
	// The test run is desktop density; touch is a toolbar toggle.
	initialGlobals: { density: "desktop" },
	globalTypes: {
		density: {
			description: "Density pin",
			toolbar: {
				title: "Density",
				items: ["desktop", "touch"],
				dynamicTitle: true,
			},
		},
	},
	decorators: [
		(Story, context) => {
			// Pinned before the story's first paint; a component's frames carry
			// their own mode.
			document.documentElement.dataset.density = String(
				context.globals.density,
			);
			return (
				<Providers>
					<Story />
				</Providers>
			);
		},
	],
	parameters: {
		a11y: {
			test: "error",
			config: {
				rules: DOCUMENT_RULES.map((id) => ({ id, enabled: false })),
			},
		},
	},
};

export default preview;
