import { Combobox } from "@base-ui/react/combobox";
import { Dialog } from "@base-ui/react/dialog";
import { Select } from "@base-ui/react/select";
import type { Draft } from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import type { IconLinkAct, Option } from "@fcalell/ui-core/descriptors";
import { optionBlocked, toggled } from "@fcalell/ui-core/list-state";
import {
	asChip,
	type Grouped,
	groupsOf,
	type PickOptions,
	SEARCH_PAST,
	type Several,
} from "@fcalell/ui-core/pick";
import { nounOf } from "@fcalell/ui-core/rules";
import type { ChipFamily, Tone } from "@fcalell/ui-core/tokens";
import {
	CHIPS_RUN,
	CHIPS_TRIGGER,
	FIELD_GLYPH,
	FIELD_PLACEHOLDER,
	FIELD_QUIET,
	field,
	fieldValue,
	HAIRLINE,
	LAYER_POPOVER,
	OPTION_GROUP_LABEL,
	OPTION_ROW,
	PICKER_EMPTY,
	PICKER_PILL,
	PICKER_POPOVER,
	PICKER_VALUE,
	POPOVER,
	picker,
	ROW_LEADING,
	row,
	text,
	textStrong,
	WORD_ACT,
} from "@fcalell/ui-core/variants";
import { VIRTUAL_FROM } from "@fcalell/ui-core/window";
import {
	type ComponentProps,
	createContext,
	memo,
	type ReactElement,
	type ReactNode,
	type RefObject,
	use,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { IconAct } from "../../lib/act.ts";
import { type Acting, useAct, useHeldDraft } from "../../lib/act.ts";
import { CHIP_LINES } from "../../lib/chip-lines.ts";
import type { CellFit } from "../../lib/field.ts";
import { expandedTrigger, rememberOpener } from "../../lib/focus.ts";
import { useQuietGuards } from "../../lib/guards.ts";
import { spacing, useTouch } from "../../lib/media.ts";
import { follow } from "../../lib/navigate.ts";
import { PAINT_CONTROL } from "../../lib/paint.tsx";
import { PortalContainer } from "../../lib/portal.ts";
import { OptionsLine, useOptions } from "../../lib/read.tsx";
import { Turn } from "../../lib/turn.tsx";
import { Scroller, useScroller, Window } from "../../lib/window.tsx";
import { useWords } from "../../lib/words.tsx";
import { Avatar } from "../avatar/index.tsx";
import { Chip } from "../chip/index.tsx";
import { Icon } from "../icon/index.tsx";
import { BOX_DISABLED, BOX_HOVER } from "../input/base.tsx";
import { Input } from "../input/index.tsx";
import { ActSheet } from "../sheet/act.tsx";
import { SheetBase } from "../sheet/base.tsx";
import { StatusBase } from "../status/base.tsx";
import { StatusDot } from "../status/dot.tsx";
import type {
	PickerMenuProps,
	PickOneProps,
	PickSeveralProps,
} from "./index.tsx";

// A field-fit trigger is the field box (at the bar fit, or a form's field
// height in a `FormField`); open, it keeps the ring. It yields only past its
// line, so a long value truncates before the chevron.
const FIELD_TRIGGER =
	"flex min-w-0 max-w-full items-center text-start focus-visible:outline-offset-(--focus-ring-edge-offset)";
const FIELD_OPEN =
	"outline-2 outline-offset-(--focus-ring-edge-offset) outline-ring";
// In a table cell, or at the bar fit in a rule row, the trigger fills the
// cell or column it stands in for.
const FILL = "w-full";
const FIELD_VALUE = "min-w-0 grow truncate";
// Painted, the trigger keeps its loaded box and draws none of its content.
const PAINTED = cn(PAINT_CONTROL, "*:invisible");
// A pick of several: the chips wrap in a run, and the trigger that opens the
// list stands beside it, filling what the run leaves, its chevron at the box's
// end; the run wraps, so the chevron never takes a line of its own.
const SEVERAL_BOX = "flex items-stretch min-w-0";
const SEVERAL_RUN = "flex items-center gap-gap min-w-0";
const WRAPS = "flex-wrap";
// In a rule's row the run keeps its one line (it does not wrap): its one chip
// truncates, and the token that stands for several is the trigger's own, so a
// press on it opens the list.
const FOLDED = "flex min-w-0 grow items-center";
const SEVERAL_TRIGGER =
	"flex grow shrink-0 items-center justify-end min-w-target max-w-full text-start";
// A row-fit trigger centres in its row and pulls back by its own padding at
// the row's end; it stands over a row's hit. Open, it holds the press wash
// and the value takes the body ink. Its cap counts the pull-back, so a value
// with room stays whole and a long one still stops at its column.
const ROW_TRIGGER =
	"relative inline-flex shrink-0 max-w-[calc(100%+var(--spacing-gap))] self-center items-center -me-gap hover:bg-wash-hover active:bg-wash-press";
const ROW_OPEN = "bg-wash-press text-ink-body";
const ROW_VALUE = "truncate";
const OPEN_VALUE = "text-ink-body";
// The popover stops at the room Base UI measures below its trigger; its rows
// scroll inside it, under a search that stays. It stands at the popover's
// width whatever the trigger's: a field the width of a sheet opens the list of
// one the width of a column (the pattern's range is the popover's, not the
// trigger's).
const POPUP = "flex flex-col max-h-(--available-height)";
const POSITIONER = "z-(--layer-popover)";
const LIST = "flex flex-col gap-gap min-h-0 overflow-y-auto overscroll-contain";
const GROUP = "flex flex-col";
// The highlight washes the option under the pointer or the keyboard; the
// keyboard's highlight rings it inset as well, the wash alone being no focus
// cue, and the pointer's draws the wash alone.
const OPTION = "flex items-center";
const PRESS = "active:bg-wash-press";
const OPTION_NO_FOCUS = "outline-none";
const KEYBOARD_RING = "outline-2 -outline-offset-2 outline-ring";
// A touch option is a button: its text at the start, its focus the
// keyboard's highlight and its ring; a blocked one takes the ring alone.
const OPTION_BUTTON = "text-start focus-visible:-outline-offset-2";
const OPTION_FOCUS_WASH = "focus-visible:bg-wash-hover";
const OPTION_TEXT = "flex flex-col min-w-0 grow";
const LINE = "truncate";
// A blocked option's label and reason; it takes no press wash.
const BLOCKED_INK = "text-ink-disabled";
const TICK = "flex shrink-0 text-ink-body";
// A glyph leads an option in the row's leading slot.
const LEADING = "flex shrink-0 items-center justify-center";
// A chip column's value and options are its chips.
const CHIP_SLOT = "flex grow min-w-0";
// An option's own chip stands after its text and keeps its word whole: the text
// truncates before it does, and only a chip past the short measure is cut.
const CHIP_AFTER = "flex shrink-0 max-w-measure-short";
const SEARCH = "flex grow items-center";
const SEARCH_VALUE =
	"min-w-0 grow truncate outline-none placeholder:text-ink-meta";
const SEARCH_SLOT = "flex px-pad";
// The sheet's rows stand a pair under its head and the search, clear of a
// phone's home indicator; a long list scrolls.
const SHEET_ROWS = "flex flex-col gap-gap pt-gap pb-pad min-h-0";
const LISTBOX = "flex flex-col min-h-0 overflow-y-auto overscroll-contain";
// The act that ends the list stands under a hairline across it, a float
// inset below the line.
const ACT_SLOT = "flex flex-col border-t pt-gap";
const ACT_ROW =
	"flex items-center text-start hover:bg-wash-hover active:bg-wash-press focus-visible:-outline-offset-2";
const ACT_GLYPH = "flex shrink-0 text-ink-meta";

const NO_MATCHES = "flex items-center";

// Base UI's props for a trigger.
type Handed = ComponentProps<"button">;

// A pick's props once its value is drawn: the viewer's pick or the
// selection's, no longer a datum.
type Drawn<V extends string | null> = Omit<
	PickerMenuProps<V>,
	"value" | "onChange"
> &
	(
		| { value?: V; onChange: (value: V) => void }
		| { value: readonly V[]; onChange: (value: V[]) => void }
	);

function isSeveral<V extends string | null>(
	props: Drawn<V>,
): props is Drawn<V> & Several<V> {
	return Array.isArray(props.value);
}

// Whether an option is in the value: the set of a pick of several, else the
// one value.
const inValue = <V extends string | null>(
	several: Several<V> | undefined,
	value: V | undefined,
	one: V,
) => (several ? several.value.includes(one) : one === value);

const optionRow = (highlighted = false) =>
	row({ state: highlighted ? "highlighted" : "rest" });

// An option's label (the empty choice in the placeholder's ink) over its
// description; an option carrying a state leads with its status's dot, one
// carrying an avatar with its avatar, and its chip after the text.
function OptionText(props: {
	option: Option<string | null>;
	chosen: boolean;
	chip?: ChipFamily;
}) {
	const { option, chip } = props;
	const blocked = optionBlocked(option, props.chosen);
	const meta = blocked ?? option.description;
	if (asChip(option, chip))
		return (
			<span className={CHIP_SLOT}>
				<Chip family={chip} label={option.label} />
			</span>
		);
	return (
		<>
			{option.icon ? (
				<span className={cn(ROW_LEADING, LEADING)}>
					<Icon name={option.icon} />
				</span>
			) : null}
			{option.status ? <StatusDot tone={option.status} /> : null}
			{option.avatar ? (
				<Avatar name={option.label} src={option.avatar.src} />
			) : null}
			<span className={OPTION_TEXT}>
				<span
					className={cn(
						text({ role: "body" }),
						option.value === null && PICKER_EMPTY,
						LINE,
						blocked !== undefined && BLOCKED_INK,
					)}
				>
					{option.label}
				</span>
				{meta ? (
					<span
						className={cn(
							text({ role: "meta" }),
							LINE,
							blocked !== undefined && BLOCKED_INK,
						)}
					>
						{meta}
					</span>
				) : null}
			</span>
			{option.chip ? (
				<span className={CHIP_AFTER}>
					<Chip {...option.chip} />
				</span>
			) : null}
		</>
	);
}

// The act that ends the list under a hairline: its glyph and label on a row,
// washed under the pointer and the press; it closes the list as it runs.
// The picker holds its act's run past the list's close (the list unmounts
// with it): a rejection toasts with Retry, and a sheet it opens stands beside
// the picker.
const PickActing = createContext<Acting<true> | undefined>(undefined);

function PickAct(props: {
	act: IconAct | IconLinkAct;
	// The act stands in the popover: rounded at the control's inset, as its options.
	popover?: boolean;
	done: () => void;
	onFocus?: () => void;
}) {
	const { act } = props;
	const acting = use(PickActing);
	if (!acting) return null;
	const look = cn(row(), props.popover && OPTION_ROW, ACT_ROW);
	const face = (
		<>
			<span className={ACT_GLYPH}>
				<Icon name={act.icon} />
			</span>
			<span className={cn(text({ role: "body" }), LINE)}>{act.label}</span>
		</>
	);
	return (
		<div className={cn(HAIRLINE, ACT_SLOT)}>
			{"href" in act && act.blocked === undefined ? (
				<a
					href={act.href}
					onFocus={props.onFocus}
					onClick={(event) => {
						rememberOpener(expandedTrigger(document));
						props.done();
						follow(event);
					}}
					className={look}
				>
					{face}
				</a>
			) : (
				<button
					type="button"
					onFocus={props.onFocus}
					aria-disabled={act.blocked !== undefined || undefined}
					onClick={() => {
						if (act.blocked !== undefined) return;
						rememberOpener(expandedTrigger(document));
						props.done();
						acting.run(true, act);
					}}
					className={look}
				>
					{face}
				</button>
			)}
		</div>
	);
}

// What a search that matches nothing says, on a row of the list.
function NoMatches(props: { popover?: boolean; children: ReactNode }) {
	return (
		<div
			className={cn(
				row(),
				props.popover && OPTION_ROW,
				text({ role: "meta" }),
				NO_MATCHES,
			)}
		>
			{props.children}
		</div>
	);
}

function GroupLabel(props: { children: ReactNode }) {
	return (
		<div
			className={cn(
				OPTION_GROUP_LABEL,
				text({ role: "meta" }),
				textStrong({ role: "meta" }),
			)}
		>
			{props.children}
		</div>
	);
}

// What every pick draws: the public `Picker`'s field and row triggers, or a
// trigger its composer draws (the Shell's switcher), over the one list. Outside
// the package's exports.
interface Composed {
	/** A trigger drawn by the composer, handed Base UI's props and whether the list is open. */
	drawn?: (handed: ComponentProps<"button">, open: boolean) => ReactElement;
	/** The family a chip column's value and options draw as chips of. */
	chip?: ChipFamily;
	/** The `Table` cell it edits in: the pick mounts open as the edit starts, named by the cell. */
	cell?: CellFit;
	/** `-1` where the trigger's host holds the tab stop (a tree's row); absent, the trigger keeps its own. */
	tabIndex?: -1;
	/** Its data is not here: the trigger's box filled at its loaded size, its content not drawn, inert, so no list opens. */
	painted?: boolean;
	/** A pick of several in a rule's row, which stays one line: its chips are one while it holds one value, and two or more fold to one token naming how many, the values ticked in its list. */
	fold?: boolean;
	/** The pill's dot: the tone of the context the Pane reads in, drawn before the label (a Pane's context pick). */
	state?: Tone;
	/** The state chip a chosen option draws is a pill: set where the pick stands in a pill of its own (a head's pick fact), so the chip nests inside it as the outer radius less the inset. */
	round?: boolean;
	/** Set by a `FormField` around the pick: the box stands at the form's field height, `edge-error` when the field is in error and the disabled fill when it is disabled, and the field's label names the pick (so no `placeholder` falls back to it). */
	form?: { invalid: boolean; disabled: boolean };
}

/** The trigger and list every Picker renders, on the `draft` its host holds: a field hosts the draft of its picker and draws a rejection in its own line. Waiting options paint the trigger, and ended ones say so in a line under it. Outside the package's exports. */
export function PickerBase<V extends string | null = string>(
	given: Omit<PickerMenuProps<V>, "value" | "onChange"> & {
		draft: Draft<V | readonly V[] | undefined>;
		onChange: (next: V | V[]) => unknown;
	} & Composed,
) {
	// The value is the viewer's pick once made, else the selection's; a painted
	// pick draws as a single one, as the placeholder is no array.
	const { draft } = given;
	// Waiting options paint the trigger as a waiting value does, and the list
	// has no rows to open.
	const { drawn: waiting, retry } = useOptions(given.options);
	const options: PickOptions<V> = waiting.painted ? [] : waiting.value;
	// A value whose read ended leaves the box empty and blocked: opening it
	// says why and opens nothing, so nothing can be picked.
	const ended = draft.ended !== undefined;
	const painted = given.painted || (draft.painted && !ended) || waiting.painted;
	const props = {
		...given,
		value: draft.painted ? undefined : draft.value,
		onChange: (next: V | V[]) => {
			draft.change(next, () => given.onChange(next));
		},
	} as Drawn<V>;
	const {
		label,
		placeholder,
		fit = "field",
		act,
		drawn,
		chip,
		cell,
		fold,
	} = given;
	const { form } = given;
	const acting = useAct("toast");
	// What an empty box says: the hint, else what is picked (a field's own label
	// stands over it already).
	const hint = placeholder ?? (form ? undefined : label);
	const fieldBox = field({
		state: form?.invalid ? "error" : "rest",
	});
	// The field box's hover edge yields to the error edge and the disabled fill.
	const states = form?.disabled ? BOX_DISABLED : !form?.invalid && BOX_HOVER;
	// A pick of several: its value is an array, which `Several` types as one.
	const several = isSeveral(props) ? props : undefined;
	const value = isSeveral(props) ? undefined : props.value;
	const set = several?.value;
	// A bar pick with nothing picked is quiet (`FIELD_QUIET`).
	const quiet =
		fit === "bar" &&
		(several
			? (set?.length ?? 0) === 0
			: value === null || value === undefined);
	const touch = useTouch();
	const box = useRef<HTMLDivElement>(null);
	const run = useRef<HTMLDivElement>(null);
	// In a table cell the pick mounts open as its edit starts, and its list
	// gone, its leave played, ends the edit. The list hands focus back to the
	// cell as it unmounts (after its option's own press has focused it), unless
	// the close came from focus moving on.
	const [open, setOpenState] = useState(cell?.starts ?? false);
	const back = useRef(true);
	const setOpen = (next: boolean, details?: { reason: string }) => {
		if (ended && next) {
			draft.change(undefined);
			return;
		}
		setOpenState(next);
		if (next) return;
		back.current =
			details?.reason !== "outside-press" && details?.reason !== "focus-out";
	};
	const finalFocus: FinalFocus = cell
		? () => (back.current && cell.home()) || false
		: true;
	const groups = groupsOf(options);
	const flat = groups.flatMap((group) => group.options);
	const current = flat.find((option) => option.value === value);
	// Past six options a search leads the list. The form follows the count only
	// while the list is closed, so a count crossing six never tears down an
	// open list and its focus.
	const many = flat.length > SEARCH_PAST;
	const [searching, setSearching] = useState(many);
	if (!open && searching !== many) setSearching(many);
	// A pick of several keeps its list open, an option toggling in and out.
	const chosen = (set ?? []).flatMap(
		(one) => flat.find((option) => option.value === one) ?? [],
	);
	const pick = (next: V) => {
		if (isSeveral(props)) {
			props.onChange(toggled(props.value, next));
			return;
		}
		setOpen(false);
		props.onChange(next);
	};
	// A row's pick names its value with it; a field box's value is its own.
	const named =
		cell?.label ??
		(fit === "row" && current ? `${label}, ${current.label}` : label);
	const glyph = current?.icon ? (
		<Icon
			name={current.icon}
			fit={fit === "row" || fit === "pill" ? "meta" : "control"}
		/>
	) : null;
	// An option carrying a state shows as its status.
	const status = current?.status ? (
		<StatusBase
			tone={current.status}
			label={current.label}
			round={given.round}
		/>
	) : null;
	// The option's kind stands after its value, on the trigger as in the list.
	const kind = current?.chip ? (
		<span className={CHIP_AFTER}>
			<Chip {...current.chip} />
		</span>
	) : null;
	// With no value the trigger shows what is picked in the placeholder's ink.
	const unset = current === undefined;
	const rowValue = status ?? (
		<span
			className={cn(
				PICKER_VALUE,
				ROW_VALUE,
				unset && FIELD_PLACEHOLDER,
				open && OPEN_VALUE,
			)}
		>
			{current?.label ?? hint}
		</span>
	);
	// A set pick in a toolbar (the bar fit, outside a table cell) reads its
	// label then its value, so a value that other filters could share
	// ("Change") is told apart ("Work type: Change"); the empty choice (a `null`
	// option, the way to clear) reads the label alone, as an unset pick does.
	// Every other place reads the value alone, its label standing over it or
	// beside it already.
	const toolbar = fit === "bar" && !cell;
	const lead = (option: Option<V>) => {
		if (!toolbar) return option.label;
		return option.value === null ? label : `${label}: ${option.label}`;
	};
	const fieldShown =
		chip && current && current.value !== null ? (
			<span className={CHIP_SLOT}>
				<Chip family={chip} label={current.label} />
			</span>
		) : (
			<span
				className={cn(
					fieldValue({ kind: "text" }),
					current?.value === null && PICKER_EMPTY,
					unset && FIELD_PLACEHOLDER,
					FIELD_VALUE,
				)}
			>
				{status ?? (current ? lead(current) : hint)}
			</span>
		);
	// A removed chip hands focus to the next chip's remove act, else the
	// previous one's, else the trigger.
	const removeChip = (picks: Several<V>, option: Option<V>, at: number) => {
		const chips = run.current?.children;
		const near = chips?.[at + 1] ?? chips?.[at - 1];
		const next = near?.querySelector("button") ?? box.current?.lastElementChild;
		picks.onChange(toggled(picks.value, option.value));
		if (next instanceof HTMLElement) next.focus();
	};
	// The chips of a pick of several each hold their own remove act, so the
	// box is no button: the trigger that opens the list stands after them.
	const severalBox = (handed: Handed, picks: Several<V>) => {
		const folded = fold && chosen.length > 1;
		return (
			<div
				ref={box}
				className={cn(
					fieldBox,
					picker({}),
					FIELD_GLYPH,
					SEVERAL_BOX,
					cell && FILL,
					quiet && !open && FIELD_QUIET,
					open && FIELD_OPEN,
					states,
					painted && PAINTED,
				)}
				inert={painted || form?.disabled || undefined}
				aria-disabled={ended || undefined}
			>
				{chosen.length > 0 && !folded ? (
					<div
						ref={run}
						className={cn(
							CHIPS_RUN,
							SEVERAL_RUN,
							!fold && cn(WRAPS, CHIP_LINES),
						)}
					>
						{chosen.map((option, at) => (
							<Chip
								key={String(option.value)}
								family="neutral"
								label={option.label}
								onRemove={() => removeChip(picks, option, at)}
							/>
						))}
					</div>
				) : null}
				<button
					{...handed}
					type="button"
					aria-label={named}
					className={cn(CHIPS_TRIGGER, SEVERAL_TRIGGER)}
				>
					{folded ? (
						<span className={cn(FOLDED, CHIPS_RUN)}>
							<Chip
								family="neutral"
								label={`${chosen.length} ${nounOf(label)}`}
							/>
						</span>
					) : null}
					{chosen.length === 0 ? (
						<span
							className={cn(
								fieldValue({ kind: "text" }),
								FIELD_PLACEHOLDER,
								FIELD_VALUE,
							)}
						>
							{hint}
						</span>
					) : null}
					<Turn name="ChevronDown" fit="control" turned={open} by="half" />
				</button>
			</div>
		);
	};
	const own = (handed: ComponentProps<"button">) =>
		several ? (
			severalBox(handed, several)
		) : (
			<button
				{...handed}
				type="button"
				aria-label={named}
				tabIndex={cell || given.tabIndex === -1 ? -1 : handed.tabIndex}
				disabled={form?.disabled}
				inert={painted || undefined}
				aria-disabled={ended || undefined}
				className={cn(
					fit === "row"
						? cn(WORD_ACT, picker({ fit }), ROW_TRIGGER, open && ROW_OPEN)
						: cn(
								fieldBox,
								picker({ fit }),
								fit !== "pill" && FIELD_GLYPH,
								FIELD_TRIGGER,
								cell && FILL,
								quiet && !open && FIELD_QUIET,
								open && FIELD_OPEN,
								fit === "pill" ? PICKER_PILL : states,
							),
					painted && PAINTED,
				)}
			>
				{fit === "pill" && given.state ? (
					<StatusDot tone={given.state} />
				) : null}
				{glyph}
				{fit === "row" ? rowValue : fieldShown}
				{kind}
				<Turn
					name="ChevronDown"
					fit={fit === "row" || fit === "pill" ? "meta" : "control"}
					turned={open}
					by="half"
				/>
			</button>
		);
	const trigger = drawn
		? (handed: ComponentProps<"button">) => drawn(handed, open)
		: own;
	const view = touch ? (
		<PickSheet
			label={label}
			groups={groups}
			value={value}
			several={several}
			searching={searching}
			typing={cell?.starts}
			open={open}
			setOpen={setOpen}
			onGone={cell?.done}
			pick={pick}
			trigger={trigger}
			act={act}
			chip={chip}
		/>
	) : searching ? (
		<PickSearch
			label={label}
			groups={groups}
			current={current}
			several={several}
			anchor={several ? box : undefined}
			chosen={chosen}
			open={open}
			setOpen={setOpen}
			onGone={cell?.done}
			finalFocus={finalFocus}
			pick={pick}
			trigger={trigger}
			act={act}
			chip={chip}
		/>
	) : (
		<PickList
			label={label}
			groups={groups}
			value={value}
			several={several}
			anchor={several ? box : undefined}
			open={open}
			setOpen={setOpen}
			onGone={cell?.done}
			finalFocus={finalFocus}
			pick={pick}
			trigger={trigger}
			act={act}
			chip={chip}
		/>
	);
	return (
		<PickActing value={acting}>
			{view}
			<OptionsLine drawn={waiting} retry={retry} />
			<ActSheet
				acting={acting}
				of={() => (act && "sheet" in act ? act.sheet : undefined)}
			/>
		</PickActing>
	);
}

/** A Picker that holds its own draft, as a bare one, a row's pick and a cell's do; a rejection toasts. Outside the package's exports. */
export function HeldPicker<V extends string | null = string>(
	props: PickOneProps<V> & Composed,
): ReactElement;
export function HeldPicker<V extends string | null = string>(
	props: PickSeveralProps<V> & Composed,
): ReactElement;
export function HeldPicker<V extends string | null = string>(
	props: PickerMenuProps<V> & Composed,
): ReactElement;
export function HeldPicker<V extends string | null = string>(
	props: PickerMenuProps<V> & Composed,
) {
	const { value, onChange, label, placeholder, options, fit, act } = props;
	return (
		<PickerBase<V>
			draft={useHeldDraft<V | readonly V[] | undefined>(value)}
			onChange={onChange as (next: V | V[]) => unknown}
			label={label}
			placeholder={placeholder}
			options={options}
			fit={fit}
			act={act}
			chip={props.chip}
			cell={props.cell}
			tabIndex={props.tabIndex}
			painted={props.painted}
			drawn={props.drawn}
			fold={props.fold}
			state={props.state}
			round={props.round}
		/>
	);
}

// Whether the keyboard moved the highlight last: a key on the trigger or in
// the popup (an Enter that opens it among them) sets it, the pointer clears it.
// A searchable list's keys land on its input, which keeps them from the popup:
// `landed` is the same for those keys, read by the blocked row alone (an
// enabled row there marks the key's position with the wash).
function useKeyed(trigger: PickParts<string | null>["trigger"]) {
	const [keyed, setKeyed] = useState(false);
	const [landed, setLanded] = useState(false);
	const keys = () => setKeyed(true);
	const pointer = () => {
		setKeyed(false);
		setLanded(false);
	};
	return {
		keyed,
		landed,
		input: { onKeyDown: () => setLanded(true) },
		trigger: (handed: ComponentProps<"button">) =>
			trigger({
				...handed,
				onKeyDown: (event) => {
					keys();
					handed.onKeyDown?.(event);
				},
				onPointerDown: (event) => {
					pointer();
					handed.onPointerDown?.(event);
				},
			}),
		popup: { onKeyDown: keys, onPointerMove: pointer },
		// Focus leaving the options for the act takes the keyboard's ring with it.
		leave: pointer,
	};
}

const optionFocus = (highlighted: boolean, keyed: boolean) =>
	highlighted && keyed ? KEYBOARD_RING : OPTION_NO_FOCUS;

interface PickParts<V extends string | null> {
	label: string;
	groups: readonly Grouped<V>[];
	open: boolean;
	setOpen: (open: boolean, details?: { reason: string }) => void;
	// Hears the list gone, its leave played: a cell's pick ends its edit.
	onGone?: () => void;
	pick: (value: V) => void;
	trigger: (props: ComponentProps<"button">) => ReactElement;
	act?: IconAct | IconLinkAct;
	chip?: ChipFamily;
	// A pick of several: its chosen values and what hears their new set.
	several?: Several<V>;
	// The box the list opens against and takes its width from, where the trigger
	// is only the part of it that opens the list (a pick of several's chevron).
	anchor?: RefObject<HTMLElement | null>;
}

// Where a desktop list hands focus as it closes: Base UI's own return,
// or what a table cell's pick names.
type FinalFocus = true | (() => HTMLElement | false);

// The desktop list of six options or fewer: Base UI's select supplies the
// listbox, its keyboard and its typeahead.
function PickList<V extends string | null>(
	props: PickParts<V> & { value: V | undefined; finalFocus: FinalFocus },
) {
	const container = use(PortalContainer);
	useQuietGuards();
	const keyboard = useKeyed(props.trigger);
	return (
		<Select.Root
			// Not modal: a modal select locks the page's scroll, which changes the
			// root's overflow and gutter and moves the page as the list opens.
			modal={false}
			multiple={props.several !== undefined}
			value={props.several ? [...props.several.value] : (props.value ?? null)}
			onValueChange={(next) => {
				if (props.several) props.several.onChange(next as V[]);
				else props.pick(next as V);
			}}
			open={props.open}
			onOpenChange={props.setOpen}
			onOpenChangeComplete={(next) => {
				if (!next) props.onGone?.();
			}}
		>
			<Select.Trigger render={(handed) => keyboard.trigger(handed)} />
			<Select.Portal container={container}>
				<Select.Positioner
					className={POSITIONER}
					anchor={props.anchor}
					align="start"
					alignItemWithTrigger={false}
					sideOffset={() => spacing("gap")}
				>
					<Select.Popup
						finalFocus={props.finalFocus}
						onKeyDown={keyboard.popup.onKeyDown}
						onPointerMove={keyboard.popup.onPointerMove}
						className={cn(POPOVER, LAYER_POPOVER, PICKER_POPOVER, POPUP)}
					>
						<Select.List aria-label={props.label} className={LIST}>
							{props.groups.map((group, at) => (
								<Select.Group key={group.label ?? at} className={GROUP}>
									{group.label ? (
										<Select.GroupLabel
											render={<GroupLabel>{group.label}</GroupLabel>}
										/>
									) : null}
									{group.options.map((option) => {
										const chosen = inValue(
											props.several,
											props.value,
											option.value,
										);
										const blocked = optionBlocked(option, chosen);
										return (
											<Select.Item
												key={String(option.value)}
												value={option.value}
												label={option.label}
												disabled={blocked !== undefined}
												className={(state) =>
													cn(
														optionRow(
															state.highlighted && blocked === undefined,
														),
														OPTION_ROW,
														OPTION,
														blocked === undefined && PRESS,
														optionFocus(state.highlighted, keyboard.keyed),
													)
												}
											>
												<OptionText
													option={option}
													chosen={chosen}
													chip={props.chip}
												/>
												<Select.ItemIndicator className={TICK}>
													<Icon name="Check" fit="body" />
												</Select.ItemIndicator>
											</Select.Item>
										);
									})}
								</Select.Group>
							))}
						</Select.List>
						{props.act ? (
							<PickAct
								act={props.act}
								popover
								done={() => props.setOpen(false)}
								onFocus={keyboard.leave}
							/>
						) : null}
					</Select.Popup>
				</Select.Positioner>
			</Select.Portal>
		</Select.Root>
	);
}

// One option of the search list, on the row its place gives: the label over
// its description, the tick on the chosen one. `index` is the option's place in
// the filtered list when the list is virtual, which Base UI cannot read off a
// DOM that holds only a window of it.
interface SearchItemProps<V extends string | null> {
	option: Option<V>;
	index?: number;
	chosen: boolean;
	/** The key moved the highlight last (a blocked row marks it by the key landing on it). */
	keyed: boolean;
	landed: boolean;
	chip?: ChipFamily;
	/** The option's place among all the filtered ones (`place` of `size`, from 1), when the list is virtual. */
	size?: number;
	place?: number;
}

function SearchItemBase<V extends string | null>(props: SearchItemProps<V>) {
	const { option, chosen } = props;
	const blocked = optionBlocked(option, chosen);
	return (
		<Combobox.Item
			value={option}
			index={props.index}
			data-index={props.index}
			aria-setsize={props.size}
			aria-posinset={props.place}
			disabled={blocked !== undefined}
			className={(state) =>
				cn(
					optionRow(state.highlighted && blocked === undefined),
					OPTION_ROW,
					OPTION,
					blocked === undefined && PRESS,
					// A blocked row has no wash to mark the key's position, so the key landing on it rings it.
					optionFocus(
						state.highlighted,
						blocked === undefined ? props.keyed : props.landed,
					),
				)
			}
		>
			<OptionText option={option} chosen={chosen} chip={props.chip} />
			<Combobox.ItemIndicator className={TICK}>
				<Icon name="Check" fit="body" />
			</Combobox.ItemIndicator>
		</Combobox.Item>
	);
}

const SearchItem = memo(SearchItemBase) as typeof SearchItemBase;

// A row of a virtual search list: a group's label, or one of the filtered
// options at its place among them.
type SearchRow<V extends string | null> =
	| { label: string }
	| { option: Option<V>; index: number };

// The rows of a long search list: the filtered options, a group's label ahead
// of its first match, in a box the list's scroller holds. Only the rows near
// the scroller's view stand, and the highlighted one stays mounted and is
// brought into view as a key moves it, so the keys reach every option.
function SearchRows<V extends string | null>(props: {
	groups: readonly Grouped<V>[];
	/** The option Base UI highlighted last, and whether to bring it into view. */
	highlight: { index: number; reveal: boolean } | undefined;
	several?: Several<V>;
	current: V | undefined;
	keyed: boolean;
	landed: boolean;
	chip?: ChipFamily;
}) {
	const matches = Combobox.useFilteredItems<Option<V>>();
	const box = useRef<HTMLDivElement>(null);
	const rows = useMemo(() => {
		const kept = new Set(matches.map((option) => option.value));
		const all: SearchRow<V>[] = [];
		let index = 0;
		for (const group of props.groups) {
			const hits = group.options.filter((option) => kept.has(option.value));
			if (hits.length === 0) continue;
			if (group.label) all.push({ label: group.label });
			for (const option of hits) all.push({ option, index: index++ });
		}
		return all;
	}, [matches, props.groups]);
	const { highlight } = props;
	const lit = highlight
		? rows.findIndex((row) => "option" in row && row.index === highlight.index)
		: -1;
	useLayoutEffect(() => {
		if (!highlight?.reveal) return;
		box.current
			?.querySelector(`[data-index="${highlight.index}"]`)
			?.scrollIntoView({ block: "nearest" });
	}, [highlight]);
	return (
		<div ref={box} className={GROUP}>
			<Window
				count={rows.length}
				keyOf={(at) => {
					const row = rows[at] as SearchRow<V>;
					return "option" in row ? String(row.option.value) : row.label;
				}}
				row={(at) => {
					const row = rows[at] as SearchRow<V>;
					if (!("option" in row))
						return <GroupLabel key={row.label}>{row.label}</GroupLabel>;
					const { option } = row;
					return (
						<SearchItem
							key={String(option.value)}
							option={option}
							index={row.index}
							size={matches.length}
							place={row.index + 1}
							chosen={inValue(props.several, props.current, option.value)}
							keyed={props.keyed}
							landed={props.landed}
							chip={props.chip}
						/>
					);
				}}
				box={box}
				keep={lit < 0 ? undefined : lit}
			/>
		</div>
	);
}

// The desktop list past six options: Base UI's combobox filters the rows by
// the search typed at the popover's head. From `VIRTUAL_FROM` options the
// list is virtual: Base UI keeps the order and the highlight of every option,
// and only a window of them is drawn.
function PickSearch<V extends string | null>(
	props: PickParts<V> & {
		current: Option<V> | undefined;
		chosen: Option<V>[];
		finalFocus: FinalFocus;
	},
) {
	const container = use(PortalContainer);
	useQuietGuards();
	const words = useWords();
	const keyboard = useKeyed(props.trigger);
	const flat = props.groups.flatMap((group) => group.options);
	const virtual = flat.length >= VIRTUAL_FROM;
	const scroll = useScroller();
	const [highlight, setHighlight] = useState<{
		index: number;
		reveal: boolean;
	}>();
	return (
		<Combobox.Root
			modal={false}
			items={virtual ? flat : props.groups}
			virtualized={virtual}
			onItemHighlighted={
				virtual
					? (item, details) =>
							setHighlight(
								item
									? {
											index: details.index,
											reveal: details.reason !== "pointer",
										}
									: undefined,
							)
					: undefined
			}
			autoHighlight
			multiple={props.several !== undefined}
			value={props.several ? props.chosen : (props.current ?? null)}
			onValueChange={(next) => {
				if (props.several)
					props.several.onChange((next as Option<V>[]).map((one) => one.value));
				else if (next) props.pick((next as Option<V>).value);
			}}
			// The search stays typed while several are picked from one query.
			onInputValueChange={(_, details) => {
				if (props.several && details.isItemPress) details.cancel();
			}}
			open={props.open}
			onOpenChange={props.setOpen}
			onOpenChangeComplete={(next) => {
				if (!next) props.onGone?.();
			}}
		>
			<Combobox.Trigger render={(handed) => keyboard.trigger(handed)} />
			<Combobox.Portal container={container}>
				<Combobox.Positioner
					className={POSITIONER}
					anchor={props.anchor}
					align="start"
					sideOffset={() => spacing("gap")}
				>
					<Combobox.Popup
						finalFocus={props.finalFocus}
						onKeyDown={keyboard.popup.onKeyDown}
						onPointerMove={keyboard.popup.onPointerMove}
						aria-label={props.label}
						className={cn(POPOVER, LAYER_POPOVER, PICKER_POPOVER, POPUP)}
					>
						<div className={cn(field({}), FIELD_GLYPH, SEARCH)}>
							<Icon name="Search" fit="control" />
							<Combobox.Input
								onKeyDown={keyboard.input.onKeyDown}
								placeholder={words.search}
								aria-label={words.search}
								className={cn(fieldValue({ kind: "search" }), SEARCH_VALUE)}
							/>
						</div>
						{virtual ? (
							<Combobox.List ref={scroll.ref} className={LIST}>
								<Scroller value={scroll}>
									<SearchRows<V>
										groups={props.groups}
										highlight={highlight}
										several={props.several}
										current={props.current?.value}
										keyed={keyboard.keyed}
										landed={keyboard.landed}
										chip={props.chip}
									/>
								</Scroller>
							</Combobox.List>
						) : (
							<Combobox.List className={LIST}>
								{(group: Grouped<V>) => (
									<Combobox.Group
										key={group.label ?? ""}
										items={group.options as Option<V>[]}
										className={GROUP}
									>
										{group.label ? (
											<Combobox.GroupLabel
												render={<GroupLabel>{group.label}</GroupLabel>}
											/>
										) : null}
										<Combobox.Collection>
											{(option: Option<V>) => (
												<SearchItem
													key={String(option.value)}
													option={option}
													chosen={inValue(
														props.several,
														props.current?.value,
														option.value,
													)}
													keyed={keyboard.keyed}
													landed={keyboard.landed}
													chip={props.chip}
												/>
											)}
										</Combobox.Collection>
									</Combobox.Group>
								)}
							</Combobox.List>
						)}
						<Combobox.Empty>
							<NoMatches popover>{words.noMatches}</NoMatches>
						</Combobox.Empty>
						{props.act ? (
							<PickAct
								act={props.act}
								popover
								done={() => props.setOpen(false)}
								onFocus={keyboard.leave}
							/>
						) : null}
					</Combobox.Popup>
				</Combobox.Positioner>
			</Combobox.Portal>
		</Combobox.Root>
	);
}

type SheetParts<V extends string | null> = PickParts<V> & {
	value: V | undefined;
	searching: boolean;
	// The sheet opened as a table cell's edit started: its search takes focus.
	typing?: boolean;
};

// The touch sheet: the rows edge to edge under the sheet's head, a search
// leading them past six options, which stands the sheet full height. It opens
// focused on the options' tab stop.
function PickSheet<V extends string | null>(props: SheetParts<V>) {
	const [sheet] = useState(() => Dialog.createHandle<unknown>());
	const first = useRef<HTMLButtonElement>(null);
	return (
		<>
			<Dialog.Trigger
				handle={sheet}
				render={(handed) => props.trigger(handed)}
			/>
			<SheetBase
				form="menu"
				tall={props.searching}
				handle={sheet}
				open={props.open}
				onOpen={() => props.setOpen(true)}
				onClose={() => props.setOpen(false)}
				onGone={props.onGone}
				title={props.label}
				focus={first}
			>
				<PickRows
					label={props.label}
					groups={props.groups}
					value={props.value}
					several={props.several}
					searching={props.searching}
					typing={props.typing}
					setOpen={props.setOpen}
					pick={props.pick}
					act={props.act}
					chip={props.chip}
					first={first}
				/>
			</SheetBase>
		</>
	);
}

// One option of the sheet: a button that is a row of the listbox. It reads its
// place in its group (`place` of `size`, from 1), which the rows a window
// leaves unmounted do not tell, and where it stands among all the options
// (`flat`, which the keys move by).
interface PickOptionProps<V extends string | null> {
	option: Option<V>;
	place: number;
	size: number;
	flat: number;
	chosen: boolean;
	/** The option holds the listbox's one tab stop. */
	stands: boolean;
	/** What the sheet takes focus on as it opens: the tab stop's button. */
	first: RefObject<HTMLButtonElement | null>;
	chip?: ChipFamily;
	pick: (value: V) => void;
}

function PickOptionBase<V extends string | null>(props: PickOptionProps<V>) {
	const { option, chosen, stands } = props;
	const blocked = optionBlocked(option, chosen);
	return (
		<button
			ref={stands ? props.first : undefined}
			type="button"
			role="option"
			aria-selected={chosen}
			aria-disabled={blocked !== undefined || undefined}
			aria-setsize={props.size}
			aria-posinset={props.place + 1}
			data-index={props.flat}
			tabIndex={stands ? 0 : -1}
			onClick={() => {
				if (blocked === undefined) props.pick(option.value);
			}}
			className={cn(
				optionRow(),
				OPTION,
				blocked === undefined && PRESS,
				OPTION_BUTTON,
				blocked === undefined && OPTION_FOCUS_WASH,
			)}
		>
			<OptionText option={option} chosen={chosen} chip={props.chip} />
			{chosen ? (
				<span className={TICK}>
					<Icon name="Check" fit="body" />
				</span>
			) : null}
		</button>
	);
}

const PickOption = memo(PickOptionBase) as typeof PickOptionBase;

// One group of the sheet's options: its label over its rows, which stand in a
// box of their own so a long group windows them, the tab stop's row kept
// mounted.
function PickGroupBox<V extends string | null>(props: {
	group: Grouped<V>;
	/** How many options stand before this group's. */
	before: number;
	/** The option holding the tab stop. */
	stop: V | undefined;
	first: RefObject<HTMLButtonElement | null>;
	several?: Several<V>;
	value: V | undefined;
	chip?: ChipFamily;
	pick: (value: V) => void;
}) {
	const { group, before, stop } = props;
	const box = useRef<HTMLDivElement>(null);
	const { options: items } = group;
	const kept = items.findIndex((option) => option.value === stop);
	return (
		// biome-ignore lint/a11y/useSemanticElements: a listbox's group of options
		<div role="group" className={GROUP}>
			{group.label ? <GroupLabel>{group.label}</GroupLabel> : null}
			<div ref={box} className={GROUP}>
				<Window
					count={items.length}
					keyOf={(place) => String(items[place]?.value)}
					row={(place) => {
						const option = items[place] as Option<V>;
						return (
							<PickOption
								key={String(option.value)}
								option={option}
								place={place}
								size={items.length}
								flat={before + place}
								chosen={inValue(props.several, props.value, option.value)}
								stands={place === kept}
								first={props.first}
								chip={props.chip}
								pick={props.pick}
							/>
						);
					}}
					box={box}
					keep={kept < 0 ? undefined : kept}
				/>
			</div>
		</div>
	);
}

// The sheet's rows hold the search, so it leaves with the sheet however it
// closes (a pick, the act, the scrim, Escape) and the next open starts from
// every option.
function PickRows<V extends string | null>(
	props: Omit<SheetParts<V>, "open" | "trigger"> & {
		first: RefObject<HTMLButtonElement | null>;
	},
) {
	const words = useWords();
	const [search, setSearch] = useState("");
	const typed = search.trim().toLowerCase();
	const shown = props.groups
		.map((group) => ({
			...group,
			options: group.options.filter((option) =>
				option.label.toLowerCase().includes(typed),
			),
		}))
		.filter((group) => group.options.length > 0);
	// The options are one tab stop that the arrows move: it starts on the chosen
	// one, else the first that can be chosen, and follows focus.
	const listed = shown.flatMap((group) => group.options);
	const isChosen = (one: V) => inValue(props.several, props.value, one);
	const [active, setActive] = useState<V>();
	const kept = listed.find((option) => isChosen(option.value));
	const free = listed.find(
		(option) => optionBlocked(option, false) === undefined,
	);
	const stop = (
		listed.find((option) => option.value === active) ??
		kept ??
		free ??
		listed[0]
	)?.value;
	// The options are a window's rows, so a press hears the latest pick through
	// one function and no row renders for another's.
	const latest = useRef(props.pick);
	latest.current = props.pick;
	const [pick] = useState(() => (value: V) => latest.current(value));
	// The option a key is moving the focus to; it stands mounted by then, the
	// window keeping the tab stop's row, and takes the focus.
	const scroll = useScroller();
	const [wanted, setWanted] = useState<{ index: number }>();
	// biome-ignore lint/correctness/useExhaustiveDependencies: only a new `wanted` is a move to focus
	useLayoutEffect(() => {
		if (!wanted) return;
		scroll.holder.current
			?.querySelector<HTMLElement>(`[data-index="${wanted.index}"]`)
			?.focus();
	}, [wanted]);
	const indexOf = (target: HTMLElement) =>
		Number(target.closest<HTMLElement>('[role="option"]')?.dataset.index);
	return (
		<div className={SHEET_ROWS}>
			{props.searching ? (
				<div className={SEARCH_SLOT}>
					<Input
						label={words.search}
						kind="search"
						value={search}
						onChange={setSearch}
						autoFocus={props.typing}
					/>
				</div>
			) : null}
			<div
				ref={scroll.ref}
				role="listbox"
				aria-multiselectable={props.several ? true : undefined}
				aria-label={props.label}
				onKeyDown={(event) => {
					const target = event.target as HTMLElement;
					if (target.getAttribute("role") !== "option") return;
					// The arrows wrap and Home and End go to the ends, over every
					// option, mounted or not.
					const at = indexOf(target);
					const last = listed.length - 1;
					const next =
						event.key === "ArrowDown"
							? (at + 1) % listed.length
							: event.key === "ArrowUp"
								? (at - 1 + listed.length) % listed.length
								: event.key === "Home"
									? 0
									: event.key === "End"
										? last
										: undefined;
					if (next === undefined) return;
					event.preventDefault();
					setActive(listed[next]?.value);
					setWanted({ index: next });
				}}
				onFocus={(event) => {
					const target = event.target as HTMLElement;
					if (target.getAttribute("role") !== "option") return;
					setActive(listed[indexOf(target)]?.value);
				}}
				className={LISTBOX}
			>
				<Scroller value={scroll}>
					{shown.map((group, at) => (
						<PickGroupBox<V>
							key={group.label ?? at}
							group={group}
							before={shown
								.slice(0, at)
								.reduce((sum, each) => sum + each.options.length, 0)}
							stop={stop}
							first={props.first}
							several={props.several}
							value={props.value}
							chip={props.chip}
							pick={pick}
						/>
					))}
				</Scroller>
			</div>
			{shown.length === 0 ? <NoMatches>{words.noMatches}</NoMatches> : null}
			{props.act ? (
				<PickAct act={props.act} done={() => props.setOpen(false)} />
			) : null}
		</div>
	);
}
