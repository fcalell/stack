// The plugin's own stand-in for `virtual:fcalell-routes`, for its type-check
// alone: a consumer's is the generated `.stack/routes.d.ts`. Kept out of
// `src/` and unpublished, since a consumer compiles `src/ui` and a second
// declaration there, loaded first and exempt under `skipLibCheck`, would type
// every builder `any`.
declare module "virtual:fcalell-routes" {
	import type { RouteDefinition } from "@solidjs/router";
	export const routes: RouteDefinition[];
	// biome-ignore lint/suspicious/noExplicitAny: a consumer's shape comes from its pages
	export const typedRoutes: any;
}
