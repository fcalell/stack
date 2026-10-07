import "../.stack/app.css";
import Providers from "virtual:stack-providers";
import type { Preview } from "@storybook/react-vite";

// Axe runs every rule on every story except the ones that judge a document as
// a whole (its landmarks, heading order, bypass blocks): a story is a frame or
// a page, never the app's one document, and screen readers are not a target.
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

const preview: Preview = {
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
			// Pinned before the story's first paint, as the app's pages pin it. A
			// page story names its mode; a component's frames carry their own.
			const root = document.documentElement;
			root.dataset.density = String(context.globals.density);
			root.classList.toggle("dark", context.parameters.mode === "dark");
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
