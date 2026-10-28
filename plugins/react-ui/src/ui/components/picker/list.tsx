import { Field } from "@base-ui/react/field";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import type { Draft } from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import type { Option } from "@fcalell/ui-core/descriptors";
import {
	choose,
	chosenOf,
	type OptionChoice,
	type OptionSlots,
	optionBlocked,
	optionsOf,
} from "@fcalell/ui-core/list-state";
import { groupsOf, paintedGroups } from "@fcalell/ui-core/pick";
import {
	BLOCK_IN,
	LINE_IN,
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
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import {
	memo,
	type ReactNode,
	use,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { useHeldDraft } from "../../lib/act.ts";
import { useDrawn } from "../../lib/arrive.ts";
import { GroupName } from "../../lib/field.ts";
import { PAINT_CONTROL, Painted } from "../../lib/paint.tsx";
import { PARTS_ITEMS, PartsLine } from "../../lib/parts-line.tsx";
import { OptionsLine, useOptions } from "../../lib/read.tsx";
import { sameBy } from "../../lib/same-by.ts";
import { Window } from "../../lib/window.tsx";
import { useWords } from "../../lib/words.tsx";
import { BooleanMark } from "../row/marks.tsx";
import { HeldCheckbox } from "../switch/checkbox.tsx";
import type { PickerListBody, PickerListProps } from "./index.tsx";

const LIST = "flex flex-col";
const GROUP = "flex flex-col";
// A fieldset's floor is its content's width; the rows' is their column's.
const FIELDSET = "min-w-0";
// The row is the label of its box or radio: a press anywhere toggles or
// chooses it, except while it is blocked.
const OPTION = "flex items-center";
const PRESS = "hover:bg-wash-hover active:bg-wash-press";
// A blocked option's label and reason.
const BLOCKED_INK = "text-ink-disabled";
// A label is the whole text of a choice: it wraps, and an unmarked row keeps
// the one-line row's height as its floor.
const OPTION_WHOLE = "py-gap";
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
const MARKED_LINE = "items-center min-w-0 break-words";
// The radio is the box's size in its label's line, its dot centred; it is
// the focused element, so the base focus ring draws on it.
const RADIO =
	"relative inline-flex shrink-0 items-center justify-center data-disabled:border-edge data-disabled:bg-fill-disabled";
const CHILDREN = "flex";
const CHILDREN_BODY = "flex flex-col grow min-w-0";

// A group's label is its fieldset's legend.
function GroupLabel(props: { children: ReactNode }) {
	return (
		<legend
			className={cn(
				OPTION_GROUP_LABEL,
				text({ role: "meta" }),
				textStrong({ role: "meta" }),
			)}
		>
			{props.children}
		</legend>
	);
}

// One option's row, its children under it when it is the first chosen: a
// row's own element, so a window can place it. It reads its place among its
// group's options (`place` of `size`), which the rows a window leaves
// unmounted do not tell, and hears its press through `toggle`, so a refetch
// that changes one option renders that row alone.
interface OptionRowProps<V extends string> {
	option: Option<V>;
	place: number;
	size: number;
	chosen: boolean;
	/** One choice (a radio) or several (a box). */
	one: boolean;
	/** The rows paint (their items wait). */
	rowsPaint: boolean;
	/** The marks paint, the rows or the value waiting. */
	painted: boolean;
	toggle: (value: V) => void;
	/** The children of the list, on the first chosen option alone. */
	children?: ReactNode;
}

// The chosen option's children: a block, in when the option is chosen and out
// when it is left. They fade in as they mount, when the list was already drawn.
function OptionChildren(props: { fade: boolean; children: ReactNode }) {
	const [fades] = useState(props.fade);
	return (
		<div className={cn(OPTION_CHILDREN, CHILDREN, fades && BLOCK_IN)}>
			<div className={cn(OPTION_INDENT, CHILDREN_BODY)}>{props.children}</div>
		</div>
	);
}

function OptionRowBase<V extends string>(props: OptionRowProps<V>) {
	const { option, place, size, chosen, one, rowsPaint, painted, children } =
		props;
	const words = useWords();
	const drawn = useDrawn();
	const blocked = optionBlocked(option, chosen);
	const meta = blocked ?? option.description;
	// The recommended mark leads the meta line (voice 9), so a recommended
	// option is two lines, its label keeping the row's width at every size.
	const recommended = !rowsPaint && option.recommended === true;
	// A painted row is marked when the map declares a description.
	const marked = rowsPaint
		? option.description !== undefined
		: Boolean(meta) || recommended;
	const target = { labelledBy: useId() };
	// The description under the label: beside the recommended mark it is a part
	// of the mark's line, led by its middle dot, as a row's meta parts follow
	// its marks (a dot that would start a line is clipped away).
	const said = rowsPaint ? (
		<span className={text({ role: "meta" })}>
			<Painted role="phrase" at={place + 1} />
		</span>
	) : meta ? (
		<span
			key={blocked}
			className={cn(
				text({ role: "meta" }),
				blocked !== undefined && cn(BLOCKED_INK, LINE_IN),
			)}
		>
			{meta}
		</span>
	) : null;
	const described = said !== null;
	return (
		<div className={GROUP}>
			{/* biome-ignore lint/a11y/noLabelWithoutControl: the Checkbox or the radio inside is its control */}
			<label
				inert={painted || undefined}
				className={cn(
					row(),
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
								aria-setsize={size}
								aria-posinset={place + 1}
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
							<Field.Root disabled={blocked !== undefined} className={FIELD}>
								<HeldCheckbox
									target={target}
									checked={chosen}
									onChange={() => props.toggle(option.value)}
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
							<span
								className={
									recommended && described
										? cn(PARTS_ITEMS, MARKED_LINE)
										: cn(ROW_META_LINE, DESCRIPTION_LINE)
								}
							>
								{recommended ? (
									<BooleanMark
										mark={{ flag: "ThumbsUp", label: words.recommended }}
									/>
								) : null}
								{recommended && described ? (
									<PartsLine parts={[said]} form="items" led />
								) : (
									said
								)}
							</span>
						</span>
					) : (
						<span
							id={target.labelledBy}
							className={cn(text({ role: "body" }), LABEL)}
						>
							{rowsPaint ? <Painted role="phrase" at={place} /> : option.label}
						</span>
					)}
				</span>
			</label>
			{children ? (
				<OptionChildren fade={drawn}>{children}</OptionChildren>
			) : null}
		</div>
	);
}

const OptionRow = memo(OptionRowBase, sameBy("option")) as typeof OptionRowBase;

// One group of options: its label over its rows. The rows stand in a box of
// their own, so a long group windows them (a label stays out of the box), the
// radio that holds the tab stop kept mounted.
function OptionGroupBox<V extends string>(props: {
	group: { label?: string; options: readonly Option<V>[] };
	one: boolean;
	rowsPaint: boolean;
	painted: boolean;
	chosenValues: readonly V[];
	toggle: (value: V) => void;
	children?: ReactNode;
}) {
	const { group, chosenValues } = props;
	const box = useRef<HTMLDivElement>(null);
	const first = chosenValues[0];
	const { options } = group;
	// The radios' one tab stop is the chosen one, else the first.
	const stop = Math.max(
		options.findIndex((option) => option.value === first),
		0,
	);
	const rowAt = (place: number) => {
		const option = options[place] as Option<V>;
		const chosen = chosenValues.includes(option.value);
		return (
			<OptionRow
				key={String(option.value)}
				option={option}
				place={place}
				size={options.length}
				chosen={chosen}
				one={props.one}
				rowsPaint={props.rowsPaint}
				painted={props.painted}
				toggle={props.toggle}
			>
				{option.value === first && chosen ? props.children : undefined}
			</OptionRow>
		);
	};
	return (
		<fieldset className={cn(GROUP, FIELDSET)}>
			{group.label === undefined ? null : (
				<GroupLabel>
					{props.rowsPaint ? <Painted role="word" /> : group.label}
				</GroupLabel>
			)}
			<div ref={box} className={GROUP}>
				<Window
					count={options.length}
					keyOf={(place) => String(options[place]?.value)}
					row={rowAt}
					box={box}
					keep={props.one ? stop : undefined}
				/>
			</div>
		</fieldset>
	);
}

/** The option rows every Picker in `fit: list` renders, on the `draft` its host holds: a field hosts the draft of its options and draws a rejection in its own line. Static `options` never paint; `items` paint `PAINT_ROWS` rows in the slots `option` declares while their read waits, and the draft paints the marks, inert. The frame that holds the read draws its failed, missing and empty forms. From `VIRTUAL_FROM` options in a group, under a scroller, it draws only the rows near the scroller's view. Outside the package's exports. */
export function PickerListBase<V extends string = string, T = unknown>(
	props: PickerListBody<V, T> & {
		/** Names the group where no `FormField` does. */
		label?: string;
		draft: Draft<V | null | readonly V[]>;
		onChange: (next: V | V[]) => unknown;
	},
) {
	const { children, draft } = props;
	const named = use(GroupName);
	const name = named
		? { "aria-labelledby": named.labelledBy }
		: { "aria-label": props.label };
	// Waiting items paint the rows; ended ones say so in a line under them.
	const { drawn: given, retry } = useOptions(props.items);
	// The rows paint while their items wait; the marks paint too while the
	// value does, the labels then standing. A value whose read ended leaves the
	// marks empty and blocked: a press says why and chooses nothing.
	const rowsPaint = given.painted;
	const painted = rowsPaint || (draft.painted && draft.ended === undefined);
	// The placeholder is no array, so a painted value is one choice.
	const one = !Array.isArray(draft.value);
	const choice = {
		value: draft.painted ? (one ? null : []) : draft.value,
		onChange: (next: V | V[]) => {
			draft.change(next, () => props.onChange(next));
		},
	} as OptionChoice<V>;
	const { option } = props;
	const items = rowsPaint ? undefined : given.value;
	const options = useMemo(
		() =>
			rowsPaint
				? paintedGroups<V>(option)
				: (props.options ??
					optionsOf(items as readonly T[], option as OptionSlots<T, V>)),
		[rowsPaint, option, props.options, items],
	);
	// A row hears its press through one function, which reads the choice the
	// latest render made, so no row renders for a choice that is not its own.
	const latest = useRef(choice);
	latest.current = choice;
	const [toggle] = useState(() => (value: V) => choose(latest.current, value));
	const chosenValues = painted ? [] : chosenOf(choice);
	const rows = groupsOf(options).map((group, at) => (
		<OptionGroupBox<V>
			key={group.label ?? at}
			group={group}
			one={one}
			rowsPaint={rowsPaint}
			painted={painted}
			chosenValues={chosenValues}
			toggle={toggle}
		>
			{children}
		</OptionGroupBox>
	));
	// One choice is a radiogroup: Base UI moves between its radios by the
	// arrows and chooses the one it reaches. Null, not undefined, keeps it
	// controlled while nothing is chosen.
	const list = one ? (
		<RadioGroup<V | null>
			value={choice.value as V | null}
			onValueChange={(next) => {
				if (next !== null) choose(choice, next);
			}}
			{...name}
			className={cn(OPTION_LIST, LIST)}
		>
			{rows}
		</RadioGroup>
	) : (
		<fieldset {...name} className={cn(OPTION_LIST, LIST, FIELDSET)}>
			{rows}
		</fieldset>
	);
	return (
		<>
			{list}
			<OptionsLine drawn={given} retry={retry} />
		</>
	);
}

/** A list that holds its own draft, as a bare one does; a rejection toasts. Outside the package's exports. */
export function HeldList<V extends string = string, T = unknown>(
	props: PickerListProps<V, T>,
) {
	const { value, onChange, label, children, ...source } = props;
	return (
		<PickerListBase<V, T>
			{...(source as PickerListBody<V, T>)}
			label={label}
			draft={useHeldDraft<V | null | readonly V[]>(value)}
			onChange={onChange as (next: V | V[]) => unknown}
		>
			{children}
		</PickerListBase>
	);
}
