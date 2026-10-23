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
import type { ReactNode } from "react";
import { Painted } from "../../lib/paint.tsx";
import { Named } from "../button/glyph.tsx";
import { IconBase } from "../icon/index.tsx";

// A mark's glyph beside its label, the label truncating before the glyph
// does. A row's meta line yields from the end: the chip, then the lock's
// label, then the warning's, then the first meta part; a mark never shrinks
// below its glyph. The shrink weights are the order, ten million apart
// (`./index.tsx` sets out why): this one stands above the first part's and
// below the lock's.
const MARK = "flex items-center min-w-icon-meta shrink-10000000";
const GLYPH = "flex shrink-0";
const LABEL = "truncate";
// The glyph names the sentence on hover where its label is cut to nothing; on touch
// it stays passive and a press reaches the row.
const GLYPH_NAMED = "relative pointer-events-auto touch:pointer-events-none";

/** What is wrong with a row: a warn glyph and its sentence in the meta ink; `painted` while the sentence is not here, the glyph's box and a phrase's filler. Outside the package's exports. */
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

// Beside the text group's floor a mark stands whole in a slot of its own
// (`useMarksFold` decides how many stand). The first gives way last, only where
// it alone is wider than the room; a folded one is not drawn: out of the flow
// and unseen, whole as it is, so it is measured and stays in the row's content
// for a screen reader.
const SLOT = "flex shrink-0";
const SLOT_FIRST = "flex min-w-0";
const SLOT_FOLDED = "absolute end-0 flex w-max opacity-0 pointer-events-none";

/** The slot of the mark at place `at` of a row's marks, of which `shown` stand. Outside the package's exports. */
export function MarkSlot(props: {
	at: number;
	shown: number;
	order: string;
	/** The mark keeps its whole width wherever it stands (a chip). */
	whole?: boolean;
	children: ReactNode;
}) {
	const { at, shown, order, whole, children } = props;
	let form = SLOT;
	if (at >= shown) form = SLOT_FOLDED;
	else if (at === 0 && !whole) form = SLOT_FIRST;
	return <span className={cn(form, order)}>{children}</span>;
}

// A boolean mark lets the pointer rest on it for its name (the row's marks are
// passive otherwise), standing above the row's hit; on touch, where the name
// shows nowhere, it stays passive and a press reaches the row.
const UNNAMED = "flex";
const NAMED =
	"relative flex items-center pointer-events-auto touch:pointer-events-none";

/** A row's boolean mark: the required ring (filled and named when it holds, a bare outline when not) or a flag glyph, each named by its label as accessible name and tooltip. Outside the package's exports. */
export function BooleanMark({ mark }: { mark: RowMark }) {
	if ("ring" in mark) {
		// An unfilled ring is the fact's absence: decorative, no name to say.
		if (!mark.ring)
			return <span aria-hidden className={cn(ROW_RING, UNNAMED)} />;
		return (
			<Named label={mark.label}>
				<span
					role="img"
					aria-label={mark.label}
					className={cn(NAMED, ROW_RING, ROW_RING_FILLED)}
				/>
			</Named>
		);
	}
	return (
		<Named label={mark.label}>
			<span role="img" aria-label={mark.label} className={cn(NAMED, ROW_FLAG)}>
				<IconBase name={mark.flag} fit="meta" stroke="line" />
			</span>
		</Named>
	);
}
