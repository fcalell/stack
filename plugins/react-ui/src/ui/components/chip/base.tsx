import { Button as BaseButton } from "@base-ui/react/button";
import { cn } from "@fcalell/ui-core/cn";
import { paintText } from "@fcalell/ui-core/paint";
import { chip, chipLabel, REMOVE_HIT } from "@fcalell/ui-core/variants";
import { PAINT_BOX } from "../../lib/paint.tsx";
import { useWords } from "../../lib/words.tsx";
import { Icon } from "../icon/index.tsx";
import type { ChipProps } from "./index.tsx";

const BOX = "inline-flex items-center min-w-0";
const LABEL = "truncate";
const REMOVE =
	"inline-flex items-center justify-center shrink-0 hover:bg-wash-hover active:bg-wash-press focus-visible:-outline-offset-2";

/** The pill every Chip renders. `painted` is the pill while its value is not here: its box filled at a word's length, inert. Outside the package's exports. */
export function ChipBase({
	label,
	family,
	onRemove,
	painted,
}: ChipProps & { painted?: boolean }) {
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
				// A control inside the chip: its focus ring is drawn inset.
				<BaseButton
					aria-label={`${words.remove} ${label}`}
					onClick={onRemove}
					className={cn(REMOVE_HIT, REMOVE)}
				>
					<Icon name="X" fit="meta" />
				</BaseButton>
			) : null}
		</span>
	);
}
