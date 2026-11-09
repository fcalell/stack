import { Button as BaseButton } from "@base-ui/react/button";
import { cn } from "@fcalell/ui-core/cn";
import { paintText } from "@fcalell/ui-core/paint";
import type { ChipFamily } from "@fcalell/ui-core/tokens";
import {
	BLOCK_IN,
	CHIP_LABEL,
	chip,
	chipDot,
	REMOVE_HIT,
} from "@fcalell/ui-core/variants";
import { PAINT_BOX } from "../../lib/paint.tsx";
import { useWords } from "../../lib/words.tsx";
import { Icon } from "../icon/index.tsx";

const BOX = "inline-flex items-center min-w-0 whitespace-nowrap";
const LABEL = "truncate";
// The remove act is a hit box the target's size (28 floor, 44 touch) pulled
// back on every side by what it has over the chip's caption line, so the chip
// keeps its height and the act takes a line's square of it; the disc inside is
// that line, a circle, and carries the washes and the focus ring.
const REMOVE =
	"group inline-flex items-center justify-center shrink-0 min-h-target min-w-target -m-[calc((var(--spacing-target)-1lh)/2)] text-caption leading-caption focus-visible:outline-none";
const DISC =
	"h-lh w-lh group-hover:bg-wash-hover group-active:bg-wash-press in-data-[modality=keyboard]:group-focus-visible:outline-2 group-focus-visible:-outline-offset-2 group-focus-visible:outline-ring";

/** The pill every Chip renders: outlined on the surface, a dot in the family's hue, then the label in the body ink; the neutral family, which has no hue, draws the label alone on its soft ground with no edge, so a dotless box never reads as a control. It has no height of its own: its caption line between its hairlines, whatever holds it. `painted` is the pill while its value is not here: its box filled at a word's length, inert. A removable pill is a block: it fades in as it mounts, and the viewer's remove runs in the page's block move, so the pill fades out on `fast` and its row closes up. Outside the package's exports. */
export function ChipBase({
	label,
	family,
	onRemove,
	painted,
	whole,
	quiet,
}: {
	label: string;
	family: ChipFamily;
	onRemove?: () => void;
	painted?: boolean;
	/** The pill keeps its whole width and its label is never cut (a kept mark in a row's end group). */
	whole?: boolean;
	/** The label in the meta ink, the quietest a word has: a chip on a dimmed edge. */
	quiet?: boolean;
}) {
	const words = useWords();
	const ground = family === "neutral" ? "soft" : "edge";
	if (painted)
		return (
			<span
				inert
				aria-hidden
				className={cn(chip({ trailing: "none", ground }), BOX, PAINT_BOX)}
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
				BOX,
				whole && "shrink-0",
				onRemove && BLOCK_IN,
			)}
		>
			{family === "neutral" ? null : <span className={chipDot({ family })} />}
			<span
				className={cn(CHIP_LABEL, !whole && LABEL, quiet && "text-ink-meta")}
			>
				{label}
			</span>
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
