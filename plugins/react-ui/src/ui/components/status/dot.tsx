import { cn } from "@fcalell/ui-core/cn";
import type { Tone } from "@fcalell/ui-core/tokens";
import { STATUS_SPINNER, statusDot } from "@fcalell/ui-core/variants";
import { PAINT_BOX } from "../../lib/paint.tsx";
import { Swap } from "../../lib/swap.tsx";
import { Spinner } from "../spinner/index.tsx";

const DOT = "shrink-0";
const SPIN = "flex shrink-0";

/** A status's mark alone (its dot, or a `Spinner` in the accent ink while `running`): beside its word in a `Status`, named by `label` as a list row's leading, or leading a status pick's option. Outside the package's exports. `painted` is the dot's box while its state is not here, nothing drawn in it. */
export function StatusDot(props: {
	tone: Tone;
	label?: string;
	painted?: boolean;
}) {
	const { tone, label } = props;
	if (props.painted)
		return (
			<span
				aria-hidden
				className={cn(statusDot({ tone: "done" }), DOT, PAINT_BOX)}
			/>
		);
	const drawn =
		tone === "running"
			? cn(STATUS_SPINNER, SPIN)
			: cn(statusDot({ tone }), DOT);
	const mark = tone === "running" ? <Spinner /> : null;
	// A state that changes while shown is a mark change: the new dot grows in
	// as the old one fades out.
	return (
		<Swap id={tone} scale>
			{label ? (
				<span role="img" aria-label={label} className={drawn}>
					{mark}
				</span>
			) : (
				<span aria-hidden className={drawn}>
					{mark}
				</span>
			)}
		</Swap>
	);
}
