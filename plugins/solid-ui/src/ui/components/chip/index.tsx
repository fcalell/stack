import type { ChipFamily } from "@fcalell/ui-core/tokens";
import { type ChipCell, chip } from "@fcalell/ui-core/variants";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";

// A data value's tag on its family's fill: the consumer gives each family of
// values (a type, a source, a destination) one of the six, so a chip's
// meaning is learnable across screens. It carries no act: what opens is the
// row or the cell it sits in. A state is a `Status`, never a chip.
export type ChipProps = Closed & {
	label: string;
	family: ChipFamily;
};

export function Chip(props: ChipProps) {
	return (
		<span
			class={cn(
				chip({ family: String(props.family) as ChipCell }),
				"inline-block max-w-full truncate align-middle",
			)}
		>
			{props.label}
		</span>
	);
}
