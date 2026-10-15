import type { Selection } from "@fcalell/plugin-api/tanstack-query";
import {
	isRead,
	useFrameRead,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import type { Act } from "@fcalell/ui-core/descriptors";
import { frameOf } from "@fcalell/ui-core/read";
import { text } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { Text as RNText, View } from "react-native";
import { ButtonBase } from "../components/button/base";
import { MissingBase } from "../components/missing/base";
import { Spinner } from "../components/spinner";
import { cn } from "./cn";
import { EmptyBase, type EmptyFit, type EmptyProps } from "./empty";
import { useShown } from "./paint";
import { useWords } from "./words";

// A frame's one subscription to its read (a root or a selection): the form it
// draws, its count, whether it refetches, whether it waits (a painted or idle
// read), whether it holds its read as the root (it draws its failure) and the
// retry.
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

const NO_READS: readonly undefined[] = [];

// The reads a form's fields hold: its own and each group's.
export function formReads(form: {
	read?: Selection<unknown>;
	groups?: readonly { read?: Selection<unknown> }[];
}): (Selection<unknown> | undefined)[] {
	return [form.read, ...(form.groups?.map((group) => group.read) ?? [])];
}

// Whether any of these reads waits, in one subscription: a holder that has no
// frame of its own (a form's bar) paints its acts, inert, while it does.
export function useWaits(
	reads: readonly (Selection<unknown> | undefined)[] = NO_READS,
): boolean {
	return useSelections(reads).some((drawn) => drawn.painted);
}

// What a frame draws in place of its body, or its body: the failed, missing
// and empty forms in the frame's `fit`; ready, waiting and idle are the loaded
// tree, its leaves painting.
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
				act={{ label: words.retry, onAct: frame.retry }}
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

// The trailing line carries the room under itself, as the web's does.
const LINE = "flex-row flex-wrap items-center gap-inside pb-inside";
// In a form's flow (a group, the form) the gap around it is the room.
const LINE_IN_FLOW = "flex-row flex-wrap items-center gap-inside";

// A frame's busy mark, after its heading: a spinner while the root it holds
// refetches or retries, shown after `WAIT_DELAY` so a refetch the server
// answers at once draws nothing. The spinner's ink is its place's, meta by
// default. A selection holder and a frame with no heading draw none.
export function BusyMark({ frame }: { frame: Frame }) {
	const busy = frame.holds && frame.busy;
	const shown = useShown(busy);
	return shown ? <Spinner /> : null;
}

// One meta sentence with an optional quiet act after it: what a frame says in
// its head about its read's state.
export function StateLine(props: {
	sentence: string;
	act?: Act;
	flow?: boolean;
}) {
	const { sentence, act, flow } = props;
	return (
		<View className={flow ? LINE_IN_FLOW : LINE}>
			<RNText className={cn(text({ role: "meta" }), "shrink")}>
				{sentence}
			</RNText>
			{act ? (
				<ButtonBase
					act="quiet"
					fit="bar"
					label={act.label}
					onAct={act.onAct}
					failed={act.failed}
				/>
			) : null}
		</View>
	);
}

// The line under a frame's heading row when its root holds data it could not
// refresh (stale, with Retry, pending while it runs) or waits for a connection
// (paused, nothing to press).
export function FrameLine({
	frame,
	flow,
}: {
	frame: Frame;
	// The line stands among a form's gapped children, which are its room.
	flow?: boolean;
}) {
	const words = useWords();
	if (!frame.holds) return null;
	if (frame.stale) {
		return (
			<StateLine
				flow={flow}
				sentence={words.readStale}
				act={{ label: words.retry, onAct: frame.retry }}
			/>
		);
	}
	return frame.paused ? (
		<StateLine flow={flow} sentence={words.readPaused} />
	) : null;
}
