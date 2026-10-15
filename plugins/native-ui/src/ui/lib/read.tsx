import type { Selection } from "@fcalell/plugin-api/tanstack-query";
import {
	FrameHolds,
	useFrameRead,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import type { Act, MenuItem } from "@fcalell/ui-core/descriptors";
import { frameOf } from "@fcalell/ui-core/read";
import type { Words } from "@fcalell/ui-core/tokens";
import { text } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { Text as RNText, View } from "react-native";
import { ButtonBase } from "../components/button/base";
import { MissingBase } from "../components/missing/base";
import { Spinner } from "../components/spinner";
import { cn } from "./cn";
import { type Empty, EmptyBase, type EmptyFit } from "./empty";
import { useShown } from "./paint";
import { useWords } from "./words";

// A frame's one subscription to its read (a read or a selection): the form it
// draws (from its own selection's reads), its count, whether it refetches,
// whether it holds its read (it draws that read's busy, stale and paused
// flags), the hashes it and its ancestors hold (`held`, for its body to
// publish) and the retry.
export function useFrame(read?: Selection<unknown>) {
	const { state, retry, holding, holds: held } = useFrameRead(read, frameOf);
	return {
		...state,
		holds: holding,
		held,
		retry,
	};
}

export type Frame = ReturnType<typeof useFrame>;

// The reason an act stands blocked under once the read it depends on has
// ended (a frame's `form`, or a selection's `phase`): the failed sentence (the
// frame's own when it has one), or `words.missing`. None while the read waits,
// stands still or answered.
export function endedReason(
	words: Words,
	phase?: string,
	failed?: string,
): string | undefined {
	if (phase === "failed") return failed ?? words.readFailed;
	return phase === "missing" ? words.missing : undefined;
}

// The one blocked item a menu stands as while its read has ended: nothing
// can be taken from it, and its reason says why.
export function endedItems(words: Words, reason: string): readonly MenuItem[] {
	return [{ label: words.more, blocked: reason, onAct: () => {} }];
}

// What the bar that submits a frame's data takes from the frame's own read:
// whether its filled act paints (the read waits or stands still, so the bar
// keeps its loaded box) and the reason it stands blocked under (the read failed
// or is missing). A group's read is not the form's, so it never reaches the bar.
export function submitOf(words: Words, form: Frame["form"], failed?: string) {
	return {
		waiting: form === "waiting" || form === "still",
		ended: endedReason(words, form, failed),
	};
}

// The same for a bar whose frame stands elsewhere: a sheet's foot holds its
// form's bar, hoisted out of the form that owns the read.
export function useSubmitOf(read?: Selection<unknown>, failed?: string) {
	const words = useWords();
	const [one] = useSelections([read]);
	if (!one.painted) return { waiting: false, ended: undefined };
	const ended = endedReason(words, one.phase, failed);
	return { waiting: ended === undefined, ended };
}

// What a frame draws in place of its body, or its body: the failed, missing
// and empty forms in the frame's `fit`; ready, waiting and idle are the loaded
// tree, its leaves painting.
export function FrameBody(props: {
	frame: Frame;
	fit: EmptyFit;
	empty?: Empty;
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
	// The reads this frame holds are not drawn again by a frame in its body.
	return <FrameHolds holds={frame.held}>{children}</FrameHolds>;
}

// The trailing line carries the room under itself, as the web's does.
const LINE = "flex-row flex-wrap items-center gap-inside pb-inside";
// In a form's flow (a group, the form) the gap around it is the room.
const LINE_IN_FLOW = "flex-row flex-wrap items-center gap-inside";

// A frame's busy mark, after its heading: a spinner while a read it holds
// refetches or retries, shown after `WAIT_DELAY` so a refetch the server
// answers at once draws nothing. The spinner's ink is its place's, meta by
// default. A frame that holds no read and a frame with no heading draw none.
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

// The line under a frame's heading row when a read it holds has data it could not
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
