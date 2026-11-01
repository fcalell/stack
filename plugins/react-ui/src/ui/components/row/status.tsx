import { cn } from "@fcalell/ui-core/cn";
import type { StatusMark } from "@fcalell/ui-core/descriptors";
import { lineBox, STATUS_LABEL } from "@fcalell/ui-core/variants";
import { Painted } from "../../lib/paint.tsx";
import { useWords } from "../../lib/words.tsx";
import { StatusDot } from "../status/dot.tsx";

// The dot's lane: one facts line tall, the dot centred on it.
const LANE = "flex shrink-0 items-center h-[1lh]";
const WORD = "min-w-0 break-words";

/** The status dot (the spinner while `running`) of a room row whose only fact is its status: it stands at the start of the end group, before its word (`RowStatusWord`), which is no badge; a row's status among its facts is a badge (`StatusBadge`). `painted` is the dot's box while the status is not here. Outside the package's exports. */
export function RowStatusDot(props: { status: StatusMark; painted?: boolean }) {
	const { status, painted } = props;
	return (
		<span className={cn(lineBox({ role: "meta" }), LANE)}>
			{/* Painted before anything reads the status: over a placeholder every key is there. */}
			{painted ? (
				<StatusDot tone="done" painted />
			) : (
				<StatusDot tone={status.tone} />
			)}
		</span>
	);
}

/** The status word of a room row whose only fact is its status, in the end group after its dot (`RowStatusDot`), a given word too, or a word's filler while the status is not here. Outside the package's exports. */
export function RowStatusWord(props: {
	status: StatusMark;
	painted?: boolean;
}) {
	const { status, painted } = props;
	const words = useWords();
	return (
		<span className={cn(STATUS_LABEL, WORD)}>
			{painted ? <Painted role="word" /> : (status.label ?? words[status.tone])}
		</span>
	);
}
