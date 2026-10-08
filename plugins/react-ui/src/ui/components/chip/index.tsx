import { Button as BaseButton } from "@base-ui/react/button";
import { cn } from "@fcalell/ui-core/cn";
import type { ChipFamily } from "@fcalell/ui-core/tokens";
import { chip, chipLabel, REMOVE_HIT } from "@fcalell/ui-core/variants";
import type { Closed } from "../../lib/closed.ts";
import { useWords } from "../../lib/words.tsx";
import { Icon } from "../icon/index.tsx";

const BOX = "inline-flex items-center min-w-0";
const LABEL = "truncate";
const REMOVE =
	"inline-flex items-center justify-center shrink-0 hover:bg-wash-hover active:bg-wash-press focus-visible:-outline-offset-2";

/** A data value's tag on its family's soft ground. */
export interface ChipProps extends Closed {
	/** The value (a word; truncates past the short measure, 18 characters). */
	label: string;
	/** The family of values it belongs to, one hue per family across screens. */
	family: ChipFamily;
	/** Adds the remove act, a round hit box the chip's height closing its right end. */
	onRemove?: () => void;
}

/** A pill of a family's soft ground and ink; its one act removes the value. */
export function Chip({ label, family, onRemove }: ChipProps) {
	const words = useWords();
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
