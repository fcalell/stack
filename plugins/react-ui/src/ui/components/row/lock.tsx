import { cn } from "@fcalell/ui-core/cn";
import { LOCK_GLYPH } from "@fcalell/ui-core/variants";
import { IconBase } from "../icon/index.tsx";

const MARK = "flex items-center min-w-icon-meta";
const FIXED = "shrink-0";

/** A lock glyph in a table's column head: the meta glyph, inert. A row's lock is a badge with its reason (`LockBadge`). Outside the package's exports. */
export function LockMark() {
	return (
		<span className={cn(MARK, FIXED)}>
			<span className={cn(LOCK_GLYPH, "flex")}>
				<IconBase name="Lock" fit="meta" stroke="line" />
			</span>
		</span>
	);
}
