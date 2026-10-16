import type { Datum } from "@fcalell/plugin-api/tanstack-query";
import type {
	IconAct,
	Option,
	OptionGroup,
} from "@fcalell/ui-core/descriptors";
import type { PickerFit } from "@fcalell/ui-core/variants";
import type { ReactElement } from "react";
import type { Closed } from "../../lib/closed";
import { HeldPicker } from "./base";

interface Shared<V extends string | null> extends Closed {
	/** What is picked: the trigger's name, and the sheet's title (a short phrase; read aloud on the trigger, wraps as the sheet's title). */
	label: string;
	/** The hint drawn while nothing is chosen, in the placeholder's ink (a short phrase; truncates). None, it is `label` outside a `FormField`, and nothing inside one, whose own label stands over the box. */
	placeholder?: string;
	// A selection paints the trigger, inert, until its read lands.
	options: Datum<readonly Option<V>[] | readonly OptionGroup<V>[]>;
	// Where it stands: a field box (the default), a field box filling its
	// column (`bar`), or a row's trailing value in a control-radius box.
	fit?: PickerFit;
	// The act that makes a new option, ending the list under a hairline.
	act?: IconAct;
}

// `V` is read off the options alone, so an enum's options pick that enum and
// a value outside them is a type error. An option whose value is `null` is
// the empty choice: it makes the pick nullable, `onChange` hears `null` for
// it, and it reads as a placeholder, in `ink-meta`.
export interface PickOneProps<V extends string | null = string>
	extends Shared<V> {
	// A selection paints the trigger, inert, until its read lands and follows
	// it until the viewer picks. Once its read ended it stands empty and
	// opening it says why instead.
	value?: Datum<NoInfer<V>>;
	// A promise it returns holds the viewer's value while it pends; a refusal
	// puts it back, with its reason.
	onChange: (value: NoInfer<V>) => unknown;
}

// A `value` that is an array picks several: the rows tick and the sheet stays
// open, and the box holds one removable chip per value.
export interface PickSeveralProps<V extends string | null = string>
	extends Shared<V> {
	// A selection of them paints as a single pick, the placeholder being no
	// array.
	value: Datum<readonly NoInfer<V>[]>;
	// A promise it returns holds the viewer's value while it pends; a refusal
	// puts it back, with its reason.
	onChange: (value: NoInfer<V>[]) => unknown;
}

export type PickerProps<V extends string | null = string> =
	| PickOneProps<V>
	| PickSeveralProps<V>;

// A pick that applies at once, outside a form: the field box showing the
// chosen label (the empty choice, and no choice, in the placeholder's ink), or a row's value
// and a chevron in a control-radius box; with no value either shows `placeholder` (else
// `label`) in the placeholder's ink, and an option carrying a state shows as its status, one
// carrying a glyph leads with it. A tap opens the sheet of options titled
// `label`, `act` under a hairline after them.
export function Picker<V extends string | null = string>(
	props: PickOneProps<V>,
): ReactElement;
export function Picker<V extends string | null = string>(
	props: PickSeveralProps<V>,
): ReactElement;
export function Picker<V extends string | null = string>(
	props: PickerProps<V>,
) {
	const { label, placeholder, options, fit, act } = props;
	// The value and its handler are one pick or several, which the base reads
	// off the value it draws; the overloads type that pairing, this call cannot.
	return (
		<HeldPicker
			label={label}
			placeholder={placeholder}
			options={options}
			fit={fit}
			act={act}
			value={props.value as never}
			onChange={props.onChange as never}
		/>
	);
}
