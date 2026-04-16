import type { PluginConfig } from "@fcalell/config";

export interface AppOptions {
	routes?: false | { pagesDir?: string };
	domain?: string;
}

export function app(options?: AppOptions): PluginConfig<"app", AppOptions> {
	return {
		__plugin: "app",
		options: options ?? {},
	};
}
