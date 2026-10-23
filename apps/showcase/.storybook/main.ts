import { fileURLToPath } from "node:url";
import { writeStorybookConfig } from "@fcalell/plugin-screens/node";
import type { StorybookConfig } from "@storybook/react-vite";
import { mergeConfig } from "vite";
import stackConfig from "../stack.config.ts";
import { writeStories } from "./roster.ts";
import { rosterPlugin } from "./roster-plugin.ts";

const config: StorybookConfig = {
	// The component modules are generated from the roster before Storybook
	// indexes them.
	stories: async () => {
		writeStories();
		return ["../stories/*.stories.ts"];
	},
	framework: {
		name: "@storybook/react-vite",
		options: {
			// The app's own Vite config for a Storybook that draws components, from
			// the slots it renders from.
			builder: {
				viteConfigPath: await writeStorybookConfig({
					config: stackConfig,
					cwd: fileURLToPath(new URL("..", import.meta.url)),
				}),
			},
		},
	},
	viteFinal: (viteConfig) =>
		mergeConfig(viteConfig, { plugins: [rosterPlugin()] }),
};

export default config;
