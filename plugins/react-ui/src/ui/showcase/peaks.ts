import type { Peaks } from "@fcalell/ui-core/descriptors";

// A track's amplitude as a decoder would give it, made up: a quiet intro, a
// build, a loud body with a break in it and an outro, with the grain of a
// real signal. Deterministic, so every draw of a story is the same.
export function madePeaks(length = 1200): Peaks {
	const values = new Float32Array(length);
	let seed = 7;
	const noise = () => {
		seed = (seed * 16807) % 2147483647;
		return seed / 2147483647;
	};
	for (let index = 0; index < length; index++) {
		const at = index / length;
		const body =
			at < 0.08
				? 0.25 + at * 3
				: at < 0.3
					? 0.5 + (at - 0.08) * 1.6
					: at < 0.45
						? 0.9
						: at < 0.55
							? 0.35
							: at < 0.92
								? 0.9
								: 0.9 - (at - 0.92) * 9;
		const beat = 0.75 + 0.25 * Math.abs(Math.sin(index * 0.35));
		values[index] = Math.min(
			1,
			Math.max(0.04, body * beat * (0.8 + noise() * 0.2)),
		);
	}
	return { values };
}

// A track of 3:48 with the cues a DJ would set.
export const MADE_DURATION = 228;

// Silence as a playable WAV (8 kHz, 8-bit mono) of `seconds`, at an object URL
// the caller revokes: a story's track needs a file that loads and plays no sound.
export function silence(seconds: number): string {
	const rate = 8000;
	const size = Math.round(seconds * rate);
	const wav = new Uint8Array(44 + size).fill(128, 44);
	const view = new DataView(wav.buffer);
	const text = (at: number, word: string) => {
		for (let index = 0; index < word.length; index++)
			wav[at + index] = word.charCodeAt(index);
	};
	text(0, "RIFF");
	view.setUint32(4, 36 + size, true);
	text(8, "WAVEfmt ");
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, 1, true);
	view.setUint32(24, rate, true);
	view.setUint32(28, rate, true);
	view.setUint16(32, 1, true);
	view.setUint16(34, 8, true);
	text(36, "data");
	view.setUint32(40, size, true);
	return URL.createObjectURL(new Blob([wav], { type: "audio/wav" }));
}
