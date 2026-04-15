import type { FontEntry } from "@fcalell/ui/fonts-manifest";
import tailwindcss from "@tailwindcss/vite";
import { type UserConfig, defineConfig as viteDefineConfig } from "vite";
import solid from "vite-plugin-solid";
import { appEntryPlugin } from "#plugins/app-entry";
import { type RoutesPluginOptions, routesPlugin } from "#plugins/routes";
import { themeFontsPlugin } from "#plugins/theme-fonts";

export interface StackConfig extends Omit<UserConfig, "plugins"> {
	plugins?: UserConfig["plugins"];
	apiProxy?: string | false;
	fonts?: FontEntry[];
	routes?: false | RoutesPluginOptions;
}

export function defineConfig(config: StackConfig = {}): UserConfig {
	const {
		plugins = [],
		apiProxy = "http://localhost:8787",
		fonts,
		routes,
		server,
		...rest
	} = config;

	const proxy =
		apiProxy !== false
			? {
					"/rpc": {
						target: apiProxy,
						changeOrigin: true,
					},
				}
			: undefined;

	return viteDefineConfig({
		plugins: [
			appEntryPlugin(),
			solid(),
			tailwindcss(),
			themeFontsPlugin({ fonts }),
			...(routes === false ? [] : [routesPlugin(routes)]),
			...plugins,
		],
		server: {
			...server,
			...(proxy ? { proxy: { ...proxy, ...server?.proxy } } : {}),
		},
		...rest,
	});
}
