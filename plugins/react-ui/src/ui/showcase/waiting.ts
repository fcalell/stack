import { type Read, read } from "@fcalell/plugin-api/tanstack-query";
import type { ShowcaseFrame } from "./cells.ts";

// The reads a frame's showcase drawer hands a frame to show each of its forms:
// one that never answers, so the frame stays painted, one that always rejects,
// so it draws its failure, one that rejects as not found, so it draws the
// missing form, one that answers nothing, one that answers rows and three that
// hold rows and are busy, stale or paused. No retry, so a failure shows at
// once. A frame that holds a read as its root is the one
// holder of its query, so a drawer that draws several frames, or a page of
// frames, takes each its own set with `readsAt`.
export interface Reads {
	/** A read whose query never resolves: its frame holds the painted form. */
	waiting: Read<readonly string[]>;
	/** A read whose query rejects: its frame draws the failed form. */
	failing: Read<readonly string[]>;
	/** A read that answers not found: its frame draws the missing form. */
	missing: Read<readonly string[]>;
	/** A read that answers no rows: its frame draws its empty form. */
	empty: Read<readonly string[]>;
	/** A read that answers rows and refetches without end: its frame draws the loaded tree and its busy mark. */
	busy: Read<readonly string[]>;
	/** A read whose refetch failed over rows it holds: its frame draws the loaded tree and its stale line. */
	stale: Read<readonly string[]>;
	/** A read that holds rows and waits for a connection: its frame draws the loaded tree and its paused line. */
	paused: Read<readonly string[]>;
	/** A read that answers rows: its frame draws the loaded tree and, for an array, its count. */
	ready: Read<readonly string[]>;
}

/** The states that hold rows beside a line or a mark of their read's. */
export type HeldState = "busy" | "stale" | "paused";

export const isHeld = (state: string): state is HeldState =>
	state === "busy" || state === "stale" || state === "paused";

const ROWS: readonly string[] = ["Ana Ruiz", "Ben Kaya", "Ema Okafor"];

const made = new Map<string, Reads>();

/** The set of reads under `key`, the same set for the same key. */
export function readsAt(key = ""): Reads {
	const held = made.get(key);
	if (held) return held;
	const at = (name: string) => ["showcase", key, name];
	const reads: Reads = {
		waiting: read({
			queryKey: at("waiting"),
			queryFn: () => new Promise<never>(() => {}),
		}),
		failing: read({
			queryKey: at("failing"),
			queryFn: () => Promise.reject(new Error("The showcase read fails.")),
			retry: false,
		}),
		missing: read(
			{
				queryKey: at("missing"),
				queryFn: () => Promise.reject(new Error("The showcase read is gone.")),
				retry: false,
			},
			{ missing: () => true },
		),
		empty: read({
			queryKey: at("empty"),
			queryFn: () => Promise.resolve<readonly string[]>([]),
			staleTime: Number.POSITIVE_INFINITY,
		}),
		ready: read({
			queryKey: at("ready"),
			queryFn: () => Promise.resolve(ROWS),
			staleTime: Number.POSITIVE_INFINITY,
		}),
		// The three below hold rows from the start and are stale at once, so
		// mounting refetches: the first never answers, the second fails, the
		// third is parked as a lost connection parks a fetch.
		busy: read({
			queryKey: at("busy"),
			queryFn: () => new Promise<never>(() => {}),
			initialData: ROWS,
			staleTime: 0,
		}),
		stale: read({
			queryKey: at("stale"),
			queryFn: () => Promise.reject(new Error("The showcase refetch fails.")),
			initialData: ROWS,
			staleTime: 0,
			retry: false,
		}),
		paused: read({
			queryKey: at("paused"),
			queryFn: ({ client, queryKey }) => {
				client.getQueryCache().find({ queryKey })?.setState({
					fetchStatus: "paused",
				});
				return new Promise<never>(() => {});
			},
			initialData: ROWS,
			staleTime: 0,
		}),
	};
	made.set(key, reads);
	return reads;
}

export const { waiting, failing, missing, empty, ready } = readsAt();

/** A text that never arrives: a leaf given it stays painted. */
export const waitingText = waiting.at(() => "");

const itemed = new Map<string, Read<readonly unknown[]>>();

/** A read in a frame's state of `items`: it answers them at rest and none when empty, never answers while loading and rejects in error. The same read for the same key; a frame that holds it as its root is its one holder, so each takes its own key. */
export function itemsAt<T>(
	key: string,
	state: ShowcaseFrame["state"],
	items: readonly T[],
): Read<readonly T[]> {
	const held = itemed.get(key);
	if (held) return held as Read<readonly T[]>;
	const made = read({
		queryKey: ["showcase", key, "items"],
		queryFn: (): Promise<readonly T[]> => {
			if (state === "loading") return new Promise<never>(() => {});
			if (state === "error")
				return Promise.reject(new Error("The showcase read fails."));
			return Promise.resolve(state === "empty" ? [] : items);
		},
		staleTime: Number.POSITIVE_INFINITY,
		retry: false,
	});
	itemed.set(key, made);
	return made;
}

export type MoreState = "next" | "fetching" | "failed";

const paged = new Map<string, Read<readonly unknown[]>>();

/** A pages read that holds `rows` as its first page with another after it: the next page answers nothing, so it loads for good ("fetching"), fails ("failed"), or is not asked for ("next", where "Show more" stands). The same read for the same key; a frame that holds it as its root is its one holder, so each takes its own key. */
export function pagesAt<T>(
	key: string,
	how: MoreState,
	rows: readonly T[],
): Read<readonly T[]> {
	const held = paged.get(key);
	if (held) return held as Read<readonly T[]>;
	const made = read<readonly T[]>(
		{
			queryKey: ["showcase", key, "pages"],
			queryFn: ({ pageParam }: { pageParam?: string }) => {
				if (pageParam === undefined)
					return Promise.resolve({ data: rows, nextCursor: "1" });
				if (how === "failed")
					return Promise.reject(new Error("The showcase next page fails."));
				return new Promise<never>(() => {});
			},
			initialPageParam: undefined,
			getNextPageParam: (last: { nextCursor: string | null }) =>
				last.nextCursor ?? undefined,
			staleTime: Number.POSITIVE_INFINITY,
			retry: false,
		} as never,
		{ kind: "pages" },
	);
	paged.set(key, made);
	return made;
}
