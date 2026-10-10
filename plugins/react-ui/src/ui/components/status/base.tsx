import { cn } from "@fcalell/ui-core/cn";
import type { StatusState } from "@fcalell/ui-core/tokens";
import {
	STATUS,
	STATUS_LABEL,
	skeleton,
	statusDot,
} from "@fcalell/ui-core/variants";
import type { Ref } from "react";
import { useWords } from "../../lib/words.tsx";
import { StatusDot } from "./dot.tsx";

const BOX = "inline-flex items-center min-w-0";
const WORD = "truncate";
// Waiting, the dot's and the word's skeletons fill what the status will.
const WAIT = "flex items-center grow min-w-0";
const DOT_WAIT = "shrink-0";
const WORD_WAIT = {
	third: "w-1/3",
	half: "w-1/2",
	short: "w-measure-short",
} as const;
// A row's status on its way: the bar stands where the word will, so the dot's
// room is kept unseen and the bar is a short label wide at most.
const DOT_ROOM = "invisible shrink-0";

/** What every status draws: the public `Status`, or its loading form a composer draws (a table's waiting status cell), the word's bar at a share of the cell. `short` is drawn in the word's place while `label` stays the name; `word` is the word's element, which a row measures. Outside the package's exports. */
export function StatusBase(
	props:
		| {
				state: StatusState;
				label?: string;
				short?: string;
				word?: Ref<HTMLSpanElement>;
				waiting?: never;
		  }
		| { waiting: keyof typeof WORD_WAIT },
) {
	const words = useWords();
	if (props.waiting)
		return (
			<span className={cn(STATUS, WAIT)}>
				<span
					className={
						props.waiting === "short"
							? cn(statusDot({ state: "done" }), DOT_ROOM)
							: cn(skeleton({ kind: "dot" }), DOT_WAIT)
					}
				/>
				<span
					className={cn(skeleton({ kind: "line" }), WORD_WAIT[props.waiting])}
				/>
			</span>
		);
	const label = props.label ?? words[props.state];
	return (
		<span className={cn(STATUS, BOX)}>
			<StatusDot state={props.state} />
			<span
				ref={props.word}
				aria-hidden={props.short === undefined ? undefined : true}
				className={cn(STATUS_LABEL, WORD)}
			>
				{props.short ?? label}
			</span>
			{props.short === undefined ? null : (
				<span className="sr-only">{label}</span>
			)}
		</span>
	);
}
