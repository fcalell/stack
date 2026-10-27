// The public matrix layer: one cva per table, the axis types a component
// declares its props with, the single-cell constants, and the family registry
// with its cell enumeration. The tables themselves stay internal to the
// package.
import { cva } from "class-variance-authority";
import type { ClassValue } from "clsx";
import type { ChangeKind } from "./descriptors.ts";
import { COLOR_NAMES, type ColorName, type Tone } from "./tokens.ts";
import {
	ANSWER,
	AVATAR,
	AVATAR_LABEL,
	type Axes,
	BANNER,
	BANNER_GLYPH,
	BUTTON,
	BUTTON_LABEL,
	CANVAS_GROUP,
	CANVAS_NODE,
	CANVAS_NODE_GLYPH,
	CANVAS_NODE_INK,
	CANVAS_NODE_NAME,
	CANVAS_NODE_TEXT,
	CHANGE_MARK,
	CHART_BAND,
	CHART_FILL,
	CHECK_MARK,
	CHECKBOX,
	CHEVRON,
	CHIP,
	CHIP_DOT,
	CODE_TEXT,
	COLUMNS,
	CURRENT_BAR,
	CURRENT_ROOM,
	DIFF_LINE,
	FIELD,
	FIELD_VALUE,
	FILE_COUNT,
	FILE_PATH_PART,
	FILL_FADE,
	FILL_X,
	FILL_Y,
	GIVE,
	ICON,
	ICON_BUTTON,
	IMAGE,
	IMAGE_PICTURE,
	LIFT,
	LINE_BOX,
	LINK,
	type Matrix,
	MENU,
	MENU_GROUP,
	MENU_LABEL,
	MESSAGE,
	METER_FILL,
	OPTION_RADIO,
	OTP_BOX,
	PAINT,
	PATH_TONE,
	PICKER,
	PLACE_ROW,
	PLACE_ROW_GLYPH,
	PLACE_TAB,
	PLACE_TAB_LABEL,
	PROSE_DIFF_RUN,
	PROSE_MARKER,
	RADIO_DOT,
	ROW,
	ROW_MARK,
	ROW_STEP,
	ROW_TITLE,
	RULE_ARROW,
	SEGMENT,
	SEGMENT_LABEL,
	SHEET_DESKTOP,
	STAGE,
	STAGE_MARK,
	STAGE_RAIL,
	STATE_CHIP,
	STATUS_DOT,
	STEP_COUNT_SEGMENT,
	SWAP_IN,
	SWAP_OUT,
	SWITCH,
	SWITCH_THUMB,
	TABLE_CHANGE_VALUE,
	TABLE_FROZEN_CELL,
	TABLE_HEAD,
	TABLE_HEAD_LABEL,
	TABLE_ROW,
	TEXT,
	TEXT_AREA,
	TEXT_AREA_BUDGET,
	TEXT_STRONG,
	TOAST_STATE,
	TOGGLE_THUMB,
	TRAVEL_X,
} from "./variant-tables.ts";

// A variant's props: one optional pick per axis, and the class or the
// className a caller merges in, never both. The shape is cva's own, spelled
// here so the declarations this file emits name this package's types alone:
// cva keeps its prop types in a `types` module the emit would otherwise have
// to import by path, which is not portable and fails wherever the package is
// built inside a pnpm virtual store.
export type ClassProp =
	| { class: ClassValue; className?: never }
	| { class?: never; className: ClassValue }
	| { class?: never; className?: never };
export type VariantProps<T extends Axes> = {
	[K in keyof T]?: keyof T[K] | null | undefined;
} & ClassProp;
export type Variant<T extends Axes> = (props?: VariantProps<T>) => string;

// The only way a cva is built here. Taking the whole matrix leaves no second
// argument to get wrong, so a cva cannot end up rendering another table's cells
// or dropping its own base. cva's own config and prop types are conditional
// on a concrete axis set, which is why one generic helper has to widen both.
function build<T extends Axes>(table: Matrix<T>): Variant<T> {
	return cva<T>(
		table.base,
		table as unknown as Parameters<typeof cva<T>>[1],
	) as Variant<T>;
}

export const text = build(TEXT);
export const textStrong = build(TEXT_STRONG);
export const icon = build(ICON);
export const button = build(BUTTON);
export const buttonLabel = build(BUTTON_LABEL);
export const iconButton = build(ICON_BUTTON);
export const link = build(LINK);
export const avatar = build(AVATAR);
export const avatarLabel = build(AVATAR_LABEL);
export const statusDot = build(STATUS_DOT);
export const stateChip = build(STATE_CHIP);
export const changeMark = build(CHANGE_MARK);
export const chip = build(CHIP);
export const chipDot = build(CHIP_DOT);
export const field = build(FIELD);
export const fieldValue = build(FIELD_VALUE);
export const textArea = build(TEXT_AREA);
export const textAreaBudget = build(TEXT_AREA_BUDGET);
export const otpBox = build(OTP_BOX);
export const switchTrack = build(SWITCH);
export const switchThumb = build(SWITCH_THUMB);
export const checkbox = build(CHECKBOX);
export const optionRadio = build(OPTION_RADIO);
export const row = build(ROW);
export const rowTitle = build(ROW_TITLE);
export const rowStep = build(ROW_STEP);
export const rowMark = build(ROW_MARK);
export const lineBox = build(LINE_BOX);
export const tableRow = build(TABLE_ROW);
export const tableHead = build(TABLE_HEAD);
export const tableHeadLabel = build(TABLE_HEAD_LABEL);
export const tableFrozenCell = build(TABLE_FROZEN_CELL);
export const tableChangeValue = build(TABLE_CHANGE_VALUE);
export const segment = build(SEGMENT);
export const segmentLabel = build(SEGMENT_LABEL);
export const picker = build(PICKER);
export const ruleArrow = build(RULE_ARROW);
export const banner = build(BANNER);
export const bannerGlyph = build(BANNER_GLYPH);
export const toastState = build(TOAST_STATE);
export const menu = build(MENU);
export const menuGroup = build(MENU_GROUP);
export const menuLabel = build(MENU_LABEL);
export const sheetDesktop = build(SHEET_DESKTOP);
export const proseMarker = build(PROSE_MARKER);
export const proseDiffRun = build(PROSE_DIFF_RUN);
export const codeText = build(CODE_TEXT);
export const diffLine = build(DIFF_LINE);
export const filePathPart = build(FILE_PATH_PART);
export const fileCount = build(FILE_COUNT);
export const message = build(MESSAGE);
export const meterFill = build(METER_FILL);
export const chartBand = build(CHART_BAND);
export const chartFill = build(CHART_FILL);
export const stage = build(STAGE);
export const stageMark = build(STAGE_MARK);
export const stageRail = build(STAGE_RAIL);
export const image = build(IMAGE);
export const imagePicture = build(IMAGE_PICTURE);
export const canvasGroup = build(CANVAS_GROUP);
export const canvasNode = build(CANVAS_NODE);
export const canvasNodeText = build(CANVAS_NODE_TEXT);
export const canvasNodeGlyph = build(CANVAS_NODE_GLYPH);
export const canvasNodeInk = build(CANVAS_NODE_INK);
export const canvasNodeName = build(CANVAS_NODE_NAME);
export const placeRow = build(PLACE_ROW);
export const placeRowGlyph = build(PLACE_ROW_GLYPH);
export const placeTab = build(PLACE_TAB);
export const placeTabLabel = build(PLACE_TAB_LABEL);
export const stepCountSegment = build(STEP_COUNT_SEGMENT);
export const columns = build(COLUMNS);
export const paint = build(PAINT);

// ── The family registry and its cells ──────────────────────────────

export type AnyCva = (props: Record<string, string>) => string;

export interface Family {
	name: string;
	cva: AnyCva;
	axes: Record<string, readonly string[]>;
}

// A registered matrix: its table's name, its cva, and each axis with the keys
// its table declares, read off the table so the two cannot drift.
function family<T extends Axes>(
	name: string,
	table: Matrix<T>,
	variant: Variant<T>,
): Family {
	return {
		name,
		// A cva takes any subset of its axes; the registry calls it one axis at
		// a time with a key the table declares.
		cva: variant as unknown as AnyCva,
		axes: Object.fromEntries(
			Object.entries(table.variants).map(([axis, cells]) => [
				axis,
				Object.keys(cells),
			]),
		),
	};
}

// Every matrix this module builds, under its table's name.
export const FAMILIES: readonly Family[] = [
	family("TEXT", TEXT, text),
	family("TEXT_STRONG", TEXT_STRONG, textStrong),
	family("ICON", ICON, icon),
	family("BUTTON", BUTTON, button),
	family("BUTTON_LABEL", BUTTON_LABEL, buttonLabel),
	family("ICON_BUTTON", ICON_BUTTON, iconButton),
	family("LINK", LINK, link),
	family("AVATAR", AVATAR, avatar),
	family("AVATAR_LABEL", AVATAR_LABEL, avatarLabel),
	family("STATUS_DOT", STATUS_DOT, statusDot),
	family("STATE_CHIP", STATE_CHIP, stateChip),
	family("CHANGE_MARK", CHANGE_MARK, changeMark),
	family("CHIP", CHIP, chip),
	family("CHIP_DOT", CHIP_DOT, chipDot),
	family("FIELD", FIELD, field),
	family("FIELD_VALUE", FIELD_VALUE, fieldValue),
	family("TEXT_AREA", TEXT_AREA, textArea),
	family("TEXT_AREA_BUDGET", TEXT_AREA_BUDGET, textAreaBudget),
	family("OTP_BOX", OTP_BOX, otpBox),
	family("SWITCH", SWITCH, switchTrack),
	family("SWITCH_THUMB", SWITCH_THUMB, switchThumb),
	family("CHECKBOX", CHECKBOX, checkbox),
	family("OPTION_RADIO", OPTION_RADIO, optionRadio),
	family("ROW", ROW, row),
	family("ROW_TITLE", ROW_TITLE, rowTitle),
	family("ROW_STEP", ROW_STEP, rowStep),
	family("ROW_MARK", ROW_MARK, rowMark),
	family("LINE_BOX", LINE_BOX, lineBox),
	family("TABLE_ROW", TABLE_ROW, tableRow),
	family("TABLE_HEAD", TABLE_HEAD, tableHead),
	family("TABLE_HEAD_LABEL", TABLE_HEAD_LABEL, tableHeadLabel),
	family("TABLE_FROZEN_CELL", TABLE_FROZEN_CELL, tableFrozenCell),
	family("TABLE_CHANGE_VALUE", TABLE_CHANGE_VALUE, tableChangeValue),
	family("SEGMENT", SEGMENT, segment),
	family("SEGMENT_LABEL", SEGMENT_LABEL, segmentLabel),
	family("PICKER", PICKER, picker),
	family("RULE_ARROW", RULE_ARROW, ruleArrow),
	family("BANNER", BANNER, banner),
	family("BANNER_GLYPH", BANNER_GLYPH, bannerGlyph),
	family("TOAST_STATE", TOAST_STATE, toastState),
	family("MENU", MENU, menu),
	family("MENU_GROUP", MENU_GROUP, menuGroup),
	family("MENU_LABEL", MENU_LABEL, menuLabel),
	family("SHEET_DESKTOP", SHEET_DESKTOP, sheetDesktop),
	family("PROSE_MARKER", PROSE_MARKER, proseMarker),
	family("PROSE_DIFF_RUN", PROSE_DIFF_RUN, proseDiffRun),
	family("CODE_TEXT", CODE_TEXT, codeText),
	family("DIFF_LINE", DIFF_LINE, diffLine),
	family("FILE_PATH_PART", FILE_PATH_PART, filePathPart),
	family("FILE_COUNT", FILE_COUNT, fileCount),
	family("MESSAGE", MESSAGE, message),
	family("METER_FILL", METER_FILL, meterFill),
	family("CHART_BAND", CHART_BAND, chartBand),
	family("CHART_FILL", CHART_FILL, chartFill),
	family("IMAGE", IMAGE, image),
	family("IMAGE_PICTURE", IMAGE_PICTURE, imagePicture),
	family("CANVAS_GROUP", CANVAS_GROUP, canvasGroup),
	family("CANVAS_NODE", CANVAS_NODE, canvasNode),
	family("CANVAS_NODE_TEXT", CANVAS_NODE_TEXT, canvasNodeText),
	family("CANVAS_NODE_GLYPH", CANVAS_NODE_GLYPH, canvasNodeGlyph),
	family("CANVAS_NODE_INK", CANVAS_NODE_INK, canvasNodeInk),
	family("CANVAS_NODE_NAME", CANVAS_NODE_NAME, canvasNodeName),
	family("STAGE", STAGE, stage),
	family("STAGE_MARK", STAGE_MARK, stageMark),
	family("STAGE_RAIL", STAGE_RAIL, stageRail),
	family("PLACE_ROW", PLACE_ROW, placeRow),
	family("PLACE_ROW_GLYPH", PLACE_ROW_GLYPH, placeRowGlyph),
	family("PLACE_TAB", PLACE_TAB, placeTab),
	family("PLACE_TAB_LABEL", PLACE_TAB_LABEL, placeTabLabel),
	family("STEP_COUNT_SEGMENT", STEP_COUNT_SEGMENT, stepCountSegment),
	family("COLUMNS", COLUMNS, columns),
	family("PAINT", PAINT, paint),
];

export function classes(value: string): string[] {
	return value.split(/\s+/).filter(Boolean);
}

// One axis value's cell is what its rendering adds over the rendering every
// other value of that axis shares. A compound row folds into the axis it
// keys off, which is what makes `bg-accent` reachable as BUTTON's primary cell.
export function matrixCells(
	families: readonly Family[],
): Map<string, Set<string>> {
	const out = new Map<string, Set<string>>();
	for (const family of families) {
		for (const [axis, values] of Object.entries(family.axes)) {
			const sets = values.map(
				(value) => new Set(classes(family.cva({ [axis]: value }))),
			);
			const first = sets[0];
			if (!first) continue;
			const shared = new Set(
				[...first].filter((name) => sets.every((set) => set.has(name))),
			);
			values.forEach((value, index) => {
				const set = sets[index];
				if (!set) return;
				const cell = new Set([...set].filter((name) => !shared.has(name)));
				if (cell.size > 0) out.set(`${family.name}.${axis}.${value}`, cell);
			});
		}
	}
	return out;
}

// Single cells: one class string each, shared verbatim by both plugins.

// A number in the meta ink at the caption size (the role, not a third grey,
// keeps it quieter than a title), its figures at one width. A count inside a
// filled act draws `COUNT_LABEL` alone, in the act's label ink.
export const COUNT = "text-ink-meta";
export const COUNT_LABEL =
	"text-caption leading-caption tracking-caption font-normal tabular-nums";
// A ring the size of the glyph it replaces: a track at 30 % under a turning
// arc, both in the ink of its place (a plugin overlay: native colours a prop).
export const SPINNER = "size-spinner";
export const SPINNER_TRACK = "rounded-full border-2 opacity-30";
export const SPINNER_ARC = "rounded-full border-2 border-t-transparent";
// The busy glyph when the theme scrambles its text (`theme.loading`): three
// mono glyphs cycling at `tick` in a box three glyphs wide (the component sets
// the width, `3ch`), the spinner's height, in the ink of its place.
export const BUSY_GLYPHS =
	"h-spinner font-mono text-code leading-code font-normal";
// A status: its dot (`statusDot`) beside its word, the word truncating only
// when the line it stands on is out of room.
export const STATUS = "gap-gap";
// A running status's mark: the spinner in the dot's place, its slot carrying
// the accent ink the spinner draws in (a native place sets the same tone as
// the spinner's ink, read through `statusContentTone`).
export const STATUS_SPINNER = "text-accent-ink";
export const STATUS_LABEL = "text-meta leading-meta font-normal text-ink-meta";
// Words that act in a control-radius box with no boundary at rest: a row's
// pick and a status that moves (Picker), a header fact that opens a sheet
// or goes to a route (Pane's record head). It pulls back by its own padding on the
// side that meets plain text (an overlay), so its words sit where static
// words do. Shared by both drawers.
export const WORD_ACT = `rounded-control px-gap min-h-target ${ANSWER}`;
// A remove act's round hit box, the chip's height: a chip's and a
// thumbnail's (`IMAGE_REMOVE`). Unheld, drawn by each that has one.
export const REMOVE_HIT = `min-h-chip min-w-chip rounded-full ${ANSWER} ${GIVE}`;
// An error line under its control, in the error ink: a field's (`FormField`)
// and a list row's entry. Unheld, drawn by each that has one.
export const FIELD_ERROR_LINE =
	"text-meta leading-meta font-normal text-ink-error";
export const FIELD_PLACEHOLDER = "text-ink-meta";
// The word `optional` under the name of a field that may be left empty, on a
// second line of the label column.
export const FIELD_OPTIONAL = "block text-ink-meta";
// An optional field on one line: its name starts the gap down (a body line in
// a control has the gap above and below, so the line centres on the control's),
// the word under it, and the row's cells start at its top so the control
// stays where a required field's stands; the row grows by the word. A text
// area's name hangs from its top, and on touch the label stands over the
// control with no inset.
export const FIELD_OPTIONAL_BOX = "items-start touch:items-stretch";
export const FIELD_OPTIONAL_LINE = "min-h-control";
export const FIELD_OPTIONAL_NAME = "items-start pt-gap touch:pt-0";
// A field's unit after its value, cut at the short measure, and its glyph
// (search, chevron).
export const FIELD_UNIT =
	"max-w-measure-short text-body leading-body font-normal text-ink-meta";
export const FIELD_GLYPH = "text-ink-meta";
// A bar pick that holds no value is quiet: no edge, the wash under the pointer;
// set, it takes the field box and its value in the body ink.
export const FIELD_QUIET =
	"border-transparent bg-transparent hover:bg-wash-hover";
// The label of a chip: bounded, so a long chip truncates before the row's title
// does, in the body ink.
export const CHIP_LABEL =
	"max-w-measure-short text-caption leading-caption tracking-caption font-normal text-ink-body";
// The word of a state chip: the chip's caption look in the state's ink.
export const STATE_CHIP_LABEL =
	"max-w-measure-short text-caption leading-caption tracking-caption font-normal";
// A pick of several's chips wrap in a run inside its field box, inset above
// and below by what centres a chip in the control (so one line of
// chips stands at the box's bar-fit height, border included); the trigger
// beside the run reaches across the box's border, so its hit is the box's
// height.
export const CHIPS_RUN = "py-chips-inset";
export const CHIPS_TRIGGER = "-my-hairline py-hairline";
// A text area's value: three body lines at least, a line more for each past them.
export const TEXT_AREA_VALUE = "min-h-text-area";
// A one-time code's row of boxes and the digit in each.
export const OTP = "gap-gap";
// An option group's label over its rows, inset to the rows' text.
export const OPTION_GROUP_LABEL = "px-pad pt-gap";
// An option's row in a popover or a list of choices (Menu, Picker,
// list Picker): its wash at the control's inset, in place of the row's own card
// inset, and the row's floor, so on touch it stands at the target as a list's
// row does. Unheld, drawn by each that has one.
export const OPTION_ROW = "px-pad min-h-row";
export const OTP_DIGIT =
	"text-heading leading-heading font-medium text-ink-body font-mono";
// A slider: its label line (the label, its value trailing, cut at the short
// measure) over the track, the fill up to the thumb and the rest after it.
export const SLIDER = "gap-gap";
export const SLIDER_HEAD = "gap-stack";
export const SLIDER_LABEL = "text-body leading-body font-medium text-ink-body";
export const SLIDER_VALUE =
	"max-w-measure-short tabular-nums text-meta leading-meta font-normal text-ink-meta";
export const SLIDER_TRACK = "w-full min-h-target";
export const SLIDER_FILL = `h-track rounded-full bg-toggle-on ${ANSWER}`;
// The unfilled rail is the control's part, in the thumb's boundary ink, so it
// reads as a track beside the hairline of the group it stands in.
export const SLIDER_REST = "h-track rounded-full bg-edge-strong";
export const SLIDER_THUMB = `size-thumb rounded-full border border-edge-strong bg-surface ${ANSWER}`;
// A picker's empty choice and its control with no value: a placeholder's
// look.
export const PICKER_EMPTY = "text-ink-meta";
// The value a row's pick shows in its box (`PICKER {fit: row}`), bounded as a
// status' label is so a long one truncates before the title beside it does;
// the field fit's value is `FIELD_VALUE`'s.
export const PICKER_VALUE =
	"max-w-measure-short tabular-nums text-meta leading-meta font-normal text-ink-meta";
// The pick's popover at the popover's width (its ground and inset are
// `POPOVER`'s).
export const PICKER_POPOVER = "w-popover";
// The pick of a Pane's bar (`PICKER {fit: pill}`): the field box at the bar
// fit (the control height, the control radius, a hairline border on
// the surface) under the hover wash in place of the hover edge, held to the
// popover's width so a long label truncates.
export const PICKER_PILL = "max-w-popover hover:bg-wash-hover";
// A list of rules on the desktop: rows of flex terms sharing one basis, so the
// columns align across rows, a pair rhythm between rows and the inside gap
// between terms. A rule's terms keep the inside gap on touch too, stacked in
// its card (`RULE_CARD`'s inset, a sheet holding the cards).
export const RULES = "gap-y-gap";
export const RULE_ROW = "gap-gap";
export const RULE_CARD = "px-pad py-gap";
// A popover: raised on the float shadow inside its hairline, its rows inset
// by the float inset so a row's wash sits just inside the edge.
export const POPOVER =
	"gap-gap p-gap bg-raised border border-edge-raised rounded-popover shadow-float";
// `w-max` because a popup mounts in a zero-size container, where its shrink-to-fit
// width would be its longest word.
const NAME_GROUND =
	"w-max px-gap py-gap bg-raised border border-edge-raised rounded-control shadow-float text-meta leading-meta font-normal text-ink-body";
// An icon act's name, shown on a rest or the keyboard: the popover's ground and
// hairline round one line of meta ink, the width of its words up to a short
// measure.
export const TOOLTIP = `${NAME_GROUND} max-w-measure-short`;
// Cut text's whole text, in the same ground: a sentence, not a name, so it may
// grow to the full measure.
export const TOOLTIP_CUT = `${NAME_GROUND} max-w-measure`;
export const HAIRLINE = "border-edge";
// The check or the dash on a checked box, at the meta glyph's size.
export const CHECKBOX_MARK = `size-icon-meta text-on-accent ${CHECK_MARK}`;
// A row's leading (an avatar, a glyph, a tick's box, a status mark) sizes to
// what it holds and stands in the row's gap rhythm: no slot reserves room for
// a part a row does not have. A list leads every row with one kind of mark,
// so its titles share one x.
export const ROW_LEADING = "shrink-0";
export const ROW_LEADING_STATUS = "shrink-0";
// A row's first line: its title (an option's label) and what trails it.
export const ROW_TITLE_LINE = "gap-gap";
// A one-line row's text: the title, then its meta parts an inside gap after it
// on the same line.
export const ROW_INLINE = "gap-gap";
// A list row's trailing value (a time, a date), its figures at one width.
export const ROW_TRAILING =
	"tabular-nums text-meta leading-meta font-normal text-ink-meta";
// The items of a row's second line (an entry's input and act, a step, an
// option's description) an inside gap apart.
export const ROW_META_LINE = "gap-x-gap";
// A sheet's open row carries the current bar drawn over its start (`current`
// wide, an inset shadow), taking no room: every row's text and hairline then
// stand at the sheet's inset, as a band's do, and nothing moves as the bar
// arrives.
export const ROW_CURRENT_BAR =
	"shadow-[inset_var(--spacing-current)_0_0_var(--color-accent)] rounded-s-none";
// A row is a flex group of two groups, and these are the two (each platform
// sets the direction and the centring, which are overlays). Its text group is
// the title or label over its description or meta line, a column that gives
// way to its end group: below its own content, so its text wraps or truncates
// inside the room the end group leaves. Its end group is what stands at the
// row's end (a value, a status, a lock, a control, an act, a chevron), a line
// centred on the row, its parts an inside apart. A row with no end item draws
// no end group, so nothing reserves room for one; room that holds an alignment
// is a group's gap or padding, never an empty element.
export const ROW_TEXT = "min-w-0 shrink";
export const ROW_END = "gap-gap";
// A row's text group keeps at least two fifths of the row's content width, the
// Pane head's floor (a fraction, never a width), whatever else stands in the
// row (a leading, a more act). The end group takes what is left and its value
// truncates inside it.
export const ROW_TEXT_FLOOR = "basis-2/5 shrink-0";
// A list row's marks lead its meta line under the title, in order (the status's
// dot and word, a warning, a lock, a chip, the boolean marks), each its glyph
// and its word, a gap apart, then the meta parts; the line wraps them whole. A
// row with a mark is two lines at every width. The warning's glyph is in
// `warn`, its label in the meta ink.
export const ROW_MARKS = "gap-gap";
export const ROW_WARNING = "text-warn";
// A row's boolean marks (`marks`) after its chip: the required ring, a filled
// circle at the dot's size in the meta ink while it holds (one that does not
// draws nothing), and a flag glyph in the meta ink, each beside its label.
export const ROW_RING = "size-dot shrink-0 rounded-full border border-ink-meta";
export const ROW_RING_FILLED = "bg-ink-meta";
export const ROW_FLAG = "text-ink-meta";
export const ROW_ACTS = "gap-gap";
// A list row's step list, in the meta line's place while its act pends: one
// line per step (`rowStep`), a pair gap apart.
export const ROW_STEPS = "gap-gap";
// A list row's entry: the title, the input with its act and the error line a
// pair apart, the error (`FIELD_ERROR_LINE`) under the input.
export const ROW_ENTRY = "gap-gap";
// A definition row subgrids the two columns of the rows grid it stands in
// (`ROWS`): its label in the first, as wide as the widest label of the run,
// and its value line (the change mark, the value, the end group) in the
// second, the row's gap between them; a description stands under the value.
// On touch the row is a column: the label, then the value line at the row's
// whole width (a label column leaves an email or a domain no room).
export const DEFINITION_BOX =
	"min-h-control grid grid-cols-subgrid gap-x-stack items-center touch:flex touch:flex-col touch:items-stretch";
export const DEFINITION_LINE = "gap-gap";
export const DEFINITION_LABEL = "flex";
export const DEFINITION_UNDER = "col-start-2";
// The name stands centred on the body's first-line box, so the label and
// the body value share one line whatever their line heights. It is the body
// role in the meta ink, so the label names and the value, in the body ink,
// reads as what is named.
export const DEFINITION_NAME =
	"text-ink-meta flex items-center min-h-line-body";
// A row whose control is a text area starts at its top, the label pulled down
// by the area's inset (its hairline and gap), so the label stands centred on
// the area's first line; on touch the value stands under its label, so the label
// row is the whole row and takes no offset.
export const DEFINITION_BOX_AREA = "items-start";
export const DEFINITION_NAME_AREA =
	"mt-[calc(var(--spacing-gap)+var(--spacing-hairline))] touch:mt-0";
export const DEFINITION_VALUE = "min-w-0 grow";
export const DEFINITION_ABSENT = "text-ink-meta";
// A control placed alone is its field: no form's label column to share, so
// its name stands over it, a gap apart, as a definition row stands on touch,
// and the description or the error under it. A switch or a checkbox stands on
// its name's line, at its end.
export const FIELD_ALONE = "flex flex-col gap-gap min-w-0";
export const FIELD_ALONE_LINE = "flex items-center gap-gap min-w-0";
// A failed row's retry mark (a definition row's, a meter's): the retry glyph,
// and the spinner that takes its place once the retry runs, centred in one
// square, so the swap moves nothing.
export const ROW_RETRY = "size-control";
// A lock glyph (`Lock` at the meta icon size) after a value, in a column's
// head or on a row's meta line: the meta ink; what it follows stands an inside
// gap from it.
export const LOCK_GLYPH = "shrink-0 text-ink-meta";
// A record's head under the Pane's bar: the overline and the facts line a pair apart;
// the facts wrap at the fields rhythm, a counted fact its word beside its
// count. The line stands at the meta line's height whichever facts it holds:
// a fact that acts or changes (a pick, an opening fact) keeps its
// target-height hit box and reaches past the line above and below it
// (`factReach`), so a fact that opens joining the line moves nothing under it.
export const ITEM_HEADER = "gap-gap";
export const ITEM_FACTS = "gap-x-stack gap-y-gap";
export const ITEM_FACT = "gap-gap";
// On the web the facts are pills, wrapping a pair apart, each chip tall at
// the pill corner every other pill takes (`rounded-chip`, V4: no pill is fully
// rounded). A plain fact (words, a counted word, an age) is no control and no
// state, so it is the neutral chip itself (`CHIP`'s `soft` ground): its words
// on the grey soft ground, no edge and no dot, never a dotless outlined box,
// which is a control's outline (voice 5); a status fact is the state pill. A
// fact that acts (one that opens, a pick of no state) is the outlined control
// pill here: on the surface under a hairline, its words in the body ink (the
// caption role; the component composes it) and its chevron in the meta ink.
// It keeps the target's hit box (`ITEM_PILL_HIT`) around the pill, pulled back
// by what it has over the chip (nothing where the chip is the taller, the
// desktop) so the line keeps its height, and the pill takes the washes and the
// ring.
export const ITEM_PILLS = "gap-gap";
export const ITEM_PILL =
	"min-h-chip rounded-chip border border-edge bg-surface px-gap gap-gap text-ink-body";
export const ITEM_PILL_GLYPH = "shrink-0 text-ink-meta";
export const ITEM_PILL_HIT =
	"group min-h-target min-w-target -my-[calc((max(var(--spacing-target),var(--spacing-chip))-var(--spacing-chip))/2)] focus-visible:outline-none";
export const ITEM_PILL_ACT = `group-hover:bg-wash-hover group-active:bg-wash-press group-focus-visible:outline-2 group-focus-visible:outline-ring ${ANSWER}`;
// A head's pick fact whose chosen option carries a state is the state pill
// itself (`STATE_CHIP`) with its chevron, one box: under the pointer and
// pressed its hairline darkens to the state's ink, as an outlined control's
// darkens to the strong edge (voice 5), so its soft fill keeps its hue.
export const ITEM_PILL_STATE_ACT = `gap-gap group-hover:border-current group-active:border-current group-focus-visible:outline-2 group-focus-visible:outline-ring ${ANSWER}`;
// A pill inside a list row (a state pill, a type pill) takes the compact height
// in place of the chip's: the caption line between its hairlines, which is
// the row's body line box, so the row keeps its height and its gap.
export const PILL_COMPACT = "min-h-chip-compact";
// A folded question is one row (`ROW`), its glyph in the `ok` ink, its label,
// its answer and its edit act an inside apart.
export const FORM_FIELD_SUMMARY_GLYPH = "text-ok";
// A list of options, several or one chosen: its option groups on a hairline
// card at the float inset; an option's box or radio beside its label, and
// the children under a chosen option inset past the box.
export const OPTION_LIST =
	"gap-gap p-gap rounded-card border border-edge bg-surface";
export const OPTION_LINE = "gap-gap";
export const OPTION_CHILDREN = "ms-check px-pad pb-gap";
// The children stand in past the box by the box's width (the group's margin)
// and the gap after it (the body's): room is a margin on a box that draws,
// never an empty element.
export const OPTION_INDENT = "ms-gap";
// The chosen radio's dot, centred in its ring.
export const OPTION_RADIO_DOT = `size-dot rounded-full bg-toggle-on ${RADIO_DOT}`;
// The segments' track: flush, so the control stands at a segment's height.
export const SEGMENTED_CONTROL = "rounded-control bg-group";
// The web's track has no ground and no border: its segments stand an inside
// gap apart, the chosen one under a 2 px ink underline on its own box (a web
// overlay: the phone keeps its ground).
export const SEGMENT_TRACK = "gap-gap";
export const SEGMENT_CHOSEN =
	"rounded-b-none border-b-2 border-ink-body hover:bg-wash-hover active:bg-wash-press";
// A segment that is not chosen holds the underline's room, clear.
export const SEGMENT_IDLE =
	"rounded-b-none border-b-2 border-transparent hover:bg-wash-hover active:bg-wash-press";
// The selection wash of a segmented control: one ground under the chosen
// segment, which moves from the old segment to the new (a view transition on
// the web, a layout transition on the phone) instead of one segment's fill
// switching off as another's switches on. Under the pointer it is a step
// darker (a platform overlay on the web; the phone has no hover).
export const SEGMENT_GROUND = "rounded-control bg-wash-selected min-h-control";
// A toast at its width, raised and floating, its end inset tighter for the
// dismiss act's own box; its state is its glyph's ink (`toastState`).
export const TOAST =
	"w-toast pl-pad pr-gap py-gap gap-gap rounded-card bg-raised border border-edge-raised shadow-float";
// A banner's line (its glyph beside the rest) and the rest (the sentence
// beside its act, the act under it only where the sentence's floor leaves it
// no room; the phone always draws the act under).
export const BANNER_ROW = "gap-gap";
export const BANNER_MAIN = "gap-gap";
// A sheet on touch, raised from the bottom edge; on the desktop a card
// (`sheetDesktop`) or a decision centred at the dialog's width, its one region
// at the card inset.
export const SHEET =
	"bg-raised border-t border-edge-raised rounded-t-sheet shadow-modal";
export const SHEET_CENTERED =
	"gap-stack w-dialog p-pad bg-raised border border-edge-raised rounded-sheet shadow-modal";
export const SCRIM = "bg-scrim";
// A sheet's regions in every form but the centred one: the head over a
// hairline (its row, then a blocked submit's reason on touch), the body's
// parts at the card inset, its sections a sections gap apart (`SHEET_PARTS`;
// the body's form stands after them, its rows flush, the body scrolling both),
// the foot under a hairline (its
// line centred beside the acts) on the sheet's own ground, since on touch it
// stands over the end of the scrolling body.
export const SHEET_HEAD = "gap-gap px-pad py-gap border-b border-edge";
// The head's row: the lead act, the title over the description, the end act,
// the title centred on the acts, which set the row's height.
export const SHEET_HEAD_ROW = "gap-gap";
export const SHEET_PARTS = "gap-section p-pad";
export const SHEET_FOOT =
	"gap-gap px-pad py-pad border-t border-edge bg-raised";
// A sheet docked in a foot (`FOOT_DOCKED`): the foot is the raised cell, so the
// head, the body and the foot carry no surface, radius, shadow, hairline or
// side inset of their own, so all three share the foot's edge; the head's back
// act stands before one column, so the title and the description share one
// start: the title over the description a pair apart; the body keeps its sections a
// sections gap apart, the card inset above and a sections gap below (the last row clears the submit by the gap the rows keep), the foot's line
// beside or over the acts an acts gap apart.
export const SHEET_DOCKED_HEAD = "gap-gap";
export const SHEET_DOCKED_BODY = "gap-section pt-pad pb-section";
export const SHEET_DOCKED_FOOT = "gap-gap";
// In a foot the body's content keeps its floor whatever the head, the foot line and the log hold; the scroller around it, bounded by `dockedBodyMax`, gives below it where the region is short.
export const SHEET_DOCKED_FLOOR = "min-h-docked-floor";
// An empty state: its column at the empty width (the mark, the text, the
// act a fields gap apart), the title over the sentence a pair apart.
export const EMPTY_COLUMN = "gap-stack w-full max-w-empty";
export const EMPTY_TEXT = "gap-gap";
// An empty state's mark: its glyph in a control-sized disc on the neutral
// ground, in the ink of its place (meta, or danger for a failed query).
export const EMPTY_MARK = "size-control rounded-full bg-fill-neutral";
// The web's empty state is one line in flow: the alert glyph of a failed read,
// the sentence in the meta ink and the act as an accent link, wrapping at the
// line's start, with no box, fill or centring (a web overlay: the phone keeps
// its column).
// One form everywhere: the sentence over its act, both centred, at the card's
// inset: inside the card whose rows it stands for (`EMPTY_PART`: a Section's sheet, a
// Form's, a Sheet's), on a card of its own elsewhere (`CARD_PART`).
export const EMPTY_LINE = "flex flex-col items-center text-center gap-gap";
export const EMPTY_PART = "p-pad";
export const EMPTY_SENTENCE = "text-ink-meta max-w-measure";
// The pending work: in an action bar's place the bar over a blocked act's
// reason, its row (the track beside the act) and the track; and, shared with a
// Banner that has a deadline, the elapsed share as a line along the foot and
// the time left.
export const PENDING_BAR = "gap-gap";
export const PENDING_ROW = "gap-gap";
export const PENDING_TRACK =
	"rounded-control bg-group min-h-control px-pad gap-gap";
export const PENDING_FILL = `h-track bg-ink-meta ${FILL_X}`;
export const PENDING_LEFT =
	"tabular-nums text-meta leading-meta font-normal text-ink-meta";
// Figures at one width, beside the type role of the line they stand in (a
// table's number and age, a meter's share, a chart's total, ticks and times).
export const FIGURES = "tabular-nums";

// ── Content ─────────────────────────────────────────────────────────

// A card: the surface inside a hairline edge at the card radius. Every part
// of a Section's body is one (a sheet's rows flush on it, a Form's
// rows, a Table's; anything else, a Prose, a Stats, at the card's inset:
// `CARD_PART`), and so is a block a reader reads whole (Code, Diff:
// a diff's soft grounds sit on the surface wherever it stands), a Message's
// card and an empty state outside a card.
export const CARD = "rounded-card border border-edge bg-surface";
export const CARD_PART = `p-pad ${CARD}`;
// A `Card`'s parts (a Stats meter over a Stats, a sentence over its act) stand a
// fields gap apart, as a Section's do.
export const CARD_BODY = "gap-stack";
// Prose: its column at the measure, its headed parts a sections gap apart,
// a heading a pair over the blocks it heads, the blocks a fields gap apart;
// a list's items a pair apart (an item's line and its nested list too), each
// marker (`proseMarker`) an inside gap from its text; inline code on the
// neutral fill in its sentence's ink; a quote behind a strong hairline; a
// rule a hairline.
export const PROSE = "gap-section max-w-measure text-body leading-body";
export const PROSE_PART = "gap-gap";
export const PROSE_BLOCKS = "gap-stack";
export const PROSE_LIST = "gap-gap";
export const PROSE_ITEM = "gap-gap";
export const PROSE_CODESPAN =
	"rounded-chip bg-fill-neutral px-gap text-code leading-code font-normal font-mono";
// A name that is code (a field, an event, a key) standing as a row's title or a
// record's name: the mono at the code role, bare, so a list of names is not a
// column of boxes.
export const CODE_NAME = "text-code leading-code font-normal font-mono";
// A record's name, or a Pane's title, that is code: the title role in the mono family.
export const TITLE_CODE = "font-mono";
export const PROSE_QUOTE = "gap-stack border-l border-edge-strong pl-pad";
export const PROSE_RULE = "border-t border-edge";
export const PROSE_EMPHASIS = "italic";
export const PROSE_STRIKE = "line-through";
// Code: the head a bar at the strip's height (its title, its copy act a
// float inset from the end), the hairline on the part under it; the copy
// act's own column beside the first line when there is no title; the fold, a
// band at the target height over the shown lines.
export const CODE_HEAD = "gap-gap py-gap pl-pad pr-gap";
export const CODE_UNDER_HEAD = "border-t border-edge";
export const CODE_ACT = "pt-pad pl-gap pr-gap";
export const CODE_FOLD = `gap-gap min-h-target px-pad border-b border-edge text-ink-meta ${ANSWER}`;
// Diff: the elided mark's cells, a gap over and under its line; the hang a
// wrapped line's continuation starts in by (its first line pulled back by a
// web overlay); the number columns, four code figures each; the marker; the
// code's end inset.
export const DIFF_HUNK = "py-gap";
export const DIFF_HANG = "pl-pad";
export const DIFF_GUTTER = "min-w-figures pl-gap tabular-nums text-ink-meta";
export const DIFF_MARK = "px-gap text-ink-meta";
export const DIFF_CODE = "pr-gap";
// Diff by word: the text at the card inset, at the measure.
export const PROSE_DIFF_BODY = "p-pad";
export const PROSE_DIFF_TEXT = "max-w-measure";
// A file row: the path at the code role (its parts in `filePathPart`), the
// counts at meta in their lanes (`fileCount`).
export const FILE_PATH = "text-code leading-code font-mono";
export const FILE_COUNTS =
	"gap-gap tabular-nums text-meta leading-meta font-normal";
// The web's counts give way once the path stands at its floor, before the
// chip's label truncates: each lane, a flex item of the row (its block stands
// as `display: contents`), shrinks at a weight (10^5) between the path's (10^7)
// and the chip's (1), from its four figures down to its own text. A lane keeps
// four figures while the row has the room, so the lanes line up down a list.
// (A phone's flex items do not shrink: its lanes keep their width.)
export const FILE_COUNT_YIELD = "basis-figures shrink-100000 min-w-min";
// Table: the grid on a card (`CARD`), its rows on hairlines, the last on the
// card's edge; its columns read at body. A cell is
// the row's height behind a transparent side border, so the `Input` that
// edits it in place (the field's bar fit) puts its text where the cell's
// stands. The frozen leading column's cell stands on the surface.
// A change cell's values and the arrow between them stand an inside gap
// apart, the arrow in the meta ink (the values' inks are `TABLE_CHANGE_VALUE`).
export const TABLE = "text-body";
export const TABLE_CELL = "py-gap border-x border-transparent px-pad";
export const TABLE_FROZEN = "bg-surface";
export const TABLE_CHANGE = "gap-gap text-ink-meta";
// A leading cell's name and its warning a gap apart.
export const TABLE_NAME = "gap-gap";
// Message: yours in a bubble on the neutral fill; the name beside the time;
// a system line's words beside its time, wrapping; the line that opens, a
// pill at the target height with the pointer's washes. Under a system line,
// its card: one list row on a card (`CARD`); a free act's code
// and its fold's lines start-aligned across the column at the pill's inset,
// the code in the meta ink, ranking under its verb. Its attachments stand in
// one wrapping row a gap apart, over the bubble at the column's end (the
// `Thread`'s composer draws the same row over its text), and its provenance line
// (`meta`) leads the time. A line and its card are one entry a pair apart, the
// label over its content.
export const MESSAGE_BUBBLE = "rounded-card bg-fill-neutral px-pad py-gap";
export const MESSAGE_HEAD = "gap-gap";
export const MESSAGE_LINE = "gap-x-gap";
export const MESSAGE_OPEN = `gap-gap rounded-control px-gap min-h-target text-ink-meta ${ANSWER}`;
export const MESSAGE_ATTACHMENTS = "gap-gap";
export const MESSAGE_ENTRY = "gap-gap";
export const MESSAGE_CODE = "px-gap text-ink-meta";
export const MESSAGE_FOLD = "px-gap";
// Thread's composer: the composer over its notice. On the desktop one box (the
// field's boundary at the card radius), its attachments, its text at the
// field's inset (capped at eight lines, scrolling past them) and its foot
// (attach, Stop while an answer comes, Send); its notice at the text's x. On
// touch one row (attach, the field at its bar fit growing upward, Stop's icon
// act at the bar fit while an answer comes, Send's icon act) and the notice's row under
// it in the same columns, its sentence at the field's text (the attach slot
// held, the field's hairline counted).
export const MESSAGE_INPUT = "gap-gap";
export const MESSAGE_INPUT_BOX =
	"rounded-card border border-edge bg-surface p-gap";
export const MESSAGE_INPUT_CHIPS = "px-gap pt-gap";
// The text is the textarea itself, inset above and below by its value's own
// padding and beside by the text's (the touch field's own sides do that
// there), so a press anywhere on the text area lands on it.
export const MESSAGE_INPUT_TEXT = "px-gap";
export const MESSAGE_INPUT_VALUE = "py-gap max-h-message-input";
export const MESSAGE_INPUT_FOOT = "gap-gap";
export const MESSAGE_INPUT_ROW = "gap-gap";
// The touch field holds no inset of its own above and below the text, which the
// text takes; its chips keep one above.
export const MESSAGE_INPUT_FIELD_CHIPS = "pt-gap";
export const MESSAGE_NOTICE =
	"gap-gap pl-pad pr-gap border-x border-transparent";
export const MESSAGE_NOTICE_TEXT = "px-pad border-x border-transparent";
export const MESSAGE_ATTACH_SLOT = "w-control";
// Stats meter: the label and its share over the bar over the meta line; the bar a
// track one wash step off the ground, its fill by level (`meterFill`).
export const METER = "gap-gap";
export const METER_HEAD = "gap-gap";
export const METER_TRACK = "h-meter rounded-chip bg-fill-neutral";
// A meter's mark: a tick across the track centred on the mark's share (so one
// at the max stands on the track's end), standing proud of the track by
// `inside` above and below. It sits outside the track, which clips.
export const METER_MARK = "w-track bg-ink-body -inset-y-gap -translate-x-1/2";
// A line of counts that lead to their lists: standalone links a gap apart
// with no glyph between (a meter's line under its bar, a stats cell's line
// under its figure). Each link's box is the target height (`LINK_TARGET`),
// and the line waits as one such box with a bar centred in it.
export const COUNT_LINKS = "gap-x-gap";
// A standalone link's box at the target height: the web's anchor carries it,
// the phone's pressable (a text's own box takes no touch past its words'
// centre). Unheld, drawn by each that has one: the Link and a count line's
// waiting form.
export const LINK_TARGET = "min-h-target";
// Stats: the card on the surface holding the cells. A cell draws its own top
// and start hairlines, so the strip splits wherever its cells wrap; the card's
// outer edge is `STATS_EDGE`, drawn over the cells. The cell is the label over
// the figure (and its unit) over the meta line, or over its counts.
export const STATS = "relative rounded-card bg-surface";
export const STATS_CELL = `gap-gap p-pad border-t border-l border-edge ${ANSWER}`;
// The card's outer edge, drawn over its cells: their own top and start
// hairlines at the card's edge sit under it, so the edge is one hairline at
// every density, with no cell pulled back by a width of its own.
export const STATS_EDGE = "absolute inset-0 rounded-card border border-edge";
export const STATS_FIGURE = "gap-gap";
// BarChart: the head (the total and its unit, then the series' keys) over
// the body (the axis beside the plot over its times). The plot is the chart's
// height in four bands (`chartBand`); a stacked part over another is split
// from it by a clear line. The axis is a lane four figures wide, the widest
// tick, loaded or loading, so the plot never moves when the data lands.
export const CHART = "gap-stack";
export const CHART_HEAD = "gap-gap";
export const CHART_TOTAL = "gap-gap";
export const CHART_KEYS = "gap-x-stack gap-y-gap";
export const CHART_KEY = "gap-gap";
export const CHART_KEY_DOT = "size-dot rounded-full";
export const CHART_BODY = "gap-gap";
export const CHART_GRID = "h-chart";
export const CHART_MAIN = "gap-gap";
export const CHART_TICK_LANE = "w-figures";
// Thread: the messages a sections gap apart, one rung above Prose's block
// gap, and under them the input; on the desktop a `Thread`'s composer stands in a
// measure-wide column, so a Pane's docked foot spans the body and the field
// keeps the column. A column cell is a width and nothing else: the region
// that owns its frame's width centres it (a docked foot), and among sections
// it keeps the region's start, as a paragraph's measure does.
export const THREAD = "gap-section";
export const THREAD_COLUMN = "w-full max-w-measure";
// The way back to the newest message, floating over the log a pair above the
// foot while the reader is scrolled up: a lifted ground under the secondary
// act's hairline, at its radius.
export const THREAD_LATEST = "mb-gap rounded-control bg-raised shadow-float";
// Stages: a rail of fixed states. A stage is its mark beside its words, the
// words the label with one meta line under it; a hairline in the edge ink
// runs from each mark to the next (`STAGE_RAIL`), and the room between two
// stages is the words' own bottom inset, so the rail runs unbroken. A row
// stands at least the two-line row's height (`STAGE_ROW`: 48, 64 on touch,
// the state rail's rows), so a later row of one meta line keeps the pace of a
// done one. A done mark's check stands on its disc in the canvas ink
// (`STAGE_CHECK`), an ended rail's cross is the danger ink (`STAGE_CROSS`).
export const STAGE_ROW = "gap-gap py-gap";
export const STAGE_WORDS = "pb-gap";
export const STAGE_CHECK = "text-canvas";
export const STAGE_CROSS = "text-danger";
// Image: its full view stands on the scrim with no frame, the picture inside
// the page inset; the close act is a lifted ground at the control radius over
// the picture, as the Latest act floats over a log.
export const IMAGE_FULL = "p-page";
export const IMAGE_CLOSE = "rounded-control bg-raised shadow-float";
// A failed image's glyph, in the meta ink its alt text is drawn in.
export const IMAGE_FAILED_INK = "text-ink-meta";
// StepCount: its segments a gap apart over its words.
export const STEP_COUNT = "gap-gap";
export const STEP_COUNT_SEGMENTS = "gap-gap";

// A thumbnail's remove act (an attachment's, in the `Thread`'s composer): a hit box
// the target's size (24, 44 on touch) a gap in from the thumbnail's corner
// (`IMAGE_REMOVE`), the `REMOVE_HIT` disc centred in it on the raised ground
// inside a hairline, so the glyph stays legible over any picture
// (`IMAGE_REMOVE_DISC`).
export const IMAGE_REMOVE = "m-gap min-h-target min-w-target rounded-full";
export const IMAGE_REMOVE_DISC = "border border-edge bg-raised";

// Canvas: the ground the nodes stand on, one step off the page; a port, a
// hollow ring on the node's edge inside a hit box the target's size (24, 44 on
// touch); a group's dashed frame and its head on the group ground; the zoom
// stack's box. The dot grid, the edge strokes and the zoom's buttons (icon `Button`)
// are not cells.
export const CANVAS_GROUND = "bg-canvas";
export const CANVAS_PORT = `size-port rounded-full border border-edge-strong bg-surface ${ANSWER}`;
export const CANVAS_PORT_HIT = "size-target";
export const CANVAS_GROUP_HEAD =
	"gap-gap px-pad py-gap min-h-target rounded-t-card border border-transparent bg-group text-meta leading-meta font-normal text-ink-meta";
export const CANVAS_ZOOM = "rounded-control border border-edge bg-surface";

// ── Layout ──────────────────────────────────────────────────────────

// The shell on the desktop: the sidebar a slate column (the dark calibration of
// the tokens, pinned in both modes by the `dark` scope, on the surface ground
// of that scope) beside the column on the canvas. The sidebar insets its rows
// by an acts gap at the sides and the foot; its first row is the switcher slot,
// a bar as the page's (the strip height, its row centred), so the switcher and
// the page title share one line with no number set for it.
export const SHELL_SIDEBAR = "dark w-sidebar bg-surface";
// The rows' inset in the sidebar and on the places layer alike: an acts gap at
// the sides and the foot.
export const SHELL_INSET = "px-gap pb-gap";
export const SHELL_COLUMN = "bg-canvas";
// The phone's column is the canvas too: the sheets stand on it at the page inset.
export const SHELL_COLUMN_PHONE = "bg-canvas";
// The column's banner slot: a `Banner` at the page inset all round, so its
// edge meets the Pane title's and the page gap stands under it, above the
// header.
export const SHELL_BANNER = "p-page";
// The switcher slot: the strip height as a Pane's bar, an acts gap over the
// places; it holds the app's mark in the row's glyph slot and the switcher's
// trigger after it.
export const SWITCHER_SLOT = "py-gap mb-gap";
// The app's mark in a place row's glyph slot: the icon size, its image fit
// inside.
export const SHELL_MARK = "size-icon object-contain";
// The places: each run of consecutive places under one group stands a fields
// gap from the next; the footer group, pushed to the bottom, keeps that gap
// above it.
export const SHELL_PLACES = "grow gap-stack";
// The footer group (settings and exits) is pushed to the sidebar's bottom.
export const SHELL_FOOT = "mt-auto";
// A group's label, at the rows' inline inset, a pair over its rows.
export const SHELL_GROUP_LABEL =
	"px-pad pb-gap text-caption leading-caption tracking-label font-medium uppercase text-ink-meta";
// The shell on touch: the tab bar, the sidebar turned on its side (the dark
// scope on its surface), under a hairline; each tab is the dock's height and
// carries the current bar on its top. The bar clips its tabs' count badges:
// nothing paints above its hairline.
export const SHELL_TAB_BAR =
	"dark px-gap bg-surface border-t border-edge overflow-hidden";
// The shell on the web's touch density: no tab bar; the places stand on a
// layer over the whole viewport (the sidebar's slate, clear of the safe
// insets, its rows at the sidebar's inset), opened by the menu act that leads a Pane's bar and closed
// by its close act, Escape or going to a place.
export const SHELL_LAYER = "dark bg-surface pt-safe pb-safe";
// A page outside the shell, a Gate: the surface ground at the page inset, one
// column at the `auth` width (a column cell is a width; the region centres
// it). A step with a title is one stack, a fields gap between every part: the
// mark, the count, the title, the description, the banner and the body. The mark is the avatar's size, and a
// drawn lockup in the Gate stands taller, at `gate-mark`.
export const GATE = "bg-surface p-page";
export const GATE_COLUMN = "w-full max-w-auth";
export const GATE_STEP = "gap-stack";
export const GATE_MARK = "size-avatar";
// The app's mark is a lockup, the logo (`GATE_MARK`, the avatar's size) and the
// app's name a row apart, a row of the step.
export const GATE_MARK_ROW = "gap-gap";
// An app's drawn lockup stands in the row in place of the logo and the name,
// its width from its own proportion, held to the row, `gate-mark` tall at
// every density.
export const GATE_LOGO = "h-gate-mark w-auto max-w-full";
// The switcher's trigger leading a touch Pane's bar, which reaches across the
// page inset (`PAGE_TOP_BAR_START`) by the inset it keeps; in the sidebar it is a
// `PLACE_ROW` with the name at body 500.
export const SWITCHER = "gap-gap px-icon-inset min-h-target rounded-control";
// The toasts' layer over the column (the desktop shell) or at a touch
// screen's foot, each toast a pair apart.
export const TOASTS = "p-page gap-gap";
// A Pane. Its head insets its bar at the page inset over one hairline: the
// back act or (on touch) the switcher, the title, then the acts, in one row.
// The bar is at a set height, a floor as a row's. The body insets its
// sections at the page inset.
export const PAGE_HEAD = "px-page border-b border-edge bg-surface";
// A room Pane stands its head the page inset from the top as it does from
// the sides: the ten-foot safe area is all round.
export const PAGE_HEAD_ROOM = "pt-page";
// A bar is a row of controls: the control height and the gap above and below
// (the floor counts the padding, so it is spelt as that sum).
export const PAGE_TOP_BAR =
	"gap-gap py-gap min-h-[calc(var(--spacing-control)+2*var(--spacing-gap))]";
// A record's place in the bar before its name: the meta ink, parted from the name
// by a slash in the mark ink. The slash is drawn, not written: it is a mark at
// the 3:1 floor, and a written one would be text to the 4.5:1 check and to a
// reader of the heading.
export const PAGE_WITHIN = "text-ink-meta";
export const PAGE_WITHIN_SEP = "text-ink-mark px-gap before:content-['/']";
// On touch the back act or the switcher reaches the page inset by its start,
// the acts by their end, and the title stands at the inset.
export const PAGE_TOP_BAR_START = "-ms-icon-inset";
export const PAGE_TOP_BAR_END = "-me-icon-inset";
// A Pane's head is one line at every width. The title truncates and holds at
// least two fifths of the row (a structural fraction, never a width); the first
// act stands and the rest stand in the more menu (`actsSplit`), whatever the
// room, and the context pick's label truncates. On touch the head takes a step
// of block padding over the row.
export const PAGE_TITLE_FLOOR = "min-w-2/5 basis-0";
export const PAGE_BODY = "gap-section p-page";
// A docked foot (a Pane's `foot`) is one cell: a
// region of its own under what scrolls past it, a raised surface (the raised
// step under a hairline), at the page inset at the
// sides and an acts gap above and below what it holds (a selection bar stands
// in its height range, a field at its own), fitting what it holds up to the
// region it shares with what stands over it (the log and the foot, never the
// head), so the log gives way to it: a docked `Sheet` fills it and bounds its
// own body (two fifths of the region, three rows at least, and the log its
// two-row floor while the body can give), so the foot is never capped below the
// sheet's pinned parts.
export const FOOT_DOCKED =
	"border-t border-edge-raised bg-raised px-page py-gap max-h-full min-h-0";
export const PAGE_BODY_OVER_FOOT = "pb-section";
// A section: its head paired to its body; the body's parts, each a card of
// its own, stand a fields gap apart (`SECTION_BODY`).
export const SECTION = "gap-gap";
// A section's head: the head row over a blocked
// act's reason, the title centred on the act, which sets the row's height.
// The fold toggle's wash overhangs its start only, where its chevron stands
// (a web overlay pulls it back).
export const SECTION_HEAD = "gap-gap";
// A section's title: the caption size at 500, uppercase and tracked, in the
// meta ink. The count after it keeps its own caption look.
export const SECTION_LABEL =
	"text-caption leading-caption tracking-label font-medium uppercase text-ink-meta";
export const SECTION_HEAD_ROW = "gap-stack";
// The head's act and its more stand the gap a list row's do (`ROW_ACTS`), so the
// more's wash does not meet the act's border.
export const SECTION_ACTS = "gap-gap";
// A section's labelled act is words in the accent ink, as an empty state's act
// is: the one filled act of a page is its bar's. One that removes or ends
// something is in the danger ink.
// An icon act that removes or ends something: the danger ink.
export const ICON_BUTTON_DESTRUCTIVE = "text-danger";
export const SECTION_BODY = "gap-stack";
export const SECTION_TITLE = "gap-gap";
export const SECTION_TOGGLE = `gap-gap min-h-target px-gap rounded-row ${ANSWER}`;
// Every run of rows (a sheet's, a Form's) is one grid of two
// columns, so a definition row's label column is as wide as the widest label
// of the run; the grid places each entry across both columns, and a
// definition row alone subgrids them (`DEFINITION_BOX`). A form's group is a
// run inside the form's (`FORM_GROUP`, a subgrid, so its labels align with
// the rest). The two columns are one chain down a Pane: its body, a Section,
// the Section's body, the sheet or the Form each stand in `ROWS`, which is
// its own two columns, and a subgrid of its parent's where the parent is a
// `rows-host` (the marker is on every `ROWS` grid; a Pane body that fills is
// a flex column and carries none), so every
// definition list in a Pane shares the label column of the widest label among
// them, and a run standing alone (a Sheet's, a Column's) keeps its own. The run draws the hairline between its rows once, so no row
// carries one: a child selector is one uniwind drops, so native draws that
// hairline per row and the web draws it as an overlay on the run (a
// pseudo-element on each entry but the last, so a rounded row keeps a
// straight hairline).
export const ROWS =
	"rows-host grid grid-cols-[auto_minmax(0,1fr)] [.rows-host>&]:grid-cols-subgrid col-span-2 *:col-span-2 gap-x-0";
export const FORM_GROUP = "grid grid-cols-subgrid *:col-span-2";
// A sheet: its rows on a card.
export const GROUP = `${CARD} ${ROWS}`;
// The box of a part that is no row (a form group's lead), at the card's inset.
export const GROUP_ITEM = "p-pad";
// A group's band in a list with `groups`: the band ground at the band height,
// across the list's width (which bleeds the card), its text at the rows' inline
// inset, the label, its count and its act a gap apart; no radius; closed by a
// rule in the body ink (the list's one rule not in the edge colour), no rule
// above it.
export const LIST_BAND = "py-gap px-pad gap-gap bg-band border-b border-edge";
// A tree row's level: one `indent` step in, its hairline rail on the end, so
// the rail falls under the middle of the parent's fold lane. A row draws one
// per level of its depth.
export const TREE_RAIL = "w-indent border-r border-edge";
// A tree row's levels and fold lane run the row's full height, over the row's
// padding (`ROW`, one `gap` above and below in every form, a one-line row's
// too), so a level's rail is unbroken from row to row, through the hairline
// between two rows: the bleed is that padding's negative.
export const TREE_BLEED = "-my-gap";
// A form's foot: its action bar, the last row of the form under a hairline
// across it, at the rows' inset; in a sheet it sticks to the scroller's foot
// on the raised ground, so what scrolls under it shows in no gutter.
export const FORM_FOOT = "border-t border-edge p-pad";
export const FORM_FOOT_STUCK = "sticky bottom-0 bg-raised";
// An action bar: the acts row over a blocked act's reason, the acts an acts
// gap apart. Where the bar stands (`fit`: at the end of its container at the
// acts' natural width, or across it with each act at the field's height) is
// structure and the `Button` fit the bar passes, so it carries no cell.
export const ACTION_BAR = "gap-gap";
export const ACTION_BAR_ACTS = "gap-gap";
// A selection bar's gaps, a pair apart: the row holding the count and its
// acts (the count at the start and the acts at the end, or stacked on touch)
// and the count's own row with its choose-all act.
export const ACTION_BAR_CHOSEN = "gap-gap";
// A selection bar's column: its container's width, which a table sets to its own
// (the page's grid) where it docks the bar.
export const ACTION_BAR_SELECTION = "w-full";
// The act beside a selection bar's count that chooses or clears every row:
// words at the control radius, as the filled act beside it, washed at the
// pointer.
export const ACTION_BAR_ALL = `rounded-control px-gap min-h-target ${ANSWER}`;
// A toolbar's band over a list, in a page's body, so its controls stand at the
// body's own inset (no inset of its own: a second one put them a page inset
// past the headings and the list under it) and its hairline spans the same
// width: its controls and acts in wrapping rows at the acts rhythm, the
// applied filters' chips at the pair rhythm.
export const TOOLBAR = "gap-gap border-b border-edge";
export const TOOLBAR_ROW = "gap-gap";
export const TOOLBAR_LINE =
	"py-gap min-h-[calc(var(--spacing-control)+2*var(--spacing-gap))]";
// The tabs stand first in the row; on touch, where the row wraps, they take
// the first line whole and the control scrolls sideways inside it.
export const TOOLBAR_TABS = "min-w-0 touch:w-full";
// The search takes the room between the tabs and the acts at every density.
export const TOOLBAR_SEARCH = "grow min-w-0";
export const TOOLBAR_CHIPS = "gap-gap";
// A toolbar's folded filters: the labelled picks in one column a fields gap
// apart, in the desktop popover at the column's width (the filters pattern's
// range is 300 to 500) at the inside inset past the popover's own float inset.
export const TOOLBAR_FILTERS = "gap-stack";
export const TOOLBAR_FILTERS_POPOVER = "w-column p-gap";

// The roles `Text` draws: a primary line and a secondary one. The other roles
// are drawn by the molecule that owns their place.
export type TextRole = Extract<
	keyof (typeof TEXT)["variants"]["role"],
	"body" | "meta"
>;
// What an icon sits beside, which picks its size: meta or caption text, body
// text, or the inside of a control.
export type IconFit = keyof (typeof ICON)["variants"]["fit"];
export type ButtonAct = keyof (typeof BUTTON)["variants"]["act"];
// What a button, an icon button or a link sits in, which picks its height
// (and a link's underline): the composing molecule sets it.
export type ButtonFit = keyof (typeof BUTTON)["variants"]["fit"];
export type IconButtonFit = keyof (typeof ICON_BUTTON)["variants"]["fit"];
export type LinkFit = keyof (typeof LINK)["variants"]["fit"];
export type FieldKind = keyof (typeof FIELD_VALUE)["variants"]["kind"];
export type FieldState = keyof (typeof FIELD)["variants"]["state"];
export type OtpBoxState = keyof (typeof OTP_BOX)["variants"]["state"];
export type RowState = keyof (typeof ROW)["variants"]["state"];
export type SwitchState = keyof (typeof SWITCH)["variants"]["state"];
export type TableRowState = keyof (typeof TABLE_ROW)["variants"]["state"];
export type CheckboxState = keyof (typeof CHECKBOX)["variants"]["state"];
export type SegmentState = keyof (typeof SEGMENT)["variants"]["state"];
export type SheetFit = keyof (typeof SHEET_DESKTOP)["variants"]["fit"];
export type ImageFit = keyof (typeof IMAGE)["variants"]["fit"];
export type ImageState = keyof (typeof IMAGE)["variants"]["state"];
// The states a status draws as a dot: every one but `running`, whose mark
// is a spinner.
export type StatusDotTone = keyof (typeof STATUS_DOT)["variants"]["tone"];
export type DiffLineKind = keyof (typeof DIFF_LINE)["variants"]["kind"];
export type MessageAuthor = keyof (typeof MESSAGE)["variants"]["author"];
export type AvatarStep = keyof (typeof AVATAR)["variants"]["step"];
export type ChipCell = keyof (typeof CHIP_DOT)["variants"]["family"];
export type PlaceRowState = keyof (typeof PLACE_ROW)["variants"]["state"];
export type PlaceTabState = keyof (typeof PLACE_TAB)["variants"]["state"];
export type ColumnsFit = keyof (typeof COLUMNS)["variants"]["fit"];
// Where an action bar stands: at the end of its container at the acts' width,
// or across it, each act at the field's height (structure, no cell).
export type ActionBarFit = "end" | "full";
export type PickerFit = keyof (typeof PICKER)["variants"]["fit"];

export type ContentTone = ColorName;

const COLOR_SET: ReadonlySet<string> = new Set(COLOR_NAMES);

// The matrices already carry the answer, so the tint a plugin hands to its
// own glyph or spinner is read back off a cell's colour instead of being
// written a second time.
function toneOf(cell: string): ContentTone {
	const tone = cell
		.split(/\s+/)
		.map((name) => /^(?:text|bg|border)-(.+)$/.exec(name)?.[1])
		.find((name) => name !== undefined && COLOR_SET.has(name));
	// Every cell these read names a contract colour, which c22 pins.
	return (tone ?? "ink-body") as ContentTone;
}

export function buttonContentTone(act: ButtonAct): ContentTone {
	return toneOf(BUTTON_LABEL.variants.act[act]);
}

// A list row's title form: the name, off a highlighted path (`dim`) or not.
export function rowTitleForm(
	dim: boolean,
): keyof (typeof ROW_TITLE)["variants"]["form"] {
	return dim ? "dim" : "name";
}

// A status's colour: the dot's, or the running spinner's.
export function statusContentTone(tone: Tone): ContentTone {
	if (tone === "running") return toneOf(STATUS_SPINNER);
	return toneOf(STATUS_DOT.variants.tone[tone]);
}

// A change mark's glyph ink, its kind's.
export function changeContentTone(kind: ChangeKind): ContentTone {
	return toneOf(CHANGE_MARK.variants.kind[kind]);
}

// A stage mark's glyph ink: the done mark's check, the ended mark's cross.
export function stageContentTone(glyph: "check" | "cross"): ContentTone {
	return toneOf(glyph === "check" ? STAGE_CHECK : STAGE_CROSS);
}

// A failed image's glyph ink.
export function imageContentTone(): ContentTone {
	return toneOf(IMAGE_FAILED_INK);
}

// The aspect an image's box stands at in every state: a content image's is
// its consumer's, a thumbnail's is its square, which its size fixes.
export function imageAspect(
	fit: ImageFit,
	aspect: number | undefined,
): number | undefined {
	return fit === "thumb" ? undefined : aspect;
}

// A toast's glyph ink, its tone's.
export function toastContentTone(tone: Tone): ContentTone {
	return toneOf(TOAST_STATE.variants.tone[tone]);
}

// A folded question's glyph ink.
export function summaryContentTone(): ContentTone {
	return toneOf(FORM_FIELD_SUMMARY_GLYPH);
}

// A row's warning glyph ink.
export function rowWarningContentTone(): ContentTone {
	return toneOf(ROW_WARNING);
}

// A banner's glyph ink, its tone's.
export function bannerContentTone(tone: Tone): ContentTone {
	return toneOf(BANNER_GLYPH.variants.tone[tone]);
}

// A pair row's arrow ink, its state's.
export function ruleArrowContentTone(
	state: keyof (typeof RULE_ARROW)["variants"]["state"],
): ContentTone {
	return toneOf(RULE_ARROW.variants.state[state]);
}

// A stable step for a name, so one name keeps one fill everywhere.
export function avatarStep(name: string): AvatarStep {
	let hash = 0;
	for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
	return String((hash % 8) + 1) as AvatarStep;
}

// The motion cells are spelled in
// `variant-tables.ts`, where the matrices compose them, and read from here.
export {
	ANSWER,
	CHECK_MARK,
	CHEVRON,
	CURRENT_BAR,
	CURRENT_ROOM,
	FILL_FADE,
	FILL_X,
	FILL_Y,
	GIVE,
	LIFT,
	PATH_TONE,
	RADIO_DOT,
	SWAP_IN,
	SWAP_OUT,
	TOGGLE_THUMB,
	TRAVEL_X,
};

// A bar chart's bar (or one part of a stacked bar): the plot's full height,
// scaled from the baseline to its share (`--fill`) and lifted over the parts
// under it (`--stack`). Each part after the first is lifted one more hairline,
// the clear line between parts, which a scaled border could not hold.
export const CHART_BAR = `absolute inset-0 ${FILL_Y}`;

// A painted fill's whole animation: the appear fade after `--wait-delay`
// (`paint-in`), then the breath on the fill's alpha (`pulse-fill`, both
// keyframes in the web's `globals.css`), one phase across the page. Under
// reduced motion `--pulse-name` is `none`, so the fade snaps and the fill
// stands still. The phone breathes in `lib/motion`.
export const PULSE =
	"animate-[paint-in_var(--transition-duration-base)_var(--ease-out)_var(--wait-delay)_both,var(--pulse-name,pulse-fill)_var(--pulse)_var(--ease-in-out)_infinite]";

// A glyph slot the theme paints by the scramble (`theme.loading`): the slot's
// own ink over no fill, appearing after the delay by the fade alone, over a
// box the filler sizes. Under reduced motion the fill stands in its place (the
// glyphs are hidden) and the fade snaps with the delay held. Composed with
// `PAINT.kind.box`, whose fill it removes.
export const SCRAMBLE =
	"relative rounded-chip motion-safe:bg-transparent animate-[paint-in_var(--transition-duration-base)_var(--ease-out)_var(--wait-delay)_both]";

// The layer cells (`motion.md` §3): what stands over the page enters on `base`
// `out` from where it belongs and leaves on `base` `in` the way it came, the
// same properties over the same distances reversed; on transform and opacity,
// a Base UI popup carrying `data-starting-style` on its mount and
// `data-ending-style` on its way out. A popover drops a float from its anchor
// (below it, else rising from the side it flipped to) and returns to it.
export const LAYER_POPOVER =
	"transition-[opacity,translate] duration-base ease-out data-starting-style:-translate-y-gap data-[side=top]:data-starting-style:translate-y-gap data-starting-style:opacity-0 data-ending-style:-translate-y-gap data-[side=top]:data-ending-style:translate-y-gap data-ending-style:opacity-0 data-ending-style:ease-in";
// A tooltip fades on `fast` once its rest has run and leaves at once (no
// ending style, so nothing holds it); one that opens with no rest (a second
// within the last's 300 ms, the keyboard's focus) shows with no fade either.
export const LAYER_TOOLTIP =
	"transition-opacity duration-fast ease-out data-starting-style:opacity-0 data-instant:transition-none";
// A centred sheet, a desktop card and a full view rise a pair as they fade in
// and sink it as they fade out.
export const LAYER_CARD =
	"transition-[opacity,translate] duration-base ease-out data-starting-style:translate-y-gap data-starting-style:opacity-0 data-ending-style:translate-y-gap data-ending-style:opacity-0 data-ending-style:ease-in";
// A bottom sheet slides from its edge and back to it.
export const LAYER_SHEET_BOTTOM =
	"transition-transform duration-base ease-out data-starting-style:translate-y-full data-ending-style:translate-y-full data-ending-style:ease-in";
// The scrim fades on its sheet's rung and curves, in and out.
export const LAYER_SCRIM =
	"transition-opacity duration-base ease-out data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:ease-in";
// A toast rises a pair as it fades in (`transform`, opacity: ease-out) and
// sinks it fading out (ease-in); the stack closes up on `translate`
// (ease-in-out), so the two motions keep their own curves.
export const LAYER_TOAST =
	"transition-[translate,transform,opacity] duration-base [transition-timing-function:var(--ease-in-out),var(--ease-out),var(--ease-out)] data-starting-style:[transform:translateY(var(--spacing-gap))] data-starting-style:opacity-0 data-ending-style:[transform:translateY(var(--spacing-gap))] data-ending-style:opacity-0 data-ending-style:[transition-timing-function:var(--ease-in-out),var(--ease-in),var(--ease-in)]";

// A line that appears in flow (a blocked act's reason, a field's error, a
// checking line, a notice, a stage's moment) fades in on `fast` `out` and
// pushes what follows at once; it leaves at once. The fade is the
// `paint-in` keyframes in the web's `globals.css`, so it is a class the
// element carries while it stands, played as it mounts. The phone fades its
// lines in Reanimated (`lineIn`), which these classes leave alone.
export const LINE_IN =
	"animate-[paint-in_var(--transition-duration-fast)_var(--ease-out)_both]";
// A block that arrives on its own (nothing the viewer did moved it in) fades
// in on `base` `out` and pushes what follows at once; a block the viewer's act
// brings in or takes out lands at once.
export const BLOCK_IN =
	"animate-[paint-in_var(--transition-duration-base)_var(--ease-out)_both]";

// A message that arrives at the end of a log (the viewer's own or another's)
// rises a `pair` as it fades in on `base` `out`, and pushes nothing but the
// end of the log, which follows it. The keyframes are in the web's
// `globals.css`; the phone rises it in Reanimated (`streamIn`).
export const STREAM_IN =
	"animate-[stream-in_var(--transition-duration-base)_var(--ease-out)_both]";
// The act back to the newest message fades in rising a `pair` on `fast` `out`
// as the reader scrolls away (its starting style), and leaves on `fast` `in`
// the same way back (`data-leaving`); it stays mounted until it has gone.
export const STREAM_LATEST =
	"transition-[opacity,translate] duration-fast ease-out starting:opacity-0 starting:translate-y-gap data-[leaving]:ease-in data-[leaving]:opacity-0 data-[leaving]:translate-y-gap";

// The motion constants above: the one place the contract's cells spell an
// interaction state (`active:`, `data-starting-style:`) or an arbitrary
// property list, which a platform would otherwise overlay, so verify holds
// these alone to resolve as themselves.
export const MOTION_CELLS = [
	"ANSWER",
	"GIVE",
	"TOGGLE_THUMB",
	"CHECK_MARK",
	"RADIO_DOT",
	"CHEVRON",
	"FILL_X",
	"FILL_Y",
	"FILL_FADE",
	"TRAVEL_X",
	"SWAP_IN",
	"SWAP_OUT",
	"PULSE",
	"SCRAMBLE",
	"LAYER_POPOVER",
	"LAYER_TOOLTIP",
	"LAYER_CARD",
	"LAYER_SHEET_BOTTOM",
	"LAYER_SCRIM",
	"LAYER_TOAST",
	"LINE_IN",
	"BLOCK_IN",
	"STREAM_IN",
	"STREAM_LATEST",
	"LIFT",
	"PATH_TONE",
] as const;
