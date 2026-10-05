import { Combobox } from "@base-ui/react/combobox";
import { Dialog } from "@base-ui/react/dialog";
import { Select } from "@base-ui/react/select";
import { cn } from "@fcalell/ui-core/cn";
import type {
	IconAct,
	Option,
	OptionGroup,
} from "@fcalell/ui-core/descriptors";
import { toggled } from "@fcalell/ui-core/list-state";
import type { ChipFamily } from "@fcalell/ui-core/tokens";
import {
	FIELD_GLYPH,
	FIELD_PLACEHOLDER,
	field,
	fieldValue,
	HAIRLINE,
	OPTION_GROUP_LABEL,
	PICKER_EMPTY,
	PICKER_POPOVER,
	PICKER_VALUE,
	PILL_ACT,
	POPOVER,
	picker,
	ROW_LEADING,
	type RowGround,
	row,
	SELECT_GROUP,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import {
	type ComponentProps,
	type FocusEvent,
	type ReactElement,
	type ReactNode,
	type RefObject,
	use,
	useRef,
	useState,
} from "react";
import { arrowsOver } from "../../lib/arrows.ts";
import { CellField } from "../../lib/field.ts";
import { spacing, useTouch } from "../../lib/media.ts";
import { PortalContainer } from "../../lib/portal.ts";
import { useWords } from "../../lib/words.tsx";
import { Avatar } from "../avatar/index.tsx";
import { Chip } from "../chip/index.tsx";
import { Icon } from "../icon/index.tsx";
import { Input } from "../input/index.tsx";
import { SheetBase } from "../sheet/base.tsx";
import { StatusDot } from "../status/dot.tsx";
import { Status } from "../status/index.tsx";
import type { PickerProps, PickOneProps, PickSeveralProps } from "./index.tsx";

// A field-fit trigger is the field box at the bar fit; open, it keeps the
// ring, as the `Select`'s does.
const FIELD_TRIGGER =
	"flex shrink-0 items-center text-start hover:border-edge-hover";
const FIELD_OPEN = "outline-2 outline-offset-2 outline-ring";
// In a table cell, or at the bar fit in a rule row, the trigger fills the
// cell or column it stands in for.
const FILL = "w-full";
const FIELD_VALUE = "min-w-0 grow truncate";
// A pick of several: the box wraps its chips, and the trigger that opens the
// list fills the line after them, its chevron at the box's end.
const SEVERAL_BOX =
	"flex flex-wrap items-center min-w-0 hover:border-edge-hover";
const SEVERAL_TRIGGER =
	"flex grow self-stretch items-center justify-between min-w-target text-start";
// A row-fit trigger centres in its row and pulls back by its own padding at
// the row's end; it stands over a row's hit. Open, it holds the press wash
// and the value takes the body ink.
const ROW_TRIGGER =
	"relative inline-flex shrink-0 self-center items-center -me-inside hover:bg-wash-hover active:bg-wash-press";
const ROW_OPEN = "bg-wash-press text-ink-body";
const ROW_VALUE = "truncate";
const OPEN_VALUE = "text-ink-body";
// The popover stops at the room Base UI measures below its trigger; its rows
// scroll inside it, under a search that stays.
const POPUP = "flex flex-col max-h-(--available-height)";
const POSITIONER = "z-(--layer-popover)";
const LIST =
	"flex flex-col gap-pair min-h-0 overflow-y-auto overscroll-contain";
const GROUP = "flex flex-col";
// The highlight washes the option under the pointer or the keyboard; the
// keyboard's highlight rings it inset as well, the wash alone being no focus
// cue, and the pointer's draws the wash alone.
const OPTION = "flex items-center active:bg-wash-press";
const OPTION_NO_FOCUS = "outline-none";
const KEYBOARD_RING = "outline-2 -outline-offset-2 outline-ring";
// A touch option is a button: its text at the start, its focus the
// keyboard's highlight and its ring.
const OPTION_BUTTON =
	"text-start focus-visible:bg-wash-hover focus-visible:-outline-offset-2";
const OPTION_TEXT = "flex flex-col min-w-0 grow";
const LINE = "truncate";
const TICK = "flex shrink-0 text-ink-body";
// A glyph leads an option in the row's leading slot.
const LEADING = "flex shrink-0 items-center justify-center";
// A chip column's value and options are its chips.
const CHIP_SLOT = "flex grow min-w-0";
const SEARCH = "flex grow items-center";
const SEARCH_VALUE =
	"min-w-0 grow truncate outline-none placeholder:text-ink-meta";
const SEARCH_SLOT = "flex px-card";
// The sheet's rows stand a pair under its head and the search, clear of a
// phone's home indicator; a long list scrolls.
const SHEET_ROWS = "flex flex-col gap-pair pt-pair pb-card min-h-0";
const LISTBOX = "flex flex-col min-h-0 overflow-y-auto overscroll-contain";
// The act that ends the list stands under a hairline across it, a float
// inset below the line.
const ACT_SLOT = "flex flex-col border-t pt-float";
const ACT_ROW =
	"flex items-center text-start hover:bg-wash-hover active:bg-wash-press focus-visible:-outline-offset-2";
const ACT_GLYPH = "flex shrink-0 text-ink-meta";

const SEARCH_PAST = 6;

// Base UI's props for a trigger.
type Handed = ComponentProps<"button">;

interface Several<V extends string | null> {
	value: readonly V[];
	onChange: (value: V[]) => void;
}

export function isSeveral<V extends string | null>(
	props: PickerProps<V>,
): props is PickerProps<V> & Several<V> {
	return Array.isArray(props.value);
}

interface Grouped<V extends string | null> {
	label?: string;
	items: readonly Option<V>[];
}

function groupsOf<V extends string | null>(
	options: PickerProps<V>["options"],
): Grouped<V>[] {
	const first = options[0];
	if (first === undefined || !("options" in first))
		return [{ items: options as readonly Option<V>[] }];
	return (options as readonly OptionGroup<V>[]).map((group) => ({
		label: group.label,
		items: group.options,
	}));
}

// A chip column's option draws as its chip alone, its description unsaid.
const asChip = (
	option: Option<string | null>,
	chip?: ChipFamily,
): chip is ChipFamily => chip !== undefined && option.value !== null;

const optionRow = (
	option: Option<string | null>,
	ground: RowGround,
	chip?: ChipFamily,
	highlighted = false,
) =>
	row({
		lines: option.description && !asChip(option, chip) ? "two" : "one",
		state: highlighted ? "highlighted" : "rest",
		ground,
	});

// An option's label (the empty choice in the placeholder's ink) over its
// description; an option carrying a state leads with its status's dot, one
// carrying an avatar with its avatar.
function OptionText(props: {
	option: Option<string | null>;
	chip?: ChipFamily;
}) {
	const { option, chip } = props;
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
			{option.status ? <StatusDot state={option.status} /> : null}
			{option.avatar ? (
				<Avatar name={option.label} src={option.avatar.src} />
			) : null}
			<span className={OPTION_TEXT}>
				<span
					className={cn(
						text({ role: "body" }),
						option.value === null && PICKER_EMPTY,
						LINE,
					)}
				>
					{option.label}
				</span>
				{option.description ? (
					<span className={cn(text({ role: "meta" }), LINE)}>
						{option.description}
					</span>
				) : null}
			</span>
		</>
	);
}

// The act that ends the list under a hairline: its glyph and label on a row,
// washed under the pointer and the press; it closes the list as it runs.
function PickAct(props: {
	act: IconAct;
	ground: RowGround;
	done: () => void;
	onFocus?: () => void;
}) {
	const { act } = props;
	return (
		<div className={cn(HAIRLINE, ACT_SLOT)}>
			<button
				type="button"
				onFocus={props.onFocus}
				onClick={() => {
					props.done();
					act.onAct();
				}}
				className={cn(row({ ground: props.ground }), ACT_ROW)}
			>
				<span className={ACT_GLYPH}>
					<Icon name={act.icon} />
				</span>
				<span className={cn(text({ role: "body" }), LINE)}>{act.label}</span>
			</button>
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
	/** The trigger's name where its composer says more than the value (a sort's direction). */
	name?: string;
}

// Overloaded as `Picker` is, so a handler's parameter is typed by the value
// beside it.
export function PickerBase<V extends string | null = string>(
	props: PickOneProps<V> & Composed,
): ReactElement;
export function PickerBase<V extends string | null = string>(
	props: PickSeveralProps<V> & Composed,
): ReactElement;
export function PickerBase<V extends string | null = string>(
	props: PickerProps<V> & Composed,
): ReactElement;
export function PickerBase<V extends string | null = string>(
	props: PickerProps<V> & Composed,
) {
	const { label, options, fit = "field", act, drawn, chip, name } = props;
	// A pick of several: its value is an array, which `Several` types as one.
	const several = isSeveral(props) ? props : undefined;
	const value = isSeveral(props) ? undefined : props.value;
	const set = several?.value;
	const touch = useTouch();
	// In a table cell the pick mounts open as its edit starts, and its list
	// gone, its leave played, ends the edit. The list hands focus back to the
	// cell as it unmounts (after its option's own press has focused it), unless
	// the close came from focus moving on.
	const cell = use(CellField);
	const [open, setOpenState] = useState(cell?.starts ?? false);
	const back = useRef(true);
	const setOpen = (next: boolean, details?: { reason: string }) => {
		setOpenState(next);
		if (next) return;
		back.current =
			details?.reason !== "outside-press" && details?.reason !== "focus-out";
	};
	const finalFocus: FinalFocus = cell
		? () => (back.current && cell.home()) || false
		: true;
	const groups = groupsOf(options);
	const flat = groups.flatMap((group) => group.items);
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
		name ??
		cell?.label ??
		(fit === "row" && current ? `${label}, ${current.label}` : label);
	const glyph = current?.icon ? (
		<Icon name={current.icon} fit={fit === "row" ? "meta" : "control"} />
	) : null;
	// An option carrying a state shows as its status.
	const status = current?.status ? (
		<Status state={current.status} label={current.label} />
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
			{current?.label ?? label}
		</span>
	);
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
				{status ?? current?.label ?? label}
			</span>
		);
	// The chips of a pick of several each hold their own remove act, so the
	// box is no button: the trigger that opens the list stands after them.
	const severalBox = (handed: Handed, picks: Several<V>) => (
		<div
			className={cn(
				field({ fit: "bar" }),
				picker({ fit: "bar" }),
				FIELD_GLYPH,
				SEVERAL_BOX,
				FILL,
				open && FIELD_OPEN,
			)}
		>
			{chosen.map((option) => (
				<Chip
					key={String(option.value)}
					family="neutral"
					label={option.label}
					onRemove={() =>
						picks.onChange(picks.value.filter((one) => one !== option.value))
					}
				/>
			))}
			<button
				{...handed}
				type="button"
				aria-label={named}
				className={SEVERAL_TRIGGER}
			>
				{chosen.length === 0 ? (
					<span
						className={cn(
							fieldValue({ kind: "text" }),
							FIELD_PLACEHOLDER,
							FIELD_VALUE,
						)}
					>
						{label}
					</span>
				) : null}
				<Icon name="ChevronDown" fit="control" />
			</button>
		</div>
	);
	const own = (handed: ComponentProps<"button">) =>
		several ? (
			severalBox(handed, several)
		) : (
			<button
				{...handed}
				type="button"
				aria-label={named}
				tabIndex={cell ? -1 : handed.tabIndex}
				className={
					fit === "row"
						? cn(PILL_ACT, picker({ fit }), ROW_TRIGGER, open && ROW_OPEN)
						: cn(
								field({ fit: "bar" }),
								picker({ fit }),
								FIELD_GLYPH,
								FIELD_TRIGGER,
								(cell || fit === "bar") && FILL,
								open && FIELD_OPEN,
							)
				}
			>
				{glyph}
				{fit === "row" ? rowValue : fieldShown}
				<Icon name="ChevronDown" fit={fit === "row" ? "meta" : "control"} />
			</button>
		);
	const trigger = drawn
		? (handed: ComponentProps<"button">) => drawn(handed, open)
		: own;
	if (touch)
		return (
			<PickSheet
				label={label}
				groups={groups}
				value={value}
				several={several}
				searching={searching}
				open={open}
				setOpen={setOpen}
				onGone={cell?.done}
				pick={pick}
				trigger={trigger}
				act={act}
				chip={chip}
			/>
		);
	if (searching)
		return (
			<PickSearch
				label={label}
				groups={groups}
				current={current}
				several={several}
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
		);
	return (
		<PickList
			label={label}
			groups={groups}
			value={value}
			several={several}
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
}

// Whether the keyboard moved the highlight last: a key on the trigger or in
// the popup (an Enter that opens it among them) sets it, the pointer clears it.
function useKeyed(trigger: PickParts<string | null>["trigger"]) {
	const [keyed, setKeyed] = useState(false);
	const keys = () => setKeyed(true);
	const pointer = () => setKeyed(false);
	return {
		keyed,
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
	groups: Grouped<V>[];
	open: boolean;
	setOpen: (open: boolean, details?: { reason: string }) => void;
	// Hears the list gone, its leave played: a cell's pick ends its edit.
	onGone?: () => void;
	pick: (value: V) => void;
	trigger: (props: ComponentProps<"button">) => ReactElement;
	act?: IconAct;
	chip?: ChipFamily;
	// A pick of several: its chosen values and what hears their new set.
	several?: Several<V>;
}

// Where a desktop list hands focus as it closes: Base UI's own return, or
// what a table cell's pick names.
type FinalFocus = true | (() => HTMLElement | false);

// The desktop list of six options or fewer: Base UI's select supplies the
// listbox, its keyboard and its typeahead.
function PickList<V extends string | null>(
	props: PickParts<V> & { value: V | undefined; finalFocus: FinalFocus },
) {
	const container = use(PortalContainer);
	const keyboard = useKeyed(props.trigger);
	// In a table cell the list hangs from the cell's start.
	const align = use(CellField) ? "start" : "end";
	return (
		<Select.Root
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
					align={align}
					alignItemWithTrigger={false}
					sideOffset={() => spacing("pair")}
				>
					<Select.Popup
						finalFocus={props.finalFocus}
						{...keyboard.popup}
						className={cn(POPOVER, PICKER_POPOVER, POPUP)}
					>
						<Select.List aria-label={props.label} className={LIST}>
							{props.groups.map((group, at) => (
								<Select.Group
									key={group.label ?? at}
									className={cn(SELECT_GROUP, GROUP)}
								>
									{group.label ? (
										<Select.GroupLabel
											render={<GroupLabel>{group.label}</GroupLabel>}
										/>
									) : null}
									{group.items.map((option) => (
										<Select.Item
											key={String(option.value)}
											value={option.value}
											label={option.label}
											className={(state) =>
												cn(
													optionRow(
														option,
														"list",
														props.chip,
														state.highlighted,
													),
													OPTION,
													optionFocus(state.highlighted, keyboard.keyed),
												)
											}
										>
											<OptionText option={option} chip={props.chip} />
											<Select.ItemIndicator className={TICK}>
												<Icon name="Check" fit="body" />
											</Select.ItemIndicator>
										</Select.Item>
									))}
								</Select.Group>
							))}
						</Select.List>
						{props.act ? (
							<PickAct
								act={props.act}
								ground="list"
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

// The desktop list past six options: Base UI's combobox filters the rows by
// the search typed at the popover's head.
function PickSearch<V extends string | null>(
	props: PickParts<V> & {
		current: Option<V> | undefined;
		chosen: Option<V>[];
		finalFocus: FinalFocus;
	},
) {
	const container = use(PortalContainer);
	const words = useWords();
	const keyboard = useKeyed(props.trigger);
	const align = use(CellField) ? "start" : "end";
	return (
		<Combobox.Root
			items={props.groups}
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
					align={align}
					sideOffset={() => spacing("pair")}
				>
					<Combobox.Popup
						finalFocus={props.finalFocus}
						{...keyboard.popup}
						aria-label={props.label}
						className={cn(POPOVER, PICKER_POPOVER, POPUP)}
					>
						<div className={cn(field({ fit: "bar" }), FIELD_GLYPH, SEARCH)}>
							<Icon name="Search" fit="control" />
							<Combobox.Input
								placeholder={words.search}
								aria-label={words.search}
								className={cn(fieldValue({ kind: "search" }), SEARCH_VALUE)}
							/>
						</div>
						<Combobox.List className={LIST}>
							{(group: Grouped<V>) => (
								<Combobox.Group
									key={group.label ?? ""}
									items={group.items as Option<V>[]}
									className={cn(SELECT_GROUP, GROUP)}
								>
									{group.label ? (
										<Combobox.GroupLabel
											render={<GroupLabel>{group.label}</GroupLabel>}
										/>
									) : null}
									<Combobox.Collection>
										{(option: Option<V>) => (
											<Combobox.Item
												key={String(option.value)}
												value={option}
												className={(state) =>
													cn(
														optionRow(
															option,
															"list",
															props.chip,
															state.highlighted,
														),
														OPTION,
														optionFocus(state.highlighted, keyboard.keyed),
													)
												}
											>
												<OptionText option={option} chip={props.chip} />
												<Combobox.ItemIndicator className={TICK}>
													<Icon name="Check" fit="body" />
												</Combobox.ItemIndicator>
											</Combobox.Item>
										)}
									</Combobox.Collection>
								</Combobox.Group>
							)}
						</Combobox.List>
						{props.act ? (
							<PickAct
								act={props.act}
								ground="list"
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

const moveFocus = arrowsOver("option");

// The listbox's one tab stop moves to the option focus reaches.
function rove(event: FocusEvent<HTMLElement>): void {
	if (event.target.getAttribute("role") !== "option") return;
	for (const option of event.currentTarget.querySelectorAll<HTMLElement>(
		'[role="option"]',
	))
		option.tabIndex = option === event.target ? 0 : -1;
}

type SheetParts<V extends string | null> = PickParts<V> & {
	value: V | undefined;
	searching: boolean;
};

// The touch sheet: the rows edge to edge under the sheet's head, a search
// leading them past six options. It opens focused on the options' tab stop.
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

// The sheet's rows hold the search, so it leaves with the sheet however it
// closes (a pick, the act, the scrim, Escape) and the next open starts from
// every option.
function PickRows<V extends string | null>(
	props: Omit<SheetParts<V>, "open" | "trigger"> & {
		first: RefObject<HTMLButtonElement | null>;
	},
) {
	const [search, setSearch] = useState("");
	const typed = search.trim().toLowerCase();
	const shown = props.groups
		.map((group) => ({
			...group,
			items: group.items.filter((option) =>
				option.label.toLowerCase().includes(typed),
			),
		}))
		.filter((group) => group.items.length > 0);
	// The options are one tab stop that the arrows move: it starts on the chosen
	// one, else the first, and follows focus in the DOM, so a move re-renders
	// no option.
	const values = shown.flatMap((group) => group.items.map((o) => o.value));
	const isChosen = (one: V) =>
		props.several ? props.several.value.includes(one) : one === props.value;
	const kept = values.find(isChosen);
	const stop = kept !== undefined ? kept : values[0];
	return (
		<div className={SHEET_ROWS}>
			{props.searching ? (
				<div className={SEARCH_SLOT}>
					<Input kind="search" value={search} onChange={setSearch} />
				</div>
			) : null}
			<div
				role="listbox"
				aria-multiselectable={props.several ? true : undefined}
				aria-label={props.label}
				onKeyDown={moveFocus}
				onFocus={rove}
				className={LISTBOX}
			>
				{shown.map((group, at) => (
					// biome-ignore lint/a11y/useSemanticElements: a listbox's group of options
					<div
						key={group.label ?? at}
						role="group"
						className={cn(SELECT_GROUP, GROUP)}
					>
						{group.label ? <GroupLabel>{group.label}</GroupLabel> : null}
						{group.items.map((option) => {
							const chosen = isChosen(option.value);
							const stands = option.value === stop;
							return (
								<button
									key={String(option.value)}
									ref={stands ? props.first : undefined}
									type="button"
									role="option"
									aria-selected={chosen}
									tabIndex={stands ? 0 : -1}
									onClick={() => props.pick(option.value)}
									className={cn(
										optionRow(option, "group", props.chip),
										OPTION,
										OPTION_BUTTON,
									)}
								>
									<OptionText option={option} chip={props.chip} />
									{chosen ? (
										<span className={TICK}>
											<Icon name="Check" fit="body" />
										</span>
									) : null}
								</button>
							);
						})}
					</div>
				))}
			</div>
			{props.act ? (
				<PickAct
					act={props.act}
					ground="group"
					done={() => props.setOpen(false)}
				/>
			) : null}
		</div>
	);
}
