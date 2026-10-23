import { cn } from "@fcalell/ui-core/cn";
import type { StatusMark } from "@fcalell/ui-core/descriptors";
import type { Ref } from "react";
import { useWords } from "../../lib/words.tsx";
import { Named } from "../button/glyph.tsx";
import { StatusBase } from "../status/base.tsx";

// The status stands in the row's end group, beside the value or under it: its
// word stands whole beside the text group's two fifths, or the dot stands alone.
const MARK = "flex min-w-0";
// A dot alone lets the pointer rest on it for its word (the row's marks are
// passive otherwise), standing above the row's hit; on touch, where the word
// shows nowhere, it stays passive and a press reaches the row.
const NAMED = "relative pointer-events-auto touch:pointer-events-none";

/** A row's status in its end group: the mark, or its dot alone, the word kept unseen for a screen reader and shown as a tooltip under the pointer (`bare`: the row's fold decides where the word does not fit; `word` is the box the row measures the word through), or `painted` (the dot's box, and a word's filler unless `bare`) while the status is not here. Outside the package's exports. */
export function RowStatusMark(props: {
	status: StatusMark;
	bare?: boolean;
	word?: Ref<HTMLSpanElement>;
	painted?: boolean;
}) {
	const { status, painted } = props;
	const words = useWords();
	// Painted before anything reads the status: over a placeholder every key is there.
	const mark = painted ? (
		<StatusBase painted bare={props.bare} />
	) : (
		<StatusBase
			tone={status.tone}
			label={status.label}
			bare={props.bare}
			word={props.word}
			compact
		/>
	);
	// The word the dot left out is the tooltip: the same word the whole status
	// draws, so a dot never says less than a pill does. The mark keeps its place
	// in the tree whether the row's fold draws the word or not, and whether it is
	// painted, so the fold's measure reads the same box in every form.
	const named = !painted && props.bare;
	return (
		<Named
			label={named ? (status.label ?? words[status.tone]) : ""}
			off={!named}
		>
			<span className={cn(MARK, named && NAMED)}>{mark}</span>
		</Named>
	);
}
