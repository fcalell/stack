import type {
	IconAct,
	Option,
	OptionGroup,
} from "@fcalell/ui-core/descriptors";
import type { PickerFit } from "@fcalell/ui-core/variants";
import type { Closed } from "../../lib/closed.ts";
import { PickerBase } from "./base.tsx";

/** A pick that applies at once, outside a form: in a toolbar, a row or a definition. `V` is read off the options, so an enum's options pick that enum; an option whose value is `null` is the empty choice. */
export interface PickerProps<V extends string | null = string> extends Closed {
	/** What is picked: the trigger's name, and the touch sheet's title. */
	label: string;
	/** The choices, flat or under group labels; an option may carry a status or an avatar. */
	options: readonly Option<V>[] | readonly OptionGroup<V>[];
	/** The chosen option's value. */
	value?: NoInfer<V>;
	/** Hears the picked option's value. */
	onChange: (value: NoInfer<V>) => void;
	/** Where it stands: a field box (the default), or a row's trailing value in a pill. */
	fit?: PickerFit;
	/** The act that makes a new option, ending the list under a hairline. */
	act?: IconAct;
}

/** The field box showing the chosen label (the empty choice in the placeholder's ink), or a row's value and a chevron in a pill. It opens a popover of rows under the trigger's end on the desktop, the chosen one ticked, a search leading past six options and the act under a hairline after them; on touch a sheet of the same rows titled `label`. */
export function Picker<V extends string | null = string>({
	label,
	options,
	value,
	onChange,
	fit,
	act,
}: PickerProps<V>) {
	return (
		<PickerBase
			label={label}
			options={options}
			value={value}
			onChange={onChange}
			fit={fit}
			act={act}
		/>
	);
}
