import type { Selection } from "@fcalell/plugin-api/tanstack-query";
import { isRead, useFrameRead } from "@fcalell/plugin-api/tanstack-query";
import type { Act } from "@fcalell/ui-core/descriptors";
import { frameOf } from "@fcalell/ui-core/read";
import type { ReactNode } from "react";
import { Button } from "../components/button/index.tsx";
import { MissingBase } from "../components/missing/base.tsx";
import { Spinner } from "../components/spinner/index.tsx";
import { Text } from "../components/text/index.tsx";
import { EmptyBase, type EmptyFit, type EmptyProps } from "./empty.tsx";
import { useWords } from "./words.tsx";

/** A frame's one subscription to its read (a root or a selection): the form it draws, its count, whether it refetches, whether it waits (a painted or idle read), whether it holds its read as the root (it draws its failure) and the retry. */
export function useFrame(read?: Selection<unknown>) {
	const { state, retry } = useFrameRead(read, frameOf);
	return {
		...state,
		waits: state.form === "waiting" || state.form === "still",
		holds: isRead(read),
		retry,
	};
}

export type Frame = ReturnType<typeof useFrame>;

/** What a frame draws in place of its body, or its body: the failed, missing and empty forms in the frame's `fit`; ready, waiting and idle are the loaded tree, its leaves painting. */
export function FrameBody(props: {
	frame: Frame;
	fit: EmptyFit;
	empty?: EmptyProps;
	failed?: string;
	children?: ReactNode;
}) {
	const { frame, fit, empty, failed, children } = props;
	const words = useWords();
	if (frame.form === "failed") {
		return (
			<EmptyBase
				fit={fit}
				tone="failed"
				sentence={failed ?? words.readFailed}
				act={{ label: words.retry, onAct: frame.retry, loading: frame.busy }}
			/>
		);
	}
	if (frame.form === "missing") return <MissingBase fit={fit} />;
	if (frame.form === "empty") {
		return (
			<EmptyBase
				fit={fit}
				tone="rest"
				{...{ sentence: words.readEmpty, ...empty }}
			/>
		);
	}
	return children;
}

// The mark fades in after `--wait-delay` like the paint does, so a refetch
// the server answers at once draws nothing a viewer sees; it stands in the
// heading's ink, the size of the glyphs beside it.
const BUSY = "inline-flex shrink-0 items-center text-ink-meta animate-paint";
// The line trails its heading row, so it carries the room under itself.
const LINE = "flex flex-wrap items-center gap-inside pb-inside";

/** A frame's busy mark, after its heading: a spinner while the root it holds refetches or retries, faded in after `WAIT_DELAY`. A selection holder and a frame with no heading draw none. */
export function BusyMark({ frame }: { frame: Frame }) {
	if (!(frame.holds && frame.busy)) return null;
	return (
		<span data-busy="" className={BUSY}>
			<Spinner />
		</span>
	);
}

/** One meta sentence with an optional quiet act after it: what a frame says in its head about its read's state. */
export function StateLine(props: { sentence: string; act?: Act }) {
	const { sentence, act } = props;
	return (
		<div className={LINE}>
			<Text role="meta">{sentence}</Text>
			{act ? (
				<Button
					act="quiet"
					fit="bar"
					label={act.label}
					onAct={act.onAct}
					loading={act.loading}
				/>
			) : null}
		</div>
	);
}

/** The line under a frame's heading row when its root holds data it could not refresh (stale, with Retry, pending while it runs) or waits for a connection (paused, nothing to press). */
export function FrameLine({ frame }: { frame: Frame }) {
	const words = useWords();
	if (!frame.holds) return null;
	if (frame.stale) {
		return (
			<StateLine
				sentence={words.readStale}
				act={{ label: words.retry, onAct: frame.retry, loading: frame.busy }}
			/>
		);
	}
	return frame.paused ? <StateLine sentence={words.readPaused} /> : null;
}
