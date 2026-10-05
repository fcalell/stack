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

// What a rule's term picks.
export function termLabel<V extends string | null>(
	value: RuleValue<V>,
): string {
	return (value.pick ?? value.picks ?? value.either).label;
}

function labelsOf<V extends string | null>(
	options: readonly Option<V>[] | readonly OptionGroup<V>[],
	values: readonly V[],
): string[] {
	const list: readonly (Option<V> | OptionGroup<V>)[] = options;
	const flat = list.flatMap((one) => ("options" in one ? one.options : one));
	return values.flatMap(
		(value) => flat.find((option) => option.value === value)?.label ?? [],
	);
}

// What a rule's term holds, in words: the labels of its picked options, or the
// typed text; none while it holds nothing.
export function termHeld<V extends string | null>(
	value: RuleValue<V>,
): string[] {
	if (value.pick) {
		const { options, value: held } = value.pick;
		return held === undefined ? [] : labelsOf(options, [held]);
	}
	if (value.picks) return labelsOf(value.picks.options, value.picks.value);
	const { options, value: held } = value.either;
	if (isTyped(held)) return held.typed === "" ? [] : [held.typed];
	return held.picked === undefined ? [] : labelsOf(options, [held.picked]);
}

// What names a rule's remove act, so six rows' acts are six names: its first
// term's label, then what the rule holds (the operator between a condition's
// field and value).
export function ruleName<V extends string | null>(terms: RuleTerms<V>): string {
	if (terms.from)
		return [
			termLabel(terms.from),
			...termHeld(terms.from),
			...termHeld(terms.to),
		].join(", ");
	const { field, operator, value } = terms;
	return [
		field.label,
		...labelsOf(field.options, field.value === undefined ? [] : [field.value]),
		operator,
		...termHeld(value),
	].join(", ");
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
