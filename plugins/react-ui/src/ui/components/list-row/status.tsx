import { cn } from "@fcalell/ui-core/cn";
import type { RowStatus } from "@fcalell/ui-core/descriptors";
import { lineBox } from "@fcalell/ui-core/variants";
import { useRef } from "react";
import { useShort } from "../../lib/short.ts";
import { StatusBase } from "../status/base.tsx";

// The status stays whole: it never shrinks below its word while anything else
// on the line can give (the later parts, the chip, the lock's label, the
// warning's, then the first part, in that order). It is held to the line's
// width less the floor the first part keeps (`figures`, so the item is still
// named by a few characters), and a status wider than that is cut: the short
// form draws in its place when the app gave one. With no first part it is held
// to the line.
const MARK = "flex shrink-0 min-w-0";
const MARK_ALONE = "max-w-full";
const MARK_BESIDE = "max-w-[calc(100%-var(--spacing-figures))]";
// A status waiting: the `Status`'s own waiting form, its bar standing where the
// loaded word does, at the meta line's height; it yields to the first part as
// the status does.
const WAIT = "flex h-lh min-w-0";

/** A row's status on its meta line: the mark (its short form in place of the label while the long one would be cut on `line`), or while its read has not answered a bar at the status's place and height. Outside the package's exports. */
export function RowStatusMark(props: {
	status: RowStatus;
	line: HTMLElement | null;
	/** Whether the line holds a first part before the status. */
	beside: boolean;
}) {
	const { status } = props;
	const word = useRef<HTMLSpanElement>(null);
	const loading = "loading" in status;
	const short = useShort(
		props.line,
		word,
		loading || status.short === undefined
			? undefined
			: `${status.label}\n${status.short}`,
	);
	if (loading)
		return (
			<span aria-hidden className={cn(lineBox({ role: "meta" }), WAIT)}>
				<StatusBase waiting="short" />
			</span>
		);
	return (
		<span className={cn(MARK, props.beside ? MARK_BESIDE : MARK_ALONE)}>
			<StatusBase
				state={status.state}
				label={status.label}
				short={short ? status.short : undefined}
				word={word}
			/>
		</span>
	);
}
