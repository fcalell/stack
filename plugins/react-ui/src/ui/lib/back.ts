import type { IconName } from "@fcalell/ui-core/descriptors";

// The back act's glyph, shared by the Place, the Screen and the Sheet.
export function backGlyph(touch: boolean): IconName {
	return touch ? "ChevronLeft" : "ArrowLeft";
}

// The marks a Split's root carries decide which back act a page draws: the
// act to the list shows below `tablet` of the page with a record open, and
// what it replaces (the switcher, the page's own back act) hides then.
export const LIST_BACK =
	"hidden page-max-tablet:group-has-data-record/page:flex";
export const LIST_BACK_REPLACED =
	"flex page-max-tablet:group-has-data-record/page:hidden";
