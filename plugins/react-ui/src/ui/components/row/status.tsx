import type { StatusMark } from "@fcalell/ui-core/descriptors";
import type { Ref } from "react";
import { StatusBase } from "../status/base.tsx";

// The status stands in the row's end group, beside the value or under it: its
// word stands whole beside the text group's two fifths, or the dot stands alone.
const MARK = "flex min-w-0";

/** A row's status in its end group: the mark, or its dot alone, the word kept unseen for a screen reader (`bare`: the row's fold decides where the word does not fit; `word` is the box the row measures the word through),, or `painted` (the dot's box, and a word's filler unless `bare`) while the status is not here. Outside the package's exports. */
export function RowStatusMark(props: {
	status: StatusMark;
	bare?: boolean;
	word?: Ref<HTMLSpanElement>;
	painted?: boolean;
}) {
	const { status } = props;
	// Painted before anything reads the status: over a placeholder every key is there.
	if (props.painted)
		return (
			<span className={MARK}>
				<StatusBase painted bare={props.bare} />
			</span>
		);
	return (
		<span className={MARK}>
			<StatusBase
				tone={status.tone}
				label={status.label}
				bare={props.bare}
				word={props.word}
				compact
			/>
		</span>
	);
}
