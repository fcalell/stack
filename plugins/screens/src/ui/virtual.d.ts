declare module "virtual:stack-screens" {
	import type { AnyRoute } from "@tanstack/react-router";
	import type { RequestHandler } from "msw";
	import type { PreviewGlobal } from "../types.ts";
	import type { ScreenFixtures } from "./fixtures.ts";

	// The app's route tree.
	export const routeTree: AnyRoute;
	// The app's `src/app/fixtures.ts` default export; undefined without the file.
	export const fixtures: ScreenFixtures<never> | undefined;
	// The URL prefixes the worker owns.
	export const prefixes: string[];
	// The toolbar globals the app's plugins contribute.
	export const previewGlobals: PreviewGlobal[];
	// The handlers of the endpoints the app's plugins own.
	export const handlers: RequestHandler[];
	// What the app's entry calls with its router.
	export function bindRouter(router: unknown): void;
}

declare module "virtual:stack-providers" {
	import type { ReactNode } from "react";

	// The app's providers, composed by the web plugin.
	const Providers: (props: { children: ReactNode }) => ReactNode;
	export default Providers;
}
