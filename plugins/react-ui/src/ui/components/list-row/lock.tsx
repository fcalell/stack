import { cn } from "@fcalell/ui-core/cn";
import { LOCK_GLYPH, ROW_MARKS, text } from "@fcalell/ui-core/variants";
import { Painted } from "../../lib/paint.tsx";
import { IconBase } from "../icon/index.tsx";

const MARK = "flex items-center min-w-icon-meta";
const GLYPH = "flex";
const LABEL = "truncate";
// A row's lock keeps its glyph and yields its label, before the warning's.
const ROW_LOCK = "shrink-100000000000000";
const FIXED = "shrink-0";
// The row's lock label shows from `tablet`; below it the glyph stands alone.
const LABEL_FROM_TABLET = "page-max-tablet:hidden";

/** A lock glyph; `labelled` draws `reason` beside it from `tablet`, as a list row's meta line does; `painted` while the reason is not here, the glyph's box and a phrase's filler. Outside the package's exports. */
export function LockMark(props: {
	reason?: string;
	labelled?: boolean;
	painted?: boolean;
}) {
	const { reason, labelled = false, painted } = props;
	return (
		<span className={cn(MARK, labelled ? cn(ROW_MARKS, ROW_LOCK) : FIXED)}>
			<span className={cn(LOCK_GLYPH, GLYPH)}>
				<IconBase name="Lock" fit="meta" stroke="line" painted={painted} />
			</span>
			{reason !== undefined && labelled ? (
				<span className={cn(text({ role: "meta" }), LABEL, LABEL_FROM_TABLET)}>
					{painted ? <Painted role="phrase" /> : reason}
				</span>
			) : null}
		</span>
	);
}
