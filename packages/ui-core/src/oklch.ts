// OKLCH to sRGB by Björn Ottosson's reference matrices. The derivation uses
// it for the shadows, since a color token stays oklch but React Native's
// `boxShadow` parses no oklch; the verify script uses it to measure the
// contrast contracts. Internal: no subpath exports it.

// Linear-light sRGB channels in [0, 1], clamped to the gamut.
export function oklchToLinear(
	l: number,
	c: number,
	h: number,
): [number, number, number] {
	const a = c * Math.cos((h * Math.PI) / 180);
	const b = c * Math.sin((h * Math.PI) / 180);
	const l1 = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m1 = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s1 = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
	const clamp = (x: number) => Math.min(1, Math.max(0, x));
	return [
		clamp(4.0767416621 * l1 - 3.3077115913 * m1 + 0.2309699292 * s1),
		clamp(-1.2684380046 * l1 + 2.6097574011 * m1 - 0.3413193965 * s1),
		clamp(-0.0041960863 * l1 - 0.7034186147 * m1 + 1.707614701 * s1),
	];
}

// Gamma-encoded sRGB channels in [0, 255].
export function oklchToRgb(
	l: number,
	c: number,
	h: number,
): [number, number, number] {
	const [r, g, b] = oklchToLinear(l, c, h).map((x) =>
		Math.round(
			(x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055) * 255,
		),
	);
	return [r ?? 0, g ?? 0, b ?? 0];
}
