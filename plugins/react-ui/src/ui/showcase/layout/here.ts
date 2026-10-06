import { createContext, use, useEffect, useState } from "react";
import type { QueryLike } from "../../components/query-boundary/index.tsx";
import { FIXTURE_MS } from "../pages.ts";
import type { View } from "../view.tsx";

// Where the review stands: the place the URL names, the Screen pushed over
// it, the record open in it,
// the file open in that record, the step that record opened beside it, and a
// query state forced for the review (`loading` waits, `error` fails once,
// `missing` answers not found, `empty` answers a collection with none); the
// view rides along on every link the page draws.
export interface Here {
	view: View;
	place: string;
	screen?: string;
	record?: string;
	file?: string;
	step?: string;
	query?: Forced;
}

const FORCED = ["loading", "error", "missing", "empty"] as const;
type Forced = (typeof FORCED)[number];

const isForced = (query: string | null): query is Forced =>
	FORCED.some((forced) => forced === query);

// What stack's procedures answer for a record that does not exist.
const NOT_FOUND = { code: "NOT_FOUND", status: 404 };

export const HereContext = createContext<Here>({
	view: { mode: "light", density: "desktop" },
	place: "deploys",
});

export function readHere(view: View): Here {
	const params = new URLSearchParams(location.search);
	const query = params.get("query");
	return {
		view,
		place: params.get("place") ?? "deploys",
		screen: params.get("screen") ?? undefined,
		record: params.get("record") ?? undefined,
		file: params.get("file") ?? undefined,
		step: params.get("step") ?? undefined,
		query: isForced(query) ? query : undefined,
	};
}

// A link inside the review, at the current view.
export function useTo(): (params: Record<string, string>) => string {
	const { view } = use(HereContext);
	return (params) =>
		`/layout?${new URLSearchParams({ ...params, mode: view.mode, density: view.density })}`;
}

export const act = () => {};

// A fixture's work: settles after a moment, so a pending act shows.
export const settle = (ms = 1200) =>
	new Promise<void>((done) => setTimeout(done, ms));

// Fixture data answered as a query does: pending a moment on mount and on
// every refetch; forced `loading` never answers, forced `error` fails until
// the first refetch, forced `missing` answers not found on every run, forced
// `empty` answers a collection with none of its items (a record answers whole,
// having no empty form).
export function useFixture<T>(data: T): QueryLike<T> {
	const { query } = use(HereContext);
	const [run, setRun] = useState(0);
	const [state, setState] = useState<"pending" | "error" | "done">("pending");
	useEffect(() => {
		setState("pending");
		if (query === "loading") return;
		const failed = query === "missing" || (query === "error" && run === 0);
		const timer = setTimeout(
			() => setState(failed ? "error" : "done"),
			FIXTURE_MS,
		);
		return () => clearTimeout(timer);
	}, [query, run]);
	const isError = state === "error";
	return {
		data: state === "done" ? answer(data, query) : undefined,
		isPending: state === "pending",
		isError,
		error: isError && query === "missing" ? NOT_FOUND : undefined,
		refetch: () => setRun((count) => count + 1),
	};
}

// What a settled fixture answers: forced `empty` drops a collection's items.
function answer<T>(data: T, query: Forced | undefined): T {
	if (query !== "empty" || !Array.isArray(data)) return data;
	// `data` is an array, so its empty slice is a `T` the narrowing cannot name.
	return data.slice(0, 0) as T;
}
