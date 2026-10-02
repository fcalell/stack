import { cn } from "@fcalell/ui-core/cn";
import type { StatusState } from "@fcalell/ui-core/tokens";
import { statusDot } from "@fcalell/ui-core/variants";

const DOT = "shrink-0";

/** A status's dot alone: beside its word in a `Status`, or named by `label` as a list row's leading. Outside the package's exports. */
export function StatusDot(props: { state: StatusState; label?: string }) {
	const drawn = cn(statusDot({ state: props.state }), DOT);
	if (props.label)
		return <span role="img" aria-label={props.label} className={drawn} />;
	return <span aria-hidden className={drawn} />;
}
