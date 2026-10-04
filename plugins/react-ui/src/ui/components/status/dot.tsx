import { cn } from "@fcalell/ui-core/cn";
import type { StatusState } from "@fcalell/ui-core/tokens";
import { STATUS_SPINNER, statusDot } from "@fcalell/ui-core/variants";
import { Spinner } from "../spinner/index.tsx";

const DOT = "shrink-0";
const SPIN = "flex shrink-0";

/** A status's mark alone (its dot, or a `Spinner` in the accent ink while `running`): beside its word in a `Status`, named by `label` as a list row's leading, or leading a status pick's option. Outside the package's exports. */
export function StatusDot(props: { state: StatusState; label?: string }) {
	const { state, label } = props;
	const drawn =
		state === "running"
			? cn(STATUS_SPINNER, SPIN)
			: cn(statusDot({ state }), DOT);
	const mark = state === "running" ? <Spinner /> : null;
	if (label)
		return (
			<span role="img" aria-label={label} className={drawn}>
				{mark}
			</span>
		);
	return (
		<span aria-hidden className={drawn}>
			{mark}
		</span>
	);
}
