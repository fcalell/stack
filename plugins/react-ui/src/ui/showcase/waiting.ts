import { type Read, read } from "@fcalell/plugin-api/tanstack-query";

// The reads a frame's showcase drawer hands a frame to show each of its forms:
// one that never answers, so the frame stays painted, one that always rejects,
// so it draws its failure, one that rejects as not found, so it draws the
// missing form, one that answers nothing and one that answers rows. No retry,
// so a failure shows at once. A frame that holds a read as its root is the one
// holder of its query, so a drawer that draws several frames, or a page of
// frames, takes each its own set with `readsAt`.
export interface Reads {
	/** A read whose query never resolves: its frame holds the painted form. */
	waiting: Read<unknown>;
	/** A read whose query rejects: its frame draws the failed form. */
	failing: Read<unknown>;
	/** A read that answers not found: its frame draws the missing form. */
	missing: Read<unknown>;
	/** A read that answers no rows: its frame draws its empty form. */
	empty: Read<readonly string[]>;
	/** A read that answers rows: its frame draws the loaded tree and, for an array, its count. */
	ready: Read<readonly string[]>;
}

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
			() => true,
		),
		empty: read({
			queryKey: at("empty"),
			queryFn: () => Promise.resolve<readonly string[]>([]),
			staleTime: Number.POSITIVE_INFINITY,
		}),
		ready: read({
			queryKey: at("ready"),
			queryFn: () =>
				Promise.resolve<readonly string[]>([
					"Ana Ruiz",
					"Ben Kaya",
					"Ema Okafor",
				]),
			staleTime: Number.POSITIVE_INFINITY,
		}),
	};
	made.set(key, reads);
	return reads;
}

export const { waiting, failing, missing, empty, ready } = readsAt();
