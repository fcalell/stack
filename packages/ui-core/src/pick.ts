// What a picker derives from its options and its value, in any of its fits: the search's threshold, the one-or-several split of a value, the option groups, the rows painted while they wait, the chip column's test and the link segment a location selects. Both platforms' `Picker` draws from it.
import type { LinkSegment, Option, OptionGroup } from "./descriptors.ts";
import { PAINT_ROWS } from "./paint.ts";
import type { ChipFamily } from "./tokens.ts";

/** The option count past which a picker's search leads the list. */
export const SEARCH_PAST = 6;

/** A pick of several: the selected values and the handler of the next set. */
export interface Several<V extends string | null> {
	value: readonly V[];
	onChange: (value: V[]) => void;
}

/** One run of options under an optional label. */
export interface Grouped<V extends string | null> {
	label?: string;
	options: readonly Option<V>[];
}

/** A picker's options, flat or in groups. */
export type PickOptions<V extends string | null> =
	| readonly Option<V>[]
	| readonly OptionGroup<V>[];

/** The options as runs under their group labels; a flat list is one unlabelled run. */
export function groupsOf<V extends string | null>(
	options: PickOptions<V>,
): readonly Grouped<V>[] {
	const first = options[0];
	if (first === undefined || !("options" in first))
		return [{ options: options as readonly Option<V>[] }];
	return options as readonly OptionGroup<V>[];
}

/** The rows a waiting `items` paints: `PAINT_ROWS` options, in one group when the map declares `group`. */
export function paintedGroups<V extends string | null>(
	slots: { description?: unknown; group?: unknown } = {},
): PickOptions<V> {
	const options = Array.from({ length: PAINT_ROWS }, (_, at) => ({
		value: `painted-${at}` as V,
		label: "",
		description: slots.description === undefined ? undefined : "",
	}));
	return slots.group === undefined ? options : [{ label: "", options }];
}

/** Whether a chip column's option draws as its chip alone, its description unsaid. */
export const asChip = (
	option: Option<string | null>,
	chip?: ChipFamily,
): chip is ChipFamily => chip !== undefined && option.value !== null;

/** The path of a location or an href: its query and its hash set aside. */
const pathOf = (route: string) => route.replace(/[?#].*$/, "");

/** The link segment a location selects: the one whose href is the location's path or its nearest parent, the longest such href, so a section's own tab is selected below it and no tab is while the location is elsewhere. */
export function linkAt(
	links: readonly LinkSegment[],
	location: string,
): LinkSegment | undefined {
	const here = pathOf(location);
	let found: LinkSegment | undefined;
	let length = -1;
	for (const link of links) {
		const path = pathOf(link.href).replace(/\/$/, "");
		const held = here === path || here.startsWith(`${path}/`);
		if (held && path.length > length) {
			found = link;
			length = path.length;
		}
	}
	return found;
}
