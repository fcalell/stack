import type { Page } from "@playwright/test";

export interface Box {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface Pixels {
	width: number;
	height: number;
	data: Uint8Array;
}

// Scrolls the element into the middle of the viewport and returns its box in
// viewport pixels, grown by `margin` on every side.
export async function place(
	page: Page,
	selector: string,
	margin = 0,
): Promise<Box | null> {
	const rect = await page.evaluate((s) => {
		const element = document.querySelector(s);
		if (!element) return null;
		element.scrollIntoView({ block: "center", inline: "center" });
		const { x, y, width, height } = element.getBoundingClientRect();
		return { x, y, width, height };
	}, selector);
	if (!rect || rect.width === 0 || rect.height === 0) return null;
	const x = Math.max(0, Math.floor(rect.x - margin));
	const y = Math.max(0, Math.floor(rect.y - margin));
	return {
		x,
		y,
		width: Math.ceil(rect.x + rect.width + margin) - x,
		height: Math.ceil(rect.y + rect.height + margin) - y,
	};
}

// The composited render inside `clip`, decoded on a canvas in the page.
export async function capture(page: Page, clip: Box): Promise<Pixels> {
	const png = await page.screenshot({ clip, caret: "hide", scale: "css" });
	const image = await page.evaluate(async (base64) => {
		const blob = await (await fetch(`data:image/png;base64,${base64}`)).blob();
		const bitmap = await createImageBitmap(blob);
		const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
		const context = canvas.getContext("2d");
		if (!context) throw new Error("no 2d context");
		context.drawImage(bitmap, 0, 0);
		const image = context.getImageData(0, 0, bitmap.width, bitmap.height);
		// RGBA back as base64: a string crosses the protocol far faster than an
		// array of numbers.
		let binary = "";
		for (let i = 0; i < image.data.length; i += 0x8000) {
			binary += String.fromCharCode(...image.data.subarray(i, i + 0x8000));
		}
		return { width: image.width, height: image.height, rgba: btoa(binary) };
	}, png.toString("base64"));
	return {
		width: image.width,
		height: image.height,
		data: Uint8Array.from(atob(image.rgba), (char) => char.charCodeAt(0)),
	};
}

// WCAG 2 relative luminance of an sRGB pixel.
function luminance(r: number, g: number, b: number): number {
	const channel = (value: number) => {
		const c = value / 255;
		return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function ratio(a: Pixels, b: Pixels, i: number): number {
	const la = luminance(a.data[i] ?? 0, a.data[i + 1] ?? 0, a.data[i + 2] ?? 0);
	const lb = luminance(b.data[i] ?? 0, b.data[i + 1] ?? 0, b.data[i + 2] ?? 0);
	return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// The highest contrast between the same pixel in two renders of one box, or
// of `area` inside it: the foreground drawn against the render with it
// removed, or a focused state against rest. 1 when the renders are identical.
export function contrast(drawn: Pixels, without: Pixels, area?: Box): number {
	const left = Math.max(0, Math.floor(area?.x ?? 0));
	const top = Math.max(0, Math.floor(area?.y ?? 0));
	const right = Math.min(
		drawn.width,
		Math.ceil(area ? area.x + area.width : drawn.width),
	);
	const bottom = Math.min(
		drawn.height,
		Math.ceil(area ? area.y + area.height : drawn.height),
	);
	let best = 1;
	for (let y = top; y < bottom; y++) {
		for (let x = left; x < right; x++) {
			best = Math.max(best, ratio(drawn, without, (y * drawn.width + x) * 4));
		}
	}
	return best;
}

// How many pixels differ between two renders, over the area both cover.
export function difference(a: Pixels, b: Pixels): number {
	const width = Math.min(a.width, b.width);
	const height = Math.min(a.height, b.height);
	let count = 0;
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const i = (y * a.width + x) * 4;
			const j = (y * b.width + x) * 4;
			if (
				a.data[i] !== b.data[j] ||
				a.data[i + 1] !== b.data[j + 1] ||
				a.data[i + 2] !== b.data[j + 2]
			) {
				count++;
			}
		}
	}
	return count;
}

export function round(value: number): number {
	return Math.round(value * 100) / 100;
}
