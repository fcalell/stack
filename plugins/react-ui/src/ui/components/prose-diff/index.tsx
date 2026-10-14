import { type Datum, useSelections } from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import { PAINT_ROWS } from "@fcalell/ui-core/paint";
import {
	CONTENT_FRAME,
	PROSE_DIFF_BODY,
	PROSE_DIFF_TEXT,
	proseDiffRun,
	text,
} from "@fcalell/ui-core/variants";
import { diffWords } from "diff";
import { Fragment, type ReactNode, useMemo } from "react";
import type { Closed } from "../../lib/closed.ts";
import { Painted } from "../../lib/paint.tsx";

const FRAME = "flex flex-col shrink-0 min-w-0 overflow-hidden";

/** A text and its edit, word by word. */
export interface ProseDiffProps extends Closed {
	/** The text before the edit (text; wraps). A selection paints `PAINT_ROWS` lines until its read lands. */
	before: Datum<string>;
	/** The text after it (text; wraps). */
	after: Datum<string>;
}

/** Body text at the measure in the frame Code and Diff share, its edit marked in place: a removed run struck through on danger-soft, an added run underlined on ok-soft. */
export function ProseDiff({ before, after }: ProseDiffProps) {
	const [from, to] = useSelections([before, after] as const);
	const painted = from.painted || to.painted;
	// The runs derive once per text pair, and not while the text paints.
	const runs = useMemo(() => {
		if (painted) return [];
		// A run marks its words alone, its edge whitespace standing outside it;
		// each run is keyed by where it starts in the two texts read together.
		const parts = diffWords(from.value as string, to.value as string);
		let at = 0;
		const drawn: ReactNode[] = [];
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
				drawn.push(part.value);
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
			drawn.push(touching ? " " : lead);
			drawn.push(
				part.removed ? (
					<del key={key} className={proseDiffRun({ kind: "removed" })}>
						{marked}
					</del>
				) : (
					<ins key={key} className={proseDiffRun({ kind: "added" })}>
						{marked}
					</ins>
				),
			);
			drawn.push(trail);
		});
		return drawn;
	}, [painted, from.value, to.value]);
	if (painted)
		return (
			<div inert className={cn(CONTENT_FRAME, FRAME)}>
				<div className={PROSE_DIFF_BODY}>
					<p className={cn(text({ role: "body" }), PROSE_DIFF_TEXT)}>
						{Array.from({ length: PAINT_ROWS }, (_, at) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: the lines are fixed stand-ins
							<Fragment key={at}>
								{at > 0 ? <br /> : null}
								<Painted role="sentence" at={at} />
							</Fragment>
						))}
					</p>
				</div>
			</div>
		);
	return (
		<div className={cn(CONTENT_FRAME, FRAME)}>
			<div className={PROSE_DIFF_BODY}>
				<p className={cn(text({ role: "body" }), PROSE_DIFF_TEXT)}>{runs}</p>
			</div>
		</div>
	);
}
