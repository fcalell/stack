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

// A mark's glyph beside its label, the label truncating before the glyph
// does. In a row's meta line (`wraps`) the label wraps instead, its glyph on
// its first line, so the sentence is read whole at every width.
const MARK = "flex items-center min-w-icon-meta";
const MARK_WRAPS = "flex items-start min-w-0";
const GLYPH = "flex shrink-0";
const GLYPH_WRAPS = "flex shrink-0 items-center h-[1lh]";
const LABEL = "truncate";
const LABEL_WRAPS = "min-w-0 break-words";
// The glyph names the sentence on hover where its label is cut to nothing; on touch
// it stays passive and a press reaches the row.
const GLYPH_NAMED = "relative pointer-events-auto touch:pointer-events-none";

/** What is wrong with a row: a warn glyph and its sentence in the meta ink, the sentence wrapping where it `wraps` (a row's meta line) and truncating elsewhere (a cell); `painted` while the sentence is not here, the glyph's box and a phrase's filler. Outside the package's exports. */
export function WarningMark(props: {
	label: string;
	wraps?: boolean;
	painted?: boolean;
}) {
	const { wraps = false } = props;
	const glyph = (
		<span
			className={cn(
				ROW_WARNING,
				wraps ? GLYPH_WRAPS : GLYPH,
				!props.painted && GLYPH_NAMED,
			)}
		>
			<IconBase
				name="TriangleAlert"
				fit="meta"
				stroke="line"
				painted={props.painted}
			/>
		</span>
	);
	return (
		<span
			className={cn(
				ROW_MARKS,
				wraps ? cn(text({ role: "meta" }), MARK_WRAPS) : MARK,
			)}
		>
			{props.painted ? glyph : <Named label={props.label}>{glyph}</Named>}
			<span className={cn(text({ role: "meta" }), wraps ? LABEL_WRAPS : LABEL)}>
				{props.painted ? <Painted role="phrase" /> : props.label}
			</span>
		</span>
	);
}

// A boolean mark is its glyph and its label, the meta line's words: the
// required ring filled, or a flag glyph. A ring that does not hold says no
// fact, so the row draws none.
const BOOLEAN = "flex items-center min-w-0";

/** A row's boolean mark in its meta line: the required ring, filled, or a flag glyph, each beside its label. Outside the package's exports. */
export function BooleanMark({ mark }: { mark: RowMark }) {
	const glyph =
		"ring" in mark ? (
			<span aria-hidden className={cn(ROW_RING, ROW_RING_FILLED)} />
		) : (
			<span aria-hidden className={cn(ROW_FLAG, GLYPH)}>
				<IconBase name={mark.flag} fit="meta" stroke="line" />
			</span>
		);
	return (
		<span className={cn(ROW_MARKS, BOOLEAN)}>
			{glyph}
			<span className={cn(text({ role: "meta" }), LABEL)}>{mark.label}</span>
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
