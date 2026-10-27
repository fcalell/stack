import { cn } from "@fcalell/ui-core/cn";
import type { ReactNode } from "react";

// A line of parts a middle dot apart (a row's meta line, a message's
// provenance), whose rule is that where a line breaks between two parts no
// separator shows, at either end of either line. A separator is a word space,
// the dot and a word space (a gap and a half, at every density), in one of
// three forms:
// - `flow`: one text that never breaks at a separator: the dot is bound to the
//   word before it and the word after it by no-break spaces, so a line breaks
//   only between the words of a part. A box beside a no-break space still
//   takes a break, so the caller draws a part's code inline (`RunText`
//   `whole`). For a line cut at its second line, and a line set to its end,
//   where nothing marks a line's start for a dot to be clipped at.
// - `items`: each part a box that wraps whole, its words wrapping inside it
//   only where it is longer than a line. Each part after the first is led by
//   its dot in a box a gap and a half wide, which it pulls into the gap before
//   it by a negative inline margin as wide as that box; the line
//   (`PARTS_ITEMS`) clips its inline-start edge, so the dot of a part that
//   starts a line stands past that edge and is clipped away. Only the inline
//   start is clipped: a descender, and a focus ring anywhere else, stand. The
//   line takes no pointer, so a row's hit under it keeps the press (the clip
//   makes the line a stacking context over the hit); a part that takes one
//   says so.
// - `adapts`: one line, cut at its end, where nothing breaks, and `items`
//   below a row's one-line width (`row-two-line:`), where its cut box's own
//   clip takes the dot away.
export type PartsForm = "flow" | "items" | "adapts";

/** The line of `items` parts: a wrapping flex line, the separator's box apart, its inline-start edge clipped. Outside the package's exports. */
export const PARTS_ITEMS =
	"flex flex-wrap gap-x-[calc(var(--spacing-gap)*1.5)] pointer-events-none [clip-path:inset(-100%_-100%_-100%_0)] rtl:[clip-path:inset(-100%_0_-100%_-100%)]";
/** The line of `adapts` parts, on the one-line form's cut box: below the row's one-line width the parts are `items`. Outside the package's exports. */
export const PARTS_ADAPTS =
	"row-two-line:flex row-two-line:flex-wrap row-two-line:gap-x-[calc(var(--spacing-gap)*1.5)] row-two-line:whitespace-normal";

// A part: in `flow` inline text; as an item its text shrinks to the line and
// wraps inside it, and one led by its dot stands the dot's box and the text
// side by side, so a wrapped part's later lines start under its first word,
// never under its dot.
const PART: Record<PartsForm, string> = {
	flow: "",
	items: "min-w-0",
	adapts: "min-w-0",
};
const LED: Record<PartsForm, string> = {
	flow: "",
	items: "flex min-w-0 -ms-[calc(var(--spacing-gap)*1.5)]",
	adapts:
		"min-w-0 row-two-line:flex row-two-line:-ms-[calc(var(--spacing-gap)*1.5)]",
};
const TEXT = "min-w-0";
const SEPARATOR =
	"inline-block shrink-0 w-[calc(var(--spacing-gap)*1.5)] text-center";
// The dot of one text, bound to the words beside it.
const BOUND = " · ";

/** Parts a middle dot apart in the form a line takes (`flow`, `items`, `adapts`); `led` gives the first part a separator too, for parts that follow other items on their line (a row's marks). The parts are the line's children, so the caller draws the line's box (`PARTS_ITEMS`, `PARTS_ADAPTS` for the item forms) and `className` styles each part (the text role). Outside the package's exports. */
export function PartsLine(props: {
	parts: readonly ReactNode[];
	form: PartsForm;
	led?: boolean;
	className?: string;
}) {
	const { parts, form, led = false, className } = props;
	return parts.map((part, at) => {
		const parted = led || at > 0;
		return (
			// biome-ignore lint/suspicious/noArrayIndexKey: the parts are one line, in order; a part is its position
			<span key={at} className={cn(parted ? LED[form] : PART[form], className)}>
				{!parted ? null : form === "flow" ? (
					BOUND
				) : (
					<span className={SEPARATOR}>·</span>
				)}
				{form === "flow" ? part : <span className={TEXT}>{part}</span>}
			</span>
		);
	});
}
