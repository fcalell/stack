import { cn } from "@fcalell/ui-core/cn";
import { markedRuns } from "@fcalell/ui-core/form";
import { FIELD_ERROR_LINE, LINE_IN, text } from "@fcalell/ui-core/variants";
import { RunText } from "../../lib/code.tsx";
import { partRuns } from "../../lib/parts.ts";

// At the line's end under an act at the row's end; `desktop` under an act
// that stands under its line on touch, so the reason starts there.
const END = "text-end";
const END_DESKTOP = "text-end touch:text-start";
// A kept line holds its height while the reason is unshown.
const KEPT = "invisible";

/** A blocked act's reason, drawn once `shown`: a line, so it fades in on `fast` and pushes what follows at once, and leaves at once. A `kept` line holds its place while unshown, so showing it moves nothing: its words stand invisible there and fade in when shown, and a changed reason fades in the same way. A `failed` line is the sentence an act's run failed with, in the field error's cell and ink, where a span between backticks is a `{ code }` run (`markedRuns`), so a machine name the server words into a refusal stands boxed in the mono and wraps whole, as a field's error does. Outside the package's exports: the Button draws it, or the host that draws it on its own line. */
export function Reason(props: {
	shown: boolean;
	kept?: boolean;
	failed?: boolean;
	end?: boolean | "desktop";
	children: string;
}) {
	if (!(props.shown || props.kept)) return null;
	const end = props.end === "desktop" ? END_DESKTOP : props.end && END;
	// A failed sentence is the server's: its backticked spans are code.
	const words = props.children;
	const said = props.failed ? partRuns(markedRuns(words)) : [words];
	const drawn =
		said.length === 1 && typeof said[0] === "string" ? (
			words
		) : (
			<RunText runs={said} whole />
		);
	return (
		<p
			role={props.failed && props.shown ? "alert" : undefined}
			className={cn(
				props.failed ? FIELD_ERROR_LINE : text({ role: "meta" }),
				end,
				!props.shown && KEPT,
			)}
		>
			{props.shown ? (
				<span key={words} className={LINE_IN}>
					{drawn}
				</span>
			) : (
				drawn
			)}
		</p>
	);
}
