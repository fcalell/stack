import { COUNT } from "@fcalell/ui-core/variants";
import type { Closed } from "#lib/closed";
import { cn } from "#lib/cn";

// A number in a pill: a place in the shell, a section header.
export type CountProps = Closed & { value: number };

export function Count(props: CountProps) {
	return (
		<span class={cn(COUNT, "inline-flex items-center justify-center")}>
			{props.value}
		</span>
	);
}
