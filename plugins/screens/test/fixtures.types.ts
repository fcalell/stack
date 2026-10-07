import type { Procedure } from "@fcalell/plugin-api/types";
import { defineFixtures } from "../src/ui/fixtures.ts";

// `tsc` runs over this file in `pnpm check`: each `@ts-expect-error` line must
// be an error, so a fixture that drifts from its procedure fails the check.

interface Project {
	id: string;
	name: string;
}

type Router = {
	projects: {
		list: Procedure<undefined, Project[]>;
		get: Procedure<{ id: string }, Project>;
		create: Procedure<{ name: string }, Project>;
	};
	session: Procedure<undefined, { userId: string | null }>;
};

// A fixture of the procedure's shape, any procedure left out: no error.
defineFixtures<Router>({
	projects: {
		list: () => [{ id: "p1", name: "Acme" }],
		get: (input) => ({ id: input.id, name: "Acme" }),
	},
	session: () => ({ userId: null }),
});
defineFixtures<Router>({});

defineFixtures<Router>({
	projects: {
		// @ts-expect-error a project without its name
		list: () => [{ id: "p1" }],
	},
});

defineFixtures<Router>({
	projects: {
		// @ts-expect-error an output of another shape
		get: () => ({ id: 1, name: "Acme" }),
	},
});

defineFixtures<Router>({
	projects: {
		// @ts-expect-error reads an input field the procedure does not take
		get: (input) => ({ id: input.slug, name: "Acme" }),
	},
});

defineFixtures<Router>({
	// @ts-expect-error a procedure the router does not have
	billing: { list: () => [] },
});

// @ts-expect-error a procedure is a function, not a value
defineFixtures<Router>({ session: { userId: null } });

// An example value for a route param is a string.
defineFixtures<Router>({}, { id: "p1" });
// @ts-expect-error a param's example is a string
defineFixtures<Router>({}, { id: 1 });
