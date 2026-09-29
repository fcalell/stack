// The public matrix layer: one cva per table, the axis types a component
// declares its props with, the single-cell constants, and the family registry
// with its cell enumeration. The tables themselves stay internal to the
// package.
import { cva } from "class-variance-authority";
import type { ClassValue } from "clsx";
import type { ColorName } from "./tokens.ts";
import {
	AVATAR,
	type Axes,
	BANNER,
	BUTTON,
	BUTTON_LABEL,
	CHECKBOX,
	CHIP,
	DIFF_LINE,
	FIELD,
	type Matrix,
	MESSAGE,
	OTP_BOX,
	PLACE,
	RHYTHM,
	ROW,
	SEGMENT,
	STATUS,
	SWITCH,
	TABLE_ROW,
	TEXT,
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
export const button = build(BUTTON);
export const buttonLabel = build(BUTTON_LABEL);
export const status = build(STATUS);
export const field = build(FIELD);
export const otpBox = build(OTP_BOX);
export const row = build(ROW);
export const switchTrack = build(SWITCH);
export const tableRow = build(TABLE_ROW);
export const checkbox = build(CHECKBOX);
export const chip = build(CHIP);
export const segment = build(SEGMENT);
export const banner = build(BANNER);
export const toastState = build(TOAST_STATE);
export const diffLine = build(DIFF_LINE);
export const message = build(MESSAGE);
export const avatar = build(AVATAR);
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
	family("BUTTON", BUTTON, button),
	family("BUTTON_LABEL", BUTTON_LABEL, buttonLabel),
	family("STATUS", STATUS, status),
	family("FIELD", FIELD, field),
	family("OTP_BOX", OTP_BOX, otpBox),
	family("ROW", ROW, row),
	family("SWITCH", SWITCH, switchTrack),
	family("TABLE_ROW", TABLE_ROW, tableRow),
	family("CHECKBOX", CHECKBOX, checkbox),
	family("SEGMENT", SEGMENT, segment),
	family("BANNER", BANNER, banner),
	family("TOAST_STATE", TOAST_STATE, toastState),
	family("DIFF_LINE", DIFF_LINE, diffLine),
	family("MESSAGE", MESSAGE, message),
	family("AVATAR", AVATAR, avatar),
	family("CHIP", CHIP, chip),
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
export const BUTTON_MUTED = "bg-fill-disabled";
export const BUTTON_MUTED_LABEL = "text-ink-disabled";
export const ICON_BUTTON =
	"rounded-control min-h-control min-w-control text-ink-body";
// The same control in a top bar, drawn compact; the plugin keeps the target
// around it.
export const ICON_BUTTON_BAR =
	"rounded-control min-h-control-compact min-w-control-compact text-ink-body";
export const COUNT =
	"rounded-full bg-group min-w-chip px-inside text-caption leading-caption tracking-caption font-medium text-ink-meta";
export const STATUS_CHIP = "rounded-full bg-group min-h-control px-control-x";
export const FIELD_PLACEHOLDER = "text-ink-meta";
// A picker's empty choice and its control with no value: a placeholder's
// look.
export const PICKER_EMPTY = "text-ink-meta";
export const GROUP = "rounded-card bg-group";
export const HAIRLINE = "border-edge";
export const SWITCH_THUMB = "rounded-full bg-switch-thumb";
export const CHECKBOX_MARK = "text-on-accent";
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
// Switch and checkbox mute by fading; a button swaps fills through BUTTON_MUTED.
export const CONTROL_MUTED = "opacity-45";

export type TextRole = keyof (typeof TEXT)["variants"]["role"];
export type ButtonAct = keyof (typeof BUTTON)["variants"]["act"];
export type ButtonFit = keyof (typeof BUTTON)["variants"]["fit"];
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

// The label matrices already carry the answer, so the tint a plugin hands to
// its own icon or spinner is read back off the label cell instead of being
// written a second time.
function inkToken(cell: string): ContentTone {
	const ink = cell.split(/\s+/).find((name) => name.startsWith("text-"));
	// Every label cell names a contract ink, which c22 pins.
	return (ink ?? "text-ink-body").slice("text-".length) as ContentTone;
}

export function buttonContentTone(act: ButtonAct): ContentTone {
	return inkToken(BUTTON_LABEL.variants.act[act]);
}

export function statusContentTone(
	state: keyof (typeof STATUS)["variants"]["state"],
): ContentTone {
	return inkToken(STATUS.variants.state[state]);
}

// A stable step for a name, so one name keeps one fill everywhere.
export function avatarStep(name: string): AvatarStep {
	let hash = 0;
	for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
	return String((hash % 8) + 1) as AvatarStep;
}
