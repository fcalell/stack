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
	// An infinite read fetching its next page: the frame is not busy for it.
	fetchingMore?: boolean;
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
		busy:
			fetching &&
			!r.fetchingMore &&
			phase !== "waiting" &&
			phase !== "idle" &&
			!streaming,
		stale: real && r.status === "error",
		more: real && r.hasNextPage === true,
		streaming,
		paused: r.fetchStatus === "paused",
	};
}

// What a frame (a Pane, Section, Sheet or Form) draws from: its non-quiet reads
// and the value its collection or leaf draws, painted or real. The form comes
// from every read; busy, stale and paused only from the `held` one, which draws
// them (a read an enclosing frame holds is drawn there). `more`: the drawn
// value is one page of several.
export interface Held {
	drawn?: { painted: boolean; value: unknown; more?: boolean };
	reads?: {
		result: ReadResult;
		missing: (e: unknown) => boolean;
		held: boolean;
	}[];
}

// ready: the loaded tree, its leaves real. waiting: the loaded tree, its
// leaves painted. still: the same, painted while the root is not asked for or
// waits for a connection, so nothing is coming yet. empty: the answer holds
// nothing. failed, missing: the read ended.
export type FrameForm =
	| "ready"
	| "waiting"
	| "still"
	| "empty"
	| "failed"
	| "missing";

export interface FrameState {
	form: FrameForm;
	// The length of a drawn list; undefined where none is drawn, while it waits
	// or stands still, and while more pages remain.
	count: number | undefined;
	// A refetch or a retry runs.
	busy: boolean;
	// A held read's: the last refetch failed, or it waits for a connection. False
	// for a frame that holds none.
	stale: boolean;
	paused: boolean;
}

// The frame's form from its reads, never from a value's change: only the
// form, the count and busy move it. The first read failed with no data ends the
// frame (failed, or missing by its own `missing`), held or not; busy, stale and
// paused are the held reads'; the frame stands still when any read is idle or
// paused with no data.
export function frameOf(held: Held): FrameState {
	const all = (held.reads ?? []).map((r) => readState(r.result, r.missing));
	const states = (held.reads ?? []).flatMap((r, i) =>
		r.held ? [all[i] as ReadState] : [],
	);
	const busy = states.some((s) => s.busy);
	const stale = states.some((s) => s.stale);
	const paused = states.some((s) => s.paused);
	const ended = all.find((s) => s.phase === "failed" || s.phase === "missing");
	if (ended) {
		return {
			form: ended.phase as FrameForm,
			count: undefined,
			busy,
			stale,
			paused,
		};
	}
	if (!held.drawn) {
		return { form: "ready", count: undefined, busy, stale, paused };
	}
	if (held.drawn.painted) {
		return {
			form: all.some((s) => s.phase === "idle" || s.paused)
				? "still"
				: "waiting",
			count: undefined,
			busy: false,
			stale: false,
			paused,
		};
	}
	const v = held.drawn.value;
	const more = held.drawn.more === true;
	const length = Array.isArray(v) ? v.length : undefined;
	return {
		form: (v == null || length === 0) && !more ? "empty" : "ready",
		count: more ? undefined : length,
		busy,
		stale,
		paused,
	};
}

// The turn an app writes into a conversation: none where nothing is being
// written, waiting for the first chunk, writing while chunks arrive, written
// once it settles, stopped where the stream failed (or a refresh of it did, the
// partial value kept). Waiting and stopped are the read's states, so a turn
// draws them only when it holds the read; under a frame that holds it, that
// frame says them once and the turn draws its value alone.
export type TurnForm = "none" | "waiting" | "writing" | "written" | "stopped";

export function turnOf(held: Held): { form: TurnForm; value: unknown } {
	// A painted selection holds a placeholder where its value would stand, and
	// a read that failed before it ever loaded is painted: no turn to keep.
	const value = held.drawn?.painted ? undefined : held.drawn?.value;
	const root = held.reads?.[0];
	const s = root && readState(root.result, root.missing);
	const holds = root?.held ?? true;
	if (s?.phase === "waiting") {
		return { form: holds ? "waiting" : "none", value };
	}
	if (s?.phase === "failed" || s?.phase === "missing") {
		if (holds) return { form: "stopped", value };
		return { form: value == null ? "none" : "written", value };
	}
	// A selection holder draws its value only, and a null one is no turn.
	if (value == null) return { form: "none", value };
	if (s?.stale && holds) return { form: "stopped", value };
	return { form: s?.streaming ? "writing" : "written", value };
}
