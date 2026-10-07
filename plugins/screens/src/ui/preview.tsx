import Providers from "virtual:stack-providers";
import { prefixes, previewGlobals } from "virtual:stack-screens";
import type { Preview } from "@storybook/react-vite";
import { mswLoader } from "msw-storybook-addon/csf3";
import { mustBeMocked } from "./answer.ts";
import { applyGlobals, globalTypes, initialGlobals } from "./globals.ts";

// The worker answers the app's procedures; a request outside it that reaches
// for the network is an error, not a silent call.
async function startWorker() {
	const { setupWorker } = await import("msw/browser");
	const worker = setupWorker();
	await worker.start({
		quiet: true,
		serviceWorker: { url: "/mockServiceWorker.js" },
		onUnhandledRequest(request, print) {
			if (mustBeMocked(request.url, location.origin, prefixes)) print.error();
		},
	});
	return worker;
}

const preview: Preview = {
	initialGlobals: initialGlobals(previewGlobals),
	globalTypes: globalTypes(previewGlobals),
	loaders: [mswLoader(startWorker)],
	decorators: [
		(Story, context) => {
			// What the plugins contribute (the design system's mode and density),
			// pinned on the root before the story's first paint.
			applyGlobals(document.documentElement, previewGlobals, context.globals);
			// Providers hold the query cache: a new one per story keeps one story's
			// answers from drawing the next.
			return (
				<Providers key={context.id}>
					<Story />
				</Providers>
			);
		},
	],
};

export default preview;
