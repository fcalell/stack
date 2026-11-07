import type { RouterClient } from "@fcalell/plugin-api/client";

export {
	type ExtraControls,
	FIXTURE_PREFIX,
	fixtureControls,
	type ServeWorker,
} from "./controls.ts";

export interface ServeSeedContext<TRouter> {
	// The app's API client, signed in as the fixture member.
	client: RouterClient<TRouter>;
	// The origin the app is served at.
	url: string;
	// The run's scratch directory, removed when the run stops.
	dir: string;
	// GETs a path of the served app and answers its text: a control of `/fixture`
	// or an app's own.
	fx(path: string): Promise<string>;
}

export type ServeSeed<TRouter> = (
	context: ServeSeedContext<TRouter>,
) => void | Promise<void>;

// The default export of the app's `src/app/seed.ts`, which `stack screens serve`
// runs once the server answers:
//
//   export default defineServeSeed<AppRouter>(async ({ client }) => {
//     await client.projects.create({ name: "Acme" });
//   });
export function defineServeSeed<TRouter = unknown>(
	seed: ServeSeed<TRouter>,
): ServeSeed<TRouter> {
	return seed;
}
