import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";
import { writeStories } from "./roster.ts";
import { adaptStackConfig } from "./stack-vite.ts";

const config: StorybookConfig = {
	// The component and page modules are generated from the roster before
	// Storybook indexes them; the behaviour stories are written by hand.
	stories: async () => {
		writeStories();
		return ["../stories/*.stories.ts", "../behaviour/*.stories.tsx"];
	},
	addons: ["@storybook/addon-a11y", "@storybook/addon-vitest"],
	framework: {
		name: "@storybook/react-vite",
		options: {
			builder: {
				viteConfigPath: fileURLToPath(
					new URL("../.stack/vite.config.ts", import.meta.url),
				),
			},
		},
	},
	viteFinal: async (viteConfig) => adaptStackConfig(viteConfig),
};

export default config;
