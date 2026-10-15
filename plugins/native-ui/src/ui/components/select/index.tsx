import type { Datum } from "@fcalell/plugin-api/tanstack-query";
import type { Option, OptionGroup } from "@fcalell/ui-core/descriptors";
import { useHeldDraft } from "../../lib/act";
import type { Closed } from "../../lib/closed";
import { SelectBase } from "./base";

// `V` is read off the options alone, so an enum's options pick that enum and
// a value outside them is a type error. An option whose value is `null` is
// the empty choice; it and no value at all draw the placeholder.
export interface SelectProps<V extends string | null = string> extends Closed {
	// A selection paints the trigger, inert, until its read lands and follows it
	// until the viewer picks.
	value?: Datum<NoInfer<V>>;
	// A promise it returns holds the viewer's value while it pends; a refusal
	// puts it back, with its reason.
	onChange: (value: NoInfer<V>) => unknown;
	// A selection paints the trigger, inert, until its read lands.
	options: Datum<readonly Option<V>[] | readonly OptionGroup<V>[]>;
	/** The hint drawn while nothing is chosen; never the field's name (a short phrase; truncates). */
	placeholder?: string;
}

// One choice among options, the control a `FormField` labels: the field box
// showing the chosen label and a chevron, `edge-error` when its `FormField`
// is in error, the disabled fill when its field is disabled; a tap opens the
// option sheet.
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
