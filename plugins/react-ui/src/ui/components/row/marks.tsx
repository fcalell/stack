import { cn } from "@fcalell/ui-core/cn";
import type { RowMark } from "@fcalell/ui-core/descriptors";
import {
	ROW_FLAG,
	ROW_MARKS,
	ROW_RING,
	ROW_RING_FILLED,
	ROW_WARNING,
	text,
} from "@fcalell/ui-core/variants";
import { Painted } from "../../lib/paint.tsx";
import { Named } from "../button/glyph.tsx";
import { IconBase } from "../icon/index.tsx";

// A mark's glyph beside its label, the label truncating before the glyph does.
const MARK = "flex items-center min-w-icon-meta";
const GLYPH = "flex shrink-0";
const LABEL = "truncate";
// The glyph names the sentence on hover where its label is cut to nothing; on touch
// it stays passive and a press reaches the row.
const GLYPH_NAMED = "relative pointer-events-auto touch:pointer-events-none";

/** What is wrong, in a table's cell: a warn glyph and its sentence in the meta ink, the sentence truncating; `painted` while the sentence is not here, the glyph's box and a phrase's filler. A row's and a head's warning is a badge (`WarningBadge`). Outside the package's exports. */
export function WarningMark(props: { label: string; painted?: boolean }) {
	const glyph = (
		<span className={cn(ROW_WARNING, GLYPH, !props.painted && GLYPH_NAMED)}>
			<IconBase
				name="TriangleAlert"
				fit="meta"
				stroke="line"
				painted={props.painted}
			/>
		</span>
	);
	return (
		<span className={cn(ROW_MARKS, MARK)}>
			{props.painted ? glyph : <Named label={props.label}>{glyph}</Named>}
			<span className={cn(text({ role: "meta" }), LABEL)}>
				{props.painted ? <Painted role="phrase" /> : props.label}
			</span>
		</span>
	);
}

/** A boolean mark whose words are not drawn (`words: false`): its glyph alone, a row's end group's first item, named for assistive tech by its label and, on hover, by a tooltip; on touch it stays passive and a press reaches the row. Outside the package's exports. */
export function EndMark({ mark }: { mark: RowMark }) {
	const glyph =
		"ring" in mark ? (
			<span aria-hidden className={cn(ROW_RING, ROW_RING_FILLED)} />
		) : (
			<span aria-hidden className={cn(ROW_FLAG, GLYPH)}>
				<IconBase name={mark.flag} fit="meta" stroke="line" />
			</span>
		);
	return (
		<Named label={mark.label}>
			<span
				role="img"
				aria-label={mark.label}
				className={cn("flex items-center shrink-0", GLYPH_NAMED)}
			>
				{glyph}
			</span>
		</Named>
	);
}

/** Whether a boolean mark says a fact: a ring says one only while it holds. */
export function says(mark: RowMark): boolean {
	return !("ring" in mark) || mark.ring;
}

/** Whether a boolean mark draws no words: its glyph stands in the row's end group, its label the name. */
export function wordless(mark: RowMark): boolean {
	return mark.words === false;
}
