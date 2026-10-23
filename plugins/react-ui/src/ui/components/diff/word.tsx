import {
	type Datum,
	paints,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import { PAINT_ROWS } from "@fcalell/ui-core/paint";
import {
	CARD,
	PROSE_DIFF_BODY,
	PROSE_DIFF_TEXT,
	proseDiffRun,
	text,
} from "@fcalell/ui-core/variants";
import { diffWords } from "diff";
import { Fragment, type ReactNode, useMemo } from "react";
import { Painted } from "../../lib/paint.tsx";

const FRAME = "flex flex-col shrink-0 min-w-0 overflow-hidden";

// Body text at the measure in the frame Code and Diff share, its edit marked in place: a removed run struck through on danger-soft, an added run underlined on ok-soft. `label` names the group.
export function WordDiff(props: {
	label: string;
	before: Datum<string>;
	after: Datum<string>;
}) {
	const { label, before, after } = props;
	const [from, to] = useSelections([before, after] as const);
	const painted = paints(from) || paints(to);
	// An ended read draws no text; the frame that holds it says why.
	const ended = from.painted || to.painted;
	// The runs derive once per text pair, and not while the text paints.
	const runs = useMemo(() => {
		if (ended) return [];
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
	}, [ended, from.value, to.value]);
	if (painted)
		return (
			<div inert className={cn(CARD, FRAME)}>
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
	if (ended) return null;
	return (
		// biome-ignore lint/a11y/useSemanticElements: a card holding one paragraph, no form group
		<div role="group" aria-label={label} className={cn(CARD, FRAME)}>
			<div className={PROSE_DIFF_BODY}>
				<p className={cn(text({ role: "body" }), PROSE_DIFF_TEXT)}>{runs}</p>
			</div>
		</div>
	);
}
