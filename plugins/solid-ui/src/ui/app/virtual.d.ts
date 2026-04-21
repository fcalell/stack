declare module "virtual:fcalell-routes" {
	import type { RouteDefinition } from "@solidjs/router";
	export const routes: RouteDefinition[];
	// biome-ignore lint/suspicious/noExplicitAny: typed routes shape is injected per-project via .stack/routes.d.ts
	export const typedRoutes: any;
}
