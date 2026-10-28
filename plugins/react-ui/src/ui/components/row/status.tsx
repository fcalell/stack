import { cn } from "@fcalell/ui-core/cn";
import type { StatusMark } from "@fcalell/ui-core/descriptors";
import { lineBox, STATUS_LABEL } from "@fcalell/ui-core/variants";
import { Painted } from "../../lib/paint.tsx";
import { useWords } from "../../lib/words.tsx";
import { StatusDot } from "../status/dot.tsx";

// The dot's lane: one meta line tall, the dot centred on it; the lane stands
// beside the line's marks and parts, so a line they wrap to starts under the
// word. In a row with a chip the lane and the word's line both take the
// chip's compact height, so the first line is that height whether the chip
// shares it or wraps under it, and the dot stays on the word's centre.
const LANE = "flex shrink-0 items-center h-[1lh]";
const CHIP_LINE = "min-h-chip-compact";
// The word wraps whole to the meta line's next line before it is cut, and
// longer than the line it wraps between its words (voice 14: a row's meta
// takes two lines rather than truncate).
const WORD = "min-w-0 break-words";
const WORD_LINE = "flex items-center min-w-0";

/** A row's status dot (the spinner while `running`) in a lane of its own ahead of its meta line, which its word leads (`RowStatusWord`); `chip` when the row holds a chip, which may share that line's first line; `painted` is the dot's box while the status is not here. Outside the package's exports. */
export function RowStatusDot(props: {
	status: StatusMark;
	chip?: boolean;
	painted?: boolean;
}) {
	const { status, chip, painted } = props;
	return (
		<span className={cn(lineBox({ role: "meta" }), LANE, chip && CHIP_LINE)}>
			{/* Painted before anything reads the status: over a placeholder every key is there. */}
			{painted ? (
				<StatusDot tone="done" painted />
			) : (
				<StatusDot tone={status.tone} />
			)}
		</span>
	);
}

/** A row's status word at the start of its meta line, a given word too, or a word's filler while the status is not here; its dot stands in the lane before the line (`RowStatusDot`), and `chip` gives the word's line the chip's compact height, as the lane's. Outside the package's exports. */
export function RowStatusWord(props: {
	status: StatusMark;
	chip?: boolean;
	painted?: boolean;
}) {
	const { status, chip, painted } = props;
	const words = useWords();
	const word = (
		<span className={cn(STATUS_LABEL, WORD)}>
			{painted ? <Painted role="word" /> : (status.label ?? words[status.tone])}
		</span>
	);
	return chip ? <span className={cn(WORD_LINE, CHIP_LINE)}>{word}</span> : word;
}
