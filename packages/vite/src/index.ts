import type { FontEntry } from "@fcalell/ui/fonts-manifest";
import tailwindcss from "@tailwindcss/vite";
import type { Plugin, UserConfig } from "vite";
import solid from "vite-plugin-solid";
import { themeFontsPlugin } from "#plugins/theme-fonts";

export interface VitePresetOptions {
	fonts?: FontEntry[];
}

export function createBasePreset(opts: VitePresetOptions = {}): Plugin[] {
	return [solid(), ...tailwindcss(), themeFontsPlugin({ fonts: opts.fonts })];
}

export interface StackViteConfig extends Omit<UserConfig, "plugins"> {
	plugins?: UserConfig["plugins"];
	fonts?: FontEntry[];
}

export function defineConfig(config: StackViteConfig = {}): UserConfig {
	const { plugins = [], fonts, ...rest } = config;

	return {
		plugins: [...createBasePreset({ fonts }), ...plugins],
		...rest,
	};
}
