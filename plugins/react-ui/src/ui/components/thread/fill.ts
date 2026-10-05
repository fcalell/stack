// A filling Thread marks its root `data-fill`, and the region it fills reads
// the mark, so the region's form follows the Thread from its first paint.
// These restate contract cells under the mark, since Tailwind reads literal
// classes only and the contract holds no platform overlay; react-ui's
// `fill.test.ts` holds each to the cell it marks.

// A Place's body under the mark draws no `PAGE_BODY` inset.
export const BODY_FILLED =
	"[&:has(>[data-fill])]:p-0 [&:has(>[data-fill])]:gap-0";
// A Split's main under the mark turns its `SPLIT_MAIN` `rest` form into its
// `fills` one.
export const MAIN_FILLED =
	"[&:has(>[data-fill])]:gap-0 [&:has(>[data-fill])]:pb-0";
// The record's head stands in `THREAD_COLUMN`, centred over the log's column,
// under its main's mark (`group/main`).
export const COLUMN_FILLED =
	"group-[:has(>[data-fill])]/main:w-full group-[:has(>[data-fill])]/main:max-w-measure group-[:has(>[data-fill])]/main:mx-auto";
