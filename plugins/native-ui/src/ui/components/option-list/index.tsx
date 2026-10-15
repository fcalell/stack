import type { Datum } from "@fcalell/plugin-api/tanstack-query";
import type { Option, OptionGroup } from "@fcalell/ui-core/descriptors";
import type { OptionSlots } from "@fcalell/ui-core/list-state";
import type { ReactNode } from "react";
import { useHeldDraft } from "../../lib/act";
import type { Closed } from "../../lib/closed";
import { OptionListBase } from "./base";

// Where an OptionList's options come from.
type OptionSource<T, V extends string> =
	| {
			// The choices, flat or under group labels. They are constants: they
			// never paint.
			options: readonly Option<V>[] | readonly OptionGroup<V>[];
			items?: never;
			option?: never;
	  }
	| {
			// The items the check rows draw, constants or a selection. While its
			// read waits, `PAINT_ROWS` rows paint in the slots `option` declares,
			// inert.
			items: Datum<readonly T[]>;
			// One function per check row slot, each called with an item; the slots
			// given are the shape the painted rows draw.
			option: OptionSlots<T, V>;
			options?: never;
	  };

export type OptionListShape<V extends string, T> = OptionSource<T, V> & {
	// What a chosen option opens, under the first one chosen at its label's
	// start.
	children?: ReactNode;
};

// One choice: the chosen value or null. A selection paints the radios, inert,
// until its read lands and follows it until the viewer chooses.
interface OneChoice<V extends string> {
	value: Datum<NoInfer<V> | null>;
	// Hears the option chosen. A promise it returns holds the viewer's value
	// while it pends; a refusal puts it back, with its reason.
	onChange: (value: V) => unknown;
}

// Several choices: the chosen set. A selection of it paints as one choice, the
// placeholder being no array.
interface SetChoice<V extends string> {
	value: Datum<readonly NoInfer<V>[]>;
	// Hears the whole chosen set after a toggle. A promise it returns holds the
	// viewer's value while it pends; a refusal puts it back, with its reason.
	onChange: (value: V[]) => unknown;
}

// One choice or several from one list, static or from items: `value` one
// value or null draws radio rows, a set check rows. `V` is read off the
// options or the `option` map's `value`.
export type OptionListProps<V extends string = string, T = unknown> = Closed &
	OptionListShape<V, T> &
	(OneChoice<V> | SetChoice<V>);

// Option rows on a hairline card, each the Checkbox (several choices) or the
// radio (one choice, a radiogroup) on its label's
// first line, a description and the recommended mark on the line under it;
// the pressed row washes, the checked box or the ringed dot is the choice.
// The children stand under the first chosen option. Static `options` never
// paint; `items` paint `PAINT_ROWS` rows in the slots `option` declares while
// their read waits, and a `value` selection paints the marks, inert. A failed
// or missing `items` read says so in a line under the list.
export function OptionList<V extends string = string, T = unknown>(
	props: Closed & OptionListShape<V, T> & OneChoice<V>,
): ReactNode;
export function OptionList<V extends string = string, T = unknown>(
	props: Closed & OptionListShape<V, T> & SetChoice<V>,
): ReactNode;
export function OptionList<V extends string = string, T = unknown>(
	props: OptionListProps<V, T>,
): ReactNode;
export function OptionList<V extends string = string, T = unknown>(
	props: OptionListProps<V, T>,
) {
	const { value, onChange, ...shape } = props;
	return (
		<OptionListBase<V, T>
			{...(shape as OptionListShape<V, T>)}
			draft={useHeldDraft<V | null | readonly V[]>(value)}
			onChange={onChange as (next: V | V[]) => unknown}
		/>
	);
}
