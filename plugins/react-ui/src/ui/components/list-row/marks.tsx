import { cn } from "@fcalell/ui-core/cn";
import { ROW_MARKS, ROW_WARNING, text } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { Painted } from "../../lib/paint.tsx";
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

/** What is wrong with a row: a warn glyph and its sentence in the meta ink; `painted` while the sentence is not here, the glyph's box and a phrase's filler. Outside the package's exports. */
export function WarningMark(props: { label: string; painted?: boolean }) {
	return (
		<span className={cn(ROW_MARKS, MARK)}>
			<span className={cn(ROW_WARNING, GLYPH)}>
				<IconBase
					name="TriangleAlert"
					fit="meta"
					stroke="line"
					painted={props.painted}
				/>
			</span>
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
	children: ReactNode;
}) {
	const { at, shown, children } = props;
	let form = SLOT;
	if (at >= shown) form = SLOT_FOLDED;
	else if (at === 0) form = SLOT_FIRST;
	return <span className={form}>{children}</span>;
}
