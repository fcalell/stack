// ─── Shared style constants ───

// The web overlay every FIELD surface composes after the matrix. `state` has no
// prop to bind to on these three, so the two reachable states are written as
// variant prefixes over the cells the matrix holds. The error state carries an
// outline as well as the border: a one-pixel hue change is the only signal a
// colour-blind reader would get from the border alone.
export const fieldShellClass =
	"font-mono text-callout text-ink-1 outline-none transition-colors placeholder:text-ink-3 focus-visible:border-ink-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive aria-invalid:border-danger aria-invalid:outline-2 aria-invalid:outline-offset-2 aria-invalid:outline-danger";

export const fieldMutedClass = "bg-surface-3 text-ink-4 cursor-not-allowed";
