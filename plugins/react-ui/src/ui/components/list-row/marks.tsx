import { cn } from "@fcalell/ui-core/cn";
import { ROW_MARKS, ROW_WARNING, text } from "@fcalell/ui-core/variants";
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
