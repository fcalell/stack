import tailwindcss from "@tailwindcss/vite";
import { type UserConfig, defineConfig as viteDefineConfig } from "vite";
import solid from "vite-plugin-solid";

export interface StackConfig extends Omit<UserConfig, "plugins"> {
	plugins?: UserConfig["plugins"];
	apiProxy?: string | false;
}

export function defineConfig(config: StackConfig = {}): UserConfig {
	const {
		plugins = [],
		apiProxy = "http://localhost:8787",
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
		plugins: [solid(), tailwindcss(), ...plugins],
		server: {
			...server,
			...(proxy ? { proxy: { ...proxy, ...server?.proxy } } : {}),
		},
		...rest,
	});
}
