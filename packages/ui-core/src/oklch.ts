// OKLCH, OKLab and sRGB by Björn Ottosson's reference matrices. The
// derivation mixes in OKLab (a hover fill toward black, a pending fill toward
// its label), clamps a re-hued accent's chroma into the sRGB gamut, and
// converts the shadows to sRGB because React Native's `boxShadow` parses no
// oklch; the verify script measures the contrast contracts through it.
// Internal: no subpath exports it.

export interface Lab {
	l: number;
	a: number;
	b: number;
}

export function oklchToLab(l: number, c: number, h: number): Lab {
	const rad = (h * Math.PI) / 180;
	return { l, a: c * Math.cos(rad), b: c * Math.sin(rad) };
}

export function labToOklch(lab: Lab): [number, number, number] {
	const c = Math.hypot(lab.a, lab.b);
	const h = ((Math.atan2(lab.b, lab.a) * 180) / Math.PI + 360) % 360;
	return [lab.l, c, h];
}

// Linear-light sRGB channels, unclamped, so a caller can tell an in-gamut
// color from one the display would clip.
function labToLinear(lab: Lab): [number, number, number] {
	const l1 = (lab.l + 0.3963377774 * lab.a + 0.2158037573 * lab.b) ** 3;
	const m1 = (lab.l - 0.1055613458 * lab.a - 0.0638541728 * lab.b) ** 3;
	const s1 = (lab.l - 0.0894841775 * lab.a - 1.291485548 * lab.b) ** 3;
	return [
		4.0767416621 * l1 - 3.3077115913 * m1 + 0.2309699292 * s1,
		-1.2684380046 * l1 + 2.6097574011 * m1 - 0.3413193965 * s1,
		-0.0041960863 * l1 - 0.7034186147 * m1 + 1.707614701 * s1,
	];
}

// Linear-light sRGB channels in [0, 1], clamped to the gamut.
export function oklchToLinear(
	l: number,
	c: number,
	h: number,
): [number, number, number] {
	const clamp = (x: number) => Math.min(1, Math.max(0, x));
	const [r, g, b] = labToLinear(oklchToLab(l, c, h));
	return [clamp(r), clamp(g), clamp(b)];
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

// WCAG 2 relative luminance and the contrast ratio between two opaque colors.
export function luminance(l: number, c: number, h: number): number {
	const [r, g, b] = oklchToLinear(l, c, h);
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: number, b: number): number {
	const [light, dark] = a > b ? [a, b] : [b, a];
	return (light + 0.05) / (dark + 0.05);
}

const EPSILON = 0.0005;

export function inGamut(l: number, c: number, h: number): boolean {
	return labToLinear(oklchToLab(l, c, h)).every(
		(x) => x >= -EPSILON && x <= 1 + EPSILON,
	);
}

// The largest chroma at or under `c` that keeps the color inside sRGB at the
// same lightness and hue, so a re-hued accent keeps its luminance (and so its
// contrast) and loses saturation instead of clipping to a different color.
// The result is floored to the three decimals a token is emitted with, so
// the emitted value is in gamut too.
export function chromaInGamut(l: number, c: number, h: number): number {
	if (inGamut(l, c, h)) return c;
	let low = 0;
	let high = c;
	for (let i = 0; i < 24; i++) {
		const mid = (low + high) / 2;
		if (inGamut(l, mid, h)) low = mid;
		else high = mid;
	}
	return Math.floor(low * 1000) / 1000;
}

// `amount` of `toward` blended into `from`, in OKLab, as CSS `color-mix(in
// oklab, from, toward amount)` does for two opaque colors.
export function mixLab(from: Lab, toward: Lab, amount: number): Lab {
	return {
		l: from.l + (toward.l - from.l) * amount,
		a: from.a + (toward.a - from.a) * amount,
		b: from.b + (toward.b - from.b) * amount,
	};
}
