// The public matrix layer: one cva per table, the axis types a component
// declares its props with, and the single-cell constants. The tables
// themselves stay internal to the package.
import { cva } from "class-variance-authority";
import type { InvariantColor, PerModeColor } from "./tokens.ts";
import {
	AVATAR,
	type Axes,
	BANNER,
	BUTTON,
	BUTTON_LABEL,
	CHECKBOX,
	DIFF_LINE,
	FIELD,
	type Matrix,
	MESSAGE,
	PLACE,
	RHYTHM,
	ROW,
	SEGMENT,
	STATUS,
	SWITCH,
	TEXT,
	TEXT_STRONG,
} from "./variant-tables.ts";

// The only way a cva is built here. Taking the whole matrix leaves no second
// argument to get wrong, so a cva cannot end up rendering another table's cells
// or dropping its own base. cva's own config type is conditional on a concrete
// axis set, which is why one generic helper has to widen it.
function build<T extends Axes>(table: Matrix<T>): ReturnType<typeof cva<T>> {
	return cva<T>(table.base, table as unknown as Parameters<typeof cva<T>>[1]);
}

export const text = build(TEXT);
export const textStrong = build(TEXT_STRONG);
export const button = build(BUTTON);
export const buttonLabel = build(BUTTON_LABEL);
export const status = build(STATUS);
export const field = build(FIELD);
export const row = build(ROW);
export const switchTrack = build(SWITCH);
export const checkbox = build(CHECKBOX);
export const segment = build(SEGMENT);
export const banner = build(BANNER);
export const diffLine = build(DIFF_LINE);
export const message = build(MESSAGE);
export const avatar = build(AVATAR);
export const place = build(PLACE);
export const rhythm = build(RHYTHM);

// Single cells: one class string each, shared verbatim by both plugins.
export const BUTTON_MUTED = "bg-group";
export const BUTTON_MUTED_LABEL = "text-ink-faint";
export const ICON_BUTTON = "rounded-full min-h-11 min-w-11 bg-group text-ink";
export const COUNT =
	"rounded-full bg-group min-w-6 px-2 text-label leading-label font-medium text-tint";
export const STATUS_CHIP = "rounded-full bg-group min-h-11 px-3";
export const FIELD_PLACEHOLDER = "text-ink-faint";
export const GROUP = "rounded-group bg-group";
export const HAIRLINE = "border-edge";
export const SWITCH_THUMB = "rounded-full bg-thumb";
export const CHECKBOX_MARK = "text-on-accent";
export const SEGMENTED_CONTROL = "rounded-full bg-group p-pair gap-pair";
export const TOAST =
	"rounded-full bg-ink px-inset py-stack gap-row text-meta leading-meta text-canvas";
export const SHEET = "bg-surface rounded-t-sheet";
export const SHEET_CENTERED = "rounded-sheet";
export const SCRIM = "bg-scrim";
export const PENDING_BAR = "rounded-full bg-group min-h-11 px-inset gap-row";
export const PENDING_FILL = "rounded-full bg-accent-soft";
export const METER_TRACK = "rounded-full bg-group";
export const METER_FILL = "rounded-full bg-tint";
export const DIFF_GUTTER = "text-ink-faint";
export const CODE = "rounded-group bg-group p-stack";
export const PLACE_ROW_SELECTED = "bg-accent-soft";
// Switch and checkbox mute by fading; a button swaps fills through BUTTON_MUTED.
export const CONTROL_MUTED = "opacity-50";

export type TextRole = keyof (typeof TEXT)["variants"]["role"];
export type ButtonAct = keyof (typeof BUTTON)["variants"]["act"];
export type FieldKind = keyof (typeof FIELD)["variants"]["kind"];
export type FieldState = keyof (typeof FIELD)["variants"]["state"];
export type RowState = keyof (typeof ROW)["variants"]["state"];
export type SwitchState = keyof (typeof SWITCH)["variants"]["state"];
export type CheckboxState = keyof (typeof CHECKBOX)["variants"]["state"];
export type SegmentState = keyof (typeof SEGMENT)["variants"]["state"];
export type BannerKind = keyof (typeof BANNER)["variants"]["kind"];
export type DiffLineKind = keyof (typeof DIFF_LINE)["variants"]["kind"];
export type MessageAuthor = keyof (typeof MESSAGE)["variants"]["author"];
export type AvatarStep = keyof (typeof AVATAR)["variants"]["step"];
export type PlaceState = keyof (typeof PLACE)["variants"]["state"];
export type RhythmUnit = keyof (typeof RHYTHM)["variants"]["unit"];

export type ContentTone = PerModeColor | InvariantColor;

// The label matrices already carry the answer, so the tint a plugin hands to
// its own icon or spinner is read back off the label cell instead of being
// written a second time.
function inkToken(cell: string): ContentTone {
	const ink = cell.split(/\s+/).find((name) => name.startsWith("text-"));
	return (ink ?? "text-ink").slice("text-".length) as ContentTone;
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
