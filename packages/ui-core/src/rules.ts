// The decisions a Rules editor and a Picker make before they draw, free of any
// framework: both platforms run this one source, and it is tested without
// rendering.

import type {
	EitherValue,
	IconName,
	Option,
	OptionGroup,
	RuleTerms,
	RuleValue,
} from "./descriptors.ts";

// A picked option that carries no leading form of its own leads with this
// glyph, which marks the value as a field and not typed text.
export const PICKED_GLYPH: IconName = "Braces";

// A typed form is the only one that carries `typed`.
export function isTyped<V extends string | null>(
	value: EitherValue<V>,
): value is { typed: string } {
	return "typed" in value;
}

// Whether a rule's term holds a value: a pick its option, a several-pick any
// option, a typed cell any text, a picked cell its option.
export function termSet<V extends string | null>(value: RuleValue<V>): boolean {
	if (value.pick) return value.pick.value !== undefined;
	if (value.picks) return value.picks.value.length > 0;
	const either = value.either.value;
	return isTyped(either) ? either.typed !== "" : either.picked !== undefined;
}

// What a rule's term picks, which names its row's remove act.
export function termLabel<V extends string | null>(
	value: RuleValue<V>,
): string {
	return (value.pick ?? value.picks ?? value.either).label;
}

// A pair's arrow is drawn faded until both its sides hold a value; a
// condition draws no arrow.
export function pairSet<V extends string | null>(terms: RuleTerms<V>): boolean {
	if (!terms.from) return false;
	return termSet(terms.from) && termSet(terms.to);
}

// The options of a pick that leads its picked form with a glyph: each option
// with no leading form of its own takes `PICKED_GLYPH`, the empty choice
// none, and the grouping is kept.
export function marked<V extends string | null>(
	options: readonly Option<V>[] | readonly OptionGroup<V>[],
): readonly Option<V>[] | readonly OptionGroup<V>[] {
	const mark = (option: Option<V>): Option<V> =>
		option.value === null || option.icon || option.status || option.avatar
			? option
			: { ...option, icon: PICKED_GLYPH };
	const first = options[0];
	if (first === undefined || !("options" in first))
		return (options as readonly Option<V>[]).map(mark);
	return (options as readonly OptionGroup<V>[]).map((group) => ({
		...group,
		options: group.options.map(mark),
	}));
}
