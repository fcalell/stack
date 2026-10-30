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
import type { IconAct } from "../../lib/act.ts";
import type { Closed } from "../../lib/closed.ts";
import { type Fielded, FieldOwned } from "../../lib/field.ts";
import { FieldBody } from "../form-field/index.tsx";
import { HeldPicker } from "./base.tsx";
import { HeldList } from "./list.tsx";
import { HeldSegments, LinkSegments } from "./segments.tsx";

interface Shared<V extends string | null> extends Closed, Fielded {
	/** The hint drawn while nothing is chosen, in the placeholder's ink (a short phrase; truncates). None, it is nothing at the field fit, whose label stands over the box, and `label` at the other fits. The label is also the touch sheet's title. */
	placeholder?: string;
	/** The choices, flat or under group labels; an option may carry a status, an avatar or a chip. A selection paints the trigger, inert, until its read lands. */
	options: Datum<readonly Option<V>[] | readonly OptionGroup<V>[]>;
	/** Where it stands: a `FormField`'s field box (the default), a bar (`bar`: a toolbar's filter, a rule's term, a table cell's edit: the field box in the meta ink, quiet while empty, a filter reading its label then its value), a row's trailing value (`row`) in a control-radius box (where the chosen option carries a state, the compact state pill holding its chevron), or a pill (`pill`) in a Pane's bar: the control height, a hairline border, the chosen label truncating at the popover's width and a mark-ink chevron. `list` stands the options in the page as rows, `segments` as one row of segments. */
	fit?: PickerFit;
	/** The act that makes a new option, ending the list under a hairline: an act that runs, or a link to where it is made. */
	act?: IconAct | IconLinkAct;
}

/** A pick of one option. */
export interface PickOneProps<V extends string | null = string>
	extends Shared<V> {
	/** The chosen option's value. A selection paints the trigger, inert, until its read lands and follows it until the viewer picks. Once its read ended the control stands with no value and a change says why instead. */
	value?: Datum<NoInfer<V>>;
	/** Hears the picked option's value. Return the save's promise and the viewer's value holds while it pends; a refusal puts it back, with its reason. */
	onChange: (value: NoInfer<V>) => unknown;
}

/** A pick of several options. */
export interface PickSeveralProps<V extends string | null = string>
	extends Shared<V> {
	/** The chosen options' values. A selection of them paints as a single pick, the placeholder being no array. */
	value: Datum<readonly NoInfer<V>[]>;
	/** Hears the chosen values once an option is ticked or a chip removed. Return the save's promise and the viewer's value holds while it pends; a refusal puts it back, with its reason. */
	onChange: (value: NoInfer<V>[]) => unknown;
}

/** The menu fits: a pick that applies at once, outside a form: in a toolbar, a row, a definition or a rule. `V` is read off the options, so an enum's options pick that enum; an option whose value is `null` is the empty choice. A `value` that is an array picks several. */
export type PickerMenuProps<V extends string | null = string> =
	| PickOneProps<V>
	| PickSeveralProps<V>;

/** Where a list's options come from. */
type OptionSource<T, V extends string> =
	| {
			/** The choices, flat or under group labels. They are constants: they never paint. */
			options: readonly Option<V>[] | readonly OptionGroup<V>[];
			items?: never;
			option?: never;
	  }
	| {
			/** The items the check rows draw, constants or a selection. While its read waits, `PAINT_ROWS` rows paint in the slots `option` declares, inert. */
			items: Datum<readonly T[]>;
			/** One function per check row slot, each called with an item; the slots given are the shape the painted rows draw. */
			option: OptionSlots<T, V>;
			options?: never;
	  };

/** The options of a list and what a chosen option opens. */
export type PickerListBody<V extends string, T> = OptionSource<T, V> & {
	/** What a chosen option opens, under the first one chosen at its label's start. */
	children?: ReactNode;
};

/** What every list fit holds: its name, its fit and its body. */
export type PickerListShape<V extends string, T> = PickerListBody<V, T> &
	Closed &
	Fielded & {
		fit: "list";
	} & (
		| { headed?: never }
		| {
				/** The list is the body of a titled `Section` that heads it: it draws no field, so the name stands once, as the Section's title. `label` is then only its accessible name (the title's words), and the Section's `description` describes it, so it takes no description, `optional` word or `error` of its own. */
				headed: true;
				description?: never;
				optional?: never;
				error?: never;
		  }
	);

/** A list of one choice: the chosen value or null, radio rows. A selection paints the radios, inert, until its read lands and follows it until the viewer chooses. Once its read ended the control stands with no value and a change says why instead. */
export type PickerListOneProps<
	V extends string = string,
	T = unknown,
> = PickerListShape<V, T> & {
	value: Datum<NoInfer<V> | null>;
	/** Hears the option chosen. Return the save's promise and the viewer's value holds while it pends; a refusal puts it back, with its reason. */
	onChange: (value: V) => unknown;
};

/** A list of several choices: the chosen set, check rows. A selection of it paints as one choice, the placeholder being no array. */
export type PickerListSetProps<
	V extends string = string,
	T = unknown,
> = PickerListShape<V, T> & {
	value: Datum<readonly NoInfer<V>[]>;
	/** Hears the whole chosen set after a toggle. Return the save's promise and the viewer's value holds while it pends; a refusal puts it back, with its reason. */
	onChange: (value: V[]) => unknown;
};

/** The list fit: one choice or several from one list, static or from items. `V` is read off the options or the `option` map's `value`. */
export type PickerListProps<V extends string = string, T = unknown> =
	| PickerListOneProps<V, T>
	| PickerListSetProps<V, T>;

/** The segments fit over choices: a view switch over a few options, one chosen. */
export interface PickerSegmentsProps<V extends string = string>
	extends Closed,
		Fielded {
	fit: "segments";
	/** The options in order, each a word up to the short measure; the track scrolls sideways where the segments do not fit, so no label is cut for room. */
	options: readonly ChoiceSegment<V>[];
	/** The chosen option's value. A selection paints the track, inert, until its read lands and follows it until the viewer chooses. Once its read ended the control stands with no value and a change says why instead. */
	value: Datum<NoInfer<V>>;
	/** Hears the chosen option's value. Return the save's promise and the viewer's value holds while it pends; a refusal puts it back, with its reason. */
	onChange: (value: NoInfer<V>) => unknown;
}

/** The segments fit over links, the tabs of a place: each option an `href` and a label. The one whose href is the location's path or its nearest parent is selected, and a press opens its href in place; where the tabs do not fit, the track scrolls sideways (no label is cut for room) with the selected tab scrolled into view. It holds no value and hears no change: the location is its value. */
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

/** A Picker in any of its fits, `V` the option value type: a menu (a field box or a row's value opening a popover), a `list` of rows in the page, or `segments`. */
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

/** The pick of a place's options. As a menu, the field box showing the chosen label (the empty choice, and no choice, in the placeholder's ink), or a row's value and a chevron in a control-radius box: it opens a popover of rows under the trigger's end on the desktop, the chosen one ticked, a search leading past six options and the act under a hairline after them; on touch a sheet of the same rows titled `label`. Given an array it picks several: the rows tick and the list stays open, and the box holds one removable chip per value. As a `list` (`fit="list"`), option rows on a hairline card, each the Checkbox (several choices) or the radio (one choice, a radiogroup) on its label's first line, the recommended mark (a glyph and its word) leading the line under it, then a description; the row under the pointer washes, the checked box or the ringed dot is the choice. The children stand under the first chosen option. Placed alone it draws its field; `headed`, the body of a titled `Section`, it draws none, the title naming it. Static `options` never paint; `items` paint `PAINT_ROWS` rows in the slots `option` declares while their read waits, and a `value` selection paints the marks, inert. The frame that holds the read draws its failed, missing and empty forms. As `segments` (`fit="segments"`), segments an inside gap apart on no ground and no border, the chosen one under the selection wash in body ink at weight 500, the others in meta ink, washing and taking the body ink under the pointer; a radio group whose arrow keys move the choice. Given `href`s and no values, the segments are links, the tabs of a place. */
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
	// reads them off the fit alone, so it cannot. Placed alone, the field fit,
	// a list and choice segments draw their field; the tabs are a place's
	// links, and the bar, row and pill fits read their label in their box.
	const owned = use(FieldOwned);
	if (props.fit === "segments" && linked(props.options))
		return <LinkSegments options={props.options} />;
	if (
		props.fit === "list" ||
		props.fit === "segments" ||
		!props.fit ||
		props.fit === "field"
	) {
		const { label, description, optional, error, fit, headed, ...control } =
			props as Fielded & { fit?: string; headed?: true };
		// An owner names the control, and a `headed` list's name is its Section's
		// title: neither draws a field.
		if (owned || (headed && fit === "list")) {
			if (fit === "list")
				return (
					<HeldList {...(props as PickerListProps<Extract<V, string>, T>)} />
				);
			if (fit === "segments")
				return (
					<HeldSegments
						{...(props as PickerSegmentsProps<Extract<V, string>>)}
					/>
				);
		} else {
			const field = { label, description, optional, error, alone: true };
			if (fit === "list")
				return <FieldBody {...field} options={control as never} />;
			if (fit === "segments")
				return <FieldBody {...field} segments={control as never} />;
			return <FieldBody {...field} picker={control as never} />;
		}
	}
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
