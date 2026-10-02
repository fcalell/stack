import { createContext, use, useEffect, useState } from "react";
import type { QueryLike } from "../../components/query-boundary/index.tsx";
import type { View } from "../view.tsx";

// Where the review stands: the place the URL names, the record open in it,
// and a query state forced for the review (`loading` waits, `error` fails
// once); the view rides along on every link the page draws.
export interface Here {
	view: View;
	place: string;
	record?: string;
	query?: "loading" | "error";
}

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
		record: params.get("record") ?? undefined,
		query: query === "loading" || query === "error" ? query : undefined,
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
// the first refetch.
export function useFixture<T>(data: T): QueryLike<T> {
	const { query } = use(HereContext);
	const [run, setRun] = useState(0);
	const [state, setState] = useState<"pending" | "error" | "done">("pending");
	useEffect(() => {
		setState("pending");
		if (query === "loading") return;
		const failed = query === "error" && run === 0;
		const timer = setTimeout(() => setState(failed ? "error" : "done"), 900);
		return () => clearTimeout(timer);
	}, [query, run]);
	return {
		data: state === "done" ? data : undefined,
		isPending: state === "pending",
		isError: state === "error",
		refetch: () => setRun((count) => count + 1),
	};
}
