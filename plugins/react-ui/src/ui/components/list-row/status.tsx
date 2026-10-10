import { cn } from "@fcalell/ui-core/cn";
import type { RowStatus } from "@fcalell/ui-core/descriptors";
import { lineBox } from "@fcalell/ui-core/variants";
import { useRef } from "react";
import { useShort } from "../../lib/short.ts";
import { StatusBase } from "../status/base.tsx";

const MARK = "flex min-w-0";
// The short form is what the app offered to read whole: it keeps its width and
// the first part takes the overflow.
const MARK_SHORT = "flex shrink-0";
// A status waiting: the `Status`'s own waiting form, its bar standing where the
// loaded word does, at the meta line's height; it yields to the first part as
// the status does.
const WAIT = "flex h-lh min-w-0";

/** A row's status on its meta line: the mark (its short form in place of the label while the long one would be cut on `line`), or while its read has not answered a bar at the status's place and height. Outside the package's exports. */
export function RowStatusMark(props: {
	status: RowStatus;
	line: HTMLElement | null;
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
		<span className={short ? MARK_SHORT : MARK}>
			<StatusBase
				state={status.state}
				label={status.label}
				short={short ? status.short : undefined}
				word={word}
			/>
		</span>
	);
}
