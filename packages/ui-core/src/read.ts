// What a read is at this moment, free of any framework: both platforms derive
// one phase and the flags beside it from the same few fields of a query's
// result, and the derivation is tested without rendering. A result of
// TanStack's `useQuery` satisfies `ReadResult`, but ui-core names only the
// fields it reads, so it imports neither TanStack nor React.

export interface ReadResult {
	status: "pending" | "success" | "error";
	fetchStatus: "fetching" | "paused" | "idle";
	// False while the read is not asked for (`enabled: false`, `skipToken`).
	isEnabled: boolean;
	// The data is the placeholder's, not an answer.
	isPlaceholderData: boolean;
	// An error with data: a refetch failed, the last answer stands.
	isRefetchError: boolean;
	error: unknown;
	// An infinite read.
	hasNextPage?: boolean;
	// Supplied from the handle: the read is a stream still writing.
	streamed?: boolean;
}

// idle: not asked for yet. waiting: asked for, no answer. ready: real data.
// failed: no data and the read failed. missing: failed with not found.
export type ReadPhase = "idle" | "waiting" | "ready" | "failed" | "missing";

export interface ReadState {
	phase: ReadPhase;
	// Ready and refetching, or failed and retrying: never a flip back to waiting.
	busy: boolean;
	// Ready, and the last refetch failed.
	stale: boolean;
	// An infinite read with a next page.
	more: boolean;
	// A streamed read still writing.
	streaming: boolean;
	// The read waits for a connection.
	paused: boolean;
}

// `isMissing` is the handle's: it knows its error type, so no shape is
// guessed here.
export function readState(
	r: ReadResult,
	isMissing: (error: unknown) => boolean,
): ReadState {
	// A placeholder reports `success`, so it is not data; a refetch error is.
	const real =
		r.status === "error"
			? r.isRefetchError
			: r.status === "success" && !r.isPlaceholderData;
	let phase: ReadPhase;
	if (real) phase = "ready";
	else if (r.status === "error")
		phase = isMissing(r.error) ? "missing" : "failed";
	else phase = r.isEnabled ? "waiting" : "idle";
	const fetching = r.fetchStatus === "fetching";
	const streaming = real && fetching && r.streamed === true;
	return {
		phase,
		busy: fetching && phase !== "waiting" && phase !== "idle" && !streaming,
		stale: real && r.status === "error",
		more: real && r.hasNextPage === true,
		streaming,
		paused: r.fetchStatus === "paused",
	};
}
