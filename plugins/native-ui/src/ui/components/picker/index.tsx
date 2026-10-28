import type { Datum } from "@fcalell/plugin-api/tanstack-query";
import type {
	ChoiceSegment,
	IconLinkAct,
	LinkSegment,
	Option,
	OptionGroup,
} from "@fcalell/ui-core/descriptors";
import type { OptionSlots } from "@fcalell/ui-core/list-state";
import type { PickerFit } from "@fcalell/ui-core/variants";
import { type ReactElement, type ReactNode, use } from "react";
import type { IconAct } from "../../lib/act";
import type { Closed } from "../../lib/closed";
import { type Fielded, FieldOwned } from "../../lib/field";
import { FieldBody } from "../form-field";
import { HeldPicker } from "./base";
import { HeldList } from "./list";
import { HeldSegments, LinkSegments } from "./segments";

interface Shared<V extends string | null> extends Closed, Fielded {
	/** The hint drawn while nothing is chosen, in the placeholder's ink (a short phrase; truncates). None, it is nothing at the field fit placed alone, whose label stands over the box, and `label` at the other fits and in a toolbar. The label is also the sheet's title. */
	placeholder?: string;
	// A selection paints the trigger, inert, until its read lands.
	options: Datum<readonly Option<V>[] | readonly OptionGroup<V>[]>;
	// Where it stands: a field box (the default), a field box filling its
	// column (`bar`), or a row's trailing value in a control-radius box.
	// `list` stands the options in the page as rows, `segments` as one row of
	// segments.
	fit?: PickerFit;
	// The act that makes a new option, ending the list under a hairline: an act that runs, or a link to where it is made.
	act?: IconAct | IconLinkAct;
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

// The menu fits: a pick that applies at once, outside a form.
export type PickerMenuProps<V extends string | null = string> =
	| PickOneProps<V>
	| PickSeveralProps<V>;

// Where a list's options come from.
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

// The options of a list and what a chosen option opens.
export type PickerListBody<V extends string, T> = OptionSource<T, V> & {
	// What a chosen option opens, under the first one chosen at its label's
	// start.
	children?: ReactNode;
};

// What every list fit holds: its name, its fit and its body.
export type PickerListShape<V extends string, T> = PickerListBody<V, T> &
	Closed &
	Fielded & {
		fit: "list";
	};

// A list of one choice: the chosen value or null, radio rows. A selection
// paints the radios, inert, until its read lands and follows it until the
// viewer chooses. Once its read ended the control stands with no value and a
// change says why instead.
export type PickerListOneProps<
	V extends string = string,
	T = unknown,
> = PickerListShape<V, T> & {
	value: Datum<NoInfer<V> | null>;
	// Hears the option chosen. A promise it returns holds the viewer's
	// value while it pends; a refusal puts it back, with its reason.
	onChange: (value: V) => unknown;
};

// A list of several choices: the chosen set, check rows. A selection of it
// paints as one choice, the placeholder being no array.
export type PickerListSetProps<
	V extends string = string,
	T = unknown,
> = PickerListShape<V, T> & {
	value: Datum<readonly NoInfer<V>[]>;
	// Hears the whole chosen set after a toggle. A promise it returns holds
	// the viewer's value while it pends; a refusal puts it back, with its
	// reason.
	onChange: (value: V[]) => unknown;
};

// The list fit: one choice or several from one list, static or from items.
// `V` is read off the options or the `option` map's `value`.
export type PickerListProps<V extends string = string, T = unknown> =
	| PickerListOneProps<V, T>
	| PickerListSetProps<V, T>;

// The segments fit over choices: a view switch over a few options, one
// chosen.
export interface PickerSegmentsProps<V extends string = string>
	extends Closed,
		Fielded {
	fit: "segments";
	/** The options in order, each a word up to the short measure; the row scrolls sideways where the segments do not fit, so no label is cut for room. */
	options: readonly ChoiceSegment<V>[];
	// A selection paints the track, inert, until its read lands and follows it
	// until the viewer chooses. Once its read ended it stands with no value
	// and a choice says why instead.
	value: Datum<NoInfer<V>>;
	// A promise it returns holds the viewer's value while it pends; a refusal
	// puts it back, with its reason.
	onChange: (value: NoInfer<V>) => unknown;
}

// The segments fit over links: each option an `href` and a label. The one
// whose href is the route's path or its nearest parent (expo-router's
// pathname) is selected, and a press opens its href. It holds no value and
// hears no change: the route is its value.
export interface PickerTabsProps extends Closed {
	fit: "segments";
	options: readonly LinkSegment[];
	label?: never;
	description?: never;
	optional?: never;
	error?: never;
	value?: never;
	onChange?: never;
}

// A Picker in any of its fits, `V` the option value type.
export type PickerProps<V extends string | null = string, T = unknown> =
	| PickerMenuProps<V>
	| PickerListProps<Extract<V, string>, T>
	| PickerSegmentsProps<Extract<V, string>>
	| PickerTabsProps;

// Whether the segments are links: the tabs of a place.
const linked = (
	options: readonly (ChoiceSegment<string> | LinkSegment)[],
): options is readonly LinkSegment[] =>
	options.some((segment) => segment.href !== undefined);

// The pick of a place's options. Placed alone, the field fit, a list and
// choice segments draw their field (the label over them, the description or
// the error under); in a `FormField`'s children or a `Toolbar`, and at the
// `bar` and `row` fits, which read their label in their box, they are bare,
// the label their accessible name; the tabs of a place are links, no control,
// and take none. As a menu, a pick that applies at once,
// outside a form: the field box showing the chosen label (the empty choice,
// and no choice, in the placeholder's ink), or a row's value and a chevron in
// a control-radius box; with no value either shows `placeholder` (else
// `label`) in the placeholder's ink, and an option carrying a state shows as
// its status, one carrying a glyph leads with it. A tap opens the sheet of
// options titled `label`, `act` under a hairline after them. As a `list`
// (`fit="list"`), option rows on a hairline card, each the Checkbox (several
// choices) or the radio (one choice, a radiogroup) on its label's first line,
// the recommended mark (a glyph and its word) leading the line under it, then a description; the pressed
// row washes, the checked box or the ringed dot is the choice. The children
// stand under the first chosen option. Static `options` never paint; `items`
// paint `PAINT_ROWS` rows in the slots `option` declares while their read
// waits, and a `value` selection paints the marks, inert. A failed or missing
// `items` read says so in a line under the list. As `segments`
// (`fit="segments"`), a view switch over a few options, one chosen: a radio
// group. Given `href`s and no values, the segments are links, the tabs of a
// place.
export function Picker<V extends string | null = string>(
	props: PickOneProps<V>,
): ReactElement;
export function Picker<V extends string | null = string>(
	props: PickSeveralProps<V>,
): ReactElement;
export function Picker<V extends string = string, T = unknown>(
	props: PickerListOneProps<V, T>,
): ReactElement;
export function Picker<V extends string = string, T = unknown>(
	props: PickerListSetProps<V, T>,
): ReactElement;
export function Picker<V extends string = string>(
	props: PickerSegmentsProps<V>,
): ReactElement;
export function Picker(props: PickerTabsProps): ReactElement;
export function Picker<V extends string | null = string, T = unknown>(
	props: PickerProps<V, T>,
) {
	// The overloads type each fit's value and handler pairing; this call
	// reads them off the fit alone, so it cannot.
	const owned = use(FieldOwned);
	if (props.fit === "segments" && linked(props.options))
		return <LinkSegments options={props.options} />;
	if (
		props.fit === "list" ||
		props.fit === "segments" ||
		!props.fit ||
		props.fit === "field"
	) {
		const { label, description, optional, error, fit, ...control } =
			props as Fielded & { fit?: string };
		if (!owned) {
			const field = { label, description, optional, error, alone: true };
			if (fit === "list")
				return <FieldBody {...field} options={control as never} />;
			if (fit === "segments")
				return <FieldBody {...field} segments={control as never} />;
			return <FieldBody {...field} picker={control as never} />;
		}
	}
	if (props.fit === "list")
		return <HeldList {...(props as PickerListProps<Extract<V, string>, T>)} />;
	if (props.fit === "segments")
		return (
			<HeldSegments {...(props as PickerSegmentsProps<Extract<V, string>>)} />
		);
	const menu = props as PickerMenuProps<V>;
	return (
		<HeldPicker
			label={menu.label}
			placeholder={menu.placeholder}
			options={menu.options}
			fit={menu.fit}
			act={menu.act}
			value={menu.value as never}
			onChange={menu.onChange as never}
		/>
	);
}
