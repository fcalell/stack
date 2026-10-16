import {
	type Datum,
	paints,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import { QR_CODE, QR_TILE } from "@fcalell/ui-core/variants";
import qrcode from "qrcode-generator";
import { useMemo } from "react";
import type { Closed } from "../../lib/closed.ts";
import { PAINT_BOX } from "../../lib/paint.tsx";

// The tile is a light scope: its modules stay dark on a light ground in both
// modes, as a scanner needs.
const TILE = "light shrink-0 self-start overflow-hidden";
const CODE = "block";
// The quiet zone a scanner needs, in modules, inside the viewBox.
const QUIET = 4;
// A painted tile's module count, a version 2 code's: it encodes nothing.
const PAINTED_MODULES = 25;

// The value's code, its text encoded as UTF-8 bytes (the generator's byte
// mode reads one char per byte).
function encode(value: string) {
	const code = qrcode(0, "M");
	code.addData(String.fromCharCode(...new TextEncoder().encode(value)), "Byte");
	code.make();
	return code;
}

// Each row's runs of dark modules as one rectangle each.
function modules(code: ReturnType<typeof qrcode>): string {
	const count = code.getModuleCount();
	let path = "";
	for (let row = 0; row < count; row++) {
		let col = 0;
		while (col < count) {
			if (!code.isDark(row, col)) {
				col++;
				continue;
			}
			const start = col;
			while (col < count && code.isDark(row, col)) col++;
			const run = col - start;
			path += `M${start + QUIET} ${row + QUIET}h${run}v1h-${run}z`;
		}
	}
	return path;
}

/** A value a phone scans. */
export interface QrCodeProps extends Closed {
	/** What the code carries (a link, a pairing secret), at most 2,331 bytes as UTF-8 (the largest code at its error correction); also its accessible name (text; drawn as a code, never as text). A selection paints the tile, inert, until its read lands. */
	value: Datum<string>;
}

/** The code scaled into a square tile inside a hairline, its quiet zone four modules wide. A value still to land paints the tile, a still square at the code's size. */
export function QrCode({ value: given }: QrCodeProps) {
	const [named] = useSelections([given]);
	const value = named.painted ? undefined : named.value;
	// The code encodes once per value, and not while the tile is painted.
	const drawn = useMemo(() => {
		if (value === undefined) return undefined;
		const code = encode(value);
		return { count: code.getModuleCount(), path: modules(code) };
	}, [value]);
	const count = drawn?.count ?? PAINTED_MODULES;
	const box = `0 0 ${count + QUIET * 2} ${count + QUIET * 2}`;
	// An ended read draws no tile; the frame that holds it says why.
	if (!drawn && named.painted && !paints(named)) return null;
	if (!drawn)
		return (
			<div aria-hidden inert className={cn(QR_TILE, TILE)}>
				<svg
					viewBox={box}
					aria-hidden="true"
					className={cn(QR_CODE, CODE, PAINT_BOX)}
				/>
			</div>
		);
	return (
		<div className={cn(QR_TILE, TILE)}>
			<svg
				viewBox={box}
				role="img"
				aria-label={value}
				className={cn(QR_CODE, CODE)}
			>
				<path fill="currentColor" d={drawn.path} />
			</svg>
		</div>
	);
}
