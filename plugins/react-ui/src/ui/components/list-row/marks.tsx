import { cn } from "@fcalell/ui-core/cn";
import { ROW_MARKS, ROW_WARNING, text } from "@fcalell/ui-core/variants";
import { useWords } from "../../lib/words.tsx";
import { Icon } from "../icon/index.tsx";

// A mark's glyph beside its label, the label truncating before the glyph
// does. The marks of a row yield from the end: the lock before the warning.
const MARK = "flex items-center min-w-0";
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
