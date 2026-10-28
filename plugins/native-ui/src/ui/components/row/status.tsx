import type { StatusMark } from "@fcalell/ui-core/descriptors";
import { STATUS_LABEL } from "@fcalell/ui-core/variants";
import { Text as RNText, View } from "react-native";
import { cn } from "../../lib/cn";
import { clipWhen, Painted, PaintText } from "../../lib/paint";
import { Strut } from "../../lib/strut";
import { useWords } from "../../lib/words";
import { StatusDot } from "../status/dot";

// The dot's lane: the dot beside a zero-width meta line, so it centres on the
// meta line's first line; the lane stands beside the line's marks and parts,
// so a line they wrap to starts under the word. In a row with a chip the lane
// and the word's line both take the chip's compact height, so the first line
// is that height whether the chip shares it or wraps under it, and the dot
// stays on the word's centre. The status passes a press through to the row.
const LANE = "flex-row items-center shrink-0";
const CHIP_LINE = "min-h-chip-compact";
const WORD = "shrink";
const WORD_LINE = "flex-row items-center shrink min-w-0";

/** A row's status dot (the spinner while `running`) in a lane of its own ahead of its meta line, which its word leads (`RowStatusWord`); `chip` when the row holds a chip, which may share that line's first line; `painted` is the dot's box while the status is not here. Outside the package's exports. */
export function RowStatusDot(props: {
	status: StatusMark;
	chip?: boolean;
	painted?: boolean;
}) {
	const { status, chip, painted } = props;
	return (
		<View pointerEvents="none" className={cn(LANE, chip && CHIP_LINE)}>
			<Strut role="meta" />
			{painted ? (
				<StatusDot tone="done" painted />
			) : (
				<StatusDot tone={status.tone} />
			)}
		</View>
	);
}

/** A row's status word at the start of its meta line, a given word too, or a word's filler while the status is not here; its dot stands in the lane before the line (`RowStatusDot`), and `chip` gives the word's line the chip's compact height, as the lane's. Outside the package's exports. */
export function RowStatusWord(props: {
	status: StatusMark;
	chip?: boolean;
	painted?: boolean;
}) {
	const word = <StatusWord {...props} />;
	return props.chip ? (
		<View pointerEvents="none" className={cn(WORD_LINE, CHIP_LINE)}>
			{word}
		</View>
	) : (
		word
	);
}

function StatusWord(props: { status: StatusMark; painted?: boolean }) {
	const { status, painted } = props;
	const words = useWords();
	if (painted)
		return (
			<PaintText
				fills="word"
				painted
				numberOfLines={1}
				{...clipWhen(true)}
				className={cn(STATUS_LABEL, WORD)}
			>
				<Painted role="word" />
			</PaintText>
		);
	// The word wraps between its words rather than being cut (voice 14).
	return (
		<RNText className={cn(STATUS_LABEL, WORD)}>
			{status.label ?? words[status.tone]}
		</RNText>
	);
}
