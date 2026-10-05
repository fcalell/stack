import { cn } from "@fcalell/ui-core/cn";
import { ROW_MARKS, ROW_WARNING, text } from "@fcalell/ui-core/variants";
import { useWords } from "../../lib/words.tsx";
import { Icon } from "../icon/index.tsx";

// A mark's glyph beside its label, the label truncating before the glyph
// does. The marks of a row yield from the end: the lock before the warning.
const MARK = "flex items-center min-w-0";
const GLYPH = "flex shrink-0";
const LOCK_GLYPH = "flex shrink-0 text-ink-meta";
const LABEL = "truncate";
const SPOKEN = "sr-only";
const LOCK_YIELDS = "shrink-2";
// The lock's label shows from `tablet`; below it the glyph stands alone and
// the label is still read aloud.
const LOCK_LABEL = "page-max-tablet:sr-only";

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

/** What a row holds: a lock glyph and its label, the label shown from `tablet` and read aloud always. Outside the package's exports. */
export function LockMark(props: { label: string }) {
	return (
		<span className={cn(ROW_MARKS, MARK, LOCK_YIELDS)}>
			<span className={LOCK_GLYPH}>
				<Icon name="Lock" fit="meta" />
			</span>
			<span className={cn(text({ role: "meta" }), LABEL, LOCK_LABEL)}>
				{props.label}
			</span>
		</span>
	);
}
