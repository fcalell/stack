import { type Read, read } from "@fcalell/plugin-api/tanstack-query";

// The reads a frame's showcase drawer hands a frame to show its waiting and
// failed forms: one that never answers, so the frame stays painted, and one
// that always rejects, so it draws its failure. No retry, so the failure
// shows at once.

/** A read whose query never resolves: its frame holds the painted form. */
export const waiting: Read<unknown> = read({
	queryKey: ["showcase", "waiting"],
	queryFn: () => new Promise<never>(() => {}),
});

/** A read whose query rejects: its frame draws the failed form. */
export const failing: Read<unknown> = read({
	queryKey: ["showcase", "failing"],
	queryFn: () => Promise.reject(new Error("The showcase read fails.")),
	retry: false,
});
