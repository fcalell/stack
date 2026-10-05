import { cn } from "@fcalell/ui-core/cn";
import { ROW_MARKS, ROW_WARNING, text } from "@fcalell/ui-core/variants";
import { useWords } from "../../lib/words.tsx";
import { Icon } from "../icon/index.tsx";

// A mark's glyph beside its label, the label truncating before the glyph
// does. A row's meta line yields from the end: the chip, then the lock's
// label, then the warning's, then the first meta part; a mark never shrinks
// below its glyph. The shrink weights are the order, ten million apart
// (`./index.tsx` sets out why): this one stands above the first part's and
// below the lock's.
const MARK = "flex items-center min-w-icon-meta shrink-10000000";
const GLYPH = "flex shrink-0";
const LABEL = "truncate";
const SPOKEN = "sr-only";

/** What is wrong with a row: a warn glyph and its sentence in the meta ink, read after the word. Outside the package's exports. */
export function WarningMark(props: { label: string }) {
	const words = useWords();
	return (
		<span className={cn(ROW_MARKS, MARK)}>
			<span className={cn(ROW_WARNING, GLYPH)}>
				<Icon name="TriangleAlert" fit="meta" />
			</span>
			<span className={SPOKEN}>{`${words.warning}. `}</span>
			<span className={cn(text({ role: "meta" }), LABEL)}>{props.label}</span>
		</span>
	);
}
