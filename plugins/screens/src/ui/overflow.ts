// The widths a screen must fit without a horizontal scrollbar: the rubric's
// phone, large phone, tablet, laptop and desktop.
export const WIDTHS = [320, 390, 768, 1280, 1440];

// The viewport's height at every width.
export const HEIGHT = 800;

// What a screen's overflow at a width reads, or null when it fits.
export function overflowError(
	width: number,
	scrollWidth: number,
	innerWidth: number,
): string | null {
	return scrollWidth > innerWidth
		? `horizontal overflow at ${width}px: scrollWidth ${scrollWidth}`
		: null;
}
