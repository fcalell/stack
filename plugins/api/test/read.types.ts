import { skipToken } from "@tanstack/react-query";
import {
	type ApiQueryUtils,
	combine,
	type Drawn,
	type Held,
	isRead,
	type Read,
	type Selection,
	useDraft,
	useFrameRead,
	useSelections,
} from "../src/tanstack-query.tsx";
import type { Procedure } from "../src/types.ts";
import { assertType, type Equal } from "./types.ts";

// `tsc` runs over this file in `pnpm check`: a handle whose input or output
// drifts from the procedure's fails the check. Never called.

type Deploy = { id: string; commit: string; steps: string[] };
type Router = {
	deploys: {
		list: Procedure<
			{ team: string; cursor?: string },
			{ data: Deploy[]; nextCursor: string | null }
		>;
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

// `useFrameRead` hands `derive` a `Held` and returns what it derives.
export function useFrame() {
	const { state, retry } = useFrameRead(
		deploy,
		(held: Held) => held.drawn?.painted,
	);
	assertType<Equal<typeof state, boolean | undefined>>(true);
	assertType<Equal<typeof retry, () => Promise<unknown>>>(true);
	useFrameRead(undefined, () => 0);
	useFrameRead(commit, () => 0);
	// @ts-expect-error a constant is not a read
	useFrameRead("fixed", () => 0);
}

// `useDraft` carries a datum's type through, constants included.
export function useField() {
	const field = useDraft(commit);
	assertType<Equal<typeof field.value, string>>(true);
	field.change("next");
	// @ts-expect-error an edit is the datum's type
	field.change(1);
	assertType<Equal<typeof field.painted, boolean>>(true);
	const fixed = useDraft<string>("fixed");
	assertType<Equal<typeof fixed.value, string>>(true);
}

declare const unknownValue: unknown;
if (isRead(unknownValue))
	assertType<Equal<typeof unknownValue, Read<unknown>>>(true);

// `.pages` exists only on a procedure of the paginated envelope: the input
// loses `cursor`, and the value is the flat list.
const listed = utils.deploys.list.pages({ team: "a" });
assertType<Equal<typeof listed, Read<Deploy[]>>>(true);
utils.deploys.list.pages(skipToken);
// @ts-expect-error the cursor is the read's own
utils.deploys.list.pages({ team: "a", cursor: "c" });
// @ts-expect-error a procedure that does not page has no pages read
utils.deploys.get.pages({ id: "d1" });
