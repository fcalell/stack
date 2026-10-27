import { Button as BaseButton } from "@base-ui/react/button";
import { cn } from "@fcalell/ui-core/cn";
import { paintText } from "@fcalell/ui-core/paint";
import type { ChipFamily } from "@fcalell/ui-core/tokens";
import {
	BLOCK_IN,
	CHIP_LABEL,
	chip,
	chipDot,
	PILL_COMPACT,
	REMOVE_HIT,
} from "@fcalell/ui-core/variants";
import { PAINT_BOX } from "../../lib/paint.tsx";
import { useWords } from "../../lib/words.tsx";
import { Icon } from "../icon/index.tsx";

const BOX = "inline-flex items-center min-w-0 whitespace-nowrap";
const LABEL = "truncate";
// The remove act is a hit box the target's size (24 floor, 44 touch) pulled
// back by what it has over the chip, so the chip keeps its height; the disc
// inside it is the chip's height, and carries the washes and the focus ring.
const REMOVE =
	"group inline-flex items-center justify-center shrink-0 min-h-target min-w-target -m-[calc((var(--spacing-target)-var(--spacing-chip))/2)] focus-visible:outline-none";
const DISC =
	"inline-flex items-center justify-center group-hover:bg-wash-hover group-active:bg-wash-press group-focus-visible:outline-2 group-focus-visible:-outline-offset-2 group-focus-visible:outline-ring";

/** The pill every Chip renders: outlined on the surface, a dot in the family's hue, then the label in the body ink; the neutral family, which has no hue, draws the label alone on its soft ground with no edge, so a dotless box never reads as a control. `painted` is the pill while its value is not here: its box filled at a word's length, inert. A removable pill is a block: it fades in as it mounts, and the viewer's remove runs in the page's block move, so the pill fades out on `fast` and its row closes up. Outside the package's exports. */
export function ChipBase({
	label,
	family,
	onRemove,
	painted,
	compact,
	whole,
}: {
	label: string;
	family: ChipFamily;
	onRemove?: () => void;
	painted?: boolean;
	/** The compact form, a pill inside a row: the caption line between its hairlines, so the row keeps its height. The row says it; a pill never reads its parent. */
	compact?: boolean;
	/** The pill keeps its whole width and its label is never cut (a kept mark in a row's end group). */
	whole?: boolean;
}) {
	const words = useWords();
	const ground = family === "neutral" ? "soft" : "edge";
	if (painted)
		return (
			<span
				inert
				aria-hidden
				className={cn(
					chip({ trailing: "none", ground }),
					compact && PILL_COMPACT,
					BOX,
					PAINT_BOX,
				)}
			>
				{family === "neutral" ? null : (
					<span className={cn(chipDot({ family }), "invisible")} />
				)}
				<span className={cn(CHIP_LABEL, LABEL, "invisible")}>
					{paintText("word")}
				</span>
			</span>
		);
	return (
		<span
			className={cn(
				chip({ trailing: onRemove ? "remove" : "none", ground }),
				compact && PILL_COMPACT,
				BOX,
				whole && "shrink-0",
				onRemove && BLOCK_IN,
			)}
		>
			{family === "neutral" ? null : <span className={chipDot({ family })} />}
			<span className={cn(CHIP_LABEL, !whole && LABEL)}>{label}</span>
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
