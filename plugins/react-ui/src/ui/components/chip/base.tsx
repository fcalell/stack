import { Button as BaseButton } from "@base-ui/react/button";
import { cn } from "@fcalell/ui-core/cn";
import { paintText } from "@fcalell/ui-core/paint";
import type { ChipFamily } from "@fcalell/ui-core/tokens";
import { chip, chipLabel, REMOVE_HIT } from "@fcalell/ui-core/variants";
import { PAINT_BOX } from "../../lib/paint.tsx";
import { useWords } from "../../lib/words.tsx";
import { Icon } from "../icon/index.tsx";

const BOX = "inline-flex items-center min-w-0";
const LABEL = "truncate";
// The remove act is a hit box the target's size (24 floor, 44 touch) pulled
// back by what it has over the chip, so the chip keeps its height; the disc
// inside it is the chip's height, and carries the washes and the focus ring.
const REMOVE =
	"group inline-flex items-center justify-center shrink-0 min-h-target min-w-target -m-[calc((var(--spacing-target)-var(--spacing-chip))/2)] focus-visible:outline-none";
const DISC =
	"inline-flex items-center justify-center group-hover:bg-wash-hover group-active:bg-wash-press group-focus-visible:outline-2 group-focus-visible:-outline-offset-2 group-focus-visible:outline-ring";

/** The pill every Chip renders. `painted` is the pill while its value is not here: its box filled at a word's length, inert. Outside the package's exports. */
export function ChipBase({
	label,
	family,
	onRemove,
	painted,
}: {
	label: string;
	family: ChipFamily;
	onRemove?: () => void;
	painted?: boolean;
}) {
	const words = useWords();
	if (painted)
		return (
			<span
				inert
				aria-hidden
				className={cn(chip({ family, trailing: "none" }), BOX, PAINT_BOX)}
			>
				<span className={cn(chipLabel({ family }), LABEL, "invisible")}>
					{paintText("word")}
				</span>
			</span>
		);
	return (
		<span
			className={cn(
				chip({ family, trailing: onRemove ? "remove" : "none" }),
				BOX,
			)}
		>
			<span className={cn(chipLabel({ family }), LABEL)}>{label}</span>
			{onRemove ? (
				<BaseButton
					aria-label={`${words.remove} ${label}`}
					onClick={onRemove}
					className={REMOVE}
				>
					<span className={cn(REMOVE_HIT, DISC)}>
						<Icon name="X" fit="meta" />
					</span>
				</BaseButton>
			) : null}
		</span>
	);
}
