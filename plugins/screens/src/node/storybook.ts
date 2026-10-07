import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";
import { STORIES_DIR } from "./stories.ts";

export interface ScreensMainOptions {
	// Also load the floors, the checks a test run adds to every screen.
	floors: boolean;
}

// The Storybook config of `.stack/screens/main.ts` and
// `.stack/screens-test/main.ts`, run from the project root: the story files
// `stack-screens/` holds are its stories, and the host is Vite on the config
// the screens plugin derives. `stories` is relative to the config directory,
// two levels under the root: the Vitest plugin joins it to that directory.
export function screensMain({ floors }: ScreensMainOptions): StorybookConfig {
	return {
		stories: [`../../${STORIES_DIR}/**/*.stories.ts`],
		addons: ["@storybook/addon-a11y"],
		framework: {
			name: "@storybook/react-vite",
			options: {
				builder: {
					viteConfigPath: join(
						process.cwd(),
						".stack",
						"screens.vite.config.ts",
					),
				},
			},
		},
		previewAnnotations: (entries = []) => [
			...entries,
			fileURLToPath(import.meta.resolve("@fcalell/plugin-screens/preview")),
			...(floors
				? [fileURLToPath(import.meta.resolve("@fcalell/plugin-screens/floors"))]
				: []),
		],
	};
}
