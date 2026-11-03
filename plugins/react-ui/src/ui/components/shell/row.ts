// What a place row in the sidebar is made of, shared by the flat row and the
// tree's (`tree.tsx`).

// A place's count: the faint ink, tabular figures, at the caption role.
export const PLACE_COUNT = "text-ink-faint tabular-nums";
// On the current place's wash the faint ink falls under the floor's 4.5:1, so
// its count stands in the meta ink, as its label does.
export const PLACE_COUNT_SELECTED = "text-ink-meta tabular-nums";
// A place row rings inset, inside the sidebar's inset.
export const ROW_BOX = "flex items-center focus-visible:-outline-offset-2";
export const ROW_PRESS = "hover:bg-wash-hover active:bg-wash-press";
export const ROW_SELECTED_PRESS = "hover:bg-ink-body/10";
export const GLYPH = "flex shrink-0";
export const LABEL = "truncate grow";
