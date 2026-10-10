// A filling Thread marks its root `data-fill`, and the region it fills reads
// the mark, so the region's form follows the Thread from its first paint.
// These restate contract cells under the mark, since Tailwind reads literal
// classes only and the contract holds no platform overlay; react-ui's
// `fill.test.ts` holds each to the cell it marks.

// A Place's body under the mark draws no `PAGE_BODY` inset and keeps its gap.
export const BODY_FILLED = "[&:has(>[data-fill])]:p-0";
// A part above the Thread in that body (a Banner, a head paired with one)
// keeps the inset the body gave up at the sides and the top, and stands the
// body's gap from the log, so the Thread alone runs edge to edge.
export const PART_ABOVE_FILLED =
	"[&:has(>[data-fill])>:not([data-fill])]:mx-page [&:has(>[data-fill])>:first-child:not([data-fill])]:mt-page";
// A Split's main under the mark turns its `SPLIT_MAIN` `rest` form into its
// `fills` one: the Thread spans the main, so the record's column cap goes.
export const MAIN_FILLED =
	"[&:has(>[data-fill])]:gap-0 [&:has(>[data-fill])]:pb-0 [&:has(>[data-fill])]:max-w-none";
// The record's head stands in `THREAD_COLUMN` at the main's start, over the
// log's column, under its main's mark (`group/main`).
export const COLUMN_FILLED =
	"group-[:has(>[data-fill])]/main:w-full group-[:has(>[data-fill])]/main:max-w-measure";
// The log's messages keep the measure but stand at the main's start, as a
// record in the main does, not centred in it.
export const LOG_AT_START = "group-[:has(>[data-fill])]/main:items-start";
// The input (and the foot that holds it) spans the main within the page
// inset; the messages above keep the measure.
export const INPUT_FILLED = "group-[:has(>[data-fill])]/main:max-w-none";
