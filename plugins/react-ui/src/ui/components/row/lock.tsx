import { cn } from "@fcalell/ui-core/cn";
import { LOCK_GLYPH, ROW_MARKS, text } from "@fcalell/ui-core/variants";
import { follow } from "../../lib/navigate.ts";
import { Painted } from "../../lib/paint.tsx";
import { IconBase } from "../icon/index.tsx";

const MARK = "flex items-center min-w-icon-meta";
const GLYPH = "flex shrink-0";
const FIXED = "shrink-0";
// A row's lock (`labelled`) wraps its reason, its glyph on the first line.
const MARK_WRAPS = "flex items-start min-w-0";
const GLYPH_WRAPS = "flex shrink-0 items-center h-[1lh]";
const LABEL_WRAPS = "min-w-0 break-words";
// A lock that links stands above the row's hit and takes the pointer the
// meta line does not.
const LINKED = "relative pointer-events-auto";

/** A lock glyph; `labelled` draws `reason` beside it, as a row's meta line does; with an `href` the mark is a link to what holds the fact, named by the reason, else it is inert; `painted` while the reason is not here, the glyph's box and a phrase's filler. Outside the package's exports. */
export function LockMark(props: {
	reason?: string;
	href?: string;
	labelled?: boolean;
	painted?: boolean;
}) {
	const { reason, href, labelled = false, painted } = props;
	const face = (
		<>
			<span className={cn(LOCK_GLYPH, labelled ? GLYPH_WRAPS : GLYPH)}>
				<IconBase name="Lock" fit="meta" stroke="line" painted={painted} />
			</span>
			{reason !== undefined && labelled ? (
				<span className={cn(text({ role: "meta" }), LABEL_WRAPS)}>
					{painted ? <Painted role="phrase" /> : reason}
				</span>
			) : null}
		</>
	);
	const form = labelled
		? cn(ROW_MARKS, text({ role: "meta" }), MARK_WRAPS)
		: cn(MARK, FIXED);
	if (href === undefined || painted)
		return <span className={form}>{face}</span>;
	return (
		<a
			href={href}
			onClick={follow}
			aria-label={reason}
			className={cn(form, LINKED)}
		>
			{face}
		</a>
	);
}
