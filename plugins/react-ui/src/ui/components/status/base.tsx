import { cn } from "@fcalell/ui-core/cn";
import type { StatusState } from "@fcalell/ui-core/tokens";
import { STATUS, STATUS_LABEL, statusDot } from "@fcalell/ui-core/variants";
import { PAINT_BOX, Painted } from "../../lib/paint.tsx";
import { useWords } from "../../lib/words.tsx";
import { StatusDot } from "./dot.tsx";

const BOX = "inline-flex items-center min-w-0 max-w-full";
const WORD = "truncate";
const DOT = "shrink-0";

/** What every status draws: the public `Status`, or `painted` (the dot's box and a word's filler while the status's data is not here, inert). `short` is drawn in the word's place while `label` stays the name (a canvas node's). Outside the package's exports. */
export function StatusBase(
	props:
		| {
				state: StatusState;
				label?: string;
				short?: string;
				painted?: never;
		  }
		| { painted: true },
) {
	const words = useWords();
	if (props.painted)
		return (
			<span inert className={cn(STATUS, BOX)}>
				<span
					aria-hidden
					className={cn(statusDot({ state: "done" }), DOT, PAINT_BOX)}
				/>
				<span className={cn(STATUS_LABEL, WORD)}>
					<Painted role="word" />
				</span>
			</span>
		);
	const label = props.label ?? words[props.state];
	return (
		<span className={cn(STATUS, BOX)}>
			<StatusDot state={props.state} />
			<span
				aria-hidden={props.short === undefined ? undefined : true}
				className={cn(STATUS_LABEL, WORD)}
			>
				{props.short ?? label}
			</span>
			{props.short === undefined ? null : (
				<span className="sr-only">{label}</span>
			)}
		</span>
	);
}
