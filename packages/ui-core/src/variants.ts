// The public matrix layer: one cva per table, the axis types a component
// declares its props with, the single-cell constants, and the family registry
// with its cell enumeration. The tables themselves stay internal to the
// package.
import { cva } from "class-variance-authority";
import type { ClassValue } from "clsx";
import type { ChangeKind } from "./descriptors.ts";
import { COLOR_NAMES, type ColorName, type StatusState } from "./tokens.ts";
import {
	ACTION_BAR,
	AVATAR,
	AVATAR_LABEL,
	type Axes,
	BANNER,
	BANNER_GLYPH,
	BUTTON,
	BUTTON_LABEL,
	CHANGE_MARK,
	CHART_BAND,
	CHART_FILL,
	CHECKBOX,
	CHIP,
	CHIP_LABEL,
	CODE_TEXT,
	COLUMNS,
	DIFF_LINE,
	FIELD,
	FIELD_VALUE,
	FILE_COUNT,
	FILE_PATH_PART,
	FORM,
	FORM_FIELD,
	ICON,
	ICON_BUTTON,
	IMAGE,
	IMAGE_PICTURE,
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
	PICKER,
	PLACE_ROW,
	PLACE_ROW_GLYPH,
	PLACE_TAB,
	PLACE_TAB_LABEL,
	PROSE_DIFF_RUN,
	PROSE_MARKER,
	QR_CODE,
	ROW,
	ROW_STEP,
	ROW_TITLE,
	RULE_ARROW,
	SECTION,
	SEGMENT,
	SEGMENT_LABEL,
	SHEET_SIDE,
	SKELETON,
	SKELETON_LANE,
	SKELETON_ROW,
	SPLIT_MAIN,
	STAGE,
	STAGE_MARK,
	STAGE_RAIL,
	STATUS_DOT,
	STEP_COUNT_SEGMENT,
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
	TREE_BLEED,
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
export const changeMark = build(CHANGE_MARK);
export const chip = build(CHIP);
export const chipLabel = build(CHIP_LABEL);
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
export const treeBleed = build(TREE_BLEED);
export const rowTitle = build(ROW_TITLE);
export const rowStep = build(ROW_STEP);
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
export const formField = build(FORM_FIELD);
export const banner = build(BANNER);
export const bannerGlyph = build(BANNER_GLYPH);
export const toastState = build(TOAST_STATE);
export const menu = build(MENU);
export const menuGroup = build(MENU_GROUP);
export const menuLabel = build(MENU_LABEL);
export const sheetSide = build(SHEET_SIDE);
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
export const qrCode = build(QR_CODE);
export const stage = build(STAGE);
export const stageMark = build(STAGE_MARK);
export const stageRail = build(STAGE_RAIL);
export const image = build(IMAGE);
export const imagePicture = build(IMAGE_PICTURE);
export const placeRow = build(PLACE_ROW);
export const placeRowGlyph = build(PLACE_ROW_GLYPH);
export const placeTab = build(PLACE_TAB);
export const placeTabLabel = build(PLACE_TAB_LABEL);
export const splitMain = build(SPLIT_MAIN);
export const stepCountSegment = build(STEP_COUNT_SEGMENT);
export const section = build(SECTION);
export const columns = build(COLUMNS);
export const form = build(FORM);
export const actionBar = build(ACTION_BAR);
export const skeleton = build(SKELETON);
export const skeletonRow = build(SKELETON_ROW);
export const skeletonLane = build(SKELETON_LANE);

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
	family("CHANGE_MARK", CHANGE_MARK, changeMark),
	family("CHIP", CHIP, chip),
	family("CHIP_LABEL", CHIP_LABEL, chipLabel),
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
	family("TREE_BLEED", TREE_BLEED, treeBleed),
	family("ROW_TITLE", ROW_TITLE, rowTitle),
	family("ROW_STEP", ROW_STEP, rowStep),
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
	family("FORM_FIELD", FORM_FIELD, formField),
	family("BANNER", BANNER, banner),
	family("BANNER_GLYPH", BANNER_GLYPH, bannerGlyph),
	family("TOAST_STATE", TOAST_STATE, toastState),
	family("MENU", MENU, menu),
	family("MENU_GROUP", MENU_GROUP, menuGroup),
	family("MENU_LABEL", MENU_LABEL, menuLabel),
	family("SHEET_SIDE", SHEET_SIDE, sheetSide),
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
	family("QR_CODE", QR_CODE, qrCode),
	family("IMAGE", IMAGE, image),
	family("IMAGE_PICTURE", IMAGE_PICTURE, imagePicture),
	family("STAGE", STAGE, stage),
	family("STAGE_MARK", STAGE_MARK, stageMark),
	family("STAGE_RAIL", STAGE_RAIL, stageRail),
	family("PLACE_ROW", PLACE_ROW, placeRow),
	family("PLACE_ROW_GLYPH", PLACE_ROW_GLYPH, placeRowGlyph),
	family("PLACE_TAB", PLACE_TAB, placeTab),
	family("PLACE_TAB_LABEL", PLACE_TAB_LABEL, placeTabLabel),
	family("SPLIT_MAIN", SPLIT_MAIN, splitMain),
	family("STEP_COUNT_SEGMENT", STEP_COUNT_SEGMENT, stepCountSegment),
	family("SECTION", SECTION, section),
	family("COLUMNS", COLUMNS, columns),
	family("FORM", FORM, form),
	family("ACTION_BAR", ACTION_BAR, actionBar),
	family("SKELETON", SKELETON, skeleton),
	family("SKELETON_ROW", SKELETON_ROW, skeletonRow),
	family("SKELETON_LANE", SKELETON_LANE, skeletonLane),
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

// A number in a pill on one grey step, its figures at one width.
export const COUNT =
	"min-h-chip min-w-chip px-inside rounded-full bg-fill-neutral";
export const COUNT_LABEL =
	"text-caption leading-caption tracking-caption font-normal text-ink-meta tabular-nums";
// A ring the size of the glyph it replaces: a track at 30 % under a turning
// arc, both in the ink of its place (a plugin overlay: native colours a prop).
export const SPINNER = "size-spinner";
export const SPINNER_TRACK = "rounded-full border-2 opacity-30";
export const SPINNER_ARC = "rounded-full border-2 border-t-transparent";
// A status: its dot (`statusDot`) beside its word, the word bounded as a
// chip's label is, so a long one truncates before a row's title does.
export const STATUS = "gap-inside";
// A running status's mark: the spinner in the dot's place, its slot carrying
// the accent ink the spinner draws in (a native place sets the same tone as
// the spinner's ink, read through `statusContentTone`).
export const STATUS_SPINNER = "text-accent-ink";
export const STATUS_LABEL =
	"max-w-measure-short text-meta leading-meta font-normal text-ink-meta";
// Words that act in a pill with no boundary at rest: a row's pick and a
// status that moves (Picker), a header fact that opens a sheet or retries a
// save (ItemHeader), whose status region takes the pill's shape for its
// focus ring. It pulls back by its own padding on the side that
// meets plain text (an overlay), so its words sit where static words do.
// Shared by both drawers.
export const PILL_ACT = "rounded-full px-inside min-h-target";
// A remove act's round hit box, the chip's height: a chip's and a
// thumbnail's (`IMAGE_REMOVE`). Unheld, drawn by each that has one.
export const REMOVE_HIT = "min-h-chip min-w-chip rounded-full";
// An error line under its control, in the error ink: a field's (`FormField`)
// and a row entry's (`ListRow`). Unheld, drawn by each that has one.
export const FIELD_ERROR_LINE =
	"text-meta leading-meta font-normal text-ink-error";
export const FIELD_PLACEHOLDER = "text-ink-meta";
// A field's unit after its value, and its glyph (search, chevron).
export const FIELD_UNIT = "text-body leading-body font-normal text-ink-meta";
export const FIELD_GLYPH = "text-ink-meta";
// A pick of several's chips wrap in a run inside its field box, inset above
// and below by what centres a chip in the compact control (so one line of
// chips stands at the box's bar-fit height, border included); the trigger
// beside the run reaches across the box's border, so its hit is the box's
// height.
export const CHIPS_RUN = "py-chips-inset";
export const CHIPS_TRIGGER = "-my-hairline py-hairline";
// A text area's value: three body lines at least, a line more for each past them.
export const TEXT_AREA_VALUE = "min-h-text-area";
// A one-time code's row of boxes and the digit in each.
export const OTP = "gap-inside";
// A group of options (a select's, a picker's, an option list's): its rows at
// the rows rhythm.
export const SELECT_GROUP = "gap-rows";
// An option group's label over its rows, inset to the rows' text.
export const OPTION_GROUP_LABEL = "px-control-x pt-pair";
export const OTP_DIGIT =
	"text-heading leading-heading tracking-heading font-semibold text-ink-body font-mono";
// A slider: its label line (the label, its value trailing) over the track,
// the fill up to the thumb and the rest after it.
export const SLIDER = "gap-pair";
export const SLIDER_HEAD = "gap-fields";
export const SLIDER_LABEL = "text-body leading-body font-medium text-ink-body";
export const SLIDER_VALUE =
	"tabular-nums text-meta leading-meta font-normal text-ink-meta";
export const SLIDER_TRACK = "w-full min-h-target";
export const SLIDER_FILL = "h-track rounded-full bg-toggle-on";
export const SLIDER_REST = "h-track rounded-full bg-edge";
export const SLIDER_THUMB =
	"size-thumb rounded-full border border-edge-strong bg-surface";
// A picker's empty choice and its control with no value: a placeholder's
// look.
export const PICKER_EMPTY = "text-ink-meta";
// The value a row's pick shows in its pill (`PICKER {fit: row}`), bounded as a
// status' label is so a long one truncates before the title beside it does;
// the field fit's value is `FIELD_VALUE`'s.
export const PICKER_VALUE =
	"max-w-measure-short tabular-nums text-meta leading-meta font-normal text-ink-meta";
// The pick's popover at the popover's width (its ground and inset are
// `POPOVER`'s).
export const PICKER_POPOVER = "w-popover";
// A list of rules on the desktop: one grid whose rows are subgrids, so the
// columns align across rows, a pair rhythm between rows and the inside gap
// between terms. A rule's terms keep the inside gap on touch too, stacked in
// its card (`RULE_CARD`'s inset, a `Group` holding the cards).
export const RULES = "gap-x-inside gap-y-pair";
export const RULE_ROW = "gap-inside";
export const RULE_CARD = "px-card py-pair";
// A box on the group ground.
export const GROUP_GROUND = "rounded-card bg-group";
// A popover: raised on the float shadow inside its hairline, its rows inset
// by the float inset so a row's wash sits just inside the edge.
export const POPOVER =
	"gap-pair p-float bg-raised border border-edge-raised rounded-popover shadow-float";
export const HAIRLINE = "border-edge";
// The check or the dash on a checked box, at the meta glyph's size.
export const CHECKBOX_MARK = "size-icon-meta text-on-accent";
// A row's leading: one slot at the avatar's size, the dot or the glyph centred
// in it, so the titles of a list share one x whatever leads them.
export const ROW_LEADING = "size-avatar";
// A row's first line: its title (an option's label, a definition's label)
// and what trails it.
export const ROW_TITLE_LINE = "gap-inside";
// A list row's trailing value (a time, a date), its figures at one width.
export const ROW_TRAILING =
	"tabular-nums text-meta leading-meta font-normal text-ink-meta";
// A two-line row's meta line, one line: its marks keep their place at its
// end and its parts truncate first, so every row keeps one height.
export const ROW_META_LINE = "gap-x-inside";
// A list row's marks on its meta line, in order (a status, a warning, a lock,
// a chip), a gap apart, and its end acts. They yield from the end: the chip
// truncates first, then the lock's label (the glyph alone below `tablet`),
// and the warning's label keeps. The warning's glyph is in `warn`, its label
// in the meta ink.
export const ROW_MARKS = "gap-inside";
export const ROW_WARNING = "text-warn";
export const ROW_ACTS = "gap-acts";
// A list row's step list, in the meta line's place while its act pends: one
// line per step (`rowStep`), a pair gap apart.
export const ROW_STEPS = "gap-pair";
// A list row's entry: the title, the input with its act and the error line a
// pair apart, the error (`FIELD_ERROR_LINE`) under the input.
export const ROW_ENTRY = "gap-pair";
// A definition row: its text and its end acts a fields gap apart, over the
// row's own gap.
export const DEFINITION_ROW = "gap-fields";
// A definition row's link chevron, centred in the square of the icon act it
// stands in for, so values with an act or a link end at one x.
export const DEFINITION_ROW_CHEVRON = "size-control-compact";
// A lock glyph (`Lock` at the meta icon size) after a value, in a column's
// head or on a row's meta line: the meta ink; what it follows stands an inside
// gap from it.
export const LOCK_GLYPH = "shrink-0 text-ink-meta";
// A record's head: the overline, the title and the facts line a pair apart;
// the facts wrap at the fields rhythm, a counted fact its word beside its
// count. A fact that acts or changes (a pick, an opening fact, a save) stands
// at the target height, as the loading line does, so the head keeps one height
// whichever fact the line holds.
export const ITEM_HEADER = "gap-pair";
export const ITEM_FACTS = "gap-x-fields gap-y-pair";
export const ITEM_FACT = "gap-inside min-h-target";
// A folded question: one row at the row height, its glyph (in the `ok` ink),
// its label, its answer and its edit act an inside apart.
export const FORM_FIELD_SUMMARY = "gap-inside min-h-row";
export const FORM_FIELD_SUMMARY_GLYPH = "text-ok";
// A list of options, several or one chosen: its option groups on a hairline
// card at the float inset; an option's box or radio beside its label, and
// the children under a chosen option inset past the box.
export const OPTION_LIST =
	"gap-pair p-float rounded-card border border-edge bg-surface";
export const OPTION_LINE = "gap-inside";
export const OPTION_CHILDREN = "gap-inside px-control-x pb-pair";
export const OPTION_INDENT = "size-check";
// The chosen radio's dot, centred in its ring.
export const OPTION_RADIO_DOT = "size-dot rounded-full bg-toggle-on";
// The segments' track: flush, so the control stands at a segment's height.
export const SEGMENTED_CONTROL = "rounded-control bg-group";
// A toast at its width, raised and floating, its end inset tighter for the
// dismiss act's own box; its state is its glyph's ink (`toastState`).
export const TOAST =
	"w-toast pl-card pr-pair py-pair gap-inside rounded-card bg-raised border border-edge-raised shadow-float";
// A banner's line (its glyph beside the rest) and the rest (the sentence
// beside its act on the desktop, over it on touch).
export const BANNER_ROW = "gap-inside";
export const BANNER_MAIN = "gap-inside";
// A sheet on touch, raised from the bottom edge; on the desktop a side sheet
// (`sheetSide`) or a centred one at the dialog's width, its one region at
// the card inset.
export const SHEET =
	"bg-raised border-t border-edge-raised rounded-t-sheet shadow-modal";
export const SHEET_CENTERED =
	"gap-fields w-dialog p-card bg-raised border border-edge-raised rounded-sheet shadow-modal";
export const SCRIM = "bg-scrim";
// A sheet's regions in every form but the centred one: the head over a
// hairline (its row, then a blocked submit's reason on touch), the body at
// the card inset with its sections a sections gap apart (a form is one child,
// so the gap shows only between sections), the foot under a hairline (its
// line centred beside the acts) on the sheet's own ground, since on touch it
// stands over the end of the scrolling body.
export const SHEET_HEAD = "gap-pair px-card py-pair border-b border-edge";
// The head's row: the lead act, the title over the description, the end act,
// the title centred on the acts, which set the row's height.
export const SHEET_HEAD_ROW = "gap-acts";
export const SHEET_BODY = "gap-sections p-card";
export const SHEET_FOOT =
	"gap-acts px-card py-card border-t border-edge bg-raised";
// A sheet docked in a foot (`FOOT_DOCKED`): the foot is the raised cell, so the
// head, the body and the foot carry no surface, radius, shadow, hairline or
// side inset of their own, so all three share the foot's edge; the head's back
// act stands before one column, so the title and the description share one
// start: the column's row (the title, the close act) over the description a
// pair apart; the body keeps its sections a
// sections gap apart and the card inset above and below, the foot's line
// beside or over the acts an acts gap apart.
export const SHEET_DOCKED_HEAD = "gap-pair";
export const SHEET_DOCKED_BODY = "gap-sections py-card";
export const SHEET_DOCKED_FOOT = "gap-acts";
// An empty state: its column at the empty width (the mark, the text, the
// act a fields gap apart), the title over the sentence a pair apart, and in a
// Section a hairline frame at the card inset around it; in a Group the card
// is its frame, so it stands at the card inset alone.
export const EMPTY_COLUMN = "gap-fields w-full max-w-empty";
export const EMPTY_TEXT = "gap-pair";
export const EMPTY_FRAME = "p-card rounded-card border border-edge";
export const EMPTY_CARD = "p-card";
// An empty state's mark: its glyph in a control-sized disc on the neutral
// ground, in the ink of its place (meta, or danger for a failed query).
export const EMPTY_MARK = "size-control rounded-full bg-fill-neutral";
// The pending work in an action bar's place: the bar over a blocked act's
// reason, its row (the track beside the act), the track, the elapsed share
// as a line along the track's foot, and the time left.
export const PENDING_BAR = "gap-pair";
export const PENDING_ROW = "gap-acts";
export const PENDING_TRACK =
	"rounded-control bg-group min-h-control px-control-x gap-inside";
export const PENDING_FILL = "h-track bg-ink-meta";
export const PENDING_LEFT =
	"tabular-nums text-meta leading-meta font-normal text-ink-meta";
// Figures at one width, beside the type role of the line they stand in (a
// table's number and age, a meter's share, a chart's total, ticks and times).
export const FIGURES = "tabular-nums";

// ── Content ─────────────────────────────────────────────────────────

// The frame a block of text a reader reads whole stands in (Code, Diff,
// ProseDiff): the surface inside a hairline, so a diff's soft grounds sit on
// the surface wherever the frame stands.
export const CONTENT_FRAME = "rounded-card border border-edge bg-surface";
// Prose: its column at the measure, its headed parts a sections gap apart,
// a heading a pair over the blocks it heads, the blocks a fields gap apart;
// a list's items a pair apart (an item's line and its nested list too), each
// marker (`proseMarker`) an inside gap from its text; inline code on the
// neutral fill in its sentence's ink; a quote behind a strong hairline; a
// rule a hairline.
export const PROSE = "gap-sections max-w-measure text-body leading-body";
export const PROSE_PART = "gap-pair";
export const PROSE_BLOCKS = "gap-fields";
export const PROSE_LIST = "gap-pair";
export const PROSE_ITEM = "gap-inside";
export const PROSE_CODESPAN =
	"rounded-chip bg-fill-neutral px-inside text-code leading-code font-normal font-mono";
export const PROSE_QUOTE =
	"gap-fields border-l border-edge-strong pl-control-x";
export const PROSE_RULE = "border-t border-edge";
export const PROSE_EMPHASIS = "italic";
export const PROSE_STRIKE = "line-through";
// Code: the head a bar at the strip's height (its title, its copy act a
// float inset from the end), the hairline on the part under it; the copy
// act's own column beside the first line when there is no title; the fold, a
// band at the target height over the shown lines.
export const CODE_HEAD = "gap-acts min-h-strip pl-tile pr-float";
export const CODE_UNDER_HEAD = "border-t border-edge";
export const CODE_ACT = "pt-tile pl-acts pr-float";
export const CODE_FOLD =
	"gap-inside min-h-target px-tile border-b border-edge text-ink-meta";
// Diff: the hunk header's cell; the hang a wrapped line's continuation
// starts in by (its first line pulled back by a web overlay); the number
// columns, four code figures each; the marker; the code's end inset.
export const DIFF_HUNK = "px-inside py-rows";
export const DIFF_HANG = "pl-control-x";
export const DIFF_GUTTER = "min-w-figures pl-inside tabular-nums text-ink-meta";
export const DIFF_MARK = "px-inside text-ink-meta";
export const DIFF_CODE = "pr-inside";
// ProseDiff: the text at the card inset, at the measure.
export const PROSE_DIFF_BODY = "p-card";
export const PROSE_DIFF_TEXT = "max-w-measure";
// FileRow: the path at the code role (its parts in `filePathPart`), the
// counts at meta in their lanes (`fileCount`).
export const FILE_PATH = "text-code leading-code font-mono";
export const FILE_COUNTS =
	"gap-inside tabular-nums text-meta leading-meta font-normal";
// Comparison: its own row, not a list row, so a wrapped value keeps its air;
// the label beside its chips.
export const COMPARISON_ROW = "gap-pair min-h-row py-inside px-card";
export const COMPARISON_LABEL = "gap-inside";
// Table: the grid hangs into the page inset by the cell's inset, so the
// leading text meets the title over it; its columns read at body. A cell is
// the row's height behind a transparent side border, so the `Input` that
// edits it in place (the field's bar fit) puts its text where the cell's
// stands. The frozen leading column's cell stands on the surface. An empty
// grid's EmptyState stands a page inset under its header, across its width.
// A change cell's values and the arrow between them stand an inside gap
// apart, the arrow in the meta ink (the values' inks are `TABLE_CHANGE_VALUE`).
export const TABLE_FRAME = "-mx-control-x";
export const TABLE = "text-body";
export const TABLE_CELL = "min-h-row border-x border-transparent px-control-x";
export const TABLE_FROZEN = "bg-surface";
export const TABLE_EMPTY = "pt-page";
export const TABLE_CHANGE = "gap-inside text-ink-meta";
// A leading cell's name and its warning a gap apart.
export const TABLE_NAME = "gap-inside";
// Message: yours in a bubble on the group ground; the name beside the time;
// a system line's words beside its time, wrapping; the line that opens, a
// pill at the target height with the pointer's washes. Under a system line,
// its card: one list row in a hairline card on the surface; a free act's code
// and its fold's lines start-aligned across the column at the pill's inset,
// the code in the meta ink, ranking under its verb. Its attachments stand in
// one wrapping row a gap apart, over the bubble at the column's end (the
// `MessageInput` draws the same row over its text), and its provenance line
// (`meta`) leads the time.
export const MESSAGE_BUBBLE = "rounded-card bg-group px-tile py-pair";
export const MESSAGE_HEAD = "gap-inside";
export const MESSAGE_LINE = "gap-x-inside";
export const MESSAGE_OPEN =
	"gap-inside rounded-control px-inside min-h-target text-ink-meta";
export const MESSAGE_ATTACHMENTS = "gap-inside";
export const MESSAGE_CARD = "rounded-card border border-edge bg-surface";
export const MESSAGE_CODE = "px-inside text-ink-meta";
export const MESSAGE_FOLD = "px-inside";
// MessageInput: the composer over its notice. On the desktop one box (the
// field's boundary at the card radius), its attachments, its text at the
// field's inset (capped at eight lines, scrolling past them) and its foot
// (attach, Stop while an answer comes, Send); its notice at the text's x. On
// touch one row (attach, the field at its bar fit growing upward, Stop's icon
// act at the bar fit while an answer comes, Send) and the notice's row under
// it in the same columns, its sentence at the field's text (the attach slot
// held, the field's hairline counted).
export const MESSAGE_INPUT = "gap-pair";
export const MESSAGE_INPUT_BOX =
	"gap-rows rounded-card border border-edge bg-surface p-inside";
export const MESSAGE_INPUT_CHIPS = "px-inside pt-inside";
export const MESSAGE_INPUT_TEXT = "px-inside py-inside";
export const MESSAGE_INPUT_VALUE = "max-h-message-input";
export const MESSAGE_INPUT_FOOT = "gap-inside";
export const MESSAGE_INPUT_ROW = "gap-inside";
export const MESSAGE_INPUT_FIELD = "py-inside";
export const MESSAGE_NOTICE =
	"gap-inside pl-control-x pr-inside border-x border-transparent";
export const MESSAGE_NOTICE_TEXT = "px-control-x border-x border-transparent";
export const MESSAGE_ATTACH_SLOT = "w-control-compact";
// Meter: the label and its share over the bar over the meta line; the bar a
// track one wash step off the ground, its fill by level (`meterFill`).
export const METER = "gap-pair";
export const METER_HEAD = "gap-inside";
export const METER_TRACK = "h-meter rounded-chip bg-fill-neutral";
// A meter's mark: a tick across the track centred on the mark's share (so one
// at the max stands on the track's end), standing proud of the track by
// `inside` above and below. It sits outside the track, which clips.
export const METER_MARK =
	"w-track bg-ink-body -inset-y-inside -translate-x-1/2";
// A line of counts that lead to their lists: standalone links a gap apart
// with no glyph between (a meter's line under its bar, a stats cell's line
// under its figure). Each link's box is the target height (`LINK_TARGET`),
// and the line waits as one such box with a bar centred in it.
export const COUNT_LINKS = "gap-x-inside";
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
export const STATS_CELL = "gap-pair p-card border-t border-l border-edge";
// The card's outer edge, drawn over its cells: their own top and start
// hairlines at the card's edge sit under it, so the edge is one hairline at
// every density, with no cell pulled back by a width of its own.
export const STATS_EDGE = "absolute inset-0 rounded-card border border-edge";
export const STATS_FIGURE = "gap-inside";
// Stat: the figure first (read "2, need you") with its label under it.
export const STAT = "gap-pair";
export const STAT_FIGURE = "gap-inside";
// BarChart: the head (the total and its unit, then the series' keys) over
// the body (the axis beside the plot over its times). The plot is the chart's
// height in four bands (`chartBand`); a stacked part over another is split
// from it by a clear line. The axis is a lane four figures wide, the widest
// tick, loaded or loading, so the plot never moves when the data lands.
export const CHART = "gap-fields";
export const CHART_HEAD = "gap-pair";
export const CHART_TOTAL = "gap-inside";
export const CHART_KEYS = "gap-x-fields gap-y-pair";
export const CHART_KEY = "gap-inside";
export const CHART_KEY_DOT = "size-dot rounded-full";
export const CHART_BODY = "gap-inside";
export const CHART_GRID = "h-chart";
export const CHART_MAIN = "gap-pair";
export const CHART_PART_SPLIT = "border-b border-transparent bg-clip-padding";
export const CHART_TICK_LANE = "w-figures";
// Thread: the messages a sections gap apart, one rung above Prose's block
// gap, and under them the input; on the desktop the messages and the input
// each stand in a measure-wide column, as do the record's head over a Thread
// filling a Split's main and a `MessageInput` (so a Place's docked foot spans
// the body and the field keeps the column). A column cell is a width and
// nothing else: the region that owns its frame's width centres it (a filling
// Thread's log, a docked foot), and among sections it keeps the region's
// start, as a paragraph's measure does.
export const THREAD = "gap-sections";
export const THREAD_COLUMN = "w-full max-w-measure";
// A Thread in a Place's body fills it: the log scrolls under the page's head
// at the page inset, a sections gap over the input, which docks at the foot.
export const THREAD_LOG = "px-page pt-page pb-sections";
// A Thread filling a Split's main stands a page inset under the record's head
// over a hairline, which the log's messages scroll up to.
export const THREAD_UNDER_HEAD = "mt-page border-t border-edge";
// The way back to the newest message, floating over the log a pair above the
// foot while the reader is scrolled up: a lifted ground under the secondary
// act's hairline, at its radius.
export const THREAD_LATEST = "mb-pair rounded-control bg-raised shadow-float";
// QrCode: the tile at the qr size inside a hairline on the surface.
export const QR_TILE = "size-qr rounded-card border border-edge bg-surface";
// Stages: a rail of fixed states. A stage is its mark beside its words, the
// words the label with one meta line under it; a hairline in the edge ink
// runs from each mark to the next (`STAGE_RAIL`), and the room between two
// stages is the words' own bottom inset, so the rail runs unbroken. A row
// stands at least the two-line row's height (`STAGE_ROW`: 48, 64 on touch,
// the state rail's rows), so a later row of one meta line keeps the pace of a
// done one. A done mark's check stands on its disc in the canvas ink
// (`STAGE_CHECK`), an ended rail's cross is the danger ink (`STAGE_CROSS`).
export const STAGE_ROW = "gap-pair min-h-row-2";
export const STAGE_WORDS = "pb-pair";
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
export const STEP_COUNT = "gap-pair";
export const STEP_COUNT_SEGMENTS = "gap-inside";

// A thumbnail's remove act (an attachment's, in the `MessageInput`): a hit box
// the target's size (24, 44 on touch) a gap in from the thumbnail's corner
// (`IMAGE_REMOVE`), the `REMOVE_HIT` disc centred in it on the raised ground
// inside a hairline, so the glyph stays legible over any picture
// (`IMAGE_REMOVE_DISC`).
export const IMAGE_REMOVE = "m-inside min-h-target min-w-target rounded-full";
export const IMAGE_REMOVE_DISC = "border border-edge bg-raised";

// ── Layout ──────────────────────────────────────────────────────────

// The shell on the desktop: the sidebar on the canvas beside the column on
// the surface, a hairline between; the switcher's slot and the places inset
// by the float inset, so no wash meets the sidebar's edge.
export const SHELL_SIDEBAR = "w-sidebar bg-canvas border-r border-edge";
export const SHELL_COLUMN = "bg-surface";
// The column's banner slot: a `Banner` at the page inset, so its edge meets
// the Place title's.
export const SHELL_BANNER = "px-page pt-page";
export const SWITCHER_SLOT = "p-float";
export const SHELL_PLACES = "gap-rows p-float";
// The shell on touch: the tab bar on the canvas under a hairline.
export const SHELL_TAB_BAR = "px-float bg-canvas border-t border-edge";
// A page outside the shell, a Gate: the surface ground at the page inset, one
// column at the `auth` width (a column cell is a width; the region centres
// it) whose banner, lead and body stand a sections gap apart. The lead (the
// mark, the count and the head) is a fields gap apart, the head's title and
// description a pair apart, and the mark the avatar's size.
export const GATE = "bg-surface p-page";
export const GATE_COLUMN = "w-full max-w-auth";
export const GATE_FLOW = "gap-sections";
export const GATE_LEAD = "gap-fields";
export const GATE_HEAD = "gap-pair";
export const GATE_MARK = "size-avatar";
// The switcher's trigger in a touch top bar; in the sidebar it is a
// `PLACE_ROW` with the name at body 500.
export const SWITCHER = "gap-inside min-h-target rounded-control";
// The toasts' layer over the column (the desktop shell) or at a touch
// screen's foot, each toast a pair apart.
export const TOASTS = "p-page gap-pair";
// A page, a Place's or a Screen's. Its head insets the top bar at the page
// inset over one hairline: on the desktop the bar holds the title and the
// acts (the strip); on touch the switcher or the back act, then the acts,
// over the title. The bar is at a set height, a floor as a row's. The body
// insets its sections at the page inset; a bleeding body draws none, and
// whatever stands first in it carries its own top inset.
export const PAGE_HEAD = "px-page border-b border-edge";
// A room Place stands its head the page inset from the top as it does from
// the sides: the ten-foot safe area is all round.
export const PAGE_HEAD_ROOM = "pt-page";
export const PAGE_TOP_BAR = "gap-acts min-h-strip";
// The touch title over the head's hairline, a pair apart from it.
export const PAGE_TITLE = "pb-pair";
export const PAGE_BODY = "gap-sections p-page";
// A docked foot (a Place's `foot`, a filling Thread's input) is one cell: a
// region of its own under what scrolls past it, a raised surface (a step in
// dark, the float shadow in light) inside a hairline, at the page inset at the
// sides and an acts gap above and below what it holds (a selection bar stands
// in its height range, a field at its own), fitting what it holds up to three
// fifths of its frame's height (a structural fraction, never a size token), so
// what stands over it keeps two fifths, with the room to shrink to it: a docked
// `Sheet` fills it, its body scrolling only past the bound.
export const FOOT_DOCKED =
	"border-t border-edge-raised bg-raised shadow-float px-page py-acts max-h-3/5 min-h-0";
export const PAGE_BODY_OVER_FOOT = "pb-sections";
// A touch Place's act, floating over the body's end on a layer at the page
// inset, lifted off what scrolls under it as a Thread's Latest act is, and
// the room the body keeps under its last row so the act never covers it.
export const FLOATING_ACT = "p-page";
export const FLOATING_ACT_LIFT = "rounded-control shadow-float";
export const FLOATING_ACT_ROOM = "min-h-control";
// A region scrolling in a bleeding body (a Split's list or record) keeps no
// page inset under its last row, so its room is the act's height over the
// page inset.
export const FLOATING_ACT_FOOT = "pb-page";
// A split: the list at its width inside a hairline, the pane at its width at
// `wide` of its page. Below `tablet` the list stands alone and draws neither.
// A list holding sections stands them a sections gap apart, as a page body
// does, the first at the page inset under the strip's hairline at every
// width, where the record's first line stands: the rhythm is its own cell,
// which the phone's list reads as well.
export const SPLIT_LIST = "w-list pb-inside px-page border-r border-edge";
export const SPLIT_LIST_STACK = "gap-sections pt-page";
export const SPLIT_PANE = "gap-sections w-pane p-page border-l border-edge";
// A record the main opened: from `wide` of its page the main and it share what
// the list leaves, half each, a structural fraction and never a width token;
// below `wide` it stands in the main's place, and on the phone it replaces it.
export const SPLIT_BESIDE = "grow basis-0";
// A section's head (its rhythm is `SECTION`'s): the head row over a blocked
// act's reason, the title centred on the act, which sets the row's height.
// The fold toggle's wash overhangs the title's start only (a web overlay
// pulls it back).
export const SECTION_HEAD = "gap-pair";
export const SECTION_HEAD_ROW = "gap-fields";
export const SECTION_TITLE = "gap-inside";
export const SECTION_TOGGLE = "gap-inside min-h-target px-inside rounded-row";
// A group: a hairline card on the surface drawing the hairline between its
// rows once, so no row carries one. `divide-*` is a child selector uniwind
// drops, so native draws that hairline per row.
export const GROUP =
	"rounded-card border border-edge bg-surface divide-y divide-edge";
// An item of a Group that is no row (a Meter, a FormField, a Slider) stands at
// the card's inset, the group drawing the hairline between. Unheld: each
// that has one draws it, none owns it.
export const GROUP_ITEM = "p-card";
// A list bleeds its rows' inset, so a row's leading meets the title over it
// and its wash hangs into the inset around it.
export const LIST = "gap-rows -mx-control-x";
// A tree's list: its rows abut, so a level's rail runs unbroken down them.
export const LIST_TREE = "-mx-control-x";
// A tree row's level: one `indent` step in, its hairline rail on the end, so
// the rail falls under the middle of the parent's fold lane. A row draws one
// per level of its depth.
export const TREE_RAIL = "w-indent border-r border-edge";
// The lane every row of a tree reserves ahead of its leading, as wide as the
// fold act's square: a branch's fold act stands in it, a leaf leaves it empty.
export const TREE_LANE = "w-control-compact";
// A board's column at its width.
export const COLUMN = "w-column";
// A sectioned form's foot: its action bar under a hairline across the form.
export const FORM_FOOT = "border-t border-edge pt-fields";
export const ACTION_BAR_ACTS = "gap-acts";
// A selection bar's gaps, a pair apart: the row holding the count and its
// acts (the count at the start and the acts at the end, or stacked on touch)
// and the count's own row with its choose-all act.
export const ACTION_BAR_CHOSEN = "gap-pair";
// A selection bar's column: its container's width up to the selection-bar
// pattern's table-wide width; the docked foot it stands in centres it.
export const ACTION_BAR_SELECTION = "w-full max-w-selection";
// The act beside a selection bar's count that chooses or clears every row:
// words at the control radius, as the filled act beside it, washed at the
// pointer.
export const ACTION_BAR_ALL = "rounded-control px-inside min-h-target";
// A toolbar's band under a bleeding page's strip, a hairline across the page
// and its controls at the page inset: its controls and acts in wrapping rows
// at the acts rhythm, the applied filters' chips at the pair rhythm.
export const TOOLBAR = "gap-pair px-page py-inside border-b border-edge";
export const TOOLBAR_ROW = "gap-acts";
export const TOOLBAR_CHIPS = "gap-pair";
// A skeleton row's stacked lines.
export const SKELETON_LINES = "gap-pair";

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
export type FieldFit = keyof (typeof FIELD)["variants"]["fit"];
export type FieldState = keyof (typeof FIELD)["variants"]["state"];
export type OtpBoxState = keyof (typeof OTP_BOX)["variants"]["state"];
export type RowState = keyof (typeof ROW)["variants"]["state"];
export type SwitchState = keyof (typeof SWITCH)["variants"]["state"];
export type TableRowState = keyof (typeof TABLE_ROW)["variants"]["state"];
export type CheckboxState = keyof (typeof CHECKBOX)["variants"]["state"];
export type SegmentState = keyof (typeof SEGMENT)["variants"]["state"];
export type RowLines = keyof (typeof ROW)["variants"]["lines"];
export type RowGround = keyof (typeof ROW)["variants"]["ground"];
export type SheetFit = keyof (typeof SHEET_SIDE)["variants"]["fit"];
export type ImageFit = keyof (typeof IMAGE)["variants"]["fit"];
export type ImageState = keyof (typeof IMAGE)["variants"]["state"];
export type FormIn = keyof (typeof FORM)["variants"]["in"];
export type BannerKind = keyof (typeof BANNER)["variants"]["kind"];
export type ToastState = keyof (typeof TOAST_STATE)["variants"]["state"];
// The states a status draws as a dot: every one but `running`, whose mark
// is a spinner.
export type StatusDotState = keyof (typeof STATUS_DOT)["variants"]["state"];
export type DiffLineKind = keyof (typeof DIFF_LINE)["variants"]["kind"];
export type MessageAuthor = keyof (typeof MESSAGE)["variants"]["author"];
export type AvatarStep = keyof (typeof AVATAR)["variants"]["step"];
export type ChipCell = keyof (typeof CHIP)["variants"]["family"];
export type PlaceRowState = keyof (typeof PLACE_ROW)["variants"]["state"];
export type PlaceTabState = keyof (typeof PLACE_TAB)["variants"]["state"];
export type ColumnsFit = keyof (typeof COLUMNS)["variants"]["fit"];
export type ActionBarFit = keyof (typeof ACTION_BAR)["variants"]["fit"];
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

// A list row's title form: a name (`strong`) or a passage wrapped whole
// (`whole`), off a highlighted path (`dim`) or not.
const TITLE_DIM = { strong: "dim", whole: "whole-dim" } as const;
export function rowTitleForm(
	wrap: boolean,
	dim: boolean,
): keyof (typeof ROW_TITLE)["variants"]["form"] {
	const read = wrap ? "whole" : "strong";
	return dim ? TITLE_DIM[read] : read;
}

// A status's colour: the dot's, or the running spinner's.
export function statusContentTone(state: StatusState): ContentTone {
	if (state === "running") return toneOf(STATUS_SPINNER);
	return toneOf(STATUS_DOT.variants.state[state]);
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

// A toast's glyph ink, its state's.
export function toastContentTone(state: ToastState): ContentTone {
	return toneOf(TOAST_STATE.variants.state[state]);
}

// A folded question's glyph ink.
export function summaryContentTone(): ContentTone {
	return toneOf(FORM_FIELD_SUMMARY_GLYPH);
}

// A row's warning glyph ink.
export function rowWarningContentTone(): ContentTone {
	return toneOf(ROW_WARNING);
}

// A banner's glyph ink, its kind's.
export function bannerContentTone(kind: BannerKind): ContentTone {
	return toneOf(BANNER_GLYPH.variants.kind[kind]);
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
