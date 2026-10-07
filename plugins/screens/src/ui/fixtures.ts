import type { Procedure } from "@fcalell/plugin-api/types";

// The answers of an app's procedures, by the router's own shape: each
// procedure is optional (one without an answer shows as a gap, never a
// request), and each takes the procedure's input and returns its output, so
// a fixture that drifts from its procedure fails the type-check.
export type Fixtures<TRouter> = {
	[K in keyof TRouter]?: TRouter[K] extends Procedure<infer I, infer O>
		? (input: I) => O
		: TRouter[K] extends Record<string, unknown>
			? Fixtures<TRouter[K]>
			: never;
};

// An example value for each `$param` of the app's routes, by the param's name:
// a screen draws its route at the URL these fill in.
export type RouteParams = Record<string, string>;

export interface ScreenFixtures<TRouter> {
	procedures: Fixtures<TRouter>;
	params: RouteParams;
}

// The default export of the app's `src/app/fixtures.ts`:
//
//   export default defineFixtures<AppRouter>(
//     { projects: { list: () => [{ id: "p1", name: "Acme" }] } },
//     { projectId: "p1" },
//   );
export function defineFixtures<TRouter>(
	procedures: Fixtures<TRouter>,
	params: RouteParams = {},
): ScreenFixtures<TRouter> {
	return { procedures, params };
}
