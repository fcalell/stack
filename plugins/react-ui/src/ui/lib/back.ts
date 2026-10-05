import type { IconName } from "@fcalell/ui-core/descriptors";

// The back act's glyph, shared by the Place, the Screen and the Sheet.
export function backGlyph(touch: boolean): IconName {
	return touch ? "ChevronLeft" : "ArrowLeft";
}
