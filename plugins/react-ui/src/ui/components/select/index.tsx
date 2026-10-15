import type { Datum } from "@fcalell/plugin-api/tanstack-query";
import type { Option, OptionGroup } from "@fcalell/ui-core/descriptors";
import { useHeldDraft } from "../../lib/act.ts";
import type { Closed } from "../../lib/closed.ts";
import { SelectBase } from "./base.tsx";

/** One choice among options, the control a `FormField` labels, describes and marks in error. `V` is read off the options, so an enum's options pick that enum. */
export interface SelectProps<V extends string | null = string> extends Closed {
	/** The chosen option's value; none draws the placeholder. A selection paints the trigger, inert, until its read lands and follows it until the viewer picks. */
	value?: Datum<NoInfer<V>>;
	/** Hears the picked option's value; `null` for an option whose value is `null` (the empty choice). Return the save's promise and the viewer's value holds while it pends; a refusal puts it back, with its reason. */
	onChange: (value: NoInfer<V>) => unknown;
	/** The choices, flat or under group labels. A selection paints the trigger, inert, until its read lands. */
	options: Datum<readonly Option<V>[] | readonly OptionGroup<V>[]>;
	/** The hint drawn while nothing is chosen; never the field's name (a short phrase; truncates). */
	placeholder?: string;
}

/** The field box showing the chosen label and a chevron; it opens a popover of rows under group labels, the highlighted row washed and the chosen one ticked. Base UI supplies the listbox, its keyboard and its typeahead. */
export function Select<V extends string | null = string>({
	value,
	onChange,
	options,
	placeholder,
}: SelectProps<V>) {
	return (
		<SelectBase<V>
			draft={useHeldDraft<V | undefined>(value)}
			onChange={onChange}
			options={options}
			placeholder={placeholder}
		/>
	);
}
