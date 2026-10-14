import { Field } from "@base-ui/react/field";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import {
	type Datum,
	useDraft,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import type { Option, OptionGroup } from "@fcalell/ui-core/descriptors";
import {
	choose,
	chosenOf,
	type OptionChoice,
	type OptionSlots,
	optionBlocked,
	optionsOf,
} from "@fcalell/ui-core/list-state";
import { PAINT_ROWS } from "@fcalell/ui-core/paint";
import {
	lineBox,
	OPTION_CHILDREN,
	OPTION_GROUP_LABEL,
	OPTION_INDENT,
	OPTION_LINE,
	OPTION_LIST,
	OPTION_RADIO_DOT,
	OPTION_ROW,
	optionRadio,
	ROW_META_LINE,
	row,
	SELECT_GROUP,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { Fragment, type ReactNode, use, useId } from "react";
import type { Closed } from "../../lib/closed.ts";
import { GroupName } from "../../lib/field.ts";
import { PAINT_CONTROL, Painted } from "../../lib/paint.tsx";
import { useWords } from "../../lib/words.tsx";
import { CheckboxBase } from "../checkbox/base.tsx";
import { Chip } from "../chip/index.tsx";

const LIST = "flex flex-col";
const GROUP = "flex flex-col";
// The row is the label of its box or radio: a press anywhere toggles or
// chooses it, except while it is blocked.
const OPTION = "flex items-center";
const PRESS = "hover:bg-wash-hover active:bg-wash-press";
// A blocked option's label and reason.
const BLOCKED_INK = "text-ink-disabled";
// A label is the whole text of a choice: it wraps, and an unmarked row keeps
// the one-line row's height as its floor.
const OPTION_WHOLE = "min-h-row";
const LINE = "flex grow min-w-0 items-start";
// The box stands on its label's first line, a box one body line tall; the
// row is its target.
const BOX_LINE = "flex shrink-0 items-center h-lh";
// The field wrapper that disables the box is a flex box itself, so the box
// stays a flex item on the line.
const FIELD = "flex";
const LABEL = "min-w-0 grow";
const TEXT = "flex flex-col min-w-0 grow";
const DESCRIPTION_LINE = "flex flex-wrap items-center min-w-0";
// The radio is the box's size in its label's line, its dot centred; it is
// the focused element, so the base focus ring draws on it.
const RADIO =
	"relative inline-flex shrink-0 items-center justify-center data-disabled:border-edge data-disabled:bg-fill-disabled";
const CHILDREN = "flex";
const INDENT = "shrink-0";
const CHILDREN_BODY = "flex flex-col grow min-w-0";

/** Where an OptionList's options come from. */
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

type OptionListBase<V extends string, T> = OptionSource<T, V> & {
	/** What a chosen option opens, under the first one chosen at its label's start. */
	children?: ReactNode;
};

/** One choice: the chosen value or null. A selection paints the radios, inert, until its read lands and follows it until the viewer chooses. */
interface OneChoice<V extends string> {
	value: Datum<NoInfer<V> | null>;
	/** Hears the option chosen. */
	onChange: (value: V) => void;
}

/** Several choices: the chosen set. A selection of it paints as one choice, the placeholder being no array. */
interface SetChoice<V extends string> {
	value: Datum<readonly NoInfer<V>[]>;
	/** Hears the whole chosen set after a toggle. */
	onChange: (value: V[]) => void;
}

/** One choice or several from one list, static or from items: `value` one value or null draws radio rows, a set check rows. `V` is read off the options or the `option` map's `value`. */
export type OptionListProps<V extends string = string, T = unknown> = Closed &
	OptionListBase<V, T> &
	(OneChoice<V> | SetChoice<V>);

function groupsOf<V extends string>(
	options: readonly Option<V>[] | readonly OptionGroup<V>[],
): readonly { label?: string; options: readonly Option<V>[] }[] {
	const first = options[0];
	if (first === undefined || !("options" in first))
		return [{ options: options as readonly Option<V>[] }];
	return options as readonly OptionGroup<V>[];
}

// The rows a waiting `items` paints: `PAINT_ROWS` options, in one group when
// the map declares `group`. Which slots it declares is read by key, none run:
// the filler decides nothing but the shape, a label over the group and a
// description under each label.
function paintedGroups<V extends string>(
	slots: { description?: unknown; group?: unknown } = {},
): readonly Option<V>[] | readonly OptionGroup<V>[] {
	const options = Array.from({ length: PAINT_ROWS }, (_, at) => ({
		value: `painted-${at}` as V,
		label: "",
		description: slots.description === undefined ? undefined : "",
	}));
	return slots.group === undefined ? options : [{ label: "", options }];
}

function GroupLabel(props: { children: ReactNode }) {
	return (
		<p
			className={cn(
				OPTION_GROUP_LABEL,
				text({ role: "meta" }),
				textStrong({ role: "meta" }),
			)}
		>
			{props.children}
		</p>
	);
}

/** Option rows on a hairline card, each the Checkbox (several choices) or the radio (one choice, a radiogroup) on its label's first line, a description and the recommended mark on the line under it; the row under the pointer washes, the checked box or the ringed dot is the choice. The children stand under the first chosen option. Static `options` never paint; `items` paint `PAINT_ROWS` rows in the slots `option` declares while their read waits, and a `value` selection paints the marks, inert. The frame that holds the read draws its failed, missing and empty forms. */
export function OptionList<V extends string = string, T = unknown>(
	props: Closed & OptionListBase<V, T> & OneChoice<V>,
): ReactNode;
export function OptionList<V extends string = string, T = unknown>(
	props: Closed & OptionListBase<V, T> & SetChoice<V>,
): ReactNode;
export function OptionList<V extends string = string, T = unknown>(
	props: OptionListProps<V, T>,
): ReactNode;
export function OptionList<V extends string = string, T = unknown>(
	props: OptionListProps<V, T>,
) {
	const { children } = props;
	const words = useWords();
	const ids = useId();
	const named = use(GroupName);
	const [given] = useSelections([props.items] as const);
	const draft = useDraft<V | null | readonly V[]>(props.value);
	// The rows paint while their items wait; the marks paint too while the
	// value does, the labels then standing.
	const rowsPaint = given.painted;
	const painted = rowsPaint || draft.painted;
	// The placeholder is no array, so a painted value is one choice.
	const one = !Array.isArray(draft.value);
	const choice = {
		value: draft.painted ? (one ? null : []) : draft.value,
		onChange: (next: V | V[]) => {
			draft.edit(next);
			(props.onChange as (value: V | V[]) => void)(next);
		},
	} as OptionChoice<V>;
	const options = rowsPaint
		? paintedGroups<V>(props.option)
		: (props.options ?? optionsOf(given.value as readonly T[], props.option));
	const chosenValues = painted ? [] : chosenOf(choice);
	const first = chosenValues[0];
	const rows = groupsOf(options).map((group, at) => (
		// biome-ignore lint/a11y/useSemanticElements: a group of rows, not a form's fieldset
		<div
			key={group.label ?? at}
			role="group"
			aria-label={group.label}
			className={cn(SELECT_GROUP, GROUP)}
		>
			{group.label === undefined ? null : (
				<GroupLabel>
					{rowsPaint ? <Painted role="word" /> : group.label}
				</GroupLabel>
			)}
			{group.options.map((option, place) => {
				const chosen = chosenValues.includes(option.value);
				const blocked = optionBlocked(option, chosen);
				const meta = blocked ?? option.description;
				// A painted row is marked when the map declares a description.
				const marked = rowsPaint
					? option.description !== undefined
					: meta || option.recommended;
				const target = { labelledBy: `${ids}-${at}-${place}` };
				return (
					<Fragment key={option.value}>
						{/* biome-ignore lint/a11y/noLabelWithoutControl: the Checkbox or the radio inside is its control */}
						<label
							inert={painted || undefined}
							className={cn(
								row({ lines: marked ? "two" : "whole" }),
								OPTION_ROW,
								OPTION,
								blocked === undefined && !painted && PRESS,
								!marked && OPTION_WHOLE,
							)}
						>
							<span className={cn(OPTION_LINE, LINE)}>
								<span className={cn(lineBox({ role: "body" }), BOX_LINE)}>
									{one ? (
										<Radio.Root
											value={option.value}
											disabled={blocked !== undefined}
											aria-labelledby={target.labelledBy}
											className={cn(
												optionRadio({
													state: chosen ? "checked" : "unchecked",
												}),
												RADIO,
												painted && PAINT_CONTROL,
											)}
										>
											<Radio.Indicator className={OPTION_RADIO_DOT} />
										</Radio.Root>
									) : (
										<Field.Root
											disabled={blocked !== undefined}
											className={FIELD}
										>
											<CheckboxBase
												target={target}
												checked={chosen}
												onChange={() => choose(choice, option.value)}
												label={option.label}
												painted={painted}
											/>
										</Field.Root>
									)}
								</span>
								{marked ? (
									<span className={TEXT}>
										<span
											id={target.labelledBy}
											className={cn(
												text({ role: "body" }),
												blocked !== undefined && BLOCKED_INK,
											)}
										>
											{rowsPaint ? (
												<Painted role="phrase" at={place} />
											) : (
												option.label
											)}
										</span>
										<span className={cn(ROW_META_LINE, DESCRIPTION_LINE)}>
											{rowsPaint ? (
												<span className={text({ role: "meta" })}>
													<Painted role="phrase" at={place + 1} />
												</span>
											) : meta ? (
												<span
													className={cn(
														text({ role: "meta" }),
														blocked !== undefined && BLOCKED_INK,
													)}
												>
													{meta}
												</span>
											) : null}
											{option.recommended ? (
												<Chip family="neutral" label={words.recommended} />
											) : null}
										</span>
									</span>
								) : (
									<span
										id={target.labelledBy}
										className={cn(text({ role: "body" }), LABEL)}
									>
										{rowsPaint ? (
											<Painted role="phrase" at={place} />
										) : (
											option.label
										)}
									</span>
								)}
							</span>
						</label>
						{option.value === first && chosen && children ? (
							<div className={cn(OPTION_CHILDREN, CHILDREN)}>
								<span aria-hidden className={cn(OPTION_INDENT, INDENT)} />
								<div className={CHILDREN_BODY}>{children}</div>
							</div>
						) : null}
					</Fragment>
				);
			})}
		</div>
	));
	if (!one) {
		return (
			// biome-ignore lint/a11y/useSemanticElements: a group of rows, not a form's fieldset
			<div
				role="group"
				aria-labelledby={named?.labelledBy}
				className={cn(OPTION_LIST, LIST)}
			>
				{rows}
			</div>
		);
	}
	// One choice is a radiogroup: Base UI moves between its radios by the
	// arrows and chooses the one it reaches. Null, not undefined, keeps it
	// controlled while nothing is chosen.
	return (
		<RadioGroup<V | null>
			value={choice.value as V | null}
			onValueChange={(next) => {
				if (next !== null) choose(choice, next);
			}}
			aria-labelledby={named?.labelledBy}
			className={cn(OPTION_LIST, LIST)}
		>
			{rows}
		</RadioGroup>
	);
}
