import { type ReactNode, useEffect, useRef } from "react";

// A frame that judges its own edge: after the cells have mounted and settled,
// `judge` reads the frame's boxes and every fault it returns is logged as a
// console error, which the Storybook run and the stories test report.
const SETTLE = 90;

export function Judged(props: {
	name: string;
	judge: (host: Element) => string[];
	children: ReactNode;
}) {
	const { name, judge, children } = props;
	const host = useRef<HTMLDivElement>(null);
	useEffect(() => {
		let frame = 0;
		let seen = 0;
		const watch = () => {
			if (++seen < SETTLE) {
				frame = requestAnimationFrame(watch);
				return;
			}
			if (host.current)
				for (const fault of judge(host.current))
					console.error(`${name}: ${fault}`);
		};
		frame = requestAnimationFrame(watch);
		return () => cancelAnimationFrame(frame);
	}, [name, judge]);
	return (
		<div ref={host} className="min-w-0">
			{children}
		</div>
	);
}

let probe: CanvasRenderingContext2D | null | undefined;

/** A computed CSS colour (oklch, color-mix, rgb) as sRGB 0-255 and alpha, read back through a canvas pixel; undefined where it cannot be read. */
export function rgbOf(
	css: string,
): [number, number, number, number] | undefined {
	if (probe === undefined) {
		const canvas = document.createElement("canvas");
		canvas.width = 1;
		canvas.height = 1;
		probe = canvas.getContext("2d", { willReadFrequently: true });
	}
	if (!probe) return undefined;
	probe.clearRect(0, 0, 1, 1);
	probe.fillStyle = "#000";
	probe.fillStyle = css;
	probe.fillRect(0, 0, 1, 1);
	const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
	return [r ?? 0, g ?? 0, b ?? 0, (a ?? 0) / 255];
}

function lin(v: number): number {
	const s = v / 255;
	return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** The WCAG contrast ratio of two colours. */
export function ratio(a: readonly number[], b: readonly number[]): number {
	const l = (c: readonly number[]) =>
		0.2126 * lin(c[0] ?? 0) + 0.7152 * lin(c[1] ?? 0) + 0.0722 * lin(c[2] ?? 0);
	const [hi, lo] = [l(a), l(b)].sort((x, y) => y - x);
	return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

/** The first painted ground of an element: its own or the nearest ancestor's background that is not clear. */
export function groundOf(el: Element | null): [number, number, number, number] {
	for (let at = el; at; at = at.parentElement) {
		const c = rgbOf(getComputedStyle(at).backgroundColor);
		if (c && c[3] > 0.5) return c;
	}
	return [255, 255, 255, 1];
}
