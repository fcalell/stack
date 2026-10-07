import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";
import { routeIndexer } from "./indexer.ts";

export interface ScreensMainOptions {
	// The routes directory, relative to the project root.
	routesDir: string;
}

// The Storybook config of `.stack/screens/main.ts`, run from the project root:
// the route files are its stories, the routes' indexer turns each into its
// states, and the host is Vite on the config the screens plugin derives.
export function screensMain({
	routesDir,
}: ScreensMainOptions): StorybookConfig {
	const root = process.cwd();
	return {
		stories: [join(root, routesDir, "**/*.{ts,tsx}")],
		addons: ["@storybook/addon-a11y"],
		framework: {
			name: "@storybook/react-vite",
			options: {
				builder: {
					viteConfigPath: join(root, ".stack", "screens.vite.config.ts"),
				},
			},
		},
		previewAnnotations: (entries = []) => [
			...entries,
			fileURLToPath(import.meta.resolve("@fcalell/plugin-screens/preview")),
		],
		experimental_indexers: async (indexers = []) => [routeIndexer, ...indexers],
	};
}
