// The web's interaction overlays, composed through cn() after a matrix
// cell: ui-core's sharing line leaves every interaction state to the
// platform. One wash for hover and press that reads on any fill, a surface's
// or a button's, since it layers over the fill instead of replacing it; one
// focus ring in `tint` for every focusable thing; and a text act's
// underline, since a wash behind a word reads as a button.
export const WASH =
	"hover:bg-linear-to-b hover:from-ink/8 hover:to-ink/8 active:bg-linear-to-b active:from-ink/8 active:to-ink/8";

export const RING =
	"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tint";

// Inside a box that clips (a `Group`'s rows), the ring draws inward.
export const RING_INSET =
	"focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-tint";

export const TEXT_ACT = `cursor-pointer font-medium text-tint hover:underline hover:underline-offset-4 disabled:cursor-not-allowed disabled:text-ink-faint disabled:no-underline aria-disabled:cursor-not-allowed aria-disabled:text-ink-faint aria-disabled:no-underline ${RING}`;
