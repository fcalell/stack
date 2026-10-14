import { skipToken } from "@tanstack/react-query";
import {
	type ApiQueryUtils,
	combine,
	type Drawn,
	type Read,
	type Selection,
	useSelections,
} from "../src/tanstack-query.tsx";
import type { Procedure } from "../src/types.ts";
import { assertType, type Equal } from "./types.ts";

// `tsc` runs over this file in `pnpm check`: a handle whose input or output
// drifts from the procedure's fails the check. Never called.

type Deploy = { id: string; commit: string; steps: string[] };
type Router = {
	deploys: {
		get: Procedure<{ id: string }, Deploy>;
		current: Procedure<undefined, Deploy | null>;
	};
};

declare const utils: ApiQueryUtils<Router>;

// Input and output come off the procedure.
const deploy = utils.deploys.get.read({ id: "d1" });
assertType<Equal<typeof deploy, Read<Deploy>>>(true);
const current = utils.deploys.current.read();
assertType<Equal<typeof current, Read<Deploy | null>>>(true);

// The input is required, and `skipToken` stands for it.
utils.deploys.get.read(skipToken);
// @ts-expect-error the input is required
utils.deploys.get.read();
// @ts-expect-error the input has the procedure's shape
utils.deploys.get.read({ id: 1 });
// @ts-expect-error a procedure with no input takes none
utils.deploys.current.read({ id: "d1" });

// The rest of oRPC's utils stay.
utils.deploys.get.queryOptions({ input: { id: "d1" } });

// `at` types the selection by the selector.
const commit = deploy.at((d) => d.commit);
assertType<Equal<typeof commit, Selection<string>>>(true);
const count = deploy.at((d) => d.steps).at((s) => s.length);
assertType<Equal<typeof count, Selection<number>>>(true);

// `combine` hands the function one value per selection, in order.
const both = combine([commit, current], (c, cur) => {
	assertType<Equal<typeof c, string>>(true);
	assertType<Equal<typeof cur, Deploy | null>>(true);
	return `${c}:${cur?.id}`;
});
assertType<Equal<typeof both, Selection<string>>>(true);

// `useSelections` draws each selection and carries each constant as given.
export function useLeaf() {
	const [title, label, n] = useSelections([commit, "fixed", 3] as const);
	assertType<Equal<typeof title, Drawn<string>>>(true);
	assertType<Equal<typeof label, Drawn<"fixed">>>(true);
	assertType<Equal<typeof n, Drawn<3>>>(true);

	// A painted value is never typed: only an unpainted one is.
	if (title.painted) assertType<Equal<typeof title.value, unknown>>(true);
	else assertType<Equal<typeof title.value, string>>(true);
}
