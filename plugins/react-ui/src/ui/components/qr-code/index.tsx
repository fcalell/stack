import { cn } from "@fcalell/ui-core/cn";
import { QR_TILE, qrCode } from "@fcalell/ui-core/variants";
import qrcode from "qrcode-generator";
import { useMemo } from "react";
import type { Closed } from "../../lib/closed.ts";

// The tile is a light scope: its modules stay dark on a light ground in both
// modes, as a scanner needs.
const TILE = "light shrink-0 self-start overflow-hidden";
const CODE = "block";
// The quiet zone a scanner needs, in modules, inside the viewBox.
const QUIET = 4;
// A waiting tile's module count, a version 2 code's: the skeleton encodes
// nothing.
const WAITING_MODULES = 25;

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
	/** What the code carries (a link, a pairing secret), at most 2,331 bytes as UTF-8 (the largest code at its error correction); also its accessible name (text; drawn as a code, never as text). */
	value: string;
	/** The tile at its size, the code's square a skeleton. */
	loading?: boolean;
}

/** The code scaled into a square tile inside a hairline, its quiet zone four modules wide. */
export function QrCode({ value, loading }: QrCodeProps) {
	// The code encodes once per value, and not while the tile waits.
	const drawn = useMemo(() => {
		if (loading) return undefined;
		const code = encode(value);
		return { count: code.getModuleCount(), path: modules(code) };
	}, [value, loading]);
	const count = drawn?.count ?? WAITING_MODULES;
	const box = `0 0 ${count + QUIET * 2} ${count + QUIET * 2}`;
	if (!drawn)
		return (
			<div aria-busy className={cn(QR_TILE, TILE)}>
				<svg
					viewBox={box}
					aria-hidden="true"
					className={cn(qrCode({ state: "loading" }), CODE)}
				>
					<rect
						x={QUIET}
						y={QUIET}
						width={count}
						height={count}
						fill="currentColor"
					/>
				</svg>
			</div>
		);
	return (
		<div className={cn(QR_TILE, TILE)}>
			<svg
				viewBox={box}
				role="img"
				aria-label={value}
				className={cn(qrCode({ state: "rest" }), CODE)}
			>
				<path fill="currentColor" d={drawn.path} />
			</svg>
		</div>
	);
}
