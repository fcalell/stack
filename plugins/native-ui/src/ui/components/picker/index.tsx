import type {
	IconAct,
	Option,
	OptionGroup,
} from "@fcalell/ui-core/descriptors";
import type { PickerFit } from "@fcalell/ui-core/variants";
import type { Closed } from "../../lib/closed";
import { PickerBase } from "./base";

// `V` is read off the options alone, so an enum's options pick that enum and
// a value outside them is a type error. An option whose value is `null` is
// the empty choice: it makes the pick nullable, `onChange` hears `null` for
// it, and it reads as a placeholder, in `ink-meta`.
export interface PickerProps<V extends string | null = string> extends Closed {
	// What is picked: the trigger's name, and the sheet's title.
	label: string;
	options: readonly Option<V>[] | readonly OptionGroup<V>[];
	value?: NoInfer<V>;
	onChange: (value: NoInfer<V>) => void;
	// Where it stands: a field box (the default), or a row's trailing value in
	// a pill.
	fit?: PickerFit;
	// The act that makes a new option, ending the list under a hairline.
	act?: IconAct;
}

// A pick that applies at once, outside a form: the field box showing the
// chosen label (the empty choice in the placeholder's ink), or a row's value
// and a chevron in a pill; with no value either shows `label` in the
// placeholder's ink, and an option carrying a state shows as its status, one
// carrying a glyph leads with it. A tap opens the sheet of options titled
// `label`, `act` under a hairline after them.
export function Picker<V extends string | null = string>(
	props: PickerProps<V>,
) {
	return <PickerBase {...props} />;
}
