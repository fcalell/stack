import { cn } from "@fcalell/ui-core/cn";
import {
	CONTENT_FRAME,
	lineBox,
	PROSE_DIFF_BODY,
	PROSE_DIFF_TEXT,
	proseDiffRun,
	skeleton,
	text,
} from "@fcalell/ui-core/variants";
import { diffWords } from "diff";
import type { ReactNode } from "react";
import type { Closed } from "../../lib/closed.ts";
import { useWords } from "../../lib/words.tsx";

const FRAME = "flex flex-col min-w-0 overflow-hidden";
const WAIT = "flex flex-col";
const LINE = "flex items-center h-lh";
// The run's kind, read aloud where its ground and its line cannot be seen.
const SPOKEN = "sr-only";
// The loading lines, each bar at the length of the line it stands in for.
const BARS = ["w-full", "w-full", "w-full", "w-1/2"] as const;

/** A text and its edit, word by word. */
export interface ProseDiffProps extends Closed {
	/** The text before the edit. */
	before: string;
	/** The text after it. */
	after: string;
	/** The text waits: four line boxes stand in for it. */
	loading?: boolean;
}

/** Body text at the measure in the frame Code and Diff share, its edit marked in place: a removed run struck through on danger-soft, an added run underlined on ok-soft, each named by its kind for assistive tech. */
export function ProseDiff({ before, after, loading }: ProseDiffProps) {
	const words = useWords();
	if (loading)
		return (
			<div aria-busy className={cn(CONTENT_FRAME, FRAME)}>
				<div className={PROSE_DIFF_BODY}>
					<div className={cn(lineBox({ role: "body" }), PROSE_DIFF_TEXT, WAIT)}>
						{BARS.map((width, index) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: the lines are fixed stand-ins
							<span key={index} className={LINE}>
								<span className={cn(skeleton({ kind: "line" }), width)} />
							</span>
						))}
					</div>
				</div>
			</div>
		);
	// A run marks its words alone, its edge whitespace standing outside it;
	// each run is keyed by where it starts in the two texts read together.
	const parts = diffWords(before, after);
	let at = 0;
	const runs: ReactNode[] = [];
	parts.forEach((part, index) => {
		const key = at;
		at += part.value.length;
		const lead = part.value.match(/^\s*/)?.[0] ?? "";
		const trail = part.value.slice(lead.length).match(/\s*$/)?.[0] ?? "";
		const marked = part.value.slice(
			lead.length,
			part.value.length - trail.length,
		);
		if ((!part.added && !part.removed) || !marked) {
			runs.push(part.value);
			return;
		}
		// A removed run and the added run beside it stand a space apart.
		const previous = parts[index - 1];
		const touching =
			previous !== undefined &&
			(previous.added || previous.removed) &&
			previous.added !== part.added &&
			!/\s$/.test(previous.value) &&
			!lead;
		runs.push(touching ? " " : lead);
		runs.push(
			part.removed ? (
				<del key={key} className={proseDiffRun({ kind: "removed" })}>
					<span className={SPOKEN}>{words.removed} </span>
					{marked}
				</del>
			) : (
				<ins key={key} className={proseDiffRun({ kind: "added" })}>
					<span className={SPOKEN}>{words.added} </span>
					{marked}
				</ins>
			),
		);
		runs.push(trail);
	});
	return (
		<div className={cn(CONTENT_FRAME, FRAME)}>
			<div className={PROSE_DIFF_BODY}>
				<p className={cn(text({ role: "body" }), PROSE_DIFF_TEXT)}>{runs}</p>
			</div>
		</div>
	);
}
