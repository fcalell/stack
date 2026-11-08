// A cell's label holds its words, so a strip too narrow wraps a label whole and
// never cuts it (held by the cell's `min-w-min`).
export const LABEL = "wrap-normal";
// The figure stands whole, as wide as its digits, so the cell's floor holds it
// with the label's longest word (`min-w-min`): a strip too narrow for its cells
// to share a row wraps them. The unit stands whole after the figure's last
// digit, and under it where the cell has not the room for both, never cutting
// the figure.
export const FIGURE = "flex flex-wrap items-baseline gap-y-0 min-w-0";
export const FIGURE_DIGITS = "shrink-0 max-w-full";
