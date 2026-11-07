// The class lists the screens run's walk names in its exceptions
// (`@fcalell/plugin-screens/walk`, `/shift`): a component draws them from
// here, and `walk-exceptions.test.ts` holds each exception's tokens to the one
// it names. Outside the package's exports.

/** An image that opens: a button sized by its picture. */
export const IMAGE_FRAME = "block relative shrink-0 overflow-hidden";

/** A modal Sheet's overlay: the viewport, over the scrim. */
export const SHEET_BACKDROP = "fixed inset-0 z-(--layer-sheet)";

/** A BarChart's body: the plot starts half a tick label's line below its top. */
export const BAR_CHART_BODY = "flex items-start pt-[calc(1lh/2)]";

/** The Gate's column, centred by an auto margin. */
export const GATE_CENTRED = "flex flex-col my-auto";
