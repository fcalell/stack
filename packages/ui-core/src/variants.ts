// The public matrix layer: one cva per table, the axis types a component
// declares its props with, the single-cell constants, and the family registry
// with its cell enumeration. The tables themselves stay internal to the
// package.
import { cva } from "class-variance-authority";
import type { ClassValue } from "clsx";
import { COLOR_NAMES, type ColorName, type StatusState } from "./tokens.ts";
import {
	AVATAR,
	AVATAR_LABEL,
	type Axes,
	BANNER,
	BUTTON,
	BUTTON_LABEL,
	CHECKBOX,
	CHIP,
	CHIP_LABEL,
	DIFF_LINE,
	FIELD,
	FIELD_VALUE,
	ICON,
	ICON_BUTTON,
	LINK,
	type Matrix,
	MESSAGE,
	OTP_BOX,
	PLACE,
	RHYTHM,
	ROW,
	SEGMENT,
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
export const banner = build(BANNER);
export const toastState = build(TOAST_STATE);
export const diffLine = build(DIFF_LINE);
export const message = build(MESSAGE);
export const place = build(PLACE);
export const rhythm = build(RHYTHM);

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
	family("BANNER", BANNER, banner),
	family("TOAST_STATE", TOAST_STATE, toastState),
	family("DIFF_LINE", DIFF_LINE, diffLine),
	family("MESSAGE", MESSAGE, message),
	family("PLACE", PLACE, place),
	family("RHYTHM", RHYTHM, rhythm),
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
// A status: its dot (`statusDot`) beside its word. With `onOpen` it is a
// pill that pulls back by its own padding, so the dot and the word sit where
// a static status's do.
export const STATUS = "gap-inside";
export const STATUS_LABEL = "text-meta leading-meta font-normal text-ink-meta";
export const STATUS_OPEN = "rounded-full px-inside -mx-inside min-h-target";
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
export const GROUP = "rounded-card bg-group";
// A popover: raised on the float shadow inside its hairline, its rows inset
// by the float inset so a row's wash sits just inside the edge.
export const POPOVER =
	"gap-pair p-float bg-raised border border-edge-raised rounded-popover shadow-float";
export const HAIRLINE = "border-edge";
// The check or the dash on a checked box, at the meta glyph's size.
export const CHECKBOX_MARK = "size-icon-meta text-on-accent";
export const SEGMENTED_CONTROL = "rounded-control bg-group p-rows gap-rows";
export const TOAST =
	"rounded-card bg-raised border border-edge px-card py-pair gap-inside text-body leading-body text-ink-body";
export const SHEET = "bg-raised rounded-t-sheet";
export const SHEET_CENTERED = "rounded-dialog";
export const SCRIM = "bg-scrim";
export const PENDING_BAR =
	"rounded-control bg-group min-h-control px-card gap-inside";
export const PENDING_FILL = "rounded-control bg-accent-soft";
export const METER_TRACK = "rounded-full bg-group";
export const METER_FILL = "rounded-full bg-accent";
export const DIFF_GUTTER = "text-ink-meta";
export const CODE = "rounded-card bg-group p-card";
// A data table's cell: a field's box behind a transparent side border, so the
// `Input` that edits it in place keeps the row's height.
export const TABLE_CELL =
	"min-h-field border-x border-transparent px-control-x";
export const PLACE_ROW_SELECTED = "bg-wash-selected";

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
export type FieldKind = keyof (typeof FIELD)["variants"]["kind"];
export type FieldState = keyof (typeof FIELD)["variants"]["state"];
export type OtpBoxState = keyof (typeof OTP_BOX)["variants"]["state"];
export type RowState = keyof (typeof ROW)["variants"]["state"];
export type SwitchState = keyof (typeof SWITCH)["variants"]["state"];
export type TableRowState = keyof (typeof TABLE_ROW)["variants"]["state"];
export type CheckboxState = keyof (typeof CHECKBOX)["variants"]["state"];
export type SegmentState = keyof (typeof SEGMENT)["variants"]["state"];
export type BannerKind = keyof (typeof BANNER)["variants"]["kind"];
export type ToastState = keyof (typeof TOAST_STATE)["variants"]["state"];
export type DiffLineKind = keyof (typeof DIFF_LINE)["variants"]["kind"];
export type MessageAuthor = keyof (typeof MESSAGE)["variants"]["author"];
export type AvatarStep = keyof (typeof AVATAR)["variants"]["step"];
export type ChipCell = keyof (typeof CHIP)["variants"]["family"];
export type PlaceState = keyof (typeof PLACE)["variants"]["state"];
export type RhythmUnit = keyof (typeof RHYTHM)["variants"]["unit"];

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
