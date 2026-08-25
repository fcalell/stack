// The public matrix layer: one cva per table, the axis types a primitive
// declares its props with, and the two color-token helpers. The tables
// themselves stay internal to the package.
import { cva } from "class-variance-authority";
import { type InvariantColor, LABEL, type PerModeColor } from "#tokens";
import {
	type Axes,
	BADGE,
	BADGE_DOT,
	BADGE_LABEL,
	BUTTON,
	BUTTON_LABEL,
	BUTTON_MUTED,
	CARD,
	CHECKBOX,
	DIALOG,
	FIELD,
	type Matrix,
	RHYTHM,
	TEXT,
	TEXT_STRONG,
	TOGGLE,
} from "#variant-tables";

// The only way a cva is built here. Taking the whole matrix leaves no second
// argument to get wrong, so a cva cannot end up rendering another table's cells
// or dropping its own base. cva's own config type is conditional on a concrete
// axis set, which is why one generic helper has to widen it.
function build<T extends Axes>(table: Matrix<T>): ReturnType<typeof cva<T>> {
	return cva<T>(table.base, table as unknown as Parameters<typeof cva<T>>[1]);
}

export const button = build(BUTTON);
export const buttonLabel = build(BUTTON_LABEL);
export const buttonMuted = build(BUTTON_MUTED);
export const text = build(TEXT);
export const textStrong = build(TEXT_STRONG);
export const badge = build(BADGE);
export const badgeLabel = build(BADGE_LABEL);
export const badgeDot = build(BADGE_DOT);
export const card = build(CARD);
export const field = build(FIELD);
export const rhythm = build(RHYTHM);
export const checkbox = build(CHECKBOX);
export const toggle = build(TOGGLE);
export const dialog = build(DIALOG);

export const BUTTON_MUTED_LABEL = "text-ink-4";
// The tick ink. RN inherits nothing, so the mark's color is its own constant.
export const CHECKBOX_MARK = "text-accent-ink";
export const TOGGLE_KNOB = "rounded-full bg-canvas";
export const SKELETON = "rounded-md bg-surface";
// Checkbox and toggle mute by fading; button swaps fills through BUTTON_MUTED.
export const CONTROL_MUTED = "opacity-50";

export type ButtonEmphasis = keyof (typeof BUTTON)["variants"]["emphasis"];
export type ButtonTone = keyof (typeof BUTTON)["variants"]["tone"];
export type ButtonSize = keyof (typeof BUTTON)["variants"]["size"];
export type TextVariant = keyof (typeof TEXT)["variants"]["variant"];
export type TextTone = keyof (typeof TEXT)["variants"]["tone"];
export type BadgeTone = keyof (typeof BADGE)["variants"]["tone"];
export type CardPadding = keyof (typeof CARD)["variants"]["padding"];
export type CardRing = keyof (typeof CARD)["variants"]["ring"];
export type FieldState = keyof (typeof FIELD)["variants"]["state"];
export type FieldLayout = keyof (typeof FIELD)["variants"]["layout"];
export type CheckboxState = keyof (typeof CHECKBOX)["variants"]["state"];
export type ToggleState = keyof (typeof TOGGLE)["variants"]["state"];
export type DialogPart = keyof (typeof DIALOG)["variants"]["part"];

export type ContentTone = PerModeColor | InvariantColor;

// The label matrices already carry the answer, so the tint a plugin hands to
// its own icon or spinner component is read back off the label cell instead of
// being written a second time.
function inkToken(cell: string): ContentTone {
	return cell.slice("text-".length) as ContentTone;
}

export function buttonContentTone(
	emphasis: ButtonEmphasis,
	tone: ButtonTone,
): ContentTone {
	for (const row of BUTTON_LABEL.compoundVariants ?? []) {
		if (row.emphasis === emphasis && row.tone === tone) {
			return inkToken(row.class);
		}
	}
	throw new Error(`${LABEL}: BUTTON_LABEL has no cell for ${emphasis}/${tone}`);
}

export function badgeContentTone(tone: BadgeTone): ContentTone {
	return inkToken(BADGE_LABEL.variants.tone[tone]);
}
