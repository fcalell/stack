import { BREAKPOINT_PX } from "@fcalell/ui-core/tokens";

// The density rule, built once for the density layer, the `touch:` variant
// and `useTouch`: the desktop set draws where the primary pointer is fine and
// the viewport is at least `tablet` wide, the touch set everywhere else. A
// `data-density` attribute on the root pins either set over it.
export const DESKTOP_MEDIA = `(pointer: fine) and (width >= ${BREAKPOINT_PX.tablet}px)`;
export const TOUCH_MEDIA = `not (${DESKTOP_MEDIA})`;
