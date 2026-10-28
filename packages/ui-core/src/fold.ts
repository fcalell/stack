import { sizeOf, sizePx, spacingOf } from "./scales.ts";
import { MEASURE_CHARACTERS, SANS_ADVANCE } from "./tokens.ts";

// The one fold rule, on both platforms and in every place acts stand side by
// side (a Pane head, a list row, an action bar's count): the first act stands,
// at its icon where it is a head's or a row's, and the rest fold into the more
// menu, in their order. It is a rule, not a measure: what stands never depends
// on the room, so a head or a row reads the same at every width.
export const ACTS_STAND = 1;

// The acts that stand and those the more menu holds, in their order.
export function actsSplit<T>(acts: readonly T[]): {
	standing: readonly T[];
	folded: readonly T[];
} {
	return {
		standing: acts.slice(0, ACTS_STAND),
		folded: acts.slice(ACTS_STAND),
	};
}

// The narrowest a row can be for its one-line form, a rule of the row's width
// (the web's `row-two-line:` container variant), never a measure of its
// content: the name and one meta, at the desktop set's figures (the touch set
// is the two-line form already), each the short measure (20 characters,
// `ROW_TEXT_FLOOR`'s text) in the text group at its floor of two fifths of the
// row, a gap between them; the end group, the rest, holds two short-measure
// words at the caption size and the gap between them. The row is as wide as
// the wider of the two needs (765 px; the name and meta bind), whatever the
// device or the viewport: a row in a narrower container takes the two-line
// form (voice 14) rather than cut its meta.
const TEXT_FLOOR = 2 / 5;
const CHARACTERS = MEASURE_CHARACTERS["measure-short"] * SANS_ADVANCE;
const ONE_LINE_TEXT =
	CHARACTERS * (sizeOf("desktop", "body") + sizeOf("desktop", "meta")) +
	spacingOf("desktop", "gap");
const ONE_LINE_END =
	2 * CHARACTERS * sizeOf("desktop", "caption") + spacingOf("desktop", "gap");
export const ROW_ONE_LINE = Math.ceil(
	Math.max(ONE_LINE_TEXT / TEXT_FLOOR, ONE_LINE_END / (1 - TEXT_FLOOR)),
);

// The narrowest a rules list can be for its one-row form (the web's
// `rules-stacked:` container variant), a rule of the list's width, never a
// measure of its terms: two terms, each a term's floor of characters at the
// desktop body size in a `bar` pick's box (its inset at both sides, a gap and a
// control's box for its act), the arrow or operator and the remove act at a
// control's width, and the row's gap between the four. A list narrower than it
// stacks each rule's terms rather than cut a term under its floor.
export const RULE_TERM_CHARACTERS = 12;
const TERM =
	RULE_TERM_CHARACTERS * SANS_ADVANCE * sizeOf("desktop", "body") +
	2 * spacingOf("desktop", "pad") +
	spacingOf("desktop", "gap") +
	sizePx("desktop", "control");
export const RULES_ONE_ROW = Math.ceil(
	2 * TERM + 2 * sizePx("desktop", "control") + 3 * spacingOf("desktop", "gap"),
);
