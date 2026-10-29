// A QR code's modules as one SVG path, free of any framework so both
// platforms draw the same code: the encoding is lean-qr's (ISO 18004, no
// dependencies of its own), the drawing is ours.

import { correction, generate } from "lean-qr";

// The light modules around the code, the four the standard asks for: a
// reader finds the code's corners by the ground around them, so the tile
// keeps them at any size.
export const QR_QUIET = 4;

export interface QrModules {
	// The tile's side in modules, the quiet zone on both sides included: the
	// path's view box is this square.
	side: number;
	// Every dark module, a row's run of them one rectangle, on whole units so
	// a crisp-edged drawing lands each on the pixel grid it can.
	path: string;
}

// The modules of `text` at the medium correction (a reader recovers about
// 15% of a damaged code), the level a screen-shown code takes; a longer text
// takes a larger version, never a lower level.
export function qrModules(text: string): QrModules {
	const code = generate(text, { minCorrectionLevel: correction.M });
	const runs: string[] = [];
	for (let y = 0; y < code.size; y++) {
		let start = -1;
		for (let x = 0; x <= code.size; x++) {
			const dark = x < code.size && code.get(x, y);
			if (dark && start < 0) start = x;
			if (!dark && start >= 0) {
				const run = x - start;
				runs.push(`M${start + QR_QUIET} ${y + QR_QUIET}h${run}v1h-${run}z`);
				start = -1;
			}
		}
	}
	return { side: code.size + 2 * QR_QUIET, path: runs.join("") };
}
