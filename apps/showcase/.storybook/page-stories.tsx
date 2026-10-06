import { LayoutPage } from "@fcalell/plugin-react-ui/showcase/layout";
import {
	FIXTURE_MS,
	type ShowcasePage,
} from "@fcalell/plugin-react-ui/showcase/pages";
import type { StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";

// A page is judged as the document it is: every axe rule runs, the page-level
// ones included, over the whole document (`html`), and `region`, which
// Storybook switches off, is back on.
const PAGE_A11Y = {
	context: "html",
	config: { rules: [{ id: "region", enabled: true }] },
};

// One page of the `/layout` app in one mode, at the toolbar's density, with
// its fixture queries answered before the page is judged.
export function pageStory(
	here: Omit<ShowcasePage, "name">,
	mode: "light" | "dark",
): StoryObj {
	return {
		parameters: { layout: "fullscreen", mode, a11y: PAGE_A11Y },
		render: (_args, context) => (
			<LayoutPage
				here={{
					...here,
					view: {
						mode,
						density: context.globals.density === "touch" ? "touch" : "desktop",
					},
				}}
			/>
		),
		play: async () => {
			await new Promise((done) => setTimeout(done, FIXTURE_MS + 300));
			await waitFor(() =>
				expect(document.querySelector('[aria-busy="true"]')).toBeNull(),
			);
		},
	};
}
