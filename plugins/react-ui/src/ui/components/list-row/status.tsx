import { cn } from "@fcalell/ui-core/cn";
import type { RowStatus } from "@fcalell/ui-core/descriptors";
import { lineBox } from "@fcalell/ui-core/variants";
import { StatusBase } from "../status/base.tsx";

// The status stays whole: it never shrinks below its word while anything else
// on the line can give (the later parts, the chip, the lock's label, the
// warning's, then the first part, in that order). It is held to the line's
// width less the floor the first part keeps (`figures`, so the item is still
// named by a few characters), and a status wider than that is cut, its word
// truncating. With no first part it is held to the line.
const MARK = "flex shrink-0 min-w-0";
const MARK_ALONE = "max-w-full";
const MARK_BESIDE = "max-w-[calc(100%-var(--spacing-figures))]";
// A status waiting: the `Status`'s own waiting form, its bar standing where the
// loaded word does, at the meta line's height; it yields to the first part as
// the status does.
const WAIT = "flex h-lh min-w-0";

/** A row's status on its meta line: the mark, its word truncating where the line is out of room, or `painted` (the dot's box and a word's filler) while the status is not here. Outside the package's exports. */
export function RowStatusMark(props: {
	status: RowStatus;
	/** Whether the line holds a first part before the status. */
	beside: boolean;
	painted?: boolean;
}) {
	const { status } = props;
	// Painted before anything reads the status: over a placeholder every key is there.
	if (props.painted)
		return (
			<span className={cn(MARK, props.beside ? MARK_BESIDE : MARK_ALONE)}>
				<StatusBase painted />
			</span>
		);
	if ("loading" in status)
		return (
			<span aria-hidden className={cn(lineBox({ role: "meta" }), WAIT)}>
				<StatusBase waiting="short" />
			</span>
		);
	return (
		<span className={cn(MARK, props.beside ? MARK_BESIDE : MARK_ALONE)}>
			<StatusBase state={status.state} label={status.label} />
		</span>
	);
}
