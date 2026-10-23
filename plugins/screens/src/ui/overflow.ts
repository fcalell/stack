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
