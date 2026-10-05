import { cn } from "@fcalell/ui-core/cn";
import { LOCK_GLYPH, ROW_MARKS, text } from "@fcalell/ui-core/variants";
import { useWords } from "../../lib/words.tsx";
import { Icon } from "../icon/index.tsx";

const MARK = "flex items-center min-w-icon-meta";
const GLYPH = "flex";
const LABEL = "truncate";
const SPOKEN = "sr-only";
// A row's lock keeps its glyph and yields its label, before the warning's.
const ROW_LOCK = "shrink-1000000";
const FIXED = "shrink-0";
// The row's lock label shows from `tablet`; below it the glyph stands alone and
// the label is still read aloud.
const LABEL_FROM_TABLET = "page-max-tablet:sr-only";

/** A lock glyph read aloud as the word Locked, then `reason` when it has one; `labelled` draws the reason beside the glyph from `tablet`, as a list row's meta line does. Outside the package's exports. */
export function LockMark(props: { reason?: string; labelled?: boolean }) {
	const words = useWords();
	const { reason, labelled = false } = props;
	return (
		<span className={cn(MARK, labelled ? cn(ROW_MARKS, ROW_LOCK) : FIXED)}>
			<span className={cn(LOCK_GLYPH, GLYPH)}>
				<Icon name="Lock" fit="meta" />
			</span>
			<span className={SPOKEN}>
				{reason === undefined ? words.locked : `${words.locked}, `}
			</span>
			{reason === undefined ? null : (
				<span
					className={
						labelled
							? cn(text({ role: "meta" }), LABEL, LABEL_FROM_TABLET)
							: SPOKEN
					}
				>
					{reason}
				</span>
			)}
		</span>
	);
}
