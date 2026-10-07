import { cn } from "@fcalell/ui-core/cn";
import { FIELD_ERROR_LINE, text } from "@fcalell/ui-core/variants";

// At the line's end under an act at the row's end; `desktop` under an act
// that stands under its line on touch, so the reason starts there.
const END = "text-end";
const END_DESKTOP = "text-end touch:text-start";
// A kept line holds its height while the reason is unshown.
const KEPT = "invisible";

/** A blocked act's reason, drawn once `shown`. A `kept` line holds its place while unshown, so showing it moves nothing. A `failed` line is the sentence an act's run failed with, in the field error's cell and ink. Outside the package's exports: the Button draws it, or the host that draws it on its own line. */
export function Reason(props: {
	shown: boolean;
	kept?: boolean;
	failed?: boolean;
	end?: boolean | "desktop";
	children: string;
}) {
	if (!(props.shown || props.kept)) return null;
	const end = props.end === "desktop" ? END_DESKTOP : props.end && END;
	return (
		<p
			role={props.failed && props.shown ? "alert" : undefined}
			className={cn(
				props.failed ? FIELD_ERROR_LINE : text({ role: "meta" }),
				end,
				!props.shown && KEPT,
			)}
		>
			{props.children}
		</p>
	);
}
