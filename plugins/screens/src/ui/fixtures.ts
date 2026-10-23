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

// The opening frame of each channel the app's screens read over plugin-node's
// socket, by the channel's name, the reply to its subscribe: the payload of its
// "snapshot" message, or `{ type, payload }` naming another server message
// (a channel that opens with `status`). `TSnapshots` types it (plugin-node's
// `Snapshots`).
export type ChannelFixtures<TSnapshots = Record<string, unknown>> = {
	[K in keyof TSnapshots]?: (params: RouteParams) => TSnapshots[K];
};

export interface ScreenFixtures<TRouter, TSnapshots = Record<string, unknown>> {
	procedures: Fixtures<TRouter>;
	params: RouteParams;
	channels: ChannelFixtures<TSnapshots>;
}

// The default export of the app's `src/app/fixtures.ts`:
//
//   export default defineFixtures<AppRouter>(
//     { projects: { list: () => [{ id: "p1", name: "Acme" }] } },
//     { projectId: "p1" },
//     { inbox: () => ({ items: [] }) },
//   );
export function defineFixtures<TRouter, TSnapshots = Record<string, unknown>>(
	procedures: Fixtures<TRouter>,
	params: RouteParams = {},
	channels: ChannelFixtures<TSnapshots> = {},
): ScreenFixtures<TRouter, TSnapshots> {
	return { procedures, params, channels };
}
