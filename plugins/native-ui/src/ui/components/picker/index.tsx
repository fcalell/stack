import type {
	IconAct,
	Option,
	OptionGroup,
} from "@fcalell/ui-core/descriptors";
import type { PickerFit } from "@fcalell/ui-core/variants";
import type { ReactElement } from "react";
import type { Closed } from "../../lib/closed";
import { isSeveral, PickerBase } from "./base";

interface Shared<V extends string | null> extends Closed {
	// What is picked: the trigger's name, and the sheet's title.
	label: string;
	options: readonly Option<V>[] | readonly OptionGroup<V>[];
	// Where it stands: a field box (the default), a field box filling its
	// column (`bar`), or a row's trailing value in a pill.
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
	value?: NoInfer<V>;
	onChange: (value: NoInfer<V>) => void;
}

// A `value` that is an array picks several: the rows tick and the sheet stays
// open, and the box holds one removable chip per value.
export interface PickSeveralProps<V extends string | null = string>
	extends Shared<V> {
	value: readonly NoInfer<V>[];
	onChange: (value: NoInfer<V>[]) => void;
}

export type PickerProps<V extends string | null = string> =
	| PickOneProps<V>
	| PickSeveralProps<V>;

// A pick that applies at once, outside a form: the field box showing the
// chosen label (the empty choice in the placeholder's ink), or a row's value
// and a chevron in a pill; with no value either shows `label` in the
// placeholder's ink, and an option carrying a state shows as its status, one
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
	const { label, options, fit, act } = props;
	if (isSeveral(props))
		return (
			<PickerBase
				label={label}
				options={options}
				fit={fit}
				act={act}
				value={props.value}
				onChange={props.onChange}
			/>
		);
	return (
		<PickerBase
			label={label}
			options={options}
			fit={fit}
			act={act}
			value={props.value}
			onChange={props.onChange}
		/>
	);
}
