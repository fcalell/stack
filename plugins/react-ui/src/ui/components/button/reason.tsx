import { cn } from "@fcalell/ui-core/cn";
import { text } from "@fcalell/ui-core/variants";

// At the line's end under an act at the row's end; `desktop` under an act
// that stands under its line on touch, so the reason starts there.
const END = "text-end";
const END_DESKTOP = "text-end touch:text-start";
// A kept line holds its height while the reason is unshown.
const KEPT = "invisible";

/** A blocked act's reason, the act's description: held from the start and hidden until shown, so the press that shows it keeps the act mounted and focused. A `kept` line holds its place while hidden, so showing it moves nothing. Outside the package's exports: the Button draws it, or the host that draws it on its own line. */
export function Reason(props: {
	id: string;
	shown: boolean;
	kept?: boolean;
	end?: boolean | "desktop";
	children: string;
}) {
	const end = props.end === "desktop" ? END_DESKTOP : props.end && END;
	return (
		<p
			id={props.id}
			hidden={!(props.shown || props.kept)}
			className={cn(text({ role: "meta" }), end, !props.shown && KEPT)}
		>
			{props.children}
		</p>
	);
}
