import { sizeOf, sizePx, spacingOf, widthPx } from "./scales.ts";
import { KNOB_DEFAULTS, MEASURE_CHARACTERS, SANS_ADVANCE } from "./tokens.ts";

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
// the wider of the two needs (765 px at the default `size` knob; the name and meta bind), whatever the
// device or the viewport: a row in a narrower container takes the two-line
// form (voice 14) rather than cut its meta.
const TEXT_FLOOR = 2 / 5;
const CHARACTERS = MEASURE_CHARACTERS["measure-short"] * SANS_ADVANCE;
export function rowOneLine(size = KNOB_DEFAULTS.size): number {
	const gap = spacingOf("desktop", "gap", size);
	const text =
		CHARACTERS *
			(sizeOf("desktop", "body", size) + sizeOf("desktop", "meta", size)) +
		gap;
	const end = 2 * CHARACTERS * sizeOf("desktop", "caption", size) + gap;
	return Math.ceil(Math.max(text / TEXT_FLOOR, end / (1 - TEXT_FLOOR)));
}

// The narrowest a rules list can be for its one-row form (the web's
// `rules-stacked:` container variant), a rule of the list's width, never a
// measure of its terms: two terms, each a term's floor of characters at the
// desktop body size in a `bar` pick's box (its inset at both sides, a gap and a
// control's box for its act), the arrow or operator and the remove act at a
// control's width, and the row's gap between the four. A list narrower than it
// stacks each rule's terms rather than cut a term under its floor.
export const RULE_TERM_CHARACTERS = 12;
export function rulesOneRow(size = KNOB_DEFAULTS.size): number {
	const gap = spacingOf("desktop", "gap", size);
	const control = sizePx("desktop", "control", size);
	const term =
		RULE_TERM_CHARACTERS * SANS_ADVANCE * sizeOf("desktop", "body", size) +
		2 * spacingOf("desktop", "pad", size) +
		gap +
		control;
	return Math.ceil(2 * term + 2 * control + 3 * gap);
}

// The narrowest a Pane can be for its definition rows' side-by-side form (the
// web's `definitions-stacked:` container variant), a rule of the Pane's width,
// never a measure of a value: a label and a value, each the short measure
// (20 characters) at the desktop body size, the `stack` gap between them, and
// the Pane's `page` inset at both sides. A Pane narrower than it stands each
// value under its label (voice 11), as touch does at every width, rather than
// leave a pick or an input under its placeholder.
export function definitionsOneRow(size = KNOB_DEFAULTS.size): number {
	const stack = spacingOf("desktop", "stack", size);
	const page = spacingOf("desktop", "page", size);
	return Math.ceil(
		2 * CHARACTERS * sizeOf("desktop", "body", size) + stack + 2 * page,
	);
}

// The widest block whose act bar stacks its acts (the web's `acts-stacked:`
// container variant), a rule of the block's width, never a measure of its
// acts: the auth column's width. A Gate step, an empty state's column and a
// sheet on a phone stand at or under it, so their acts read one per row
// across the block, the filled act on top; a desktop sheet and a page's form
// stand wider, their acts at their width at the block's end.
export function actsStackedMax(size = KNOB_DEFAULTS.size): number {
	return widthPx("auth", size);
}

// A two-line row's title wraps to this many lines before it is cut (voice 14):
// the title is the row's name, and a name cut at one line leaves it unread.
// The web's `line-clamp-3` and the phone's `numberOfLines` both read it.
export const ROW_TITLE_LINES = 3;
