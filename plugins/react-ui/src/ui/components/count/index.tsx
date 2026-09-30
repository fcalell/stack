import { cn } from "@fcalell/ui-core/cn";
import { COUNT, COUNT_LABEL } from "@fcalell/ui-core/variants";
import type { Closed } from "../../lib/closed.ts";

const PILL = "inline-flex items-center justify-center shrink-0";

/** A number in a pill. */
export interface CountProps extends Closed {
	/** The number. */
	value: number;
}

/** A number in a grey pill, its figures at one width. */
export function Count({ value }: CountProps) {
	return (
		<span className={cn(COUNT, PILL)}>
			<span className={COUNT_LABEL}>{value}</span>
		</span>
	);
}
