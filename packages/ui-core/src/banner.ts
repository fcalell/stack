// The glyph each banner and toast tone draws, free of any framework: both platforms draw from it.

import type { IconName } from "./descriptors.ts";
import type { Tone } from "./tokens.ts";

export const GLYPHS: Record<Tone, IconName> = {
	active: "Info",
	running: "Info",
	waiting: "Clock",
	idle: "Info",
	done: "CircleCheck",
	attention: "TriangleAlert",
	failed: "CircleAlert",
};

// The glyph each toast tone draws: both platforms' `Toast` draw from it.
export const TOAST_GLYPHS: Record<Tone, IconName> = {
	...GLYPHS,
	failed: "CircleX",
};
