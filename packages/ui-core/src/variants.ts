// The public matrix layer: one cva per table, the axis types a component
// declares its props with, the single-cell constants, and the family registry
// with its cell enumeration. The tables themselves stay internal to the
// package.
import { cva } from "class-variance-authority";
import type { ClassValue } from "clsx";
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
	CHECKBOX,
	CHIP,
	CHIP_LABEL,
	DIFF_LINE,
	FIELD,
	FIELD_VALUE,
	FORM,
	ICON,
	ICON_BUTTON,
	LINK,
	type Matrix,
	MENU,
	MENU_GROUP,
	MESSAGE,
	OTP_BOX,
	PLACE_ROW,
	PLACE_ROW_GLYPH,
	PLACE_TAB,
	PLACE_TAB_LABEL,
	ROW,
	SECTION,
	SEGMENT,
	SEGMENT_LABEL,
	SHEET_SIDE,
	SKELETON,
	SKELETON_ROW,
	SPLIT_MAIN,
	STATUS_DOT,
	SWITCH,
	SWITCH_THUMB,
	TABLE_ROW,
	TEXT,
	TEXT_AREA,
	TEXT_AREA_BUDGET,
	TEXT_STRONG,
	TOAST_STATE,
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
export const row = build(ROW);
export const tableRow = build(TABLE_ROW);
export const segment = build(SEGMENT);
export const segmentLabel = build(SEGMENT_LABEL);
export const banner = build(BANNER);
export const bannerGlyph = build(BANNER_GLYPH);
export const toastState = build(TOAST_STATE);
export const menu = build(MENU);
export const menuGroup = build(MENU_GROUP);
export const sheetSide = build(SHEET_SIDE);
export const diffLine = build(DIFF_LINE);
export const message = build(MESSAGE);
export const placeRow = build(PLACE_ROW);
export const placeRowGlyph = build(PLACE_ROW_GLYPH);
export const placeTab = build(PLACE_TAB);
export const placeTabLabel = build(PLACE_TAB_LABEL);
export const splitMain = build(SPLIT_MAIN);
export const section = build(SECTION);
export const form = build(FORM);
export const actionBar = build(ACTION_BAR);
export const skeleton = build(SKELETON);
export const skeletonRow = build(SKELETON_ROW);

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
	family("ROW", ROW, row),
	family("TABLE_ROW", TABLE_ROW, tableRow),
	family("SEGMENT", SEGMENT, segment),
	family("SEGMENT_LABEL", SEGMENT_LABEL, segmentLabel),
	family("BANNER", BANNER, banner),
	family("BANNER_GLYPH", BANNER_GLYPH, bannerGlyph),
	family("TOAST_STATE", TOAST_STATE, toastState),
	family("MENU", MENU, menu),
	family("MENU_GROUP", MENU_GROUP, menuGroup),
	family("SHEET_SIDE", SHEET_SIDE, sheetSide),
	family("DIFF_LINE", DIFF_LINE, diffLine),
	family("MESSAGE", MESSAGE, message),
	family("PLACE_ROW", PLACE_ROW, placeRow),
	family("PLACE_ROW_GLYPH", PLACE_ROW_GLYPH, placeRowGlyph),
	family("PLACE_TAB", PLACE_TAB, placeTab),
	family("PLACE_TAB_LABEL", PLACE_TAB_LABEL, placeTabLabel),
	family("SPLIT_MAIN", SPLIT_MAIN, splitMain),
	family("SECTION", SECTION, section),
	family("FORM", FORM, form),
	family("ACTION_BAR", ACTION_BAR, actionBar),
	family("SKELETON", SKELETON, skeleton),
	family("SKELETON_ROW", SKELETON_ROW, skeletonRow),
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
// chip's label is, so a long one truncates before a row's title does. With
// `onOpen` it is a `PILL_ACT`.
export const STATUS = "gap-inside";
export const STATUS_LABEL =
	"max-w-measure-short text-meta leading-meta font-normal text-ink-meta";
// An act drawn as its words in a pill with no boundary at rest: a status that
// opens, a row's pick. It pulls back by its own padding on the side that
// meets plain text (an overlay), so its words sit where static words do.
export const PILL_ACT = "rounded-full px-inside min-h-target";
// A removable chip's remove act: a round hit box the chip's height.
export const CHIP_REMOVE_HIT = "min-h-chip min-w-chip rounded-full";
export const FIELD_PLACEHOLDER = "text-ink-meta";
// A field's unit after its value, and its glyph (search, chevron).
export const FIELD_UNIT = "text-body leading-body font-normal text-ink-meta";
export const FIELD_GLYPH = "text-ink-meta";
// A text area's value: three body lines at least, a line more for each past them.
export const TEXT_AREA_VALUE = "min-h-text-area";
// A one-time code's row of boxes and the digit in each.
export const OTP = "gap-inside";
// A select's option group: its rows at the rows rhythm.
export const SELECT_GROUP = "gap-rows";
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
// A two-line row's meta line: the meta keeps its room and the marks or the
// trailing that cannot sit beside it wrap under it, the row growing.
export const ROW_META_LINE = "gap-x-inside";
// A definition row: its text and its end acts a fields gap apart, over the
// row's own gap.
export const DEFINITION_ROW = "gap-fields";
// A definition row's act: the Link's standalone form, at the body line's type.
export const DEFINITION_ROW_ACT = "text-body leading-body";
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
// the card inset, the foot under a hairline (its line centred beside the acts).
export const SHEET_HEAD = "gap-pair px-card py-pair border-b border-edge";
// The head's row: the lead act, the title over the description, the end act,
// the title centred on the acts, which set the row's height.
export const SHEET_HEAD_ROW = "gap-acts";
export const SHEET_BODY = "p-card";
export const SHEET_FOOT = "gap-acts px-card py-card border-t border-edge";
// An empty state's mark: its glyph in a control-sized disc on the neutral
// ground, in the ink of its place (meta, or danger for a failed query).
export const EMPTY_MARK = "size-control rounded-full bg-fill-neutral";
// The pending work's track in an action bar's place, its act beside it.
export const PENDING_BAR =
	"rounded-control bg-group min-h-control px-control-x gap-inside";
// The elapsed share: a line along the track's foot.
export const PENDING_FILL = "h-track bg-ink-meta";
export const METER_TRACK = "rounded-full bg-group";
export const METER_FILL = "rounded-full bg-accent";
export const DIFF_GUTTER = "text-ink-meta";
export const CODE = "rounded-card bg-group p-card";
// A data table's cell: a field's box behind a transparent side border, so the
// `Input` that edits it in place keeps the row's height.
export const TABLE_CELL =
	"min-h-field border-x border-transparent px-control-x";

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
// The switcher's trigger in a touch top bar; in the sidebar it is a
// `PLACE_ROW` with the name at body 500.
export const SWITCHER = "gap-inside min-h-target rounded-control";
// The toasts' layer over the column (the desktop shell) or at a touch
// screen's foot, each toast a pair apart.
export const TOASTS = "p-page gap-pair";
// A page, a Place's or a Screen's. On the desktop its title and acts share
// the strip under a hairline; on touch the head insets a top bar (the
// switcher or the back act, then the acts) over the title. The strip and the
// top bar are bars at a set height, a floor as a row's. The body insets its
// sections at the page inset; a bleeding body draws none, and whatever
// stands first in it carries its own top inset.
export const PAGE_STRIP = "gap-acts min-h-strip px-page border-b border-edge";
export const PAGE_HEAD = "px-page";
export const PAGE_TOP_BAR = "gap-acts min-h-strip";
export const PAGE_BODY = "gap-sections p-page";
// A touch Place's act, floating over the body's end on a layer at the page
// inset, and the room the body keeps under its last row so the act never
// covers it.
export const FLOATING_ACT = "p-page";
export const FLOATING_ACT_ROOM = "min-h-control";
// A region scrolling in a bleeding body (a Split's list or record) keeps no
// page inset under its last row, so its room is the act's height over the
// page inset.
export const FLOATING_ACT_FOOT = "pb-page";
// A split: the list at its width inside a hairline, the pane at its width at
// `wide` of its page. Below `tablet` the list stands alone and draws neither.
export const SPLIT_LIST = "w-list py-inside px-page border-r border-edge";
export const SPLIT_PANE = "gap-sections w-pane p-page border-l border-edge";
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
// A list bleeds its rows' inset, so a row's leading meets the title over it
// and its wash hangs into the inset around it.
export const LIST = "gap-rows -mx-control-x";
// A board's columns: the row scrolls sideways from the page inset (a web
// overlay bleeds it to the Place's edge), each column at its width.
export const COLUMNS = "gap-fields px-page";
export const COLUMN = "w-column";
// A sectioned form's foot: its action bar under a hairline across the form.
export const FORM_FOOT = "border-t border-edge pt-fields";
export const ACTION_BAR_ACTS = "gap-acts";
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
export type SheetFit = keyof (typeof SHEET_SIDE)["variants"]["fit"];
export type BannerKind = keyof (typeof BANNER)["variants"]["kind"];
export type ToastState = keyof (typeof TOAST_STATE)["variants"]["state"];
export type DiffLineKind = keyof (typeof DIFF_LINE)["variants"]["kind"];
export type MessageAuthor = keyof (typeof MESSAGE)["variants"]["author"];
export type AvatarStep = keyof (typeof AVATAR)["variants"]["step"];
export type ChipCell = keyof (typeof CHIP)["variants"]["family"];
export type PlaceRowState = keyof (typeof PLACE_ROW)["variants"]["state"];
export type PlaceTabState = keyof (typeof PLACE_TAB)["variants"]["state"];
export type ActionBarFit = keyof (typeof ACTION_BAR)["variants"]["fit"];

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

// A status's colour, the dot's.
export function statusContentTone(state: StatusState): ContentTone {
	return toneOf(STATUS_DOT.variants.state[state]);
}

// A stable step for a name, so one name keeps one fill everywhere.
export function avatarStep(name: string): AvatarStep {
	let hash = 0;
	for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
	return String((hash % 8) + 1) as AvatarStep;
}
