import type {
	IconAct,
	Option,
	OptionGroup,
} from "@fcalell/ui-core/descriptors";
import type { PickerFit } from "@fcalell/ui-core/variants";
import type { ReactElement } from "react";
import type { Closed } from "../../lib/closed.ts";
import { isSeveral, PickerBase } from "./base.tsx";

interface Shared<V extends string | null> extends Closed {
	/** What is picked: the trigger's name, and the touch sheet's title (a short phrase; read aloud on the trigger, wraps as the sheet's title). */
	label: string;
	/** The choices, flat or under group labels; an option may carry a status, an avatar or a chip. */
	options: readonly Option<V>[] | readonly OptionGroup<V>[];
	/** Where it stands: a field box (the default), a field box filling its column (`bar`), or a row's trailing value in a control-radius box. */
	fit?: PickerFit;
	/** The act that makes a new option, ending the list under a hairline. */
	act?: IconAct;
}

/** A pick of one option. */
export interface PickOneProps<V extends string | null = string>
	extends Shared<V> {
	/** The chosen option's value. */
	value?: NoInfer<V>;
	/** Hears the picked option's value. */
	onChange: (value: NoInfer<V>) => void;
}

/** A pick of several options. */
export interface PickSeveralProps<V extends string | null = string>
	extends Shared<V> {
	/** The chosen options' values. */
	value: readonly NoInfer<V>[];
	/** Hears the chosen values once an option is ticked or a chip removed. */
	onChange: (value: NoInfer<V>[]) => void;
}

/** A pick that applies at once, outside a form: in a toolbar, a row, a definition or a rule. `V` is read off the options, so an enum's options pick that enum; an option whose value is `null` is the empty choice. A `value` that is an array picks several. */
export type PickerProps<V extends string | null = string> =
	| PickOneProps<V>
	| PickSeveralProps<V>;

/** The field box showing the chosen label (the empty choice in the placeholder's ink), or a row's value and a chevron in a control-radius box. It opens a popover of rows under the trigger's end on the desktop, the chosen one ticked, a search leading past six options and the act under a hairline after them; on touch a sheet of the same rows titled `label`. Given an array it picks several: the rows tick and the list stays open, and the box holds one removable chip per value. */
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
